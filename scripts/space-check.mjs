// Office templates on the server (ADR-015): switching the plan reaches everyone,
// new joins get it, and a template's private room has its own voice. Browserless.
import { Client } from "colyseus.js";
import { buildOffice, compileSpace } from "../packages/shared/src/space/index.ts";
import { API, VOICE_ROOM, WS } from "./lib/lane.mjs";
import { walkBot } from "./lib/walk.mjs";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const office = { template: "atelier", headcount: 12, seed: 3 };
const loftOffice = { template: "loft", headcount: 8, seed: 1 };

async function join(characterId) {
  const client = new Client(WS);
  const room = await client.joinOrCreate("office", { characterId, name: `${characterId} (space bot)` });
  const seen = { space: [] };
  room.onMessage("*", () => {});
  room.onMessage("space", (message) => seen.space.push(message));
  const welcome = await new Promise((resolve) => {
    room.onMessage("welcome", resolve);
    room.send("hello");
  });
  return { room, welcome, seen };
}

const a = await join("jules");
const b = await join("fern");
try {
  a.room.send("space", { office });
  await sleep(500);
  check("the other client hears the new office", b.seen.space.some((m) => m.template === "atelier" && m.headcount === 12), JSON.stringify(b.seen.space));

  const c = await join("arlo");
  check("a fresh join is told the current office", c.welcome.office?.template === "atelier", JSON.stringify(c.welcome.office));
  await c.room.leave();

  // Walk into Atelier's private Huddle Room on the server's version of the plan.
  const doc = buildOffice(office);
  const space = compileSpace(doc);
  const huddle = doc.rooms.find((room) => room.id === "huddle");
  const selfB = b.welcome.players.find((player) => player.id === b.room.sessionId);
  // The switch may have moved B to open floor; ask the server where B is now.
  await sleep(200);
  const startSeen = await new Promise((resolve) => {
    b.room.onMessage("welcome", resolve);
    b.room.send("hello");
  });
  const start = startSeen.players.find((player) => player.id === b.room.sessionId) ?? selfB;
  const end = await walkBot(b.room, { x: start.x, z: start.z }, huddle.anchor, { space, stepMs: 70 });
  check("found a path into the huddle room", Boolean(end));
  await sleep(500);
  const token = await fetch(`${API}/livekit/token?identity=${b.room.sessionId}&key=${b.welcome.voiceKey}`);
  const body = token.ok ? await token.json() : {};
  check("the huddle room has its own voice", body.room === `${VOICE_ROOM}:huddle`, `room ${body.room ?? token.status}`);
} finally {
  // The dev server is shared with the other checks: always put the loft back.
  await sleep(1100);
  a.room.send("space", { office: loftOffice });
  await sleep(400);
  await a.room.leave();
  await b.room.leave();
}
console.log(failures === 0 ? "SPACE CHECK: PASS" : `SPACE CHECK: FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
