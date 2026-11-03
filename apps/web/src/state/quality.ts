import { create } from "zustand";

/**
 * Render quality (ADR-015 perf): "high" keeps soft shadows, real lamp lights
 * and bloom; "balanced" drops them, which is what holds 60 fps at 1080p on
 * integrated graphics (artifacts/perf). The scene starts high and steps down
 * when a PerformanceMonitor sees frames sag; the choice is remembered.
 * `?quality=high|balanced` forces a tier.
 */
export type Quality = "high" | "balanced";

const KEY = "workbits.quality";

function initial(): Quality {
  if (typeof window === "undefined") return "high";
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "high" || forced === "balanced") return forced;
  try {
    return localStorage.getItem(KEY) === "balanced" ? "balanced" : "high";
  } catch {
    return "high";
  }
}

export const forcedQuality =
  typeof window !== "undefined" && ["high", "balanced"].includes(new URLSearchParams(window.location.search).get("quality") ?? "");

export const useQuality = create<{ quality: Quality; setQuality: (quality: Quality) => void }>((set) => ({
  quality: initial(),
  setQuality: (quality) => {
    try {
      localStorage.setItem(KEY, quality);
    } catch {
      // per-viewer convenience only
    }
    set({ quality });
  },
}));
