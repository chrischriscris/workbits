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
await new Promise((resolve) => setTimeout(resolve, 200));

const floor = await fetch(
  `${base}/livekit/token?identity=${room.sessionId}&room=office:workbits-loft:meeting`,
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
  `${base}/livekit/token?identity=${room.sessionId}&room=office:workbits-loft`,
);
const meetingBody = await meeting.json();
check(
  "meeting-room zone gets the private room",
  meetingBody.room === "office:workbits-loft:meeting",
  `granted ${meetingBody.room}`,
);

await room.leave();
process.exit(failures === 0 ? 0 : 1);
