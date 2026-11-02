export type Spawn = [number, number, number];

export const characterSpawns: Record<string, Spawn> = {
  chus: [-3.5, 0, 6.5],
  jules: [-5.9, 0, 3.8],
  mira: [-4.5, 0, 1.2],
  felix: [2.5, 0, 3.3],
  fern: [-2.4, 0, 3.0],
  arlo: [-2.6, 0, 5.2],
  theo: [9.2, 0, 3.95],
  clawd: [-5.7, 0, 2.6],
};

export function spawnFor(characterId: string): Spawn {
  return characterSpawns[characterId] ?? characterSpawns.chus!;
}
