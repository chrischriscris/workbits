import { compileSpace } from "./compile";
import { defaultLoft } from "./defaultLoft";
import { furnish, prng } from "./kits";
import type { Edge, Item, Point, Rect, Room, RoomType, ShellOpening, SpaceDoc } from "./types";

/**
 * Office templates (ADR-015): curated plans in a few size classes, furnished
 * by room kits. Coordinates in a template are metres from the floor's
 * north-west corner; built offices are centred on the origin.
 */

type Side = "north" | "south" | "east" | "west";

type TemplateRoom = {
  /** Stable room id; the vocabulary (meeting, kitchen, lounge, nap, focus) routes chat history. */
  id: string;
  name: string;
  type: RoomType;
  /** [x0, z0, x1, z1] from the north-west corner. */
  rect: [number, number, number, number];
  privacy?: "open" | "private";
  /** How its interior sides are built. Kitchen/lounge are usually open zones. */
  enclosure?: "glass" | "frosted";
  /** Glass rooms: the side with the door and the door's offset from that side's start. */
  door?: { side: Side; at: number };
  /** Frosted nooks: the side left open. */
  openSide?: Side;
  /** Rooms people can switch off; they become open floor. */
  optional?: "nap" | "focus" | "lounge";
};

export type OfficeTemplate = {
  id: string;
  name: string;
  size: { w: number; d: number };
  rooms: TemplateRoom[];
  /** The open floor where desk pods go. */
  desks: [number, number, number, number];
  /** Most seats the desk area takes. */
  maxSeats: number;
};

export type OfficeParams = {
  template: string;
  /** Desks wanted; capped by the template's desk area. */
  headcount: number;
  rooms?: { nap?: boolean; focus?: boolean; lounge?: boolean };
  seed?: number;
};

export const templates: OfficeTemplate[] = [
  {
    id: "studio",
    name: "Studio",
    size: { w: 14, d: 10 },
    rooms: [
      { id: "meeting", name: "Meeting Room", type: "meeting", rect: [0, 0, 4.8, 4.2], privacy: "private", enclosure: "glass", door: { side: "south", at: 3.5 } },
      { id: "kitchen", name: "Kitchen", type: "kitchen", rect: [5.6, 0, 14, 3.0] },
      { id: "lounge", name: "Lounge", type: "lounge", rect: [0, 5.2, 4.8, 10], optional: "lounge" },
      { id: "focus", name: "Focus Booth", type: "focus", rect: [11.8, 3.8, 14, 6.2], privacy: "private", enclosure: "glass", door: { side: "west", at: 1.2 }, optional: "focus" },
    ],
    desks: [5.4, 3.6, 11.4, 10],
    maxSeats: 8,
  },
  {
    id: "compact",
    name: "Compact",
    size: { w: 12, d: 9 },
    rooms: [
      { id: "meeting", name: "Meeting Room", type: "meeting", rect: [0, 0, 4.4, 3.8], privacy: "private", enclosure: "glass", door: { side: "south", at: 3.2 } },
      { id: "kitchen", name: "Kitchen", type: "kitchen", rect: [5.2, 0, 12, 2.8] },
      { id: "lounge", name: "Lounge", type: "lounge", rect: [0, 4.8, 4.4, 9], optional: "lounge" },
    ],
    desks: [5.0, 3.4, 12, 9],
    maxSeats: 4,
  },
  {
    id: "atelier",
    name: "Atelier",
    size: { w: 20, d: 14 },
    rooms: [
      { id: "meeting", name: "Meeting Room", type: "meeting", rect: [0, 0, 5.6, 4.8], privacy: "private", enclosure: "glass", door: { side: "south", at: 4.3 } },
      { id: "huddle", name: "Huddle Room", type: "meeting", rect: [6.4, 0, 10.2, 3.8], privacy: "private", enclosure: "glass", door: { side: "south", at: 0.4 } },
      { id: "kitchen", name: "Kitchen", type: "kitchen", rect: [11.0, 0, 20, 3.2] },
      { id: "lounge", name: "Lounge", type: "lounge", rect: [0, 6.2, 5.4, 14], optional: "lounge" },
      { id: "nap", name: "Nap Room", type: "nap", rect: [16.6, 9.8, 20, 14], privacy: "private", enclosure: "frosted", door: { side: "west", at: 3.0 }, optional: "nap" },
    ],
    desks: [6.2, 4.4, 16.2, 14],
    maxSeats: 16,
  },
  {
    id: "gallery",
    name: "Gallery",
    size: { w: 24, d: 12 },
    rooms: [
      { id: "meeting", name: "Meeting Room", type: "meeting", rect: [0, 0, 5.4, 4.6], privacy: "private", enclosure: "glass", door: { side: "south", at: 4.1 } },
      { id: "kitchen", name: "Kitchen", type: "kitchen", rect: [6.2, 0, 15, 3.0] },
      { id: "focus", name: "Focus Booth", type: "focus", rect: [15.8, 0, 18.4, 2.8], privacy: "private", enclosure: "glass", door: { side: "south", at: 0.3 }, optional: "focus" },
      { id: "lounge", name: "Lounge", type: "lounge", rect: [18.6, 6.0, 24, 12], optional: "lounge" },
      { id: "nap", name: "Nap Room", type: "nap", rect: [0, 7.6, 3.6, 12], privacy: "private", enclosure: "frosted", openSide: "east", optional: "nap" },
    ],
    desks: [4.6, 3.8, 18.2, 12],
    maxSeats: 12,
  },
  {
    id: "commons",
    name: "Commons",
    size: { w: 18, d: 14 },
    rooms: [
      { id: "kitchen", name: "Kitchen", type: "kitchen", rect: [0, 0, 9, 3.2] },
      { id: "lounge", name: "Lounge", type: "lounge", rect: [9.8, 0, 18, 4.4], optional: "lounge" },
      { id: "focus", name: "Focus Booth", type: "focus", rect: [0, 4.2, 2.8, 7.2], privacy: "private", enclosure: "glass", door: { side: "east", at: 1.6 }, optional: "focus" },
      { id: "meeting", name: "Meeting Room", type: "meeting", rect: [0, 8.6, 5.6, 14], privacy: "private", enclosure: "glass", door: { side: "north", at: 4.4 } },
    ],
    desks: [6.4, 5.2, 18, 14],
    maxSeats: 16,
  },
];

