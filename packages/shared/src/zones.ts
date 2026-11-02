export type ZoneId = "lounge" | "engineering" | "meeting" | "kitchen" | "nap";

export type Zone = {
  id: ZoneId;
  name: string;
  private: boolean;
  anchor: { x: number; z: number };
};

export const zones: Zone[] = [
  { id: "lounge", name: "Lounge", private: false, anchor: { x: -4.6, z: 3.2 } },
  { id: "engineering", name: "Engineering", private: false, anchor: { x: -1.3, z: 3.8 } },
  { id: "meeting", name: "Meeting Room", private: true, anchor: { x: -3.0, z: -1.6 } },
  { id: "kitchen", name: "Kitchen", private: false, anchor: { x: 3.6, z: -3.2 } },
  { id: "nap", name: "Nap Room", private: true, anchor: { x: 5.2, z: 4.9 } },
];

const byId = Object.fromEntries(zones.map((zone) => [zone.id, zone]));

export function zoneById(id: string): Zone | undefined {
  return byId[id];
}

/**
 * The authoritative room a point belongs to. The server uses the same function
 * for chat routing and private-room gating, so client and server cannot drift.
 */
export function zoneAt(x: number, z: number): ZoneId {
  if (x < -2.2 && z < -0.9) return "meeting";
  if (x < -3.4 && z >= -0.9) return "lounge";
  if (x >= -2.2 && z < -2.6) return "kitchen";
  if (x > 4.6 && z >= 2.0) return "nap";
  return "engineering";
}

export function zoneName(id: string) {
  return zoneById(id)?.name ?? "Office";
}
