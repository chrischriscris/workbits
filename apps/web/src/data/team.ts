import manifest from "../../../../seeds/team/manifest.json";
import { zones, type SeedCharacter, type SeedPack } from "@workbits/shared";

export const teamPack = manifest as unknown as SeedPack;
export const teamCharacters = teamPack.characters;
export const teamById = Object.fromEntries(
  teamCharacters.map((character) => [character.id, character]),
);

const requestedCharacter =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("character")
    : null;
export const localCharacterId =
  requestedCharacter && teamById[requestedCharacter] ? requestedCharacter : "chus";
const local = teamById[localCharacterId];
if (!local) throw new Error("Team pack is missing the local character");
export const localCharacter: SeedCharacter = local;

export type Vec2 = { x: number; z: number };

export const roomAnchors: Record<string, Vec2> = Object.fromEntries(
  zones.map((zone) => [zone.id, zone.anchor]),
);

export function roomLabel(id: string) {
  return teamPack.office.rooms.find((room) => room.id === id)?.name ?? id;
}
