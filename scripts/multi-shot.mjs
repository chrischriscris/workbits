import { mkdir } from "node:fs/promises";
import { Client } from "colyseus.js";
import { WS, app, launchBrowser } from "./lib/lane.mjs";
import { spawnOf, walkBot } from "./lib/walk.mjs";

const pageUrl = process.argv[2] ? `${process.argv[2]}?character=chus&e2e=1` : app("?character=chus&e2e=1");
await mkdir("artifacts/shots", { recursive: true });

const browser = await launchBrowser({
  args: [
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
page.on("pageerror", (error) => console.log("pageerror:", error.message));
await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
await page
  .waitForFunction(
    () => document.querySelector(".live-pill")?.textContent?.includes("Live"),
    { timeout: 20000 },
  )
  .catch(() => console.error("browser did not reach Live"));

const client = new Client(WS);
const bot = await client.joinOrCreate("office", {
  characterId: "jules",
  name: "Jules (bot)",
});
bot.onMessage("*", () => {});
const received = [];
bot.onMessage("chat", (message) => {
  received.push(message);
  console.log("bot received chat:", message.authorName, message.body);
});

console.log("bot state keys", Object.keys(bot.state ?? {}));
console.log("bot players type", typeof bot.state?.players, typeof bot.state?.players?.onAdd, bot.state?.players?.size);
console.log("bot players", bot.state?.players ? [...bot.state.players.values()].map((p) => ({ ...p })) : null);
await walkBot(bot, spawnOf("jules"), { x: -4.9, z: 4.3 }, { stepMs: 40, rotation: 0.5 });
await page.waitForTimeout(1500);

console.log("tags:", await page.locator(".name-tag").allTextContents());
console.log("debug:", await page.evaluate(() => window.__WORKBITS_DEBUG__?.()));

await page.locator(".chat-bar").click();
await page.locator('input[aria-label="Message"]').fill("hello from chus");
await page.locator('input[aria-label="Message"]').press("Enter");
await page.waitForTimeout(900);
console.log("browser chat:", await page.locator(".chat__messages").innerText());

bot.send("chat", { channel: "office", body: "hello from jules bot" });
await page.waitForTimeout(900);
console.log("browser chat after bot:", await page.locator(".chat__messages").innerText());

await page.locator(".icon-button[aria-label='Close chat']").click();
await page.screenshot({ path: "artifacts/shots/multi-bot.png", timeout: 120000, animations: "disabled" });

await bot.leave();
// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(0);
