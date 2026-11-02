import { Client } from "colyseus.js";

const client = new Client("ws://127.0.0.1:3101");
const room = await client.joinOrCreate("office", { characterId: "fern", name: "Persist Bot" });
room.onMessage("*", () => {});
room.send("hello");
room.send("chat", { channel: "office", body: "persist-check-message" });
await new Promise((resolve) => setTimeout(resolve, 500));
await room.leave();
process.exit(0);
