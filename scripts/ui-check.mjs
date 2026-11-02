import { chromium } from "playwright";

const base = "http://127.0.0.1:3100";
const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const context = await browser.newContext({ viewport: { width: 1200, height: 760 } });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(`${base}/?character=chus&e2e=1`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, undefined, { timeout: 60000 });

await page.locator(".office-switcher").click();
await page.waitForTimeout(250);
await page.screenshot({ path: "artifacts/shots/rooms-menu.png", timeout: 120000, animations: "disabled" });
await page.locator(".office-menu__item").filter({ hasText: "Meeting Room" }).click();
await page.waitForTimeout(500);

const legacyCamera = await page.locator('button[aria-label*="camera"], button[aria-label*="Share screen"]').count();
console.log("dead camera/share controls:", legacyCamera);

await page.locator(".chat-bar").click();
await page.getByRole("button", { name: "Emoji" }).click();
await page.getByRole("menuitem", { name: "👍" }).click();
const draft = await page.locator('input[aria-label="Message"]').inputValue();
console.log("emoji inserted:", draft);
await page.screenshot({ path: "artifacts/shots/chat-composer.png", timeout: 120000, animations: "disabled" });
await page.locator(".chat__header button[aria-label=\"Close chat\"]").click();

await page.getByRole("button", { name: "Open team roster" }).click();
await page.waitForTimeout(250);
await page.getByRole("button", { name: "Invite teammate" }).click();
await page.waitForTimeout(300);
const inviteLabel = await page.locator(".roster__footer .ghost-button").innerText();
const clipboard = await page.evaluate(() => navigator.clipboard.readText());
console.log("invite button:", inviteLabel.replace(/\n/g, " "));
console.log("clipboard has join link:", clipboard.includes("join=1") && clipboard.includes("host=chus"));
await page.screenshot({ path: "artifacts/shots/ui-polish.png", timeout: 120000, animations: "disabled" });

await page.locator(".user-chip").click();
await page.waitForTimeout(250);
await page.screenshot({ path: "artifacts/shots/user-menu.png", timeout: 120000, animations: "disabled" });
console.log("switcher options:", await page.locator(".user-menu__item").allTextContents());
await page.locator(".user-menu__item").filter({ hasText: "Jules" }).click();
await page.waitForTimeout(2500);
console.log("url:", page.url());

const ok =
  legacyCamera === 0 &&
  draft.includes("👍") &&
  inviteLabel.includes("Link copied") &&
  clipboard.includes("join=1") &&
  page.url().includes("character=jules") &&
  errors.length === 0;
console.log("UI CHECKS:", ok ? "PASS" : "FAIL", errors.slice(0, 2));

await browser.close();
process.exit(ok ? 0 : 1);
