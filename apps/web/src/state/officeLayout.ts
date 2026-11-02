import { create } from "zustand";
import type { DeskPlacement, OfficeLayout } from "@workbits/shared";

export type { DeskPlacement, OfficeLayout };

/**
 * Default engineering area: two joined 2x2 pods offset on the diagonal, like
 * the reference. Kept here so the rendered benches, the persisted default
 * layout, and the seat placements cannot drift.
 */
export const BENCH_PODS = [
  { x: -0.8, z: 0.55 },
  { x: 2.6, z: 3.7 },
];
export const BENCH_DESK = { width: 1.8, depth: 1.0 };
export const BENCH_DESKS: DeskPlacement[] = BENCH_PODS.flatMap((pod, index) => [
  { id: `p${index}d1`, x: pod.x - BENCH_DESK.width / 2, z: pod.z - BENCH_DESK.depth / 2, rotation: Math.PI, variant: 0 },
  { id: `p${index}d2`, x: pod.x + BENCH_DESK.width / 2, z: pod.z - BENCH_DESK.depth / 2, rotation: Math.PI, variant: 1 },
  { id: `p${index}d3`, x: pod.x - BENCH_DESK.width / 2, z: pod.z + BENCH_DESK.depth / 2, rotation: 0, variant: 2 },
  { id: `p${index}d4`, x: pod.x + BENCH_DESK.width / 2, z: pod.z + BENCH_DESK.depth / 2, rotation: 0, variant: 3 },
]);

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
