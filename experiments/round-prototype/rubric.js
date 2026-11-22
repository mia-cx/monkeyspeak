export const config = {
  qualificationThreshold: 60,
  defaultPar: 30,
  speedMin: 0.5,
  speedMax: 1.5,
  duplicationWeight: 0.5,
  roundCap: 90,
};
export const halfUp = (n) => Math.floor(n + 0.5);
export const usefulness = (dimensions) =>
  halfUp((Object.values(dimensions).reduce((a, b) => a + b, 0) / 16) * 100);
export const quality = (U, D) => U * (1 - D * config.duplicationWeight);
export const speed = (T, P = config.defaultPar) =>
  Math.max(config.speedMin, Math.min(config.speedMax, P / T));
export const qualifies = (U, manipulation = false) =>
  U >= config.qualificationThreshold && !manipulation;
export const pbEligible = ({ qualified, T, voided = false }) =>
  qualified && T < config.roundCap && !voided;
export function evaluate({ dimensions, D = 0, T, P, manipulation = false }) {
  const U = usefulness(dimensions);
  const Q = quality(U, D);
  const qualified = qualifies(U, manipulation);
  const S = qualified ? speed(T, P) : null;
  return { U, D, Q, S, T, qualified, score: qualified ? halfUp(Q * S) : null };
}
export function duplication(transcript, spans) {
  const words = [...transcript.matchAll(/\S+/g)];
  return words.length
    ? words.filter((w) =>
        spans.some((s) => w.index < s.end && w.index + w[0].length > s.start),
      ).length / words.length
    : 0;
}
