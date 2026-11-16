import { compileSpace, type CompiledSpace, type RoomRef } from "./compile";
import { templateIds, type OfficeParams } from "./templates";
import type { SpaceDoc } from "./types";

const compiled = new WeakMap<SpaceDoc, CompiledSpace>();

/** The document compiled with client padding, cached per document object. */
export function spaceOf(doc: SpaceDoc): CompiledSpace {
  let space = compiled.get(doc);
  if (!space) {
    space = compileSpace(doc);
    compiled.set(doc, space);
  }
  return space;
}

/** Every place someone can be: the document's rooms, then the open floor. */
export function roomsOf(doc: SpaceDoc): RoomRef[] {
  return [...doc.rooms, { ...doc.floorRoom, privacy: "open" as const }];
}

/** The office everyone starts in. */
export const defaultOfficeParams: OfficeParams = { template: "loft", headcount: 8, seed: 1 };

/**
 * Validate office parameters from a client. Only small, bounded values cross
 * the wire; the server builds the document itself and never trusts geometry.
 */
export function sanitizeOfficeParams(value: unknown): OfficeParams | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const template = typeof record.template === "string" && templateIds.includes(record.template) ? record.template : undefined;
  if (!template) return undefined;
  const headcount = Number(record.headcount);
  const seed = Number(record.seed);
  const rooms = (record.rooms && typeof record.rooms === "object" ? record.rooms : {}) as Record<string, unknown>;
  const toggle = (key: string) => (rooms[key] === false ? false : undefined);
  const roomToggles = { nap: toggle("nap"), focus: toggle("focus"), lounge: toggle("lounge") };
  const anyOff = Object.values(roomToggles).some((off) => off === false);
  return {
    template,
    headcount: Number.isFinite(headcount) ? Math.max(1, Math.min(32, Math.round(headcount))) : 8,
    seed: Number.isFinite(seed) ? Math.max(1, Math.min(1_000_000, Math.round(seed))) : 1,
    ...(anyOff ? { rooms: Object.fromEntries(Object.entries(roomToggles).filter(([, off]) => off === false)) } : {}),
  };
}
