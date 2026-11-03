import type { DeskPlacement, OfficeLayout } from "../types";
import type { Item, SpaceDoc } from "./types";

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

/** Items that make up the desk area, replaced wholesale by a custom desk layout. */
const deskAreaKeys = new Set(["DeskPod", "Desk"]);
const isDeskAreaDressing = (item: Item) => item.id.startsWith("pod-");

/**
 * Swap the document's desk pods for a custom layout's single desks (Workspace
 * Studio). Shared so the server's walkable grid matches what clients draw.
 */
export function applyDeskLayout(doc: SpaceDoc, layout: OfficeLayout | undefined): SpaceDoc {
  if (!layout || layout.id === "default") return doc;
  const rugVariant = layout.rug === "cream" ? "lines" : layout.rug;
  const desks: Item[] = layout.desks.map((desk: DeskPlacement) => ({
    id: `desk-${desk.id}`,
    key: "Desk",
    at: { x: desk.x, z: desk.z },
    rot: desk.rotation,
    params: { width: 1.8, depth: 0.85, variant: desk.variant, panel: true },
  }));
  return {
    ...doc,
    items: [
      ...doc.items.filter((item) => !deskAreaKeys.has(item.key) && !isDeskAreaDressing(item)),
      { id: "pod-custom-rug", key: "Rug", at: { x: 0, y: 0.035, z: 3.0 }, params: { width: 6.0, depth: 4.4, variant: rugVariant } },
      { id: "pod-custom-light", key: "Pendant", at: { x: 0, y: 2.05, z: 3.0 }, params: { kind: "bar", length: 3.0, drop: 0.6, light: true } },
      ...desks,
    ],
  };
}
