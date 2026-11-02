import { Client, Room } from "@colyseus/core";

type PlayerData = {
  id: string;
  characterId: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  moving: boolean;
  status: string;
};

const characterIds = new Set([
  "jules",
  "mira",
  "felix",
  "fern",
  "arlo",
  "theo",
  "chus",
  "clawd",
]);

const spawns: Record<string, { x: number; z: number }> = {
  chus: { x: -3.5, z: 6.5 },
  jules: { x: -5.9, z: 3.8 },
  mira: { x: -4.5, z: 1.2 },
  felix: { x: 2.5, z: 3.3 },
  fern: { x: -2.4, z: 3.0 },
  arlo: { x: -2.6, z: 5.2 },
  theo: { x: 9.2, z: 3.95 },
  clawd: { x: -5.7, z: 2.6 },
};

type MoveMessage = {
  x: number;
  z: number;
  rotation?: number;
  moving?: boolean;
};

type ChatMessage = {
  id?: string;
  channel?: string;
  body?: string;
};

export class OfficeRoom extends Room {
  override maxClients = 32;
  private players = new Map<string, PlayerData>();
  private lastMove = new Map<string, number>();

  override onCreate() {
    this.onMessage("hello", (client) => {
      client.send("welcome", {
        selfId: client.sessionId,
        players: [...this.players.values()],
      });
    });

    this.onMessage("move", (client, message: MoveMessage) => {
      const player = this.players.get(client.sessionId);
      if (!player) return;

      const now = Date.now();
      const last = this.lastMove.get(client.sessionId) ?? 0;
      if (now - last < 30) return;
      this.lastMove.set(client.sessionId, now);

      const x = Number(message?.x);
      const z = Number(message?.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;

      player.x = Math.max(-12.2, Math.min(12.2, x));
      player.z = Math.max(-8.5, Math.min(8.5, z));
      player.rotation = Number.isFinite(Number(message.rotation)) ? Number(message.rotation) : 0;
      player.moving = Boolean(message.moving);

      this.broadcast("player_moved", player, { except: client });
    });

    this.onMessage("chat", (client, message: ChatMessage) => {
      const player = this.players.get(client.sessionId);
      if (!player) return;

      const body = String(message?.body ?? "").trim().slice(0, 2000);
      if (!body) return;

      const channel = ["global", "office", "room", "dm"].includes(String(message.channel))
        ? String(message.channel)
        : "office";
      const id =
        typeof message.id === "string" && message.id.length > 0
          ? message.id.slice(0, 120)
          : `${client.sessionId}-${Date.now()}`;

      this.broadcast("chat", {
        id,
        authorId: player.characterId,
        authorName: player.name,
        channel,
        body,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      });
    });
  }

  override onJoin(client: Client, options: Record<string, unknown>) {
    const requested = typeof options.characterId === "string" ? options.characterId : "chus";
    const characterId = characterIds.has(requested) ? requested : "chus";
    const spawn = spawns[characterId] ?? spawns.chus!;

    const player: PlayerData = {
      id: client.sessionId,
      characterId,
      name:
        typeof options.name === "string" && options.name.trim()
          ? options.name.trim().slice(0, 40)
          : characterId,
      x: spawn.x,
      z: spawn.z,
      rotation: 0,
      moving: false,
      status: "available",
    };

    this.players.set(client.sessionId, player);
    this.lastMove.set(client.sessionId, 0);
    this.broadcast("player_added", player, { except: client });
  }

  override onLeave(client: Client) {
    this.players.delete(client.sessionId);
    this.lastMove.delete(client.sessionId);
    this.broadcast("player_left", { id: client.sessionId });
  }
}
