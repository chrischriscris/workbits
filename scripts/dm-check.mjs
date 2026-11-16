import { Client } from "colyseus.js";
import { WS, app, launchBrowser } from "./lib/lane.mjs";

const makeBot = async (characterId) => {
  const client = new Client(WS);
  const room = await client.joinOrCreate("office", { characterId, name: characterId });
  room.onMessage("*", () => {});
  const received = [];
  room.onMessage("chat", (message) => received.push(message));
  room.send("hello");
  return { room, received };
};

const arlo = await makeBot("arlo");
const jules = await makeBot("jules");

const browser = await launchBrowser({
  args: [
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
await page.goto(app("?character=chus&e2e=1"), { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
await page.locator(".chat-bar").click();
await page.getByRole("tab", { name: "DM · Arlo" }).click();
await page.locator('input[aria-label="Message"]').fill("private hello to arlo");
await page.locator('input[aria-label="Message"]').press("Enter");
await page.waitForTimeout(1000);

console.log("arlo got:", arlo.received.map((m) => m.body));
console.log("jules got:", jules.received.map((m) => m.body));

await arlo.room.leave();
await jules.room.leave();
// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(0);
