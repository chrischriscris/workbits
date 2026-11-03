import type { SpaceDoc } from "./types";

/** A chair someone can sit at: where it stands and which way the sitter faces. */
export type Seat = { x: number; z: number; rotation: number };

/** How far a chair sits from its desk's centre, along the desk's facing. */
export const CHAIR_OFFSET = 0.95;

const rotate = (x: number, z: number, angle: number) => ({
  x: x * Math.cos(angle) + z * Math.sin(angle),
  z: -x * Math.sin(angle) + z * Math.cos(angle),
});

/** The desks inside a pod, in pod-local space: back row faces −z, front row +z. */
export function podDesks(deskWidth: number, deskDepth: number) {
  return [
    { x: -deskWidth / 2, z: -deskDepth / 2, rotation: Math.PI, variant: 0 },
    { x: deskWidth / 2, z: -deskDepth / 2, rotation: Math.PI, variant: 1 },
    { x: -deskWidth / 2, z: deskDepth / 2, rotation: 0, variant: 2 },
    { x: deskWidth / 2, z: deskDepth / 2, rotation: 0, variant: 3 },
  ];
}

function chairOf(desk: { x: number; z: number; rotation: number }): Seat {
  const front = rotate(0, CHAIR_OFFSET, desk.rotation);
  return { x: desk.x + front.x, z: desk.z + front.z, rotation: desk.rotation + Math.PI };
}

/** Every seat in the document, in item order (pods contribute four each). */
export function seatsOf(doc: SpaceDoc): Seat[] {
  const seats: Seat[] = [];
  for (const item of doc.items) {
    const rot = item.rot ?? 0;
    if (item.key === "DeskPod") {
      const width = Number(item.params?.deskWidth ?? 1.8);
      const depth = Number(item.params?.deskDepth ?? 1.0);
      for (const desk of podDesks(width, depth)) {
        const offset = rotate(desk.x, desk.z, rot);
        seats.push(chairOf({ x: item.at.x + offset.x, z: item.at.z + offset.z, rotation: desk.rotation + rot }));
      }
    } else if (item.key === "Desk") {
      seats.push(chairOf({ x: item.at.x, z: item.at.z, rotation: rot }));
    }
  }
  return seats;
}
