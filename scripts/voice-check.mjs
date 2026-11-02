import { chromium } from "playwright";
import { RoomServiceClient } from "livekit-server-sdk";

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1200, height: 760 },
  permissions: ["microphone"],
});
const page = await context.newPage();
page.on("pageerror", (error) => console.log("pageerror:", error.message));
page.on("console", (message) => {
  if (message.type() === "error") console.log("console:", message.text().slice(0, 200));
});
await page.goto("http://127.0.0.1:3100/?character=chus&e2e=1", {
  waitUntil: "domcontentloaded",
});
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
await page.waitForTimeout(2500);
console.log("voice before:", await page.evaluate(() => window.__WORKBITS_VOICE__?.()));

await page.locator('button[aria-label="Join / unmute microphone"]').click();
await page.waitForTimeout(2000);
console.log("voice after:", await page.evaluate(() => window.__WORKBITS_VOICE__?.()));

const service = new RoomServiceClient("http://127.0.0.1:7880", "devkey", "secret");
const participants = await service.listParticipants("office:workbits-loft");
console.log(
  "livekit participants:",
  participants.map((p) => ({ identity: p.identity, tracks: p.tracks.length })),
);

await page.screenshot({ path: "artifacts/shots/voice-check.png", timeout: 120000 });
await browser.close();
