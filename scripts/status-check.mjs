import { Client } from "colyseus.js";
import { WS, app, launchBrowser } from "./lib/lane.mjs";

const client = new Client(WS);
const bot = await client.joinOrCreate("office", { characterId: "jules", name: "Jules" });
bot.onMessage("*", () => {});
const updates = [];
bot.onMessage("player_updated", (player) => updates.push({ id: player.characterId, status: player.status }));

const browser = await launchBrowser({
  args: [
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
await page.goto(app("?character=chus&e2e=1"), { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
await page.locator(".user-chip").click();
await page.waitForTimeout(250);
await page.screenshot({ path: "artifacts/shots/status.png", timeout: 120000, animations: "disabled" });
await page.getByRole("button", { name: "Away" }).click();
await page.waitForTimeout(700);
console.log("status updates:", updates);
console.log("local status:", await page.evaluate(() => window.__WORKBITS_VOICE__?.()));

await bot.leave();
// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(0);
