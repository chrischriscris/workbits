import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client, Room } from "@colyseus/core";
import { zoneAt, type AvatarConfig, type OfficeLayout } from "@workbits/shared";
import { presence } from "../presence";

type PlayerData = {
  id: string;
  characterId: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  moving: boolean;
  status: string;
  zone: string;
  avatar?: AvatarConfig;
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
  chus: { x: -5.4, z: 5.9 },
  jules: { x: 3.0, z: -4.4 },
  mira: { x: 0.15, z: 4.75 },
  felix: { x: 2.65, z: 1.65 },
  fern: { x: 0.15, z: 1.65 },
  arlo: { x: -5.5, z: 4.55 },
  theo: { x: 8.75, z: 4.05 },
  clawd: { x: 4.1, z: -4.15 },
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
  to?: string;
};

type StoredMessage = {
  id: string;
  authorId: string;
  authorName: string;
  channel: string;
  body: string;
  time: string;
  zone?: string;
  to?: string;
};

const MAX_DESKS = 8;
const MAX_HISTORY = 600;

function text(value: unknown, max = 40): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function part(value: unknown): { style: string; color: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const style = text(record.style, 32);
  const color = text(record.color, 32);
  return style && color ? { style, color } : undefined;
}

function sanitizeAvatar(value: unknown): AvatarConfig | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (JSON.stringify(value).length > 6000) return undefined;
  const record = value as Record<string, unknown>;
  const species = ["human", "frog", "crab"].includes(String(record.species))
    ? (record.species as AvatarConfig["species"])
    : "human";
  const skin = text(record.skin, 32);
  const outfitRecord =
    record.outfit && typeof record.outfit === "object"
      ? (record.outfit as Record<string, unknown>)
      : null;
  if (!skin || !outfitRecord) return undefined;

  const outfit = {
    top: text(outfitRecord.top, 32) ?? "crew-tee",
    topColor: text(outfitRecord.topColor, 32) ?? "#5c6b7a",
    bottom: text(outfitRecord.bottom, 32) ?? "jeans",
    bottomColor: text(outfitRecord.bottomColor, 32) ?? "#2e3440",
    shoes: text(outfitRecord.shoes, 32) ?? "sneakers",
    shoesColor: text(outfitRecord.shoesColor, 32) ?? "#f5f5f5",
  };

  const paletteRecord =
    record.palette && typeof record.palette === "object"
      ? (record.palette as Record<string, unknown>)
      : null;

  const accessories = Array.isArray(record.accessories)
    ? record.accessories
        .filter((item): item is string => typeof item === "string")
        .slice(0, 12)
        .map((item) => item.slice(0, 32))
    : [];

  return {
    species,
    body: text(record.body, 32) ?? "male-average",
    skin,
    ...(text(record.belly, 32) ? { belly: text(record.belly, 32) } : {}),
    ...(part(record.hair) ? { hair: part(record.hair) } : {}),
    ...(part(record.facialHair) ? { facialHair: part(record.facialHair) } : {}),
    ...(part(record.eyes) ? { eyes: part(record.eyes) } : {}),
    ...(part(record.glasses) ? { glasses: part(record.glasses) } : {}),
    ...(part(record.headwear) ? { headwear: part(record.headwear) } : {}),
    ...(part(record.wings) ? { wings: part(record.wings) } : {}),
    outfit,
    accessories,
    palette: {
      primary: text(paletteRecord?.primary, 32) ?? outfit.topColor,
      secondary: text(paletteRecord?.secondary, 32) ?? "#d9b98c",
      accent: text(paletteRecord?.accent, 32) ?? "#6c8cff",
    },
  };
}

function finite(value: unknown, min: number, max: number): number | undefined {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.max(min, Math.min(max, number));
}

