export type Spawn = [number, number, number];

export const characterSpawns: Record<string, Spawn> = {
  chus: [-5.4, 0, 5.9],
  jules: [3.0, 0, -4.4],
  mira: [0.15, 0, 4.75],
  felix: [2.65, 0, 1.65],
  fern: [0.15, 0, 1.65],
  arlo: [-5.5, 0, 4.55],
  theo: [8.75, 0, 4.05],
  clawd: [4.1, 0, -4.15],
};

export function spawnFor(characterId: string): Spawn {
  return characterSpawns[characterId] ?? characterSpawns.chus!;
}