/** The hand-tuned loft stays available as a template of its own. */
export const LOFT_TEMPLATE = "loft";
export const templateIds = [LOFT_TEMPLATE, ...templates.map((template) => template.id)];

const GLASS_HEIGHT = 2.6;
const NOOK_HEIGHT = 1.3;
const DOOR = 0.9;

/** The interior sides of a room (not on the shell's north/west walls or the floor's open south/east edge). */
function interiorSides(rect: Rect, size: { w: number; d: number }, origin: Point) {
  const x0 = rect.x - origin.x;
  const z0 = rect.z - origin.z;
  const x1 = x0 + rect.w;
  const z1 = z0 + rect.d;
  return {
    north: z0 > 0.01,
    west: x0 > 0.01,
    south: z1 < size.d - 0.01,
    east: x1 < size.w - 0.01,
  };
}

function sideSegment(rect: Rect, side: Side): [Point, Point] {
  const { x, z, w, d } = rect;
  if (side === "north") return [{ x, z }, { x: x + w, z }];
  if (side === "south") return [{ x, z: z + d }, { x: x + w, z: z + d }];
  if (side === "west") return [{ x, z }, { x, z: z + d }];
  return [{ x: x + w, z }, { x: x + w, z: z + d }];
}

function edgesFor(room: TemplateRoom, rect: Rect, size: { w: number; d: number }, origin: Point): Edge[] {
  if (!room.enclosure) return [];
  const sides = interiorSides(rect, size, origin);
  const edges: Edge[] = [];
  for (const side of ["north", "west", "south", "east"] as const) {
    if (!sides[side] || side === room.openSide) continue;
    const [a, b] = sideSegment(rect, side);
    const frosted = room.enclosure === "frosted";
    edges.push({
      id: `${room.id}-${side}`,
      a,
      b,
      // Like the loft's nook: frosted at the back, clear on the side.
      kind: frosted && side === "north" ? "frosted" : "glass",
      height: frosted ? NOOK_HEIGHT : GLASS_HEIGHT,
      openings: room.door?.side === side ? [{ at: room.door.at, width: DOOR }] : [],
    });
  }
  return edges;
}

/** Windows over the rooms that sit on the shell walls, like the loft's meeting-room window. */
function windowsFor(rooms: Array<{ room: TemplateRoom; rect: Rect }>, origin: Point): ShellOpening[] {
  const openings: ShellOpening[] = [];
  for (const { room, rect } of rooms) {
    if (room.type !== "meeting" && room.type !== "lounge") continue;
    if (Math.abs(rect.z - origin.z) < 0.01 && rect.w >= 3.2) {
      openings.push({ wall: "north", at: rect.x + rect.w / 2, width: Math.min(2.1, rect.w - 1.2), bottom: 0.8, top: 2.25, kind: "window", curtain: true });
    } else if (Math.abs(rect.x - origin.x) < 0.01 && rect.d >= 3.2 && room.type !== "lounge") {
      openings.push({ wall: "west", at: rect.z + rect.d / 2, width: Math.min(2.1, rect.d - 1.2), bottom: 0.8, top: 2.25, kind: "window", curtain: true });
    }
  }
  return openings;
}