function sanitizeLayout(value: unknown): OfficeLayout | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (JSON.stringify(value).length > 8000) return undefined;
  const record = value as Record<string, unknown>;
  const rugInput = text(record.rug, 20);
  const rug: OfficeLayout["rug"] = ["cream", "sage", "terracotta"].includes(rugInput ?? "")
    ? (rugInput as OfficeLayout["rug"])
    : "cream";
  if (!Array.isArray(record.desks)) return undefined;

  const desks = record.desks
    .slice(0, MAX_DESKS)
    .map((item, index) => {
      if (!item || typeof item !== "object") return undefined;
      const desk = item as Record<string, unknown>;
      const x = finite(desk.x, -3.4, 3.4);
      const z = finite(desk.z, 0.4, 5.9);
      if (x === undefined || z === undefined) return undefined;
      const rotationNumber = Number(desk.rotation);
      const rotation =
        Number.isFinite(rotationNumber) && Math.abs(rotationNumber) > Math.PI / 2 ? Math.PI : 0;
      const variantNumber = Number(desk.variant);
      return {
        id: text(desk.id, 24) ?? `desk-${index}`,
        x,
        z,
        rotation,
        variant: Number.isFinite(variantNumber)
          ? Math.max(0, Math.min(3, Math.floor(variantNumber)))
          : 0,
      };
    })
    .filter((desk): desk is OfficeLayout["desks"][number] => Boolean(desk));

  if (desks.length === 0) return undefined;

  return {
    id: text(record.id, 32) ?? "custom",
    name: text(record.name, 60) ?? "Custom layout",
    note: text(record.note, 120) ?? `${desks.length} desks`,
    rug,
    desks,
  };
}

export class OfficeRoom extends Room {
  override maxClients = 32;
  private players = new Map<string, PlayerData>();
  private lastMove = new Map<string, number>();
  private lastMeta = new Map<string, number>();
  private history: StoredMessage[] = [];
  private layout?: OfficeLayout;
  private historyFile = join(process.cwd(), "data", "chat.jsonl");

