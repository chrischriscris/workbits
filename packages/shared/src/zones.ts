export type ZoneId = "lounge" | "engineering" | "meeting" | "kitchen" | "nap" | "garden";

export type Zone = {
  id: ZoneId;
  name: string;
  private: boolean;
  anchor: { x: number; z: number };
};

export const zones: Zone[] = [
  { id: "lounge", name: "Lounge", private: false, anchor: { x: -6.4, z: 3.6 } },
  { id: "engineering", name: "Engineering", private: false, anchor: { x: 0.5, z: 2.2 } },
  { id: "meeting", name: "Meeting Room", private: true, anchor: { x: 7, z: -4 } },
  { id: "kitchen", name: "Kitchen", private: false, anchor: { x: -7.8, z: -6.2 } },
  { id: "nap", name: "Nap Room", private: true, anchor: { x: 9, z: 4.2 } },
  { id: "garden", name: "Garden", private: false, anchor: { x: 8.5, z: 7.6 } },
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
  if (x > 3.3 && x < 11 && z > -8.2 && z < -1.1) return "meeting";
  if (z >= 7.1 && x > 4.6) return "garden";
  if (x > 6.4 && z > 1.1) return "nap";
  if (x < -3.2 && z < -4.3) return "kitchen";
  if (x < -3.2) return "lounge";
  return "engineering";
}

export function zoneName(id: string) {
  return zoneById(id)?.name ?? "Office";
}
