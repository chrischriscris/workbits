export type ZoneId = "lounge" | "engineering" | "meeting" | "kitchen" | "nap" | "garden";

export type Zone = {
  id: ZoneId;
  name: string;
  private: boolean;
  anchor: { x: number; z: number };
};

export const zones: Zone[] = [
  { id: "lounge", name: "Lounge", private: false, anchor: { x: -5.7, z: 2.6 } },
  { id: "engineering", name: "Engineering", private: false, anchor: { x: 1.4, z: 5.6 } },
  { id: "meeting", name: "Meeting Room", private: true, anchor: { x: -6.15, z: -2.2 } },
  { id: "kitchen", name: "Kitchen", private: false, anchor: { x: 5.0, z: -4.8 } },
  { id: "nap", name: "Nap Room", private: true, anchor: { x: 7.7, z: 5.1 } },
  { id: "garden", name: "Garden", private: false, anchor: { x: 8.2, z: 1.6 } },
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
  if (x < -2.4 && z < -1.1) return "meeting";
  if (x < -4.2 && z >= -1.1) return "lounge";
  if (x >= -2.4 && z < -3.0) return "kitchen";
  if (x > 6.6 && z >= 3.1) return "nap";
  if (x > 6.6) return "garden";
  return "engineering";
}

export function zoneName(id: string) {
  return zoneById(id)?.name ?? "Office";
}
