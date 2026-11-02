import { create } from "zustand";
import { Client, type Room } from "colyseus.js";
import { localCharacter, localCharacterId } from "../data/team";

export type RemotePlayer = {
  id: string;
  characterId: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  moving: boolean;
  status: string;
};

export type RealtimeMessage = {
  id: string;
  authorId: string;
  authorName: string;
  channel: string;
  body: string;
  time: string;
};

type RealtimeStatus = "offline" | "connecting" | "connected";

type RealtimeState = {
  status: RealtimeStatus;
  room: Room | null;
  sessionId: string | null;
  players: Record<string, RemotePlayer>;
  messages: RealtimeMessage[];
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMove: (data: { x: number; z: number; rotation: number; moving: boolean }) => void;
  sendChat: (channel: string, body: string) => void;
};

let client: Client | null = null;

function realtimeUrl() {
  const explicit = import.meta.env.VITE_REALTIME_URL as string | undefined;
  if (explicit) return explicit;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:3101`;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  status: "offline",
  room: null,
  sessionId: null,
  players: {},
  messages: [],

  connect: async () => {
    if (get().status !== "offline") return;
    set({ status: "connecting" });

    try {
      client ??= new Client(realtimeUrl());
      const room = await client.joinOrCreate("office", {
        characterId: localCharacterId,
        name: localCharacter.displayName,
      });

      set({ status: "connected", room, sessionId: room.sessionId });

      room.onMessage("welcome", (message: { players: RemotePlayer[] }) => {
        const players = Object.fromEntries(message.players.map((player) => [player.id, player]));
        set({ players });
      });
      room.onMessage("player_added", (player: RemotePlayer) => {
        set((state) => ({ players: { ...state.players, [player.id]: player } }));
      });
      room.onMessage("player_moved", (player: RemotePlayer) => {
        set((state) => ({ players: { ...state.players, [player.id]: player } }));
      });
      room.onMessage("player_left", ({ id }: { id: string }) => {
        set((state) => {
          const next = { ...state.players };
          delete next[id];
          return { players: next };
        });
      });
      room.onMessage("chat", (message: RealtimeMessage) => {
        set((state) => {
          if (state.messages.some((item) => item.id === message.id)) return state;
          return { messages: [...state.messages, message] };
        });
      });

      room.onLeave(() => {
        set({ status: "offline", room: null, sessionId: null, players: {} });
      });
      room.onError(() => {
        set({ status: "offline", room: null, sessionId: null, players: {} });
      });

      room.send("hello");
    } catch (error) {
      console.warn("Workbits realtime connection failed", error);
      set({ status: "offline", room: null });
    }
  },

  disconnect: () => {
    get().room?.leave();
    set({ status: "offline", room: null, sessionId: null, players: {} });
  },

  sendMove: (data) => {
    get().room?.send("move", data);
  },

  sendChat: (channel, body) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const id = `${localCharacterId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const message: RealtimeMessage = {
      id,
      authorId: localCharacterId,
      authorName: localCharacter.displayName,
      channel,
      body: trimmed,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    const room = get().room;
    if (room) {
      room.send("chat", { id, channel, body: trimmed });
    }
  },
}));
