import { Client } from "colyseus.js";
import { WS, app, launchBrowser } from "./lib/lane.mjs";

const client = new Client(WS);
const bot = await client.joinOrCreate("office", { characterId: "jules", name: "Jules" });
bot.onMessage("*", () => {});
const received = [];
bot.onMessage("emote", (event) => received.push(event));

const browser = await launchBrowser({
  args: [
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
await page.goto(app("?character=chus&e2e=1"), { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });

async function emote(label) {
  await page.locator('button[aria-label="Emotes"]').click();
  await page.getByRole("menuitem", { name: new RegExp(label, "i") }).click();
  await page.waitForTimeout(350);
  return page.locator(".emote-bubble").first().innerText().catch(() => "");
}

const wave = await emote("Wave");
const clap = await emote("Clap");
await page.waitForTimeout(350);
const heart = await emote("Heart");
await page.waitForTimeout(300);
await page.screenshot({ path: "artifacts/shots/emote.png", timeout: 120000 });

console.log("wave bubble:", wave || "missing");
console.log("clap bubble:", clap || "missing");
console.log("heart bubble:", heart || "missing");
console.log("bot emotes:", received.map((event) => event.kind));

const ok = wave === "👋" && clap === "👏" && heart === "❤️" && received.length >= 3;
console.log("EMOTES:", ok ? "PASS" : "FAIL");

await bot.leave();
// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(ok ? 0 : 1);
