import { create } from "zustand";
import { Client, type Room } from "colyseus.js";
import { zoneAt, type AvatarConfig, type OfficeLayout } from "@workbits/shared";
import { localCharacter, localCharacterId } from "../data/team";
import { realtimeUrl } from "../config";
import { useAvatarStore } from "../state/avatar";
import { useOfficeLayout } from "../state/officeLayout";

export type RemotePlayer = {
  id: string;
  characterId: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  moving: boolean;
  status: string;
  zone?: string;
  avatar?: AvatarConfig;
};

export type RealtimeMessage = {
  id: string;
  authorId: string;
  authorName: string;
  channel: string;
  body: string;
  time: string;
  zone?: string;
  to?: string;
};

type RealtimeStatus = "offline" | "connecting" | "connected";

type RealtimeState = {
  status: RealtimeStatus;
  room: Room | null;
  sessionId: string | null;
  players: Record<string, RemotePlayer>;
  messages: RealtimeMessage[];
  localPosition: { x: number; z: number };
  hasMoved: boolean;
  emotes: Record<string, { kind: string; until: number }>;
  localStatus: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  setLocalPosition: (position: { x: number; z: number }) => void;
  sendMove: (data: { x: number; z: number; rotation: number; moving: boolean }) => void;
  sendChat: (channel: string, body: string, to?: string) => void;
  sendEmote: (kind: string) => void;
  setStatus: (status: string) => void;
  setAvatar: (avatar: AvatarConfig | null) => void;
  sendLayout: (layout: OfficeLayout) => void;
};

let client: Client | null = null;
let reconnectTimer: number | null = null;
let reconnectAttempts = 0;
let manualDisconnect = false;

export const useRealtimeStore = create<RealtimeState>((set, get) => {
  const scheduleReconnect = () => {
    if (manualDisconnect || reconnectTimer !== null) return;
    const delay = Math.min(15000, 1000 * 2 ** reconnectAttempts);
    reconnectAttempts += 1;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      void get().connect();
    }, delay);
  };

  return {
  status: "offline",
  room: null,
  sessionId: null,
  players: {},
  messages: [],
  localPosition: { x: -3.5, z: 6.5 },
  hasMoved: false,
  emotes: {},
  localStatus: "available",

  connect: async () => {
    if (get().status !== "offline") return;
    manualDisconnect = false;
    set({ status: "connecting" });

    try {
      client ??= new Client(realtimeUrl());
      const room = await client.joinOrCreate("office", {
        characterId: localCharacterId,
        name: localCharacter.displayName,
        status: get().localStatus,
        avatar: useAvatarStore.getState().config ?? undefined,
        ...(get().hasMoved
          ? { x: get().localPosition.x, z: get().localPosition.z }
          : {}),
      });

      set({ status: "connected", room, sessionId: room.sessionId });

      room.onMessage(
        "welcome",
        (message: {
          selfId: string;
          players: RemotePlayer[];
          messages?: RealtimeMessage[];
          layout?: OfficeLayout;
        }) => {
          reconnectAttempts = 0;
          const players = Object.fromEntries(message.players.map((player) => [player.id, player]));
          const localStatus = message.players.find((player) => player.id === message.selfId)?.status ?? "available";
          if (message.layout) useOfficeLayout.getState().applyLayout(message.layout);
          set((state) => {
            const merged = [...state.messages];
            for (const item of message.messages ?? []) {
              if (!merged.some((existing) => existing.id === item.id)) merged.push(item);
            }
            return { players, messages: merged, localStatus };
          });
        },
      );
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
      room.onMessage("player_updated", (player: RemotePlayer) => {
        set((state) => ({ players: { ...state.players, [player.id]: player } }));
      });
      room.onMessage("emote", (event: { id: string; kind: string }) => {
        const until = Date.now() + 2200;
        set((state) => ({ emotes: { ...state.emotes, [event.id]: { kind: event.kind, until } } }));
        window.setTimeout(() => {
          set((state) => {
            if (state.emotes[event.id]?.until !== until) return state;
            const next = { ...state.emotes };
            delete next[event.id];
            return { emotes: next };
          });
        }, 2300);
      });
      room.onMessage("layout", (layout: OfficeLayout) => {
        useOfficeLayout.getState().applyLayout(layout);
      });
      room.onMessage("chat", (message: RealtimeMessage) => {
        set((state) => {
          if (state.messages.some((item) => item.id === message.id)) return state;
          return { messages: [...state.messages, message] };
        });
      });

      room.onLeave(() => {
        set({ status: "offline", room: null, sessionId: null, players: {} });
        scheduleReconnect();
      });
      room.onError(() => {
        set({ status: "offline", room: null, sessionId: null, players: {} });
        scheduleReconnect();
      });

      room.send("hello");
    } catch (error) {
      console.warn("Workbits realtime connection failed", error);
      set({ status: "offline", room: null });
      scheduleReconnect();
    }
  },

  disconnect: () => {
    manualDisconnect = true;
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    get().room?.leave();
    set({ status: "offline", room: null, sessionId: null, players: {} });
  },

  setLocalPosition: (localPosition) => set({ localPosition, hasMoved: true }),

  sendMove: (data) => {
    get().room?.send("move", data);
  },

  setStatus: (status) => {
    set({ localStatus: status });
    get().room?.send("status", { status });
  },

  setAvatar: (avatar) => {
    get().room?.send("avatar", { avatar });
  },

  sendLayout: (layout) => {
    get().room?.send("layout", { layout });
  },

  sendEmote: (kind) => {
    const room = get().room;
    if (!room) return;
    const identity = get().sessionId;
    if (identity) {
      const until = Date.now() + 2200;
      set((state) => ({ emotes: { ...state.emotes, [identity]: { kind, until } } }));
      window.setTimeout(() => {
        set((state) => {
          if (state.emotes[identity]?.until !== until) return state;
          const next = { ...state.emotes };
          delete next[identity];
          return { emotes: next };
        });
      }, 2300);
    }
    room.send("emote", { kind });
  },

  sendChat: (channel, body, to) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const id = `${localCharacterId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const position = get().localPosition;
    const message: RealtimeMessage = {
      id,
      authorId: localCharacterId,
      authorName: localCharacter.displayName,
      channel,
      body: trimmed,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      ...(channel === "room" ? { zone: zoneAt(position.x, position.z) } : {}),
      ...(to ? { to } : {}),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    const room = get().room;
    if (room) {
      room.send("chat", { id, channel, body: trimmed, ...(to ? { to } : {}) });
    }
  },
  };
});

if (import.meta.env.DEV && typeof window !== "undefined") {
  const debugWindow = window as unknown as {
    __WORKBITS_DEBUG__: () => {
      status: string;
      sessionId: string | null;
      players: RemotePlayer[];
      localZone: string;
      layout: OfficeLayout;
      avatar: AvatarConfig | null;
    };
    __WORKBITS_DROP__: () => void;
  };

  debugWindow.__WORKBITS_DROP__ = () => {
    useRealtimeStore.getState().room?.leave();
  };
  debugWindow.__WORKBITS_DEBUG__ = () => {
    const state = useRealtimeStore.getState();
    return {
      status: state.status,
      sessionId: state.sessionId,
      players: Object.values(state.players),
      localZone: zoneAt(state.localPosition.x, state.localPosition.z),
      layout: useOfficeLayout.getState().layout,
      avatar: useAvatarStore.getState().config,
    };
  };
}
