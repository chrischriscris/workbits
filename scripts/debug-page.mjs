import { chromium } from "playwright";

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (message) => console.log("console", message.type(), message.text().slice(0, 300)));
page.on("pageerror", (error) => console.log("pageerror", error.message));
page.on("framenavigated", (frame) => console.log("navigated", frame.url()));
await page.goto("http://127.0.0.1:3100/?character=chus", { waitUntil: "domcontentloaded" });
for (let i = 0; i < 10; i += 1) {
  await page.waitForTimeout(1000);
  console.log(
    i,
    await page.evaluate(() => ({
      ready: window.__WORKBITS_READY__,
      live: document.querySelector(".live-pill")?.textContent,
      canvas: Boolean(document.querySelector("canvas")),
      root: document.querySelector("#root")?.childElementCount,
    })),
  );
}
await page.screenshot({ path: "artifacts/shots/debug-page.png" });
await browser.close();
