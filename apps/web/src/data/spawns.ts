import { characterSpawns } from "@workbits/shared";

export type Spawn = [number, number, number];

/** Seed spawn for a character (shared with the server); the scene snaps it onto walkable ground. */
export function spawnFor(characterId: string): Spawn {
  const spawn = characterSpawns[characterId] ?? characterSpawns.chus!;
  return [spawn.x, 0, spawn.z];
}
