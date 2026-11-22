import { readFileSync } from "node:fs";
import { score } from "./metrics.mjs";
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(f));
  const rows = d.clips.map((c) => ({ set: c.set, file: c.file, errors: c.errors, ...score(c.ref, c.text ?? ""), hyp: c.text, lags: (c.results ?? []).map((r) => r.lagMs) }));
  const sum = (k, s) => rows.filter((r) => !s || r.set === s).reduce((a, r) => a + r[k], 0);
  const ami = rows.filter((r) => r.set === "ami");
  console.log(f, JSON.stringify({ install: d.install, amiWer: +(sum("wer", "ami") / ami.length).toFixed(3), synthWer: +(sum("wer", "synth") / 3).toFixed(3), fillersKept: `${sum("hypFillers")}/${sum("refFillers")}`, repsKept: `${sum("hypReps")}/${sum("refReps")}`, errors: [...new Set(rows.flatMap((r) => r.errors ?? []))], empty: rows.filter((r) => !r.hyp).length }));
  for (const r of rows.slice(0, 5)) console.log("  ", r.file, r.lags, r.hyp);
}
