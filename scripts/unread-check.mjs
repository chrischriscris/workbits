import { chromium } from "playwright";
import { Client } from "colyseus.js";

const client = new Client("ws://127.0.0.1:3101");
const bot = await client.joinOrCreate("office", { characterId: "fern", name: "Unread bot" });
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
await page.goto("http://127.0.0.1:3100/?character=chus&e2e=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, undefined, { timeout: 60000 });
await page.waitForFunction(
  () => window.__WORKBITS_DEBUG__?.().status === "connected",
  undefined,
  { timeout: 20000 },
);

bot.send("chat", { channel: "office", body: "unread ping" });
const badge = page.locator(".chat-bar__unread");
await badge.waitFor({ timeout: 10000 });
const count = await badge.innerText();
console.log("unread badge:", count);
await page.screenshot({ path: "artifacts/shots/unread.png", timeout: 120000, animations: "disabled" });

await page.locator(".chat-bar").click();
await page.waitForTimeout(600);
const stillBadge = await page.locator(".chat-bar__unread").count();
const tabBadge = await page.locator(".chat__tab-badge").count();
const messages = await page.locator(".chat__messages").innerText();
console.log("after opening:", { stillBadge, tabBadge, hasMessage: messages.includes("unread ping") });

const ok = count === "1" && stillBadge === 0 && tabBadge === 0 && messages.includes("unread ping");
console.log("UNREAD:", ok ? "PASS" : "FAIL");

await bot.leave();
// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(ok ? 0 : 1);
