import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const out = process.argv[3] ?? "artifacts/shots/art-pass.png";
await mkdir(path.dirname(out), { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (error) => console.log("pageerror:", error.message));
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("synchronously unmount")) {
    console.log("console:", message.text().slice(0, 200));
  }
});
await page.goto(`${base}/?art=1`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, undefined, { timeout: 60000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: out, timeout: 120000 });
console.log(out);
await browser.close();
