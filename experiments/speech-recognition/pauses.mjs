// Pauses measured from the audio alone (energy VAD), against the known silences in the synthetic clips.
import wavefile from "wavefile";
import { readFileSync } from "node:fs";
const read = (p) => { const w = new wavefile.WaveFile(readFileSync(p)); w.toBitDepth("32f"); w.toSampleRate(16000); let s = w.getSamples(); return Float32Array.from(Array.isArray(s) ? s[0] : s); };
export function silences(x, { frame = 160, db = -45, min = 0.5 } = {}) {
  const out = []; let start = null;
  for (let i = 0; i + frame <= x.length; i += frame) {
    let e = 0; for (let j = i; j < i + frame; j++) e += x[j] * x[j];
    const quiet = 20 * Math.log10(Math.sqrt(e / frame) + 1e-9) < db;
    if (quiet && start === null) start = i;
    if (!quiet && start !== null) { if ((i - start) / 16000 >= min && start > 0) out.push(+((i - start) / 16000).toFixed(2)); start = null; }
  }
  return out;
}
const refs = JSON.parse(readFileSync("audio/synth/refs.json"));
for (const [k, v] of Object.entries(refs)) console.log(JSON.stringify({ clip: k, truePausesS: v.segments.slice(1).map((s, i) => +(s.start - v.segments[i].end).toFixed(2)), vadPausesS: silences(read(`audio/synth/${k}.wav`)) }));
