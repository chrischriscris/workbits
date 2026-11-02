import { chromium } from "playwright";
import { Client } from "colyseus.js";
import { RoomServiceClient } from "livekit-server-sdk";
import { zoneAt } from "../packages/shared/src/zones.ts";

const observer = new Client("ws://127.0.0.1:3101");
const observerRoom = await observer.joinOrCreate("office", {
  characterId: "jules",
  name: "Reconnect observer",
});
observerRoom.onMessage("*", () => {});
const joined = [];
observerRoom.onMessage("player_added", (player) => joined.push(player));

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
const page = await browser.newPage({
  viewport: { width: 1000, height: 680 },
  permissions: ["microphone"],
});
page.on("pageerror", (error) => console.log("pageerror:", error.message));
await page.goto("http://127.0.0.1:3100/?character=chus&e2e=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
await page.waitForFunction(() => window.__WORKBITS_VOICE__?.().status === "connected", {
  timeout: 20000,
});
await page.locator('button[aria-label="Join / unmute microphone"]').click();
await page.waitForFunction(() => window.__WORKBITS_VOICE__?.().muted === false, {
  timeout: 15000,
});

await page.locator(".office-switcher").click();
await page.locator(".office-menu__item").filter({ hasText: "Meeting Room" }).click();
await page.waitForFunction(() => window.__WORKBITS_VOICE__?.().channel === "meeting", {
  timeout: 25000,
});
await page.waitForTimeout(1000);

const before = await page.evaluate(() => window.__WORKBITS_DEBUG__?.());
const voiceBefore = await page.evaluate(() => window.__WORKBITS_VOICE__?.());
console.log("before:", { session: before.sessionId, zone: before.localZone, voice: voiceBefore.channel, muted: voiceBefore.muted });

await page.evaluate(() => window.__WORKBITS_DROP__());
let reconnected = false;
for (let i = 0; i < 60; i += 1) {
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => window.__WORKBITS_DEBUG__?.());
  if (state?.status === "connected" && state.sessionId && state.sessionId !== before.sessionId) {
    reconnected = true;
    break;
  }
}
console.log("reconnect state:", reconnected ? "connected with a new session" : "timed out");
await page.waitForTimeout(2500);
await page.waitForFunction(() => window.__WORKBITS_VOICE__?.().status === "connected", {
  timeout: 20000,
});
await page.waitForTimeout(1200);

const after = await page.evaluate(() => window.__WORKBITS_DEBUG__?.());
const voiceAfter = await page.evaluate(() => window.__WORKBITS_VOICE__?.());
console.log("after:", { session: after.sessionId, zone: after.localZone, voice: voiceAfter.channel, muted: voiceAfter.muted, identity: voiceAfter.identity });

// The rejoin must restore Chus where they were (inside the meeting room), not at the spawn.
const restored = joined.find((player) => player.characterId === "chus" && zoneAt(player.x, player.z) === "meeting");
const sessionChanged = reconnected && before.sessionId !== after.sessionId;
const sameZone = before.localZone === after.localZone;
const voiceRebound = voiceAfter.identity === after.sessionId && voiceAfter.channel === "meeting";
const micPreserved = voiceAfter.muted === false;

console.log("session changed:", sessionChanged);
console.log("zone preserved:", sameZone, after.localZone);
console.log("restored server position:", restored ? `${restored.x.toFixed(1)},${restored.z.toFixed(1)}` : "missing");
console.log("voice rebound:", voiceRebound);
console.log("mic preserved:", micPreserved);

const service = new RoomServiceClient("http://127.0.0.1:7880", "devkey", "secret");
const meeting = await service.listParticipants("office:workbits-loft:meeting");
console.log("meeting participants:", meeting.map((p) => ({ identity: p.identity, tracks: p.tracks.length })));
const inMeeting = meeting.some((participant) => participant.identity === after.sessionId);

console.log(
  "RECONNECT:",
  sessionChanged && sameZone && voiceRebound && micPreserved && inMeeting && Boolean(restored)
    ? "PASS"
    : "FAIL",
);

await page.screenshot({ path: "artifacts/shots/reconnect.png", timeout: 120000, animations: "disabled" });
await observerRoom.leave();
await browser.close();
process.exit(
  sessionChanged && sameZone && voiceRebound && micPreserved && inMeeting && restored ? 0 : 1,
);
