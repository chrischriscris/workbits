import { chromium } from "playwright";
import { Client } from "colyseus.js";

const botClient = new Client("ws://127.0.0.1:3101");
const bot = await botClient.joinOrCreate("office", { characterId: "fern", name: "Fern" });
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
  () => window.__WORKBITS_DEBUG__?.().players.length > 1,
  undefined,
  { timeout: 20000 },
);

await page.locator('button[aria-label="Ask Workbits assistant"]').click();
await page.waitForTimeout(400);
const greeting = await page.locator(".assistant-bubble").first().innerText();
console.log("greeting:", greeting.split("\n")[0]);

const answers = page.locator(
  ".assistant-row--assistant .assistant-bubble:not(.assistant-bubble--thinking)",
);

async function ask(trigger) {
  const before = await answers.count();
  await trigger();
  await page.waitForFunction(
    (count) =>
      document.querySelectorAll(
        ".assistant-row--assistant .assistant-bubble:not(.assistant-bubble--thinking)",
      ).length > count,
    before,
    { timeout: 15000 },
  );
  await page.waitForTimeout(150);
  return answers.last().innerText();
}

const presence = await ask(() =>
  page.getByRole("button", { name: "Where is everyone?" }).click(),
);
console.log("presence:", presence.replace(/\n/g, " | "));

const meeting = await ask(async () => {
  await page.locator('input[aria-label="Ask the Workbits assistant"]').fill("Who's in the meeting room?");
  await page.locator('input[aria-label="Ask the Workbits assistant"]').press("Enter");
});
console.log("meeting:", meeting.replace(/\n/g, " | "));

const fern = await ask(async () => {
  await page.locator('input[aria-label="Ask the Workbits assistant"]').fill("Where is Fern?");
  await page.locator('input[aria-label="Ask the Workbits assistant"]').press("Enter");
});
console.log("fern:", fern.replace(/\n/g, " | "));

const walkButton = page.locator(".assistant-action").last();
const walkLabel = await walkButton.innerText();
console.log("action:", walkLabel.replace(/\n/g, " "));
await page.screenshot({ path: "artifacts/shots/assistant.png", timeout: 120000 });

const ok =
  greeting.includes("Hi.") &&
  presence.includes("Connected now") &&
  presence.toLowerCase().includes("fern") &&
  meeting.toLowerCase().includes("meeting room") &&
  fern.toLowerCase().includes("engineering") &&
  walkLabel.toLowerCase().includes("walk to engineering");
console.log("ASSISTANT:", ok ? "PASS" : "FAIL");

await bot.leave();
await browser.close();
process.exit(ok ? 0 : 1);
