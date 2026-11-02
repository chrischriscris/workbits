import { chromium } from "playwright";
import { Client } from "colyseus.js";

const customAvatar = {
  species: "human",
  body: "male-average",
  skin: "#7d4b32",
  hair: { style: "curly-medium", color: "#1a1a1a" },
  outfit: {
    top: "hoodie",
    topColor: "#6c8cff",
    bottom: "jeans",
    bottomColor: "#2e3440",
    shoes: "sneakers",
    shoesColor: "#f5f5f5",
  },
  accessories: [],
  palette: { primary: "#6c8cff", secondary: "#d9b98c", accent: "#6c8cff" },
};

const layout = {
  id: "sync-test",
  name: "Sync test layout",
  note: "4 desks · focus line",
  rug: "sage",
  desks: [
    { id: "s1", x: -2.7, z: 3.9, rotation: 0, variant: 0 },
    { id: "s2", x: -0.9, z: 3.9, rotation: 0, variant: 1 },
    { id: "s3", x: 0.9, z: 3.9, rotation: 0, variant: 2 },
    { id: "s4", x: 2.7, z: 3.9, rotation: 0, variant: 3 },
  ],
};

const bots = {};
async function bot(characterId) {
  const client = new Client("ws://127.0.0.1:3101");
  const room = await client.joinOrCreate("office", {
    characterId,
    name: `${characterId} (sync bot)`,
    ...(characterId === "jules" ? { avatar: customAvatar } : {}),
  });
  room.onMessage("*", () => {});
  const received = { chat: [], layout: [], updated: [], welcome: null };
  room.onMessage("welcome", (message) => (received.welcome = message));
  room.onMessage("chat", (message) => received.chat.push(message));
  room.onMessage("layout", (message) => received.layout.push(message));
  room.onMessage("player_updated", (message) => received.updated.push(message));
  room.onMessage("player_added", (message) => received.updated.push(message));
  room.send("hello");
  bots[characterId] = { room, received };
  return bots[characterId];
}

await bot("jules");
await bot("fern");
await bot("mira");
await new Promise((resolve) => setTimeout(resolve, 400));

console.log("jules avatar seen by fern:", Boolean(bots.fern.received.welcome?.players.find((p) => p.characterId === "jules")?.avatar));
console.log("jules avatar skin:", bots.fern.received.welcome?.players.find((p) => p.characterId === "jules")?.avatar?.skin);

bots.jules.room.send("layout", { layout });
await new Promise((resolve) => setTimeout(resolve, 300));
console.log("layout broadcasts:", bots.fern.received.layout.length, bots.fern.received.layout[0]?.name, bots.fern.received.layout[0]?.rug);
console.log("layout sanitized desks:", bots.fern.received.layout[0]?.desks?.length);

bots.jules.room.send("chat", { channel: "room", body: "lounge-only message" });
await new Promise((resolve) => setTimeout(resolve, 300));
console.log("jules room chat count (self):", bots.jules.received.chat.length);
console.log("fern room chat (engineering):", bots.fern.received.chat.length);
console.log("mira room chat (lounge):", bots.mira.received.chat.length);

bots.fern.room.send("move", { x: -5.2, z: 4.4, rotation: 0, moving: false });
await new Promise((resolve) => setTimeout(resolve, 150));
bots.jules.room.send("chat", { channel: "room", body: "lounge message two" });
await new Promise((resolve) => setTimeout(resolve, 300));
console.log("fern room chat after walking in:", bots.fern.received.chat.length);

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const context = await browser.newContext({ viewport: { width: 1200, height: 760 } });
await context.addInitScript((avatar) => {
  localStorage.setItem("workbits.avatar", JSON.stringify(avatar));
}, customAvatar);
const page = await context.newPage();
page.on("pageerror", (error) => console.log("pageerror:", error.message));
await page.goto("http://127.0.0.1:3100/?character=chus&e2e=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
await page.waitForTimeout(1200);

console.log("browser debug:", await page.evaluate(() => window.__WORKBITS_DEBUG__?.()));

await page.locator(".roster-collapsed").click();
await page.waitForTimeout(400);
await page.screenshot({ path: "artifacts/shots/sync-roster.png", timeout: 120000, animations: "disabled" });

await page.locator(".office-switcher").click();
await page.waitForTimeout(200);
await page.locator(".office-menu__item").filter({ hasText: "Engineering" }).click();
await page.waitForTimeout(900);
console.log("browser zone after walk:", await page.evaluate(() => window.__WORKBITS_DEBUG__?.().localZone));

await page.locator(".chat-bar").click();
await page.getByRole("tab", { name: "Engineering" }).click();
await page.locator('input[aria-label="Message"]').fill("hello engineering");
await page.locator('input[aria-label="Message"]').press("Enter");
await page.waitForTimeout(700);
console.log("browser room messages:", await page.locator(".chat__messages").innerText());

for (const entry of Object.values(bots)) {
  await entry.room.leave();
}
await browser.close();
