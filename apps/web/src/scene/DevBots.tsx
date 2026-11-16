import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { prng, spaceOf, type Point } from "@workbits/shared";
import { teamCharacters } from "../data/team";
import { useSpace } from "../state/space";
import { TeamAvatar } from "./avatars";
import { perfTools } from "../lib/perfMode";

/**
 * Dev-only load for performance measurement (`?bots=50`): avatars that walk
 * real paths between random walkable spots. Client-side only; each bot moves
 * its own group every frame without React re-renders, so the harness doesn't
 * distort what it measures.
 */
const count = (() => {
  if (!perfTools || typeof window === "undefined") return 0;
  return Math.max(0, Math.min(200, Number(new URLSearchParams(window.location.search).get("bots") ?? 0)));
})();

type Walker = { path: Point[]; x: number; z: number; rotation: number };

function Bot({ index }: { index: number }) {
  const doc = useSpace((state) => state.doc);
  const space = spaceOf(doc);
  const group = useRef<THREE.Group>(null);
  const humans = useMemo(() => teamCharacters.filter((character) => character.kind === "user"), []);
  const character = humans[index % humans.length]!;
  const rng = useMemo(() => prng(index * 977 + 13), [index]);
  const randomSpot = () => {
    const { floor } = doc;
    return space.nearestWalkable({ x: floor.x + rng() * floor.w, z: floor.z + rng() * floor.d });
  };
  const walker = useRef<Walker | null>(null);
  if (!walker.current) {
    const start = randomSpot();
    walker.current = { path: [], x: start.x, z: start.z, rotation: 0 };
  }

  useFrame((_, delta) => {
    const bot = walker.current!;
    const node = group.current;
    if (!node) return;
    if (bot.path.length === 0) bot.path = space.findPath(bot, randomSpot())?.slice(1) ?? [];
    const next = bot.path[0];
    if (next) {
      const dx = next.x - bot.x;
      const dz = next.z - bot.z;
      const distance = Math.hypot(dx, dz);
      const step = Math.min(distance, 1.4 * delta);
      if (distance > 1e-6) {
        bot.x += (dx / distance) * step;
        bot.z += (dz / distance) * step;
        bot.rotation = Math.atan2(dx, dz);
      }
      if (distance - step < 0.02) bot.path.shift();
    }
    node.position.set(bot.x, 0, bot.z);
    node.rotation.y = bot.rotation;
  });

  return (
    <group ref={group}>
      <TeamAvatar character={character} position={[0, 0, 0]} pose="standing" motion="walk" />
    </group>
  );
}

export function DevBots() {
  if (count === 0) return null;
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <Bot key={index} index={index} />
      ))}
    </group>
  );
}
