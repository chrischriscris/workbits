import { create } from "zustand";
import type { DeskPlacement, OfficeLayout } from "@workbits/shared";

export type { DeskPlacement, OfficeLayout };

export const defaultLayout: OfficeLayout = {
  id: "default",
  name: "Studio rows",
  note: "4 desks · two rows · cream rug",
  rug: "cream",
  desks: [
    { id: "d1", x: -1.2, z: 1.45, rotation: 0, variant: 0 },
    { id: "d2", x: 1.65, z: 1.45, rotation: 0, variant: 1 },
    { id: "d3", x: -1.2, z: 4.7, rotation: Math.PI, variant: 2 },
    { id: "d4", x: 1.65, z: 4.7, rotation: Math.PI, variant: 3 },
  ],
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
