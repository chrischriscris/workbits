// Local controls in a real browser: WASD walks relative to the screen (W is up
// the screen, not along the room's axis), a Cmd shortcut never leaves a key
// stuck, a drag pans without sending the avatar walking, and a click still walks.
import { mkdir } from "node:fs/promises";
import { app, launchBrowser } from "./lib/lane.mjs";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const browser = await launchBrowser({ args: ["--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (error) => console.error("page error:", error.message));
await page.goto(app("?character=chus&e2e=1"), { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, null, { timeout: 30000 });
await page.waitForFunction(() => window.__WORKBITS_DEBUG__?.().status === "connected", null, { timeout: 30000 });
await page.waitForTimeout(800);

// The avatar's live position (dev hook), read once it has stopped walking.
const position = async () => {
  await page.waitForFunction(() => !window.__WORKBITS_LOCAL__.moving, null, { timeout: 30000 });
  await page.waitForTimeout(150);
  return page.evaluate(() => ({ x: window.__WORKBITS_LOCAL__.x, z: window.__WORKBITS_LOCAL__.z }));
};

// The camera sits at +x +z looking at the office, so on the floor screen-up is
// (-1, -1)/√2 and screen-right is (1, -1)/√2.
const s = Math.SQRT1_2;
const screen = { KeyW: [-s, -s], KeyS: [s, s], KeyD: [s, -s], KeyA: [-s, s] };

for (const key of ["KeyW", "KeyS", "KeyD", "KeyA"]) {
  const before = await position();
  // Hold until it has walked a metre: software GL runs at a few frames per second.
  await page.keyboard.down(key);
  await page
    .waitForFunction(
      ([x, z]) => Math.hypot(window.__WORKBITS_LOCAL__.x - x, window.__WORKBITS_LOCAL__.z - z) > 1,
      [before.x, before.z],
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.keyboard.up(key);
  const after = await position();
  const dx = after.x - before.x;
  const dz = after.z - before.z;
  const length = Math.hypot(dx, dz);
  const [ex, ez] = screen[key];
  const along = length > 0 ? (dx * ex + dz * ez) / length : 0;
  check(
    `${key} walks ${key === "KeyW" ? "up" : key === "KeyS" ? "down" : key === "KeyD" ? "right" : "left"} the screen`,
    length > 0.4 && along > 0.95,
    `moved ${length.toFixed(2)} m, alignment ${along.toFixed(3)}`,
  );
}

// Cmd+W style shortcut: macOS never delivers the W keyup while Cmd is held.
{
  const before = await position();
  await page.keyboard.down("Meta");
  await page.keyboard.down("KeyW");
  await page.keyboard.up("Meta");
  await page.waitForTimeout(600);
  const after = await position();
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  check("a key pressed with Cmd doesn't walk or stick", moved < 0.05, `moved ${moved.toFixed(2)} m`);
  await page.keyboard.up("KeyW");
}

// A plain click on the floor still walks there.
{
  const before = await position();
  await page.mouse.click(720, 640);
  await page.waitForTimeout(1500);
  const after = await position();
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  check("a click on the floor walks there", moved > 0.3, `moved ${moved.toFixed(2)} m`);
}

// Drag to pan, starting on the floor: the avatar stays put. (It used to walk to
// wherever the drag started, because the floor reacted to the press.)
{
  const before = await position();
  await page.mouse.move(520, 620);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(520 + i * 22, 620 - i * 12);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const after = await position();
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  check("dragging to pan doesn't send the avatar walking", moved < 0.05, `moved ${moved.toFixed(2)} m`);
}

await mkdir("artifacts/shots", { recursive: true });
await page.screenshot({ path: "artifacts/shots/controls.png", timeout: 120000, animations: "disabled" });
console.log(failures ? `${failures} failed` : "all controls checks passed");
// Exit instead of browser.close(): Chromium's graceful shutdown is slow once WebRTC is up.
process.exit(failures ? 1 : 0);
