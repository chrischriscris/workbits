import { chromium } from "playwright";
import { Client } from "colyseus.js";

const makeBot = async (characterId) => {
  const client = new Client("ws://127.0.0.1:3101");
  const room = await client.joinOrCreate("office", { characterId, name: characterId });
  room.onMessage("*", () => {});
  const received = [];
  room.onMessage("chat", (message) => received.push(message));
  room.send("hello");
  return { room, received };
};

const arlo = await makeBot("arlo");
const jules = await makeBot("jules");

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
await page.goto("http://127.0.0.1:3100/?character=chus&e2e=1", { waitUntil: "domcontentloaded" });
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
await browser.close();
