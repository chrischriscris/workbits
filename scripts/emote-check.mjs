import { chromium } from "playwright";
import { Client } from "colyseus.js";

const client = new Client("ws://127.0.0.1:3101");
const bot = await client.joinOrCreate("office", { characterId: "jules", name: "Jules" });
const received = [];
bot.onMessage("emote", (event) => received.push(event));

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
await page.locator('button[aria-label="Emotes"]').click();
await page.getByRole("menuitem", { name: /Wave/ }).click();
await page.waitForTimeout(700);
console.log("bot emotes:", received);
await page.screenshot({ path: "artifacts/shots/emote.png", timeout: 120000, animations: "disabled" });
await bot.leave();
await browser.close();
