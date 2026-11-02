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
  lounge: { x: -6.4, z: 3.6 },
  engineering: { x: 0.5, z: 2.2 },
  meeting: { x: 7, z: -4 },
  nap: { x: 9, z: 4.2 },
  kitchen: { x: -7.8, z: -6.2 },
  garden: { x: 8.5, z: 7.6 },
};

export function roomLabel(id: string) {
  return teamPack.office.rooms.find((room) => room.id === id)?.name ?? id;
}
