import type { Item, Rect, RoomType } from "./types";

/**
 * Room kits (ADR-015): furnish a room rectangle of any size from its type.
 * Kits only place furniture; partitions, doors and windows are the template's.
 * Output is plain items, so a kit-furnished room can be edited like any other.
 */

export type KitContext = {
  /** Which shell walls the room's edges sit on (north = −z, west = −x). */
  walls: { north: boolean; west: boolean };
  /** Side the door or opening is on; kits keep that edge clear. */
  entrance: "north" | "south" | "east" | "west";
  /** For desks: how many seats this room should hold, at most. */
  seats?: number;
  /** Deterministic variation (plant kinds, colours). */
  seed: number;
  /** Prefix for item ids, unique per room. */
  id: string;
};

const CREAM = "#f1ece3";
const TERRACOTTA = "#d98e73";
const HALF_PI = Math.PI / 2;

/** Integer-only PRNG so seeds reproduce across engines (no Math.sin tricks). */
export function prng(seed: number) {
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

type Builder = { items: Item[]; add: (key: string, x: number, z: number, extra?: Omit<Item, "id" | "key" | "at"> & { y?: number }) => void };

function builder(prefix: string): Builder {
  const items: Item[] = [];
  let index = 0;
  return {
    items,
    add(key, x, z, extra = {}) {
      const { y, ...rest } = extra;
      index += 1;
      items.push({ id: `${prefix}-${key.toLowerCase()}-${index}`, key, at: y === undefined ? { x, z } : { x, z, y }, ...rest });
    },
  };
}

const plantKinds = ["leafy", "tall", "leafy", "bush"] as const;
const pots = [CREAM, TERRACOTTA, CREAM];

function cornerPlant(b: Builder, rng: () => number, x: number, z: number, scale = 1.1) {
  const kind = plantKinds[Math.floor(rng() * plantKinds.length)]!;
  b.add("Plant", x, z, { scale: kind === "tall" ? scale * 1.05 : scale, params: { pot: pots[Math.floor(rng() * pots.length)]!, kind } });
}

const PAD = 0.45;

/** The two corners on the side away from the entrance (plants never block the way in). */
function farCorners(r: Rect, entrance: KitContext["entrance"], pad = PAD): [number, number][] {
  const west = r.x + pad;
  const east = r.x + r.w - pad;
  const north = r.z + pad;
  const south = r.z + r.d - pad;
  if (entrance === "north") return [[west, south], [east, south]];
  if (entrance === "south") return [[west, north], [east, north]];
  if (entrance === "east") return [[west, north], [west, south]];
  return [[east, north], [east, south]];
}

function meeting(r: Rect, ctx: KitContext, b: Builder, rng: () => number) {
  const alongX = r.w >= r.d;
  const long = alongX ? r.w : r.d;
  const short = alongX ? r.d : r.w;
  const length = Math.max(1.6, Math.min(3.6, long - 2.2));
  const width = Math.max(1.0, Math.min(1.45, short - 2.6));
  const cx = r.x + r.w / 2;
  const cz = r.z + r.d / 2;
  const rot = alongX ? 0 : HALF_PI;
  b.add("Rug", cx, cz, { y: 0.035, rot, params: { width: Math.min(long - 0.6, length + 1.4), depth: Math.min(short - 0.6, width + 2.2), variant: "cream" } });
  b.add("MeetingTable", cx, cz, { rot, params: { length, width, chairScale: 1.2 } });
  b.add("Pendant", cx, cz, { y: 1.62, params: { kind: "bell", drop: 1.2, size: 1.6, light: true } });
  if (ctx.walls.west && r.d >= 2.6) {
    b.add("WallArt", r.x + 0.03, cz, { y: 1.62, rot: HALF_PI, params: { variant: 0, width: Math.min(1.7, r.d - 1.2), height: 1.3 } });
  } else if (ctx.walls.north) {
    b.add("WallArt", cx, r.z + 0.03, { y: 1.62, params: { variant: 0, width: Math.min(1.7, r.w - 1.2), height: 1.3 } });
  }
  const [first, second] = farCorners(r, ctx.entrance);
  cornerPlant(b, rng, first![0], first![1], 1.15);
  if (long > 4.5) cornerPlant(b, rng, second![0], second![1]);
}

function kitchen(r: Rect, ctx: KitContext, b: Builder, rng: () => number) {
  // A counter run along the north wall (or the room's north edge), fridge and pantry at its east end.
  const backZ = r.z + 0.33;
  const fridge = 0.92;
  const pantry = 0.9;
  const runLength = Math.max(2.4, Math.min(6.0, r.w - fridge - pantry - 0.6));
  const runX = r.x + 0.15 + runLength / 2;
  b.add("KitchenRun", runX, backZ, { params: { length: runLength } });
  b.add("Fridge", runX + runLength / 2 + 0.05 + fridge / 2, r.z + 0.35);
  if (r.w - runLength - fridge > pantry + 0.3) {
    const pantryX = runX + runLength / 2 + 0.1 + fridge + pantry / 2;
    b.add("TallCabinet", pantryX, r.z + 0.32, { params: { height: 2.25 } });
    b.add("Plant", pantryX, r.z + 0.3, { y: 2.25, scale: 0.62, params: { pot: CREAM, kind: "trailing", onTop: true } });
  }
  b.add("Rug", runX, r.z + 1.05, { y: 0.035, params: { width: Math.min(2.6, runLength - 0.4), depth: 0.75, variant: "lines" } });
  if (r.d > 3) cornerPlant(b, rng, r.x + r.w - PAD, r.z + r.d - PAD, 1.2);
}

function lounge(r: Rect, ctx: KitContext, b: Builder, rng: () => number) {
  // Sectional against the west wall when there is one, else against the north edge.
  const onWest = ctx.walls.west || r.w < r.d;
  const sofaScale = Math.min(1.1, (onWest ? r.d : r.w) / 3.4);
  if (onWest) {
    const cz = r.z + r.d / 2;
    b.add("Rug", r.x + Math.min(2.2, r.w / 2), cz, { y: 0.035, params: { width: Math.min(4.0, r.w - 0.4), depth: Math.min(4.4, r.d - 0.6), variant: "ivory" } });
    b.add("Sectional", r.x + 0.06 + 0.475 * sofaScale, cz, { rot: HALF_PI, scale: sofaScale });
    b.add("CoffeeTable", r.x + 2.15, cz + 0.3, { scale: 1.15, params: { radius: 0.62 } });
    if (ctx.walls.west) b.add("WallArt", r.x + 0.03, cz + 0.25, { y: 1.92, rot: HALF_PI, params: { variant: 1, width: 1.9, height: 1.2 } });
    if (r.w > 3.6) b.add("Pouf", r.x + 3.1, cz - 0.6, { scale: 1.15, params: { color: TERRACOTTA } });
    b.add("FloorLamp", r.x + PAD, r.z + r.d - PAD);
  } else {
    const cx = r.x + r.w / 2;
    b.add("Rug", cx, r.z + Math.min(2.2, r.d / 2), { y: 0.035, params: { width: Math.min(4.4, r.w - 0.6), depth: Math.min(4.0, r.d - 0.4), variant: "ivory" } });
    b.add("Sectional", cx, r.z + 0.06 + 0.475 * sofaScale, { scale: sofaScale });
    b.add("CoffeeTable", cx - 0.3, r.z + 2.15, { scale: 1.15, params: { radius: 0.62 } });
    if (ctx.walls.north) b.add("WallArt", cx - 0.25, r.z + 0.03, { y: 1.92, params: { variant: 1, width: 1.9, height: 1.2 } });
    if (r.d > 3.6) b.add("Pouf", cx + 0.6, r.z + 3.1, { scale: 1.15, params: { color: TERRACOTTA } });
    b.add("FloorLamp", r.x + r.w - PAD, r.z + PAD);
  }
  cornerPlant(b, rng, r.x + PAD, r.z + PAD, 1.15);
  if (r.w * r.d > 14) cornerPlant(b, rng, r.x + r.w - PAD, r.z + r.d - PAD);
}

function nap(r: Rect, ctx: KitContext, b: Builder, rng: () => number) {
  const alongZ = r.d >= r.w;
  const cx = r.x + r.w / 2;
  const cz = r.z + r.d / 2;
  b.add("Rug", cx, cz, { y: 0.035, rot: alongZ ? 0 : HALF_PI, params: { width: 2.3, depth: 2.6, variant: "blush" } });
  // Head against the room's north (or west) edge.
  if (alongZ) b.add("Daybed", cx + 0.2, r.z + 0.15 + 1.075);
  else b.add("Daybed", r.x + 0.15 + 1.075, cz + 0.2, { rot: -HALF_PI });
  b.add("SideTable", r.x + PAD, r.z + PAD);
  b.add("TableLamp", r.x + PAD - 0.02, r.z + PAD - 0.05, { y: 0.55, params: { light: true } });
  const [, corner] = farCorners(r, ctx.entrance, PAD - 0.1);
  cornerPlant(b, rng, corner![0], corner![1], 0.95);
}

function focus(r: Rect, ctx: KitContext, b: Builder, rng: () => number) {
  // A phone-booth desk against the north edge.
  b.add("Desk", r.x + r.w / 2, r.z + 0.5, { rot: 0, params: { width: Math.min(1.6, r.w - 0.4), depth: 0.8, variant: Math.floor(rng() * 4), panel: true } });
  const [, corner] = farCorners(r, ctx.entrance === "north" ? "south" : ctx.entrance, 0.35);
  cornerPlant(b, rng, corner![0], corner![1], 0.8);
}

/** Desk pods (2 × 2 benches) packed in rows; each needs ~4.4 × 4.5 m with its chairs and aisles. */
function desks(r: Rect, ctx: KitContext, b: Builder) {
  const podW = 3.6 + 0.9;
  const podD = 2.0 + 2 * 1.25;
  // The last pod in a row or column needs no aisle after it.
  const cols = Math.max(1, Math.floor((r.w + 0.9) / podW));
  const rows = Math.max(1, Math.floor((r.d + 0.4) / podD));
  const wanted = Math.ceil((ctx.seats ?? cols * rows * 4) / 4);
  const count = Math.min(cols * rows, Math.max(1, wanted));
  const usedRows = Math.ceil(count / cols);
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / cols);
    const inRow = Math.min(cols, count - row * cols);
    const col = index % cols;
    const x = r.x + r.w / 2 + (col - (inRow - 1) / 2) * podW;
    const z = r.z + r.d / 2 + (row - (usedRows - 1) / 2) * podD;
    b.add("Rug", x, z, { y: 0.035, params: { width: 4.6, depth: 3.8, variant: "lines" } });
    b.add("Pendant", x, z, { y: 2.05, params: { kind: "bar", length: 3.0, drop: 0.6, light: true } });
    b.add("DeskPod", x, z, { params: { deskWidth: 1.8, deskDepth: 1.0 } });
  }
}

function open(r: Rect, _ctx: KitContext, b: Builder, rng: () => number) {
  cornerPlant(b, rng, r.x + PAD, r.z + PAD);
  cornerPlant(b, rng, r.x + r.w - PAD, r.z + r.d - PAD);
}

const kits: Record<RoomType, (r: Rect, ctx: KitContext, b: Builder, rng: () => number) => void> = {
  meeting,
  kitchen,
  lounge,
  nap,
  focus,
  desks,
  open,
};

/** Furnish one room. Deterministic for the same rect, context and seed. */
export function furnish(type: RoomType, rect: Rect, ctx: KitContext): Item[] {
  const b = builder(ctx.id);
  kits[type](rect, ctx, b, prng(ctx.seed));
  return b.items;
}
