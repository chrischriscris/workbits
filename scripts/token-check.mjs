import { Client } from "colyseus.js";
import { API, MEETING_ROOM, VOICE_ROOM, WS } from "./lib/lane.mjs";
import { walkBot } from "./lib/walk.mjs";

const base = API;
let failures = 0;

function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const unauth = await fetch(`${base}/livekit/token?identity=ghost&room=${MEETING_ROOM}`);
check("token without an office session is rejected", unauth.status === 403, `status ${unauth.status}`);

const client = new Client(WS);
const room = await client.joinOrCreate("office", { characterId: "jules", name: "Token bot" });
room.onMessage("*", () => {});
const welcome = await new Promise((resolve) => {
  room.onMessage("welcome", resolve);
  room.send("hello");
});
const voiceKey = welcome.voiceKey;
check("the server issues a private voice key", typeof voiceKey === "string" && voiceKey.length > 10);

const noKey = await fetch(`${base}/livekit/token?identity=${room.sessionId}`);
check("token without the voice key is rejected", noKey.status === 403, `status ${noKey.status}`);

const wrongKey = await fetch(
  `${base}/livekit/token?identity=${room.sessionId}&key=wrong`,
);
check("token with a wrong voice key is rejected", wrongKey.status === 403, `status ${wrongKey.status}`);

const floor = await fetch(
  `${base}/livekit/token?identity=${room.sessionId}&key=${voiceKey}&room=${MEETING_ROOM}`,
);
const floorBody = await floor.json();
check(
  "client-requested room cannot override the floor zone",
  floorBody.room === VOICE_ROOM,
  `granted ${floorBody.room}`,
);

// Walk in through the door; the server rejects teleports (ADR-015).
const self = welcome.players.find((player) => player.id === room.sessionId);
await walkBot(room, { x: self.x, z: self.z }, { x: -4.8, z: -3.2 });
await new Promise((resolve) => setTimeout(resolve, 250));

const meeting = await fetch(
  `${base}/livekit/token?identity=${room.sessionId}&key=${voiceKey}&room=${VOICE_ROOM}`,
);
const meetingBody = await meeting.json();
check(
  "meeting-room zone gets the private room",
  meetingBody.room === MEETING_ROOM,
  `granted ${meetingBody.room}`,
);

await room.leave();
process.exit(failures === 0 ? 0 : 1);
