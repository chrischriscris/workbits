import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:3201";
const failures = [];
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

const root = await fetch(`${base}/`);
const html = await root.text();
check("root serves the built app", root.status === 200 && html.includes('<div id="root">'));

const spa = await fetch(`${base}/some/deep/route`, { headers: { accept: "text/html" } });
check("SPA fallback serves index", spa.status === 200 && (await spa.text()).includes('<div id="root">'));

const welcome = await fetch(`${base}/welcome.html`);
const welcomeHtml = await welcome.text();
check(
  "welcome page is served",
  welcome.status === 200 && welcomeHtml.includes("Your team's place"),
);

const health = await fetch(`${base}/health`).then((response) => response.json());
check("health reports the web build", health.ok === true && health.web === true, JSON.stringify(health));

const token = await fetch(`${base}/livekit/token?identity=ghost`);
check("token endpoint rejects outsiders", token.status === 403, `status ${token.status}`);

const assetPath = html.match(/src="([^"]+\.js)"/)?.[1];
if (assetPath) {
  const asset = await fetch(`${base}${assetPath}`);
  check("hashed JS asset loads", asset.status === 200, assetPath);
}

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("synchronously unmount")) {
    errors.push(message.text());
  }
});
await page.goto(`${base}/?e2e=1`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, undefined, { timeout: 60000 });
await page.waitForFunction(
  () => document.querySelector(".live-pill")?.textContent?.includes("Live"),
  undefined,
  { timeout: 20000 },
).catch(() => {});
const live = await page.locator(".live-pill").innerText();
const api = await page.evaluate(async () => (await fetch("/health")).json());
check("same-origin realtime reaches Live", live.includes("Live"), live);
check("same-origin API responds from the page", api.ok === true && api.web === true);
check("no unexpected browser errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await page.screenshot({ path: "artifacts/shots/prod.png", timeout: 120000, animations: "disabled" });
await browser.close();

console.log(`PRODUCTION: ${failures.length === 0 ? "PASS" : "FAIL"}`);
process.exit(failures.length === 0 ? 0 : 1);
