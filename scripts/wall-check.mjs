// Server-side movement validation (ADR-015): a bot tries to teleport and to walk
// through the meeting-room glass, then walks in through the door. Browserless.
import { Client } from "colyseus.js";
import { defaultLoft } from "../packages/shared/src/space/index.ts";
import { API, MEETING_ROOM, WS } from "./lib/lane.mjs";
import { loft } from "./lib/walk.mjs";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


const client = new Client(WS);
const room = await client.joinOrCreate("office", { characterId: "jules", name: "Wall bot" });
const corrections = [];
room.onMessage("*", () => {});
room.onMessage("correct", (position) => corrections.push(position));
const welcome = await new Promise((resolve) => {
  room.onMessage("welcome", resolve);
  room.send("hello");
});
const self = welcome.players.find((player) => player.id === room.sessionId);
let here = { x: self.x, z: self.z };
check("spawn is walkable", loft.walkable(here.x, here.z), JSON.stringify(here));

const send = (to) => room.send("move", { x: to.x, z: to.z, rotation: 0, moving: true });
async function expectCorrection(label, to) {
  const before = corrections.length;
  await sleep(300);
  send(to);
  await sleep(400);
  check(label, corrections.length > before, `sent ${JSON.stringify(to)}`);
}
async function walk(to) {
  const path = loft.findPath(here, to);
  if (!path) return false;
  for (let i = 1; i < path.length; i += 1) {
    const from = path[i - 1];
    const leg = path[i];
    const length = Math.hypot(leg.x - from.x, leg.z - from.z);
    const steps = Math.max(1, Math.ceil(length / 0.18));
    for (let s = 1; s <= steps; s += 1) {
      here = { x: from.x + ((leg.x - from.x) * s) / steps, z: from.z + ((leg.z - from.z) * s) / steps };
      send(here);
      await sleep(75);
    }
  }
  return true;
}

// 1. Teleport straight into the meeting room.
await expectCorrection("teleporting across the office is rejected", { x: -5.5, z: -1.45 });

// 2. Walk up to the meeting room's side glass (x = -2.2) from the kitchen corridor,
// then step straight through it into the walkway inside the room.
let outside;
let inside;
for (let z = -4.0; z < -1.2 && !outside; z += 0.1) {
  const from = { x: -1.85, z };
  const across = { x: -2.6, z };
  if (loft.walkable(from.x, from.z) && loft.walkable(across.x, across.z) && loft.findPath(here, from)) {
    outside = from;
    inside = across;
  }
}
check("found reachable spots either side of the glass", Boolean(outside), JSON.stringify({ outside, inside }));
if (!outside) process.exit(1);
check("walked up to the glass", await walk(outside));
await expectCorrection("stepping through the glass is rejected", inside);

// 3. Walk in through the door; the server should then put us in the meeting room.
const correctionsBefore = corrections.length;
check("walked in through the door", await walk(defaultLoft.rooms.find((r) => r.id === "meeting").anchor));
await sleep(600);
check("no corrections on a legitimate walk", corrections.length === correctionsBefore, `${corrections.length - correctionsBefore} corrections`);
const token = await fetch(`${API}/livekit/token?identity=${room.sessionId}&key=${welcome.voiceKey}`);
const body = token.ok ? await token.json() : {};
check("the server places us in the meeting room's voice", body.room === MEETING_ROOM, `room ${body.room ?? token.status}`);

await room.leave();
console.log(failures === 0 ? "WALL CHECK: PASS" : `WALL CHECK: FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
