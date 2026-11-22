// Usage: node bench.mjs <candidate>   (one candidate per process so memory numbers stay separate)
import { pipeline, env } from "@huggingface/transformers";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import wavefile from "wavefile";
import { score } from "./metrics.mjs";

const FILLER_PROMPT = " Umm, let me think like, hmm... Okay, here's what I'm, like, thinking. I I want, uh, a a thing.";
const CANDIDATES = {
  "whisper-tiny.en": { id: "onnx-community/whisper-tiny.en", dtype: "q8" },
  "whisper-base.en": { id: "onnx-community/whisper-base.en", dtype: "q8" },
  "whisper-small.en": { id: "onnx-community/whisper-small.en", dtype: "q8" },
  "whisper-base.en+prompt": { id: "onnx-community/whisper-base.en", dtype: "q8", prefix: { prompt: FILLER_PROMPT, en: true } },
  "whisper-small.en+prompt": { id: "onnx-community/whisper-small.en", dtype: "q8", prefix: { prompt: FILLER_PROMPT, en: true } },
  "whisper-large-v3-turbo": { id: "onnx-community/whisper-large-v3-turbo", dtype: "q4" },
  "moonshine-tiny": { id: "onnx-community/moonshine-tiny-ONNX", dtype: "q8" },
  "moonshine-base": { id: "onnx-community/moonshine-base-ONNX", dtype: "q8" },
  "wav2vec2-base-960h": { id: "onnx-community/wav2vec2-base-960h-ONNX", dtype: "q8" },
  "parakeet-ctc-0.6b": { id: "onnx-community/parakeet-ctc-0.6b-ONNX", dtype: "int8" },
  "crisperwhisper2-turbo (NC licence)": { id: "Masterx/CrisperWhisper2.0-turbo-ONNX", dtype: "q4", prefix: { verbatim: true } },
};

const name = process.argv[2];
const c = CANDIDATES[name];
if (!c) { console.error("candidates:", Object.keys(CANDIDATES).join(", ")); process.exit(1); }

function readWav(path) {
  const w = new wavefile.WaveFile(readFileSync(path));
  w.toBitDepth("32f"); w.toSampleRate(16000);
  let s = w.getSamples();
  if (Array.isArray(s)) s = s[0];
  return Float32Array.from(s);
}
const clips = [];
for (const set of ["synth", "ami"]) {
  const refs = JSON.parse(readFileSync(`audio/${set}/refs.json`, "utf8"));
  for (const [k, v] of Object.entries(refs)) {
    const file = v.file ?? `${k}.wav`;
    clips.push({ set, file, ref: v.ref, audio: readWav(`audio/${set}/${file}`) });
  }
}

function dirSize(p) { if (!existsSync(p)) return 0; const s = statSync(p); return s.isDirectory() ? readdirSync(p).reduce((a, f) => a + dirSize(join(p, f)), 0) : s.size; }
const cachePath = join(env.cacheDir, c.id);

// Prime the cache so load timings below measure a warm (cached) load, as on a returning visit.
const t0 = performance.now();
let asr = await pipeline("automatic-speech-recognition", c.id, { dtype: c.dtype, device: "cpu" });
const coldLoadMs = performance.now() - t0;
await asr.dispose();
const t1 = performance.now();
asr = await pipeline("automatic-speech-recognition", c.id, { dtype: c.dtype, device: "cpu" });
const warmLoadMs = performance.now() - t1;
const rssAfterLoadMB = process.memoryUsage().rss / 1e6;

async function transcribe(audio) {
  if (!c.prefix) return (await asr(audio, { max_new_tokens: 200 })).text;
  const tok = asr.tokenizer;
  const id = (t) => { const v = tok.get_vocab()[t] ?? tok.convert_tokens_to_ids([t])[0]; return v === tok.unk_token_id ? undefined : v; };
  let init;
  if (c.prefix.verbatim) {
    init = [1, 2, 3, 4, 5].map((i) => id(`[verbatim_${i}]`)).concat([id("<|startoftranscript|>"), id("<|en|>"), id("<|transcribe|>"), id("<|notimestamps|>")]);
  } else {
    const promptIds = tok.encode(c.prefix.prompt, { add_special_tokens: false });
    init = [id("<|startofprev|>"), ...promptIds, id("<|startoftranscript|>"), id("<|notimestamps|>")];
  }
  if (init.some((x) => x === undefined)) throw new Error("missing special token in tokenizer");
  const { input_features } = await asr.processor(audio);
  const out = await asr.model.generate({ inputs: input_features, decoder_input_ids: init, max_new_tokens: 200 });
  const ids = Array.from(out.tolist()[0]).map(Number).slice(init.length);
  return tok.decode(ids, { skip_special_tokens: !c.prefix.verbatim }).replace(/<\|[^|]+\|>/g, "").trim();
}

await transcribe(clips[0].audio); // warm-up (first inference compiles kernels)
const rows = [];
let peakRss = process.memoryUsage().rss;
for (const clip of clips) {
  const t = performance.now();
  const text = await transcribe(clip.audio);
  const ms = performance.now() - t;
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  const dur = clip.audio.length / 16000;
  rows.push({ set: clip.set, file: clip.file, durS: +dur.toFixed(2), ms: Math.round(ms), rtf: +(ms / 1000 / dur).toFixed(3), ref: clip.ref, hyp: text, ...score(clip.ref, text) });
}
const sum = (k, set) => rows.filter((r) => !set || r.set === set).reduce((a, r) => a + r[k], 0);
const summary = {
  candidate: name, id: c.id, dtype: c.dtype,
  downloadMB: +(dirSize(cachePath) / 1e6).toFixed(1),
  coldLoadMs: Math.round(coldLoadMs), warmLoadMs: Math.round(warmLoadMs),
  rssAfterLoadMB: Math.round(rssAfterLoadMB), peakRssMB: Math.round(peakRss / 1e6),
  meanRtf: +(sum("rtf") / rows.length).toFixed(3),
  amiWer: +(sum("wer", "ami") / rows.filter((r) => r.set === "ami").length).toFixed(3),
  synthWer: +(sum("wer", "synth") / rows.filter((r) => r.set === "synth").length).toFixed(3),
  fillersKept: `${sum("hypFillers")}/${sum("refFillers")}`,
  repsKept: `${sum("hypReps")}/${sum("refReps")}`,
};
writeFileSync(`results/node-${name.replace(/[^a-z0-9.+-]+/gi, "_")}.json`, JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary));
for (const r of rows) console.log(`  [${r.file}] ${r.hyp}`);