/** The spot inside `rect` closest to its centre that people can actually walk to from `from`. */
function anchorIn(compiled: ReturnType<typeof compileSpace>, rect: Rect, roomId: string, from: Point): Point {
  const cx = rect.x + rect.w / 2;
  const cz = rect.z + rect.d / 2;
  const candidates: Array<Point & { distance: number }> = [];
  for (let x = rect.x + 0.3; x < rect.x + rect.w - 0.3; x += 0.2) {
    for (let z = rect.z + 0.3; z < rect.z + rect.d - 0.3; z += 0.2) {
      if (compiled.walkable(x, z) && compiled.roomAt(x, z).id === roomId) candidates.push({ x, z, distance: Math.hypot(x - cx, z - cz) });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const candidate of candidates) {
    if (compiled.findPath(from, candidate)) return { x: candidate.x, z: candidate.z };
  }
  return compiled.nearestWalkable({ x: cx, z: cz });
}

const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

/** Build an office document from a template and parameters. Deterministic. */
export function buildOffice(params: OfficeParams): SpaceDoc {
  if (params.template === LOFT_TEMPLATE) return defaultLoft;
  const template = templates.find((candidate) => candidate.id === params.template) ?? templates[0]!;
  const { w, d } = template.size;
  const origin = { x: -w / 2, z: -d / 2 };
  const seed = clampInt(params.seed ?? 1, 1, 1_000_000);
  const toggles = params.rooms ?? {};
  const enabled = template.rooms.filter((room) => !room.optional || toggles[room.optional] !== false);
  const rectOf = ([x0, z0, x1, z1]: [number, number, number, number]): Rect => ({ x: origin.x + x0, z: origin.z + z0, w: x1 - x0, d: z1 - z0 });
  const placed = enabled.map((room) => ({ room, rect: rectOf(room.rect) }));

  const items: Item[] = [];
  placed.forEach(({ room, rect }, index) => {
    const walls = { north: Math.abs(rect.z - origin.z) < 0.01, west: Math.abs(rect.x - origin.x) < 0.01 };
    items.push(...furnish(room.type, rect, { walls, entrance: room.door?.side ?? room.openSide ?? "south", seed: seed * 31 + index, id: room.id }));
  });
  const deskRect = rectOf(template.desks);
  const seats = clampInt(params.headcount, 1, template.maxSeats);
  items.push(...furnish("desks", deskRect, { walls: { north: false, west: false }, entrance: "south", seats, seed, id: "pod" }));

  // Switched-off rooms become open floor with a little greenery.
  template.rooms
    .filter((room) => room.optional && toggles[room.optional] === false)
    .forEach((room, index) => items.push(...furnish("open", rectOf(room.rect), { walls: { north: false, west: false }, entrance: "south", seed: seed + index, id: `${room.id}-open` })));

  const draft: SpaceDoc = {
    schema: 1,
    id: `${template.id}-${seed}`,
    name: template.name,
    floor: { x: origin.x, z: origin.z, w, d },
    wallHeight: 2.7,
    shell: { openings: windowsFor(placed, origin) },
    floorRoom: { id: "engineering", name: "Desks", type: "desks", anchor: { x: 0, z: 0 } },
    rooms: placed.map(({ room, rect }) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      privacy: room.privacy ?? "open",
      rect,
      anchor: { x: rect.x + rect.w / 2, z: rect.z + rect.d / 2 },
    })),
    edges: placed.flatMap(({ room, rect }) => edgesFor(room, rect, template.size, origin)),
    items,
    spawns: [],
  };

  // Anchors and spawns on walkable ground, from the compiled plan.
  const compiled = compileSpace(draft);
  const floorAnchor = compiled.nearestWalkable({ x: deskRect.x + deskRect.w / 2, z: deskRect.z + deskRect.d - 0.6 });
  const rooms: Room[] = draft.rooms.map((room) => ({ ...room, anchor: anchorIn(compiled, room.rect, room.id, floorAnchor) }));
  const rng = prng(seed);
  const spawns: Point[] = [floorAnchor];
  for (let attempt = 0; attempt < 40 && spawns.length < 4; attempt += 1) {
    const candidate = compiled.nearestWalkable({ x: deskRect.x + rng() * deskRect.w, z: deskRect.z + rng() * deskRect.d });
    if (compiled.roomAt(candidate.x, candidate.z).id === "engineering" && compiled.findPath(floorAnchor, candidate)) spawns.push(candidate);
  }
  return { ...draft, rooms, floorRoom: { ...draft.floorRoom, anchor: floorAnchor }, spawns };
}
