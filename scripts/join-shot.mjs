import { chromium } from "playwright";
import { Client } from "colyseus.js";

const client = new Client("ws://127.0.0.1:3101");
const bot = await client.joinOrCreate("office", { characterId: "jules", name: "Jules (occupancy)" });
bot.onMessage("*", () => {});

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
page.on("pageerror", (error) => console.log("pageerror:", error.message));
await page.goto("http://127.0.0.1:3100/?join=1&host=chus&e2e=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, undefined, { timeout: 60000 });
await page.waitForTimeout(700);

const beforeJoin = await page.evaluate(() => window.__WORKBITS_DEBUG__?.());
const selected = await page.locator(".join-person.is-selected").innerText();
const taken = await page.locator(".join-person.is-taken").allInnerTexts();
console.log("join screen status:", beforeJoin?.status);
console.log("occupied seats:", taken.map((text) => text.split("\n")[0]));
console.log("selected:", selected.replace(/\n/g, " "));
console.log("avoids host and live seats:", !selected.includes("Jules") ? "PASS" : "FAIL");

await page.screenshot({ path: "artifacts/shots/join.png", timeout: 120000, animations: "disabled" });
await page.getByRole("button", { name: "Enter the loft" }).click();
await page.waitForFunction(
  () => window.__WORKBITS_DEBUG__?.().status === "connected",
  undefined,
  { timeout: 30000 },
);
console.log("url:", page.url());
const afterJoin = await page.evaluate(() => window.__WORKBITS_DEBUG__?.());
console.log("connected after entering:", afterJoin?.status);

const ok =
  beforeJoin?.status === "offline" &&
  taken.some((text) => text.includes("Jules")) &&
  !selected.includes("Jules") &&
  page.url().includes("character=mira") &&
  afterJoin?.status === "connected";
console.log("INVITE:", ok ? "PASS" : "FAIL");

await bot.leave();
await browser.close();
process.exit(ok ? 0 : 1);
