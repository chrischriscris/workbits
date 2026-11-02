// Export the live scene (dev server) to a GLB for offline Blender renders.
//   bun scripts/art-export.mjs "http://localhost:3100/?art" artifacts/cycles/office.glb
// Uses window.__WORKBITS_EXPORT__ (dev builds only, apps/web/src/scene/devExport.ts).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3100/?art";
const out = process.argv[3] ?? "artifacts/cycles/office.glb";
await mkdir(path.dirname(out), { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 45000 });
await page.waitForTimeout(4000);
const b64 = await page.evaluate(() => window.__WORKBITS_EXPORT__());
await writeFile(out, Buffer.from(b64, "base64"));
console.log("wrote", out, Math.round((b64.length * 0.75) / 1024), "KB");
await browser.close();
