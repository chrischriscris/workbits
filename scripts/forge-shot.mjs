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
page.on("console", (message) => {
  if (message.type() === "error") console.log("console:", message.text().slice(0, 180));
});
await page.goto("http://127.0.0.1:3100/?character=chus", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
await page.locator('button[aria-label="Avatar studio"]').click();
await page.waitForTimeout(600);
await page.screenshot({ path: "artifacts/shots/forge.png", timeout: 120000, animations: "disabled" });

await page.getByRole("button", { name: "Generate 3 bases" }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: "artifacts/shots/forge-generated.png", timeout: 120000, animations: "disabled" });

await page.getByRole("button", { name: "Use this base" }).first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "artifacts/shots/forge-applied.png", timeout: 120000, animations: "disabled" });

await browser.close();
