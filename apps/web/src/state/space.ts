import { create } from "zustand";
import {
  buildOffice,
  defaultOfficeParams,
  roomsOf,
  spaceOf,
  type OfficeParams,
  type RoomRef,
  type SpaceDoc,
} from "@workbits/shared";

/** The office the scene renders and walks on (ADR-015): built from small params the server agrees on. */
type SpaceState = {
  office: OfficeParams;
  doc: SpaceDoc;
  setOffice: (office: OfficeParams) => void;
};

/** Dev-only art bench: `?office=atelier&seats=12&seed=3` renders a template locally. */
function initialOffice(): OfficeParams {
  if (!import.meta.env.DEV || typeof window === "undefined") return defaultOfficeParams;
  const params = new URLSearchParams(window.location.search);
  const template = params.get("office");
  if (!template) return defaultOfficeParams;
  return { template, headcount: Number(params.get("seats") ?? 8), seed: Number(params.get("seed") ?? 1) };
}

const startOffice = initialOffice();

export const useSpace = create<SpaceState>((set) => ({
  office: startOffice,
  doc: buildOffice(startOffice),
  setOffice: (office) => set({ office, doc: buildOffice(office) }),
}));

/** Room lookups against the current office, for code outside React. */
export function currentRooms(): RoomRef[] {
  return roomsOf(useSpace.getState().doc);
}
export function roomAtNow(x: number, z: number): RoomRef {
  return spaceOf(useSpace.getState().doc).roomAt(x, z);
}
export function roomName(id: string): string {
  return currentRooms().find((room) => room.id === id)?.name ?? "Office";
}
export function roomAnchor(id: string): { x: number; z: number } | null {
  return currentRooms().find((room) => room.id === id)?.anchor ?? null;
}

/**
 * The visible shell around a document's walkable floor: wall centre lines,
 * the open ends of the cut walls, and the slab. Offsets reproduce the
 * hand-built loft exactly (walls 0.09 behind the floor edge, open sides a
 * little short of it).
 */
export function shellOf(doc: SpaceDoc) {
  const { floor } = doc;
  const westX = floor.x - 0.09;
  const northZ = floor.z - 0.09;
  const eastX = floor.x + floor.w - 0.2;
  const southZ = floor.z + floor.d - 0.25;
  return {
    westX,
    northZ,
    eastX,
    southZ,
    height: doc.wallHeight,
    slab: {
      width: eastX - westX + 0.5,
      depth: southZ - northZ + 0.55,
      cx: (westX + eastX) / 2,
      cz: (northZ + southZ) / 2,
    },
  };
}

