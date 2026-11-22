// Drives the probe page in an already-running Chrome over CDP and saves JSON results.
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
// Largest single Chrome renderer RSS (MB): approximates the tab running the model.
const rendererMB = () => Math.max(0, ...execSync("ps -eo rss=,args=").toString().split("\n").filter((l) => l.includes("--type=renderer")).map((l) => parseInt(l) / 1024));
const [cdp = "http://localhost:29229", ...runs] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(cdp);
const open = async () => {
  const page = await browser.contexts()[0].newPage();
  page.on("console", (m) => console.log("  page:", m.text().slice(0, 200)));
  await page.goto("http://localhost:8765/web/");
  await page.waitForFunction(() => window.runProbe && window.probeResult.env.userAgent);
  return page;
};
let page = await open();
const out = { env: await page.evaluate(() => window.probeResult.env), webSpeech: await page.evaluate(() => window.checkWebSpeech()), runs: [] };
console.log(JSON.stringify(out.env), JSON.stringify(out.webSpeech));
for (const r of runs) {
  const [name, device] = r.split("@");
  await page.close(); page = await open();
  let peak = 0; const timer = setInterval(() => (peak = Math.max(peak, rendererMB())), 250);
  try { out.runs.push({ ...(await page.evaluate(([n, d]) => window.runProbe(n, d), [name, device])), peakRendererMB: Math.round(peak) }); }
  catch (e) { out.runs.push({ name, device, error: String(e).slice(0, 500) }); console.log("ERROR", name, device, String(e).slice(0, 300)); }
  clearInterval(timer);
}
await writeFile(new URL(`../results/browser-${process.env.TAG ?? "chrome"}.json`, import.meta.url), JSON.stringify(out, null, 1));
await page.close(); await browser.close();
