import { create } from "zustand";
import type { DeskPlacement, OfficeLayout } from "@workbits/shared";

export type { DeskPlacement, OfficeLayout };

export { BENCH_DESK, BENCH_DESKS, BENCH_PODS } from "@workbits/shared";
import { BENCH_DESKS } from "@workbits/shared";

export const defaultLayout: OfficeLayout = {
  id: "default",
  name: "Studio pods",
  note: "8 desks · two 2×2 pods · cream rug",
  rug: "cream",
  desks: BENCH_DESKS,
};

type OfficeLayoutState = {
  layout: OfficeLayout;
  applyLayout: (layout: OfficeLayout) => void;
  resetLayout: () => void;
};

function load(): OfficeLayout {
  try {
    const raw = localStorage.getItem("workbits.office");
    if (!raw) return defaultLayout;
    const parsed = JSON.parse(raw) as OfficeLayout;
    return parsed?.desks?.length ? parsed : defaultLayout;
  } catch {
    return defaultLayout;
  }
}

export const useOfficeLayout = create<OfficeLayoutState>((set) => ({
  layout: typeof window !== "undefined" ? load() : defaultLayout,
  applyLayout: (layout) => {
    try {
      localStorage.setItem("workbits.office", JSON.stringify(layout));
    } catch {
      // best effort
    }
    set({ layout });
  },
  resetLayout: () => {
    try {
      localStorage.removeItem("workbits.office");
    } catch {
      // best effort
    }
    set({ layout: defaultLayout });
  },
}));

export function chairFor(desk: DeskPlacement) {
  return {
    x: desk.x,
    z: desk.z + (desk.rotation === 0 ? 0.95 : -0.95),
    rotation: desk.rotation === 0 ? Math.PI : 0,
  };
}
