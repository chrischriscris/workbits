import { create } from "zustand";

export type Vec2 = { x: number; z: number };
export type ChatTab = "global" | "office" | "room" | "dm";

type AppState = {
  target: Vec2 | null;
  setTarget: (target: Vec2 | null) => void;
  selectedId: string | null;
  select: (id: string | null) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatTab: ChatTab;
  setChatTab: (tab: ChatTab) => void;
  muted: boolean;
  toggleMuted: () => void;
  deafened: boolean;
  toggleDeafened: () => void;
  cameraOn: boolean;
  toggleCamera: () => void;
  screenOn: boolean;
  toggleScreen: () => void;
  rosterOpen: boolean;
  toggleRoster: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
  selectedId: null,
  select: (selectedId) => set({ selectedId }),
  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),
  chatTab: "office",
  setChatTab: (chatTab) => set({ chatTab }),
  muted: true,
  toggleMuted: () => set((state) => ({ muted: !state.muted })),
  deafened: false,
  toggleDeafened: () => set((state) => ({ deafened: !state.deafened })),
  cameraOn: false,
  toggleCamera: () => set((state) => ({ cameraOn: !state.cameraOn })),
  screenOn: false,
  toggleScreen: () => set((state) => ({ screenOn: !state.screenOn })),
  rosterOpen: false,
  toggleRoster: () => set((state) => ({ rosterOpen: !state.rosterOpen })),
}));
