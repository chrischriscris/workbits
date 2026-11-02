import { chromium } from "playwright";

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
page.on("pageerror", (error) => console.log("pageerror:", error.message));
await page.goto("http://127.0.0.1:3100/?character=chus&e2e=1", {
  waitUntil: "domcontentloaded",
});
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });

await page.locator(".office-switcher").click();
await page.waitForTimeout(250);
await page.screenshot({ path: "artifacts/shots/rooms-menu.png", timeout: 120000, animations: "disabled" });

await page.getByRole("button", { name: /Meeting Room/ }).click();
await page.waitForTimeout(500);

await page.locator(".user-chip").click();
await page.waitForTimeout(250);
await page.screenshot({ path: "artifacts/shots/user-menu.png", timeout: 120000, animations: "disabled" });

console.log("switcher options:", await page.locator(".user-menu__item").allTextContents());
await page.getByRole("button", { name: "Jules" }).click();
await page.waitForTimeout(2500);
console.log("url:", page.url());
console.log("voice:", await page.evaluate(() => window.__WORKBITS_VOICE__?.()));

await browser.close();
