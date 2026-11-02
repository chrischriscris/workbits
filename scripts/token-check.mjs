import { Client } from "colyseus.js";

const base = "http://127.0.0.1:3101";
let failures = 0;

function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const unauth = await fetch(`${base}/livekit/token?identity=ghost&room=office:workbits-loft:meeting`);
check("token without an office session is rejected", unauth.status === 403, `status ${unauth.status}`);

const client = new Client("ws://127.0.0.1:3101");
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
  `${base}/livekit/token?identity=${room.sessionId}&key=${voiceKey}&room=office:workbits-loft:meeting`,
);
const floorBody = await floor.json();
check(
  "client-requested room cannot override the floor zone",
  floorBody.room === "office:workbits-loft",
  `granted ${floorBody.room}`,
);

room.send("move", { x: 7, z: -4, rotation: 0, moving: false });
await new Promise((resolve) => setTimeout(resolve, 250));

const meeting = await fetch(
  `${base}/livekit/token?identity=${room.sessionId}&key=${voiceKey}&room=office:workbits-loft`,
);
const meetingBody = await meeting.json();
check(
  "meeting-room zone gets the private room",
  meetingBody.room === "office:workbits-loft:meeting",
  `granted ${meetingBody.room}`,
);

await room.leave();
process.exit(failures === 0 ? 0 : 1);
