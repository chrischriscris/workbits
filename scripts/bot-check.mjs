import { Client } from "colyseus.js";

const client = new Client("ws://127.0.0.1:3101");
const room = await client.joinOrCreate("office", { characterId: "chus", name: "Bot check" });
room.onMessage("*", () => {});

room.onMessage("welcome", (message) => {
  console.log("welcome", message);
});
room.onMessage("player_added", (player) => {
  console.log("player_added", player);
});
room.onMessage("player_moved", (player) => {
  console.log("player_moved", player.id, player.x, player.z);
});
room.onMessage("chat", (message) => {
  console.log("chat", message.authorName, message.body);
});

room.send("hello");
await new Promise((resolve) => setTimeout(resolve, 1500));
await room.leave();
process.exit(0);
