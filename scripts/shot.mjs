import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:3100/";
const out = process.argv[3] ?? "artifacts/shots/office.png";

await mkdir(path.dirname(out), { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

page.on("console", (message) => {
  if (message.type() === "error") console.error("console error:", message.text());
});
page.on("pageerror", (error) => console.error("page error:", error.message));

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await page
  .waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 })
  .catch(() => console.error("ready flag not set; screenshotting anyway"));
await page.waitForTimeout(1500);
// SwiftShader can take well over 30s to hand back a frame of the full scene.
await page.screenshot({ path: out, timeout: 120000, animations: "disabled" });
console.log(out);

// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(0);
