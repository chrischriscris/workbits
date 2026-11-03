// Office studio (ADR-015): generate three offices, apply one, see the server
// confirm it, then go back to the loft so later checks in this lane start there.
import { Client } from "colyseus.js";
import { WS, app, launchBrowser } from "./lib/lane.mjs";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

// A bot listens for the server's broadcast.
const watcher = await new Client(WS).joinOrCreate("office", { characterId: "jules", name: "Studio watcher" });
const heard = [];
watcher.onMessage("*", () => {});
watcher.onMessage("space", (office) => heard.push(office));

const browser = await launchBrowser({ args: ["--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
page.on("pageerror", (error) => console.log("pageerror:", error.message));
await page.goto(app("?character=chus&e2e=1"), { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 30000 });
const office = () => page.evaluate(() => window.__WORKBITS_DEBUG__?.().office);
try {
  await page.locator('button[aria-label="Office studio"]').click();
  await page.locator('input[aria-label="Office prompt"]').fill("a team of twelve, no nap room");
  await page.getByRole("button", { name: "Generate 3 offices" }).click();
  await page.waitForTimeout(400);
  const cards = await page.locator(".plan-card").count();
  check("three office suggestions", cards === 3, `${cards} cards`);
  await page.screenshot({ path: "artifacts/shots/room-studio.png", timeout: 120000, animations: "disabled" });

  await page.getByRole("button", { name: "Use this office" }).first().click();
  await page.waitForTimeout(900);
  const applied = await office();
  check("the browser switched office", applied?.template !== "loft" && applied?.headcount === 12, JSON.stringify(applied));
  check("the server broadcast it", heard.some((item) => item.template === applied?.template), JSON.stringify(heard));
  await page.screenshot({ path: "artifacts/shots/room-applied.png", timeout: 120000, animations: "disabled" });
} finally {
  await page.locator('button[aria-label="Office studio"]').click();
  await page.getByRole("button", { name: "Back to the loft" }).click();
  await page.waitForTimeout(1200);
  check("back to the loft", (await office())?.template === "loft");
  await watcher.leave();
}
console.log(failures === 0 ? "OFFICE STUDIO: PASS" : `OFFICE STUDIO: FAIL (${failures})`);
// Exit instead of browser.close(): once WebRTC is up, Chromium's graceful
// shutdown takes ~25s. Playwright kills the browser when the process exits.
process.exit(failures === 0 ? 0 : 1);
