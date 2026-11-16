import type { Item } from "./types";

/** A solid footprint rectangle in the item's local space (centre + size), before rotation. */
export type Footprint = { cx: number; cz: number; w: number; d: number };

type Params = NonNullable<Item["params"]>;
const num = (params: Params | undefined, key: string, fallback: number) => {
  const value = params?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};
const square = (size: number): Footprint[] => [{ cx: 0, cz: 0, w: size, d: size }];

/**
 * What each catalog key blocks on the floor, unscaled. Keys missing here
 * (rugs, wall art, pendants, things sitting on other things) don't block.
 */
const footprints: Record<string, (params: Params | undefined) => Footprint[]> = {
  KitchenRun: (p) => [{ cx: 0, cz: 0, w: num(p, "length", 6.8) + 0.04, d: 0.66 }],
  Fridge: () => [{ cx: 0, cz: 0, w: 0.86, d: 0.7 }],
  TallCabinet: (p) => [{ cx: 0, cz: 0, w: num(p, "width", 0.9), d: 0.62 }],
  Plant: (p) => square(p?.kind === "tall" ? 0.5 : 0.42),
  Tree: () => square(0.66),
  MeetingTable: (p) => {
    const chairScale = num(p, "chairScale", 1);
    return [{ cx: 0, cz: 0, w: num(p, "length", 3.4) + 0.1, d: num(p, "width", 1.2) + 0.82 * chairScale }];
  },
  Credenza: (p) => [{ cx: 0, cz: 0, w: num(p, "length", 1.8), d: num(p, "depth", 0.45) }],
  Sectional: () => [
    { cx: 0, cz: 0, w: 2.7, d: 0.95 },
    { cx: 1.35 - 0.475, cz: 0.475 + 0.525, w: 0.95, d: 1.05 },
  ],
  CoffeeTable: (p) => square(num(p, "radius", 0.5) * 2),
  Pouf: () => square(0.8),
  Beanbag: () => square(1.15),
  SideTable: () => square(0.52),
  FloorLamp: () => square(0.36),
  Shelf: (p) => [{ cx: 0, cz: 0, w: num(p, "width", 1.2), d: num(p, "depth", 0.34) }],
  Planter: (p) => [{ cx: 0, cz: 0, w: num(p, "length", 3), d: num(p, "width", 0.55) }],
  Daybed: () => [{ cx: 0, cz: 0, w: 1.2, d: 2.15 }],
  SlatDivider: (p) => [{ cx: 0, cz: 0, w: num(p, "length", 1.6), d: 0.14 }],
  /** A single desk (custom layouts); its chair sits in front, on walkable floor. */
  Desk: (p) => [{ cx: 0, cz: 0, w: num(p, "width", 1.8), d: num(p, "depth", 0.85) }],
  /** A 2 × 2 bench: four desks back to back around a planted partition. Chairs stay walkable. */
  DeskPod: (p) => [{ cx: 0, cz: 0, w: num(p, "deskWidth", 1.8) * 2, d: num(p, "deskDepth", 1.0) * 2 }],
};

export function footprintOf(item: Item): Footprint[] {
  const build = footprints[item.key];
  if (!build) return [];
  const scale = item.scale ?? 1;
  return build(item.params).map((f) => ({ cx: f.cx * scale, cz: f.cz * scale, w: f.w * scale, d: f.d * scale }));
}
