export type Spawn = [number, number, number];

export const characterSpawns: Record<string, Spawn> = {
  chus: [-3.6, 0, 4.2],
  jules: [2.6, 0, -3.35],
  mira: [-1.7, 0, 2.0],
  felix: [3.5, 0, 2.25],
  fern: [-1.7, 0, -0.9],
  arlo: [-5.15, 0, 0.55],
  theo: [6.4, 0, 3.05],
  clawd: [1.4, 0, -2.75],
};

export function spawnFor(characterId: string): Spawn {
  return characterSpawns[characterId] ?? characterSpawns.chus!;
}
