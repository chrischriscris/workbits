import { chromium } from "playwright";
import { Client } from "colyseus.js";

const client = new Client("ws://127.0.0.1:3101");
const bot = await client.joinOrCreate("office", { characterId: "jules", name: "Forge observer" });
bot.onMessage("*", () => {});
const updates = [];
bot.onMessage("player_updated", (player) => updates.push(player));

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on("pageerror", (error) => console.log("pageerror:", error.message));
await page.goto("http://127.0.0.1:3100/?character=chus&e2e=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, undefined, { timeout: 60000 });
await page.locator('button[aria-label="Avatar studio"]').click();
await page.waitForTimeout(600);
await page.screenshot({ path: "artifacts/shots/forge.png", timeout: 120000, animations: "disabled" });

await page.getByRole("button", { name: "Tune" }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: "artifacts/shots/forge-editor.png", timeout: 120000, animations: "disabled" });

await page.getByRole("button", { name: "Skin #7d4b32" }).click();
await page.getByRole("button", { name: "Top #2f7d4f" }).click();
await page.getByRole("button", { name: "Beard", exact: true }).click();
await page.getByRole("button", { name: "Cap", exact: true }).click();
await page.getByRole("button", { name: "Save look" }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: "artifacts/shots/forge-applied.png", timeout: 120000, animations: "disabled" });

const debug = await page.evaluate(() => window.__WORKBITS_DEBUG__?.());
const latest = updates.filter((player) => player.characterId === "chus").at(-1);
console.log(
  "local avatar:",
  debug?.avatar?.skin,
  debug?.avatar?.outfit?.topColor,
  "beard",
  Boolean(debug?.avatar?.facialHair),
  "cap",
  Boolean(debug?.avatar?.headwear),
);
console.log(
  "remote update:",
  latest?.avatar?.skin,
  latest?.avatar?.outfit?.topColor,
  "beard",
  Boolean(latest?.avatar?.facialHair),
  "cap",
  Boolean(latest?.avatar?.headwear),
);

const ok =
  debug?.avatar?.skin === "#7d4b32" &&
  debug?.avatar?.outfit?.topColor === "#2f7d4f" &&
  !debug?.avatar?.facialHair &&
  debug?.avatar?.headwear?.style === "cap" &&
  latest?.avatar?.skin === "#7d4b32" &&
  latest?.avatar?.outfit?.topColor === "#2f7d4f";
console.log("AVATAR TUNING:", ok ? "PASS" : "FAIL");

await bot.leave();
// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(ok ? 0 : 1);
