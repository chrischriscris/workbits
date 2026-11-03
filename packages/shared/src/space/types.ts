/**
 * An office ("space") as data: rooms, interior edges, the outer shell, items
 * and spawns. One `compileSpace` turns it into room membership, walls and a
 * walkable grid that the server and client share (ADR-015,
 * docs/architecture/spaces.md).
 */

export type Point = { x: number; z: number };

/** Axis-aligned rectangle, half-open: [x, x + w) × [z, z + d). */
export type Rect = { x: number; z: number; w: number; d: number };

export type RoomType = "meeting" | "kitchen" | "lounge" | "desks" | "nap" | "focus" | "open";

export type Room = {
  id: string;
  name: string;
  type: RoomType;
  rect: Rect;
  /** Private = its own voice and chat; anyone may walk in (ADR-015). */
  privacy: "open" | "private";
  /** Where the rooms menu sends people. Must be walkable. */
  anchor: Point;
};

export type EdgeKind = "glass" | "frosted" | "sill" | "solid";

/** An interior partition from `a` to `b` (axis-aligned), with gaps people walk through. */
export type Edge = {
  id: string;
  a: Point;
  b: Point;
  kind: EdgeKind;
  height: number;
  /** Distance along a→b to the opening's start, and its width. */
  openings: Array<{ at: number; width: number }>;
};

export type ShellOpening = {
  wall: "north" | "west";
  /** Centre along the wall, in world units on that wall's axis. */
  at: number;
  width: number;
  bottom: number;
  top: number;
  kind: "window" | "door";
  curtain?: boolean;
};

export type Item = {
  id: string;
  /** Catalog key; today these are the props.tsx component names. */
  key: string;
  at: { x: number; z: number; y?: number };
  /** Rotation about Y, radians. */
  rot?: number;
  scale?: number;
  params?: Record<string, string | number | boolean>;
};

export type SpaceDoc = {
  schema: 1;
  id: string;
  name: string;
  /** Interior floor footprint: walls stand on its north (−z) and west (−x) edges. */
  floor: Rect;
  wallHeight: number;
  shell: { openings: ShellOpening[] };
  /** What a point outside every room belongs to (the open floor). */
  floorRoom: { id: string; name: string; type: RoomType; anchor: Point };
  rooms: Room[];
  edges: Edge[];
  items: Item[];
  spawns: Point[];
};
