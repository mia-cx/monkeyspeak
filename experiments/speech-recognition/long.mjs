// Long-round check: does a model keep up on a 30-60 s round when fed whole vs. split at pauses?
import { pipeline } from "@huggingface/transformers";
import wavefile from "wavefile";
import { readFileSync } from "node:fs";
import { wer } from "./metrics.mjs";
const [id, dtype = "q8"] = process.argv.slice(2);
const read = (p) => { const w = new wavefile.WaveFile(readFileSync(p)); w.toBitDepth("32f"); w.toSampleRate(16000); let s = w.getSamples(); return Float32Array.from(Array.isArray(s) ? s[0] : s); };
const synth = JSON.parse(readFileSync("audio/synth/refs.json")), ami = JSON.parse(readFileSync("audio/ami/refs.json"));
const parts = [...Object.entries(synth).map(([k, v]) => ({ a: read(`audio/synth/${k}.wav`), ref: v.ref })), ...ami.slice(0, 8).map((v) => ({ a: read(`audio/ami/${v.file}`), ref: v.ref }))];
const gap = new Float32Array(16000 * 0.8);
const chunks = parts.flatMap((p) => [p.a, gap]);
const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0)); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
const ref = parts.map((p) => p.ref).join(" ");
// Energy VAD: split where 30 ms frames stay below -45 dBFS for >= 500 ms.
function vadSplit(x, minSil = 0.5) {
  const f = 480, rms = []; for (let i = 0; i + f <= x.length; i += f) { let s = 0; for (let j = i; j < i + f; j++) s += x[j] * x[j]; rms.push(20 * Math.log10(Math.sqrt(s / f) + 1e-9)); }
  const segs = []; let start = null, sil = 0;
  rms.forEach((db, i) => { if (db > -45) { if (start === null) start = i; sil = 0; } else if (start !== null && ++sil * 0.03 >= minSil) { segs.push([start * f, (i - sil + 1) * f]); start = null; sil = 0; } });
  if (start !== null) segs.push([start * f, x.length]);
  return segs;
}
const asr = await pipeline("automatic-speech-recognition", id, { dtype });
const isWhisper = /whisper/i.test(id);
let t = performance.now();
const whole = (await asr(all, isWhisper ? { chunk_length_s: 30, return_timestamps: true } : {})).text;
const wholeMs = performance.now() - t;
t = performance.now();
const segs = vadSplit(all);
const split = []; for (const [a, b] of segs) split.push((await asr(all.slice(Math.max(0, a - 3200), Math.min(all.length, b + 3200)))).text.trim());
const splitMs = performance.now() - t;
console.log(JSON.stringify({ id, durS: +(all.length / 16000).toFixed(1), segments: segs.length, wholeWer: +wer(ref, whole).toFixed(3), wholeMs: Math.round(wholeMs), splitWer: +wer(ref, split.join(" ")).toFixed(3), splitMs: Math.round(splitMs), whole: whole.slice(0, 400) }));
