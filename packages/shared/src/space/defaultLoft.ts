import type { DeskPlacement } from "../types";
import type { Item, SpaceDoc } from "./types";

/**
 * Today's office (ADR-014's 15 × 11 loft) as a SpaceDoc. Room ids keep the
 * old zone ids so chat history and seed data still route.
 *
 * Coordinates: x −7.46 (west wall face) → 7.7 (open east edge),
 * z −5.46 (north wall face) → 5.75 (open south edge).
 */
const WEST = -7.46;
const NORTH = -5.46;
const CREAM = "#f1ece3";
const TERRACOTTA = "#d98e73";
const HALF_PI = Math.PI / 2;

let next = 0;
const item = (key: string, x: number, z: number, extra: Omit<Item, "id" | "key" | "at"> & { y?: number } = {}): Item => {
  const { y, ...rest } = extra;
  next += 1;
  return { id: `${key.toLowerCase()}-${next}`, key, at: y === undefined ? { x, z } : { x, z, y }, ...rest };
};

export const defaultLoft: SpaceDoc = {
  schema: 1,
  id: "default-loft",
  name: "Workbits Loft",
  floor: { x: WEST, z: NORTH, w: 15.16, d: 11.21 },
  wallHeight: 2.7,
  shell: {
    openings: [
      { wall: "north", at: -4.85, width: 2.1, bottom: 0.8, top: 2.25, kind: "window", curtain: true },
      { wall: "north", at: 6.75, width: 1.0, bottom: 0, top: 2.2, kind: "door" },
    ],
  },
  floorRoom: { id: "engineering", name: "Engineering", type: "desks", anchor: { x: -1.3, z: 3.8 } },
  rooms: [
    { id: "meeting", name: "Meeting Room", type: "meeting", privacy: "private", rect: { x: -8, z: -6, w: 5.8, d: 5.1 }, anchor: { x: -3.0, z: -1.6 } },
    { id: "lounge", name: "Lounge", type: "lounge", privacy: "open", rect: { x: -8, z: -0.9, w: 4.6, d: 6.9 }, anchor: { x: -4.2, z: 3.7 } },
    { id: "kitchen", name: "Kitchen", type: "kitchen", privacy: "open", rect: { x: -2.2, z: -6, w: 10.2, d: 3.4 }, anchor: { x: 3.6, z: -3.2 } },
    { id: "nap", name: "Nap Room", type: "nap", privacy: "private", rect: { x: 4.6, z: 2.0, w: 3.4, d: 4.0 }, anchor: { x: 5.2, z: 4.9 } },
  ],
  edges: [
    // Glass meeting box, door gap at x −3.6 … −2.7.
    { id: "meeting-front", a: { x: -7.5, z: -0.9 }, b: { x: -2.2, z: -0.9 }, kind: "glass", height: 2.6, openings: [{ at: 3.9, width: 0.9 }] },
    { id: "meeting-side", a: { x: -2.2, z: -5.5 }, b: { x: -2.2, z: -0.9 }, kind: "glass", height: 2.6, openings: [] },
    // Nap nook: frosted half-height glass at the back, clear glass on the side, open at the front.
    { id: "nap-back", a: { x: 4.6, z: 2.0 }, b: { x: 7.5, z: 2.0 }, kind: "frosted", height: 1.3, openings: [] },
    { id: "nap-side", a: { x: 4.6, z: 2.0 }, b: { x: 4.6, z: 4.2 }, kind: "glass", height: 1.3, openings: [] },
  ],
  items: [
    // Shell dressing.
    item("SlatDivider", -1.85, -4.7, { rot: HALF_PI, params: { length: 1.5, height: 2.62 } }),
    item("WallClock", -1.45, NORTH + 0.03, { y: 1.75 }),

    // Meeting room.
    item("Rug", -4.8, -3.2, { y: 0.035, params: { width: 4.6, depth: 3.6, variant: "cream" } }),
    item("MeetingTable", -4.8, -3.25, { params: { length: 3.4, width: 1.45, chairScale: 1.2 } }),
    item("Pendant", -4.8, -3.25, { y: 1.62, params: { kind: "bell", drop: 1.2, size: 1.6, light: true } }),
    item("WallArt", WEST + 0.03, -3.25, { y: 1.62, rot: HALF_PI, params: { variant: 0, width: 1.7, height: 1.3 } }),
    item("Credenza", WEST + 0.25, -3.25, { rot: HALF_PI, params: { length: 1.9, height: 0.62, depth: 0.42 } }),
    item("Vase", WEST + 0.25, -3.85, { y: 0.62, params: { color: "#e8dccb" } }),
    item("Books", WEST + 0.25, -3.1, { y: 0.62, rot: 1.4, params: { count: 3 } }),
    item("Plant", -7.0, -5.0, { scale: 1.2, params: { pot: CREAM, kind: "tall" } }),
    item("Plant", -2.75, -5.0, { scale: 1.15, params: { pot: CREAM, kind: "leafy" } }),
    item("Plant", -7.05, -1.4, { scale: 1.1, params: { pot: TERRACOTTA, kind: "leafy" } }),

    // Kitchen.
    item("KitchenRun", 1.45, NORTH + 0.33, { params: { length: 5.8 } }),
    item("Fridge", 4.95, NORTH + 0.35),
    item("TallCabinet", 5.9, NORTH + 0.32, { params: { height: 2.25 } }),
    item("Plant", 5.9, NORTH + 0.3, { y: 2.25, scale: 0.62, params: { pot: CREAM, kind: "trailing", onTop: true } }),
    item("Plant", 7.05, -4.4, { scale: 1.2, params: { pot: CREAM, kind: "leafy" } }),
    item("Rug", 1.6, -4.4, { y: 0.035, params: { width: 2.6, depth: 0.75, variant: "lines" } }),

    // Lounge.
    item("Rug", -5.6, 2.7, { y: 0.035, params: { width: 4.0, depth: 4.4, variant: "ivory" } }),
    item("Sectional", WEST + 0.52, 2.65, { rot: HALF_PI, scale: 1.1 }),
    item("CoffeeTable", -5.3, 2.95, { scale: 1.15, params: { radius: 0.62 } }),
    item("Pouf", -4.35, 2.05, { scale: 1.15, params: { color: TERRACOTTA } }),
    item("Beanbag", -5.22, 0.42, { rot: 0.5, scale: 1.4 }),
    item("Cat", -4.45, 4.5, { y: 0.06, rot: -0.7 }),
    item("SideTable", -7.0, -0.35),
    item("TableLamp", -7.05, -0.4, { y: 0.55 }),
    item("FloorLamp", -7.05, 4.55),
    item("WallArt", WEST + 0.03, 2.9, { y: 1.92, rot: HALF_PI, params: { variant: 1, width: 1.9, height: 1.2 } }),
    item("Shelf", -5.5, 5.05, { params: { width: 2.2, height: 0.8, depth: 0.36, seed: 2 } }),
    item("Plant", -7.0, 5.0, { scale: 1.15, params: { pot: CREAM, kind: "tall" } }),
    item("Plant", -3.75, -0.45, { scale: 1.05, params: { pot: CREAM, kind: "leafy" } }),

    // Open floor: the long front planter (desk pods come from the desk layout).
    // Ends short of the second pod so the walk to the nap nook stays open.
    item("Planter", -1.55, 5.0, { params: { length: 2.7, width: 0.55, height: 0.5 } }),

    // East edge.
    item("Shelf", 6.55, -1.9, { params: { width: 1.5, height: 1.95, depth: 0.38, seed: 6 } }),
    item("Tree", 6.75, 0.55, { scale: 1.1 }),
    item("Plant", 5.6, -1.95, { scale: 0.95, params: { pot: TERRACOTTA, kind: "leafy" } }),

    // Nap nook.
    item("Rug", 6.25, 3.9, { y: 0.035, params: { width: 2.3, depth: 2.6, variant: "blush" } }),
    item("Daybed", 6.4, 3.85),
    item("SideTable", 5.25, 2.5),
    item("TableLamp", 5.23, 2.45, { y: 0.55, params: { light: true } }),
    item("Books", 5.33, 2.62, { y: 0.55, rot: -0.4, params: { count: 2 } }),
    item("Plant", 7.1, 5.05, { scale: 0.95, params: { pot: TERRACOTTA, kind: "leafy" } }),
  ],
  spawns: [
    { x: -3.6, z: 4.2 },
    { x: 0.0, z: 2.2 },
    { x: 2.6, z: -2.0 },
    { x: -4.2, z: 3.7 },
  ],
};

/**
 * Default engineering area: two joined 2×2 pods offset on the diagonal, like
 * the reference. Shared so the rendered benches, seat placements and the
 * server's walkable grid can't drift.
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

/** Desk obstacles for the walkable grid: the bench layout or a custom one. */
export function deskItems(desks: DeskPlacement[], bench: boolean): Item[] {
  return desks.map((desk) => ({
    id: `desk-${desk.id}`,
    key: "Desk",
    at: { x: desk.x, z: desk.z },
    rot: desk.rotation,
    params: bench ? { width: BENCH_DESK.width, depth: BENCH_DESK.depth } : { width: 1.8, depth: 0.85 },
  }));
}

/** Where each seed character first appears; joins snap to the nearest walkable spot. */
export const characterSpawns: Record<string, { x: number; z: number }> = {
  chus: { x: -3.6, z: 4.2 },
  jules: { x: 2.6, z: -3.35 },
  mira: { x: -1.7, z: 2.0 },
  felix: { x: 3.5, z: 2.25 },
  fern: { x: -1.7, z: -0.9 },
  arlo: { x: -5.15, z: 0.55 },
  theo: { x: 6.4, z: 3.05 },
  clawd: { x: 1.4, z: -2.75 },
};
