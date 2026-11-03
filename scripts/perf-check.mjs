// Frame-rate measurement at 1080p on the real GPU (system Chrome), vsync off so
// the numbers show headroom, not a 60 fps cap. Scenarios: the loft and a large
// template, empty and with 50 walking avatars (dev-only ?bots=).
//   bun scripts/perf-check.mjs [seconds] [--breakdown] [--prod]
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const seconds = Number(process.argv.find((arg) => /^\d+$/.test(arg)) ?? 8);
const breakdown = process.argv.includes("--breakdown");
// --prod measures the built bundle the realtime server serves (bun run build first).
const prod = process.argv.includes("--prod");
const base = prod ? "http://localhost:3101/?perf&" : "http://localhost:3100/?";
const scenarios = breakdown
  ? [
      { name: "loft, everything", query: "&quality=high" },
      { name: "no post-processing", query: "&fx=-post" },
      { name: "no bloom", query: "&fx=-bloom" },
      { name: "no point lights", query: "&fx=-points" },
      { name: "no soft shadows", query: "&fx=-soft" },
      { name: "no contact shadows", query: "&fx=-contact" },
      { name: "no shadows at all", query: "&fx=-shadows" },
      { name: "no antialiasing", query: "&fx=-aa" },
      { name: "bare (all off)", query: "&fx=-post,-shadows,-contact,-aa,-points" },
    ]
  : [
      { name: "loft, high", query: "&quality=high" },
      { name: "loft, balanced", query: "&quality=balanced" },
      { name: "loft +50, high", query: "&quality=high&bots=50" },
      { name: "loft +50, balanced", query: "&quality=balanced&bots=50" },
      { name: "atelier, balanced", query: "&quality=balanced&office=atelier&seats=16&seed=3" },
      { name: "atelier +50, balanced", query: "&quality=balanced&office=atelier&seats=16&seed=3&bots=50" },
    ];

// Uncapped (default) shows GPU headroom; its p95 includes command-buffer back-pressure
// stalls from submitting faster than the GPU drains. --vsync measures what people see.
const vsync = process.argv.includes("--vsync");
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-gpu-blocklist", "--enable-gpu", ...(vsync ? [] : ["--disable-gpu-vsync", "--disable-frame-rate-limit"])],
  // Playwright adds --enable-unsafe-swiftshader by default; keep the real GPU.
  ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
});
const results = [];
for (const scenario of scenarios) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  // ?art: no server connection (its welcome would reset the office), same render pipeline.
  await page.goto(`${base}art&character=chus${scenario.query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__WORKBITS_READY__ === true, { timeout: 60000 });
  await page.waitForTimeout(4000); // shaders compiled, avatars loaded
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  const sample = await page.evaluate(async (ms) => {
    const intervals = [];
    let last = performance.now();
    const end = last + ms;
    await new Promise((resolve) => {
      const tick = (now) => {
        intervals.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return { intervals, perf: window.__WORKBITS_PERF__?.() };
  }, seconds * 1000);
  const sorted = [...sample.intervals].sort((a, b) => a - b);
  const mean = sample.intervals.reduce((sum, value) => sum + value, 0) / sample.intervals.length;
  const result = {
    scenario: scenario.name,
    fps: Math.round(1000 / mean),
    p95ms: Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(1)),
    worstMs: Number(sorted[sorted.length - 1].toFixed(1)),
    drawCalls: sample.perf?.calls,
    triangles: sample.perf?.triangles,
    renderer,
  };
  results.push(result);
  console.log(`${result.scenario.padEnd(22)} ${String(result.fps).padStart(4)} fps   p95 ${String(result.p95ms).padStart(5)} ms   calls ${result.drawCalls}   tris ${result.triangles}`);
  await page.close();
}
await mkdir("artifacts/perf", { recursive: true });
const out = `artifacts/perf/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
await writeFile(out, JSON.stringify({ seconds, viewport: "1920x1080", build: prod ? "production" : "dev", vsync, results }, null, 2));
console.log(`renderer: ${results[0]?.renderer}\n${out}`);
process.exit(0);
