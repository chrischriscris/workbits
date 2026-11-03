import manifest from "../../../../seeds/team/manifest.json";
import type { SeedCharacter, SeedPack } from "@workbits/shared";
import { roomAnchor, roomName } from "../state/space";

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

/** Where a seed character's home room is in the current office (falls back to the open floor). */
export function homeAnchor(roomId: string): Vec2 | null {
  return roomAnchor(roomId) ?? roomAnchor("engineering");
}

export function roomLabel(id: string) {
  const name = roomName(id);
  return name === "Office" ? (teamPack.office.rooms.find((room) => room.id === id)?.name ?? id) : name;
}
