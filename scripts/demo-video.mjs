import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

await mkdir("artifacts/video", { recursive: true });
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: "artifacts/video", size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://127.0.0.1:3100/?character=chus", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, undefined, { timeout: 60000 });
await page.waitForTimeout(2200);

// Slow pan across the office.
await page.mouse.move(640, 420);
await page.mouse.down();
await page.mouse.move(510, 390, { steps: 24 });
await page.mouse.up();
await page.waitForTimeout(700);

// Zoom in and out like a person inspecting the diorama.
await page.mouse.move(650, 410);
await page.mouse.wheel(0, -170);
await page.waitForTimeout(900);
await page.mouse.wheel(0, 90);
await page.waitForTimeout(800);

// Walk to the engineering pod / lounge.
await page.mouse.click(690, 445);
await page.waitForTimeout(1500);

// Open the local assistant, then close it.
await page.locator('button[aria-label="Ask Workbits assistant"]').click();
await page.waitForTimeout(1700);
await page.locator('button[aria-label="Close assistant"]').click();
await page.waitForTimeout(900);

// Finish on a short pan.
await page.mouse.move(620, 430);
await page.mouse.down();
await page.mouse.move(700, 400, { steps: 18 });
await page.mouse.up();
await page.waitForTimeout(1200);

const video = page.video();
await context.close();
await browser.close();
const source = await video.path();
console.log(source);
