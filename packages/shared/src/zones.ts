import { compileSpace, defaultLoft } from "./space";

export type ZoneId = "lounge" | "engineering" | "meeting" | "kitchen" | "nap";

export type Zone = {
  id: ZoneId;
  name: string;
  private: boolean;
  anchor: { x: number; z: number };
};

/** The rooms of the default loft (ADR-015), in menu order. */
const order: ZoneId[] = ["lounge", "engineering", "meeting", "kitchen", "nap"];
const loftRooms = [...defaultLoft.rooms, { ...defaultLoft.floorRoom, privacy: "open" as const }];
export const zones: Zone[] = order.map((id) => {
  const room = loftRooms.find((candidate) => candidate.id === id)!;
  return { id, name: room.name, private: room.privacy === "private", anchor: room.anchor };
});

/** The default loft compiled once: room lookup, walls and the walkable grid. */
export const loft = compileSpace(defaultLoft);

const byId = Object.fromEntries(zones.map((zone) => [zone.id, zone]));

export function zoneById(id: string): Zone | undefined {
  return byId[id];
}

/**
 * The authoritative room a point belongs to. The server uses the same function
 * for chat routing and private-room gating, so client and server cannot drift.
 */
export function zoneAt(x: number, z: number): ZoneId {
  return loft.roomAt(x, z).id as ZoneId;
}

export function zoneName(id: string) {
  return zoneById(id)?.name ?? "Office";
}
