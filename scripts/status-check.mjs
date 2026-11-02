import { chromium } from "playwright";
import { Client } from "colyseus.js";

const client = new Client("ws://127.0.0.1:3101");
const bot = await client.joinOrCreate("office", { characterId: "jules", name: "Jules" });
const updates = [];
bot.onMessage("player_updated", (player) => updates.push({ id: player.characterId, status: player.status }));

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
await page.locator(".user-chip").click();
await page.waitForTimeout(250);
await page.screenshot({ path: "artifacts/shots/status.png", timeout: 120000, animations: "disabled" });
await page.getByRole("button", { name: "Away" }).click();
await page.waitForTimeout(700);
console.log("status updates:", updates);
console.log("local status:", await page.evaluate(() => window.__WORKBITS_VOICE__?.()));

await bot.leave();
await browser.close();
