import { chromium } from "playwright";
import { RoomServiceClient } from "livekit-server-sdk";

const args = [
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
];

async function open(character) {
  const browser = await chromium.launch({ args });
  const context = await browser.newContext({
    viewport: { width: 900, height: 600 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:3100/?character=${character}&e2e=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
  await page
    .waitForFunction(() => document.querySelector(".live-pill")?.textContent?.includes("Live"), {
      timeout: 20000,
    })
    .catch(() => {});
  await page.waitForFunction(
    () => window.__WORKBITS_VOICE__?.().status === "connected",
    { timeout: 20000 },
  );
  await page.waitForTimeout(400);
  await page.locator('button[aria-label="Join / unmute microphone"]').click();
  await page.waitForTimeout(1600);
  return { browser, page };
}

const chus = await open("chus");
const jules = await open("jules");
await chus.page.waitForTimeout(1200);

const service = new RoomServiceClient("http://127.0.0.1:7880", "devkey", "secret");
const participants = await service.listParticipants("office:workbits-loft");
console.log(
  "participants:",
  participants.map((p) => ({ identity: p.identity, tracks: p.tracks.length })),
);
console.log("chus voice:", await chus.page.evaluate(() => window.__WORKBITS_VOICE__?.()));
console.log("jules voice:", await jules.page.evaluate(() => window.__WORKBITS_VOICE__?.()));

// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(0);
