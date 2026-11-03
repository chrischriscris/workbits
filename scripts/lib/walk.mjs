// Bots must walk like clients now (ADR-015): the server rejects teleports and
// steps through walls or furniture. This plans a path on the shared grid and
// sends it at walking pace.
import {
  BENCH_DESKS,
  characterSpawns,
  compileSpace,
  defaultLoft,
  deskItems,
} from "../../packages/shared/src/space/index.ts";

/** The default loft as a client sees it (client padding). */
export const loft = compileSpace(defaultLoft, { extraItems: deskItems(BENCH_DESKS, true) });
const serverLoft = compileSpace(defaultLoft, { radius: 0.12, extraItems: deskItems(BENCH_DESKS, true) });

/** Where the server puts a fresh join for this character. */
export function spawnOf(characterId) {
  return serverLoft.nearestWalkable(characterSpawns[characterId] ?? characterSpawns.chus);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Walk `room`'s player from `from` to (the walkable spot nearest) `to`. Returns where it ended, or null. */
export async function walkBot(room, from, to, { stepMs = 75, rotation = 0 } = {}) {
  const path = loft.findPath(from, to);
  if (!path) return null;
  let here = from;
  for (let i = 1; i < path.length; i += 1) {
    const start = path[i - 1];
    const leg = path[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(leg.x - start.x, leg.z - start.z) / 0.18));
    for (let s = 1; s <= steps; s += 1) {
      here = { x: start.x + ((leg.x - start.x) * s) / steps, z: start.z + ((leg.z - start.z) * s) / steps };
      room.send("move", { x: here.x, z: here.z, rotation, moving: s < steps || i < path.length - 1 });
      await sleep(stepMs);
    }
  }
  return here;
}
