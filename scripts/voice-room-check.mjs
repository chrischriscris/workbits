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
    viewport: { width: 960, height: 640 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log(`${character} pageerror:`, error.message));
  await page.goto(`http://127.0.0.1:3100/?character=${character}&e2e=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
  await page.waitForFunction(
    () => window.__WORKBITS_VOICE__?.().status === "connected",
    { timeout: 20000 },
  );
  await page.locator('button[aria-label="Join / unmute microphone"]').click();
  await page.waitForFunction(() => window.__WORKBITS_VOICE__?.().muted === false, {
    timeout: 15000,
  });
  return { browser, page };
}

const chus = await open("chus");
const jules = await open("jules");
await chus.page.waitForTimeout(1500);

const sessionId = (page) =>
  page.evaluate(() => window.__WORKBITS_DEBUG__?.().sessionId);

const chusId = await sessionId(chus.page);
const juanId = await sessionId(jules.page);
const service = new RoomServiceClient("http://127.0.0.1:7880", "devkey", "secret");

const floorBefore = await service.listParticipants("office:workbits-loft");
const meetingBefore = await service.listParticipants("office:workbits-loft:meeting");
console.log("floor before:", floorBefore.map((p) => ({ identity: p.identity, tracks: p.tracks.length })));
console.log("meeting before:", meetingBefore.map((p) => p.identity));
console.log("chus voice before:", await chus.page.evaluate(() => window.__WORKBITS_VOICE__?.()));
console.log("jules voice before:", await jules.page.evaluate(() => window.__WORKBITS_VOICE__?.()));

await chus.page.locator(".office-switcher").click();
await chus.page.locator(".office-menu__item").filter({ hasText: "Meeting Room" }).click();
await chus.page.waitForFunction(
  () => window.__WORKBITS_DEBUG__?.().localZone === "meeting",
  { timeout: 20000 },
);
await chus.page.waitForFunction(
  () => window.__WORKBITS_VOICE__?.().channel === "meeting",
  { timeout: 20000 },
);
await chus.page.waitForTimeout(1800);

const floorAfter = await service.listParticipants("office:workbits-loft");
const meetingAfter = await service.listParticipants("office:workbits-loft:meeting");
console.log("floor after:", floorAfter.map((p) => ({ identity: p.identity, tracks: p.tracks.length })));
console.log("meeting after:", meetingAfter.map((p) => ({ identity: p.identity, tracks: p.tracks.length })));
console.log("chus identity:", chusId, "jules identity:", juanId);
console.log("chus voice after:", await chus.page.evaluate(() => window.__WORKBITS_VOICE__?.()));
console.log("jules voice after:", await jules.page.evaluate(() => window.__WORKBITS_VOICE__?.()));

const isolated =
  meetingAfter.some((p) => p.identity === chusId) &&
  floorAfter.some((p) => p.identity === juanId) &&
  !floorAfter.some((p) => p.identity === chusId) &&
  !meetingAfter.some((p) => p.identity === juanId);
console.log("ROOM ISOLATION:", isolated ? "PASS" : "FAIL");

await chus.page.screenshot({ path: "artifacts/shots/voice-meeting.png", timeout: 120000, animations: "disabled" });
await jules.page.screenshot({ path: "artifacts/shots/voice-floor.png", timeout: 120000, animations: "disabled" });

await chus.browser.close();
await jules.browser.close();
process.exit(isolated ? 0 : 1);
