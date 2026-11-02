import { create } from "zustand";
import type { AvatarConfig } from "@workbits/shared";

type AvatarState = {
  config: AvatarConfig | null;
  setConfig: (config: AvatarConfig | null) => void;
};

function load(): AvatarConfig | null {
  try {
    const raw = localStorage.getItem("workbits.avatar");
    return raw ? (JSON.parse(raw) as AvatarConfig) : null;
  } catch {
    return null;
  }
}

export const useAvatarStore = create<AvatarState>((set) => ({
  config: typeof window !== "undefined" ? load() : null,
  setConfig: (config) => {
    try {
      if (config) localStorage.setItem("workbits.avatar", JSON.stringify(config));
      else localStorage.removeItem("workbits.avatar");
    } catch {
      // local storage is best-effort
    }
    set({ config });
  },
}));
