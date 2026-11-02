// Screenshot any app URL with system Chrome (real GPU), for art comparisons.
//   bun scripts/art-view.mjs "http://localhost:3100/?art" out.png
// Useful query params: ?art (no UI), &artWidth=8&artTarget=x,y,z (zoom/aim),
// ?lineup (dev cast bench, &zoom=&focus=x,y,z), &heads=gen (generated heads).
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3100/?art";
const out = process.argv[3] ?? "artifacts/shots/view.png";
await mkdir(path.dirname(out), { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("synchronously unmount")) errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 45000 }).catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
console.log(JSON.stringify({ out, errors: errors.slice(0, 6) }));
await browser.close();
