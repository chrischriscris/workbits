import manifest from "../../../../seeds/team/manifest.json";
import type { SeedCharacter, SeedPack } from "@workbits/shared";

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

export const roomAnchors: Record<string, Vec2> = {
  lounge: { x: -5.7, z: 2.6 },
  engineering: { x: 1.4, z: 5.6 },
  meeting: { x: -6.15, z: -2.2 },
  nap: { x: 7.7, z: 5.1 },
  kitchen: { x: 5.0, z: -4.8 },
  garden: { x: 8.2, z: 1.6 },
};

export function roomLabel(id: string) {
  return teamPack.office.rooms.find((room) => room.id === id)?.name ?? id;
}
