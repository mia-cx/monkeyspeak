// Shared scoring: WER plus how many fillers and immediate repetitions survive.
const FILLER_MAP = { um: "um", umm: "um", uhm: "um", erm: "um", uh: "uh", uhh: "uh", er: "uh", ah: "uh", hmm: "hmm", mm: "hmm", mhm: "hmm" };
export function normalize(text) {
  return text.toLowerCase().replace(/\[(um|uh)\]/g, " $1 ").replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/).filter(Boolean).map((w) => FILLER_MAP[w] ?? w);
}
export function wer(ref, hyp) {
  const r = normalize(ref), h = normalize(hyp);
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / Math.max(r.length, 1);
}
const isFiller = (w) => w === "um" || w === "uh" || w === "hmm";
export function fillers(text) { return normalize(text).filter(isFiller).length; }
// Immediate repetitions of a word or a two-word phrase ("users users", "the um the" ignoring fillers).
export function repetitions(text) {
  const w = normalize(text).filter((x) => !isFiller(x));
  let n = 0;
  for (let i = 0; i < w.length - 1; i++) {
    if (w[i] === w[i + 1]) n++;
    else if (i < w.length - 3 && w[i] === w[i + 2] && w[i + 1] === w[i + 3]) n++;
  }
  return n;
}
export function score(ref, hyp) {
  return { wer: +wer(ref, hyp).toFixed(3), refFillers: fillers(ref), hypFillers: fillers(hyp), refReps: repetitions(ref), hypReps: repetitions(hyp) };
}