  override async onCreate() {
    await this.loadHistory();

    this.onMessage("hello", (client) => {
      const player = this.players.get(client.sessionId);
      const zone = player ? zoneAt(player.x, player.z) : "lounge";
      const visibleHistory = this.history.filter((message) => {
        if (message.channel === "dm") {
          return message.authorId === player?.characterId || message.to === player?.characterId;
        }
        if (message.channel === "room") return message.zone === zone;
        return true;
      });
      client.send("welcome", {
        selfId: client.sessionId,
        voiceKey: presence.get(client.sessionId)?.voiceKey,
        players: [...this.players.values()],
        messages: visibleHistory.slice(-MAX_HISTORY),
        ...(this.layout ? { layout: this.layout } : {}),
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
      player.zone = zoneAt(player.x, player.z);
      const entry = presence.get(client.sessionId);
      if (entry) {
        entry.x = player.x;
        entry.z = player.z;
        entry.zone = player.zone;
      }

      this.broadcast("player_moved", player, { except: client });
    });

    this.onMessage("status", (client, message: { status?: string }) => {
      const player = this.players.get(client.sessionId);
      if (!player) return;
      const allowed = new Set(["available", "focus", "away", "meeting"]);
      const status = String(message?.status ?? "");
      if (!allowed.has(status)) return;
      player.status = status;
      this.broadcast("player_updated", player);
    });

    this.onMessage("avatar", (client, message: { avatar?: unknown }) => {
      const player = this.players.get(client.sessionId);
      if (!player) return;
      const now = Date.now();
      if (now - (this.lastMeta.get(client.sessionId) ?? 0) < 400) return;
      this.lastMeta.set(client.sessionId, now);

      const avatar = sanitizeAvatar(message?.avatar);
      if (avatar) player.avatar = avatar;
      else delete player.avatar;
      this.broadcast("player_updated", player);
    });

    this.onMessage("layout", (client, message: { layout?: unknown }) => {
      const player = this.players.get(client.sessionId);
      if (!player) return;
      const now = Date.now();
      if (now - (this.lastMeta.get(`layout:${client.sessionId}`) ?? 0) < 300) return;
      this.lastMeta.set(`layout:${client.sessionId}`, now);

      const layout = sanitizeLayout(message?.layout);
      if (!layout) return;
      this.layout = layout;
      this.broadcast("layout", layout);
    });

    this.onMessage("emote", (client, message: { kind?: string }) => {
      const player = this.players.get(client.sessionId);
      if (!player) return;
      const allowed = new Set(["wave", "clap", "heart"]);
      const kind = String(message?.kind ?? "");
      if (!allowed.has(kind)) return;
      this.broadcast("emote", { id: player.id, characterId: player.characterId, kind });
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

      const to = channel === "dm" ? String(message.to ?? "") : undefined;
      if (channel === "dm" && !to) return;
      const zone = channel === "room" ? zoneAt(player.x, player.z) : undefined;

      const stored: StoredMessage = {
        id,
        authorId: player.characterId,
        authorName: player.name,
        channel,
        body,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        ...(zone ? { zone } : {}),
        ...(to ? { to } : {}),
      };
      this.history.push(stored);
      if (this.history.length > MAX_HISTORY) this.history.shift();
      void appendFile(this.historyFile, `${JSON.stringify(stored)}\n`).catch((error) => {
        console.warn("Could not persist chat message", error);
      });

      if (to) {
        for (const client of this.clients) {
          const participant = this.players.get(client.sessionId);
          if (!participant) continue;
          if (participant.characterId === player.characterId || participant.characterId === to) {
            client.send("chat", stored);
          }
        }
        return;
      }

      if (channel === "room") {
        for (const client of this.clients) {
          const participant = this.players.get(client.sessionId);
          if (participant && zoneAt(participant.x, participant.z) === zone) {
            client.send("chat", stored);
          }
        }
        return;
      }

      this.broadcast("chat", stored);
    });
  }

  private async loadHistory() {
    try {
      await mkdir(join(process.cwd(), "data"), { recursive: true });
      const raw = await readFile(this.historyFile, "utf8");
      this.history = raw
        .split("\n")
        .filter(Boolean)
        .slice(-MAX_HISTORY)
        .map((line) => JSON.parse(line) as StoredMessage)
        .filter((message) => message && message.body);
    } catch {
      this.history = [];
    }
  }

  override onJoin(client: Client, options: Record<string, unknown>) {
    const requested = typeof options.characterId === "string" ? options.characterId : "chus";
    const characterId = characterIds.has(requested) ? requested : "chus";
    const spawn = spawns[characterId] ?? spawns.chus!;
    const restoreX = finite(options.x, -12.2, 12.2);
    const restoreZ = finite(options.z, -8.5, 8.5);
    const spawnX = restoreX ?? spawn.x;
    const spawnZ = restoreZ ?? spawn.z;
    const avatar = sanitizeAvatar(options.avatar);
    const requestedStatus = String(options.status ?? "");
    const status = ["available", "focus", "away", "meeting"].includes(requestedStatus)
      ? requestedStatus
      : "available";

    const player: PlayerData = {
      id: client.sessionId,
      characterId,
      name:
        typeof options.name === "string" && options.name.trim()
          ? options.name.trim().slice(0, 40)
          : characterId,
      x: spawnX,
      z: spawnZ,
      rotation: 0,
      moving: false,
      status,
      zone: zoneAt(spawnX, spawnZ),
      ...(avatar ? { avatar } : {}),
    };

    this.players.set(client.sessionId, player);
    this.lastMove.set(client.sessionId, 0);
    presence.set(client.sessionId, {
      sessionId: client.sessionId,
      characterId,
      name: player.name,
      x: player.x,
      z: player.z,
      zone: player.zone,
      voiceKey: randomUUID(),
    });
    this.broadcast("player_added", player, { except: client });
  }

  override onLeave(client: Client) {
    this.players.delete(client.sessionId);
    this.lastMove.delete(client.sessionId);
    this.lastMeta.delete(client.sessionId);
    presence.delete(client.sessionId);
    this.broadcast("player_left", { id: client.sessionId });
  }
}
