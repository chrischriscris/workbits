import { chromium } from "playwright";

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
page.on("pageerror", (error) => console.log("pageerror:", error.message));
await page.goto("http://127.0.0.1:3100/?character=chus&e2e=1", {
  waitUntil: "domcontentloaded",
});
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: "artifacts/shots/mobile.png", timeout: 120000, animations: "disabled" });
// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(0);
