// Word timestamps from Whisper vs. the known segment boundaries of the synthetic clips.
import { pipeline } from "@huggingface/transformers";
import wavefile from "wavefile";
import { readFileSync } from "node:fs";
const id = process.argv[2] ?? "onnx-community/whisper-base.en_timestamped";
const read = (p) => { const w = new wavefile.WaveFile(readFileSync(p)); w.toBitDepth("32f"); w.toSampleRate(16000); let s = w.getSamples(); return Float32Array.from(Array.isArray(s) ? s[0] : s); };
const refs = JSON.parse(readFileSync("audio/synth/refs.json"));
const asr = await pipeline("automatic-speech-recognition", id, { dtype: "q8" });
for (const [k, v] of Object.entries(refs)) {
  const t = performance.now();
  const { chunks } = await asr(read(`audio/synth/${k}.wav`), { return_timestamps: "word" });
  const ms = Math.round(performance.now() - t);
  // Each true segment start vs. the first word Whisper placed at or after the previous segment end.
  const errs = v.segments.map((s) => { const w = chunks.find((c) => c.timestamp[0] >= s.start - 0.6); return w ? +(w.timestamp[0] - s.start).toFixed(2) : null; });
  const gaps = chunks.slice(1).map((c, i) => +(c.timestamp[0] - chunks[i].timestamp[1]).toFixed(2)).filter((g) => g >= 0.5);
  console.log(JSON.stringify({ clip: k, ms, segmentStarts: v.segments.map((s) => s.start), startErrS: errs, truePauses: v.segments.slice(1).map((s, i) => +(s.start - v.segments[i].end).toFixed(2)), detectedGapsS: gaps, words: chunks.map((c) => `${c.text.trim()}@${c.timestamp[0]}`).join(" ") }));
}
