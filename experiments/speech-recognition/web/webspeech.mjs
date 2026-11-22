// Installs the on-device en-US pack and runs every clip through Web Speech with processLocally=true.
import { chromium } from "playwright-core";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.connectOverCDP(process.argv[2] ?? "http://localhost:29229");
const ctx = browser.contexts()[0];
await ctx.grantPermissions(["microphone"], { origin: "http://localhost:8765" }).catch(() => {});
let page = await ctx.newPage();
page.on("console", (m) => console.log("  page:", m.text().slice(0, 300)));
await page.goto("http://localhost:8765/web/");
await page.waitForFunction(() => window.webSpeechClip);
const out = { check: await page.evaluate(() => window.checkWebSpeech()) };
await page.click("#webspeech"); // user activation for install()
out.install = await Promise.race([page.evaluate(() => window.installWebSpeech()).catch((e) => ({ error: String(e) })), new Promise((r) => setTimeout(() => r({ error: "install() did not settle in 120 s" }), 120000))]);
console.log("install", JSON.stringify(out.install));
await page.close(); page = await ctx.newPage(); page.on("console", (m) => console.log("  page:", m.text().slice(0, 300)));
await page.goto("http://localhost:8765/web/"); await page.waitForFunction(() => window.webSpeechClip);
out.clips = [];
for (const set of ["synth", "ami"]) {
  const refs = JSON.parse(await readFile(new URL(`../audio/${set}/refs.json`, import.meta.url)));
  for (const [k, v] of Object.entries(refs)) {
    const file = v.file ?? `${k}.wav`;
    const r = await page.evaluate(([s, f, l]) => window.webSpeechClip(s, f, { local: l }), [set, file, process.env.LOCAL !== "0"]).catch((e) => ({ file, error: String(e) }));
    out.clips.push({ ...r, ref: v.ref });
  }
}
await writeFile(new URL(`../results/browser-webspeech-${process.env.LOCAL === "0" ? "cloud" : "local"}.json`, import.meta.url), JSON.stringify(out, null, 1));
await page.close(); await browser.close();
