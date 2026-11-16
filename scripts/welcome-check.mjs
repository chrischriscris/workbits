import { chromium } from "playwright";

const base = "http://127.0.0.1:3100";
const browser = await chromium.launch({
  args: ["--ignore-gpu-blocklist"],
});

const desktop = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const errors = [];
desktop.on("pageerror", (error) => errors.push(error.message));
const response = await desktop.goto(`${base}/welcome.html`, { waitUntil: "networkidle" });
const title = await desktop.title();
const hero = await desktop.locator(".hero h1").innerText();
const imageLoaded = await desktop
  .locator(".hero-media img")
  .evaluate((image) => image.complete && image.naturalWidth > 0);
const cta = await desktop.locator(".hero .button-primary").getAttribute("href");
console.log("status:", response?.status(), "title:", title);
console.log("hero:", hero.replace(/\n/g, " "));
console.log("hero image loaded:", imageLoaded, "cta:", cta);
await desktop.screenshot({
  path: "artifacts/shots/welcome.png",
  fullPage: true,
  timeout: 120000,
  animations: "disabled",
});

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${base}/welcome.html`, { waitUntil: "networkidle" });
await mobile.screenshot({
  path: "artifacts/shots/welcome-mobile.png",
  fullPage: true,
  timeout: 120000,
  animations: "disabled",
});

await desktop.locator(".hero .button-primary").click();
await desktop.waitForURL(/join=1/, { timeout: 10000 });
await desktop.locator(".join-card").waitFor({ timeout: 20000 });
console.log("cta destination:", desktop.url());

const ok =
  response?.status() === 200 &&
  title.includes("Your team's place") &&
  hero.includes("not another tab") &&
  imageLoaded &&
  cta === "/?join=1" &&
  desktop.url().includes("join=1") &&
  errors.length === 0;
console.log("WELCOME:", ok ? "PASS" : "FAIL", errors.slice(0, 2));

// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(ok ? 0 : 1);
