import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Status } from "@workbits/shared";
import { spawnFor, type Spawn } from "../data/spawns";
import { localCharacter, localCharacterId, teamCharacters } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAvatarStore } from "../state/avatar";
import { compileSpace, seatsOf, type Seat, type SpaceDoc } from "@workbits/shared";
import { shellOf, useSpace } from "../state/space";
import { useAppStore } from "../state/app";
import { palette } from "../theme";
import { EmoteBubble, TeamAvatar, type AvatarMotion, type AvatarPose } from "./avatars";
import { SpaceContents } from "./catalog";
import { DevBots } from "./DevBots";
import { StaticBatch } from "./StaticBatch";
import { RemotePlayers } from "./RemotePlayers";
import {
  Block,
  Wall,
} from "./props";
import { textures, withRepeat } from "./textures";

/*
 * Compact cutaway diorama, 15 x 11 on a stone plinth: the reference's four
 * zones plus a small nap nook, so people and props read big in frame.
 *
 *   x -7.5 ................................... +7.5
 *   z -5.5 [ meeting (glass) ] [ kitchen run ...... fridge pantry door ]
 *          [                 ] [   aisle                                ]
 *          [ lounge  ]  [ 2x2 bench ]                     bookcase  tree
 *   z +5.5 [         ]  [           ]                     [ nap nook  ]
 *
 * Rear (z = -5.5) and left (x = -7.5) walls are cut away at 2.7; front and
 * right are open so the camera sees in. Zone boundaries live in
 * packages/shared/src/zones.ts.
 */

const HALF_PI = Math.PI / 2;


const tone = {
  charcoal: "#3f444c",
  plinth: "#ece3d3",
  plinthCap: "#f6f0e6",
  plinthFoot: "#d3c6b3",
};




/* ------------------------------------------------------------------ */
/* Shell: plinth, floor, walls                                         */
/* ------------------------------------------------------------------ */

function Floor() {
  const setTarget = useAppStore((state) => state.setTarget);
  const doc = useSpace((state) => state.doc);
  const FLOOR = useMemo(() => shellOf(doc).slab, [doc]);
  // One continuous pale microcement floor, like the reference; rugs define zones.
  const concrete = useMemo(() => withRepeat(textures.concrete, FLOOR.width / 5, FLOOR.depth / 5), [FLOOR]);
  return (
    <group position={[FLOOR.cx, 0, FLOOR.cz]}>
      {/* Thick pale limestone plinth: inset foot for a shadow line, slab, bright cap. */}
      <Block size={[FLOOR.width, 0.18, FLOOR.depth]} position={[0, -0.99, 0]} color={tone.plinthFoot} radius={0.04} />
      <Block size={[FLOOR.width + 0.3, 0.86, FLOOR.depth + 0.3]} position={[0, -0.47, 0]} color={tone.plinth} radius={0.05} />
      <Block size={[FLOOR.width + 0.36, 0.05, FLOOR.depth + 0.36]} position={[0, -0.03, 0]} color={tone.plinthCap} radius={0.02} />
      <mesh
        receiveShadow
        onPointerDown={(event) => {
          event.stopPropagation();
          setTarget({ x: event.point.x, z: event.point.z });
        }}
      >
        <boxGeometry args={[FLOOR.width, 0.04, FLOOR.depth]} />
        <meshStandardMaterial map={concrete} roughness={0.55} />
      </mesh>
    </group>
  );
}

/**
 * Fake sun through tall windows: soft pane-shaped pools of warm light laid on
 * the floor with additive blending, skewed along the sun direction. Cheap,
 * and it's the signature of the reference's lighting.
 */
/** Positions as fractions of the floor (taken from the 15 × 11 loft), so any size gets the same light. */
const SUN_PATCHES: Array<{ fx: number; fz: number; w: number; d: number }> = [
  { fx: (-5.5 + 7.46) / 15.16, fz: (4.4 + 5.46) / 11.21, w: 3.0, d: 1.8 },
  { fx: (-0.9 + 7.46) / 15.16, fz: (3.6 + 5.46) / 11.21, w: 3.4, d: 2.0 },
  { fx: (3.2 + 7.46) / 15.16, fz: (-1.2 + 5.46) / 11.21, w: 3.2, d: 1.9 },
];

function SunPatches() {
  const floor = useSpace((state) => state.doc.floor);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: textures.sunPatch,
        color: "#ffc98a",
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  return (
    <group>
      {SUN_PATCHES.map((patch) => (
        <mesh
          key={`${patch.fx}|${patch.fz}`}
          position={[floor.x + patch.fx * floor.w, 0.045, floor.z + patch.fz * floor.d]}
          rotation={[-HALF_PI, 0, 0.62]}
          scale={[patch.w, patch.d, 1]}
          material={material}
          raycast={() => null}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}

function Walls() {
  const doc = useSpace((state) => state.doc);
  const shell = useMemo(() => shellOf(doc), [doc]);
  const { westX, northZ, eastX, southZ, height } = shell;
  const northCenter = (westX + eastX) / 2;
  const northLength = eastX - westX + 0.14;
  const westCenter = (northZ + southZ) / 2;
  const westLength = southZ - northZ - 0.09;
  const openings = (wall: "north" | "west", center: number) =>
    doc.shell.openings
      .filter((opening) => opening.wall === wall)
      .map(({ at, width, bottom, top, kind, curtain }) => ({ at: at - center, width, bottom, top, kind, curtain }));
  return (
    <group>
      <Wall position={[northCenter, 0, northZ]} length={northLength} height={height} openings={openings("north", northCenter)} />
      <Wall
        position={[westX, 0, westCenter]}
        rotation={[0, HALF_PI, 0]}
        length={westLength}
        height={height}
        openings={openings("west", westCenter)}
      />
      {/* Charcoal pilasters where the cut walls end. */}
      <Block size={[0.26, height + 0.06, 0.3]} position={[eastX - 0.08, (height + 0.06) / 2, northZ]} color={tone.charcoal} />
      <Block size={[0.3, height + 0.06, 0.26]} position={[westX, (height + 0.06) / 2, southZ - 0.1]} color={tone.charcoal} />
      <Block size={[0.3, height + 0.06, 0.3]} position={[westX, (height + 0.06) / 2, northZ]} color={tone.charcoal} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */







/** The daybed in the nap nook (a default-loft item), where Theo sleeps. */
const NAP_BED = { x: 6.4, z: 3.85 };


/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  pose?: AvatarPose;
  motion?: AvatarMotion;
};

/** Cast members who sit at a bench seat (index into the active desks). */
const seated: Record<string, { seat: number; motion?: AvatarMotion }> = {
  fern: { seat: 0, motion: "type" },
  mira: { seat: 2 },
  felix: { seat: 5, motion: "type" },
};

const placements: Record<string, Placement> = {
  jules: { position: [2.6, 0, -3.35], rotation: [0, 0.55, 0], motion: "wave" },
  clawd: { position: [1.4, 0, -2.75], rotation: [0, 0.9, 0] },
  // Sunk into the beanbag, like the persona picture.
  arlo: { position: [-5.15, 0.3, 0.55], rotation: [0, 0.5, 0] },
  // Head on the pillow end of the daybed.
  theo: { position: [NAP_BED.x, 0.68, NAP_BED.z - 0.8], rotation: [0, 0, 0], pose: "sleeping" },
};

/**
 * Where the unseated cast stands in an office built from a template: Theo on
 * the daybed, Arlo on a beanbag or in the lounge, Jules and Claw'd in the
 * kitchen. Undefined means "not in this office" (no daybed, no room).
 */
function placementsIn(doc: SpaceDoc): Record<string, Placement | undefined> {
  if (doc.id === "default-loft") return placements;
  const room = (id: string) => doc.rooms.find((candidate) => candidate.id === id);
  const bed = doc.items.find((item) => item.key === "Daybed");
  const beanbag = doc.items.find((item) => item.key === "Beanbag");
  const kitchen = room("kitchen")?.anchor;
  const lounge = room("lounge")?.anchor;
  const pillow = (rot: number) => ({ x: -Math.sin(rot) * 0.8, z: -Math.cos(rot) * 0.8 });
  return {
    theo: bed
      ? {
          position: [bed.at.x + pillow(bed.rot ?? 0).x, 0.68, bed.at.z + pillow(bed.rot ?? 0).z],
          rotation: [0, bed.rot ?? 0, 0],
          pose: "sleeping",
        }
      : undefined,
    arlo: beanbag
      ? { position: [beanbag.at.x + 0.07, 0.3, beanbag.at.z + 0.13], rotation: [0, beanbag.rot ?? 0, 0] }
      : lounge
        ? { position: [lounge.x, 0, lounge.z], rotation: [0, 0.5, 0] }
        : undefined,
    jules: kitchen ? { position: [kitchen.x - 0.6, 0, kitchen.z], rotation: [0, 0.55, 0], motion: "wave" } : undefined,
    clawd: kitchen ? { position: [kitchen.x + 0.7, 0, kitchen.z + 0.4], rotation: [0, 0.9, 0] } : undefined,
  };
}

function placementFor(id: string, seats: Seat[], doc: SpaceDoc): Placement | undefined {
  const seat = seated[id];
  if (seat && seats.length > 0) {
    const chair = seats[seat.seat % seats.length]!;
    return {
      position: [chair.x, 0.08, chair.z],
      rotation: [0, chair.rotation, 0],
      pose: "sitting",
      motion: seat.motion,
    };
  }
  return placementsIn(doc)[id];
}

function Team() {
  const players = useRealtimeStore((state) => state.players);
  const doc = useSpace((state) => state.doc);
  const seats = useMemo(() => seatsOf(doc), [doc]);
  const occupied = new Set([
    localCharacterId,
    ...Object.values(players).map((player) => player.characterId),
  ]);
  return (
    <group>
      {teamCharacters
        .filter((character) => character.id !== localCharacterId)
        .map((character) => {
          const placement = placementFor(character.id, seats, doc);
          if (!placement) return null;
          return (
            <TeamAvatar
              key={character.id}
              character={character}
              position={placement.position}
              rotation={placement.rotation}
              pose={placement.pose}
              motion={placement.motion}
              speaking={false}
              hidden={occupied.has(character.id)}
            />
          );
        })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Local player                                                        */
/* ------------------------------------------------------------------ */

const START: Spawn = spawnFor(localCharacterId);

/** The loft compiled with the current desk layout: walls, furniture and the walkable grid. */
function useLoft() {
  const doc = useSpace((state) => state.doc);
  return useMemo(() => compileSpace(doc), [doc]);
}

function LocalPlayer() {
  const customAvatar = useAvatarStore((state) => state.config);
  const localStatus = useRealtimeStore((state) => state.localStatus);
  const localEmote = useRealtimeStore((state) =>
    state.sessionId ? state.emotes[state.sessionId]?.kind : undefined,
  );
  const character = useMemo(
    () => ({
      ...localCharacter,
      ...(customAvatar ? { avatar: customAvatar } : {}),
      status: localStatus as Status,
    }),
    [customAvatar, localStatus],
  );
  const target = useAppStore((state) => state.target);
  const setTarget = useAppStore((state) => state.setTarget);
  const group = useRef<THREE.Group>(null);
  const loft = useLoft();
  const position = useRef<THREE.Vector3 | null>(null);
  if (!position.current) {
    const start = loft.nearestWalkable({ x: START[0], z: START[2] });
    position.current = new THREE.Vector3(start.x, 0, start.z);
  }
  /** Waypoints toward the current click target, from A* on the walkable grid. */
  const path = useRef<{ x: number; z: number }[]>([]);
  const correction = useRealtimeStore((state) => state.correction);
  const keys = useRef<Record<string, boolean>>({});
  const movingRef = useRef(false);
  const lastSent = useRef(0);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        keys.current[key] = true;
        event.preventDefault();
        setTarget(null);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setTarget]);

  useEffect(() => {
    const here = position.current!;
    path.current = target ? (loft.findPath({ x: here.x, z: here.z }, target)?.slice(1) ?? []) : [];
    if (target && path.current.length === 0) setTarget(null);
  }, [loft, setTarget, target]);

  // The server rejected a step (through a wall, or too fast): snap back to its spot.
  useEffect(() => {
    if (!correction) return;
    position.current!.set(correction.x, 0, correction.z);
    path.current = [];
    setTarget(null);
  }, [correction, setTarget]);

  useFrame((_, delta) => {
    const node = group.current;
    const here = position.current;
    if (!node || !here) return;

    let dx = 0;
    let dz = 0;
    const keyState = keys.current;
    if (keyState.w || keyState.arrowup) dz -= 1;
    if (keyState.s || keyState.arrowdown) dz += 1;
    if (keyState.a || keyState.arrowleft) dx -= 1;
    if (keyState.d || keyState.arrowright) dx += 1;

    if (dx !== 0 || dz !== 0) {
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      const step = 2.5 * delta;
      // Slide along walls and furniture: try the full step, then each axis alone.
      const options = [
        [here.x + dx * step, here.z + dz * step],
        [here.x + dx * step, here.z],
        [here.x, here.z + dz * step],
      ] as const;
      const next = options.find(([x, z]) => loft.walkable(x, z));
      if (next) {
        here.x = next[0];
        here.z = next[1];
      }
    } else if (path.current.length > 0) {
      const waypoint = path.current[0]!;
      const goal = path.current[path.current.length - 1]!;
      const offsetX = waypoint.x - here.x;
      const offsetZ = waypoint.z - here.z;
      const distance = Math.hypot(offsetX, offsetZ);
      const remaining = Math.hypot(goal.x - here.x, goal.z - here.z);
      // Never step past the waypoint: at low frame rates a full step would
      // overshoot and jitter around it (across zone edges) instead of landing.
      const step = Math.min(distance, Math.min(2.9, 1.1 + remaining) * delta);
      if (distance > 1e-6) {
        here.x += (offsetX / distance) * step;
        here.z += (offsetZ / distance) * step;
        dx = offsetX;
        dz = offsetZ;
      }
      if (distance - step < 0.02) {
        path.current.shift();
        if (path.current.length === 0) setTarget(null);
      }
    }

    node.position.set(here.x, 0, here.z);

    if (dx !== 0 || dz !== 0) {
      const desired = Math.atan2(dx, dz);
      let difference = desired - node.rotation.y;
      while (difference > Math.PI) difference -= Math.PI * 2;
      while (difference < -Math.PI) difference += Math.PI * 2;
      node.rotation.y += difference * Math.min(1, delta * 10);
    }

    const isMoving = dx !== 0 || dz !== 0;
    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving;
      setMoving(isMoving);
    }

    const now = Date.now();
    if (now - lastSent.current > (isMoving ? 70 : 450)) {
      lastSent.current = now;
      useRealtimeStore.getState().setLocalPosition({ x: here.x, z: here.z });
      useRealtimeStore.getState().sendMove({
        x: here.x,
        z: here.z,
        rotation: node.rotation.y,
        moving: isMoving,
      });
    }
  });

  return (
    <group ref={group} position={[position.current.x, 0, position.current.z]}>
      <TeamAvatar
        character={character}
        position={[0, 0, 0]}
        pose="standing"
        motion={localEmote === "wave" ? "wave" : moving ? "walk" : "idle"}
        isLocal
      />
      <EmoteBubble kind={localEmote} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Interaction                                                         */
/* ------------------------------------------------------------------ */

function MoveTarget() {
  const target = useAppStore((state) => state.target);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ring.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08;
    ring.current.scale.setScalar(pulse);
    const material = ring.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 4) * 0.12;
  });
  if (!target) return null;
  return (
    <group position={[target.x, 0.15, target.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.25, 28]} />
        <meshBasicMaterial
          color={palette.accent}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Office                                                              */
/* ------------------------------------------------------------------ */

/** Art bench: `?art&noCast` hides every character so props can be compared against the reference. */
const NO_CAST = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("noCast");

export function Office() {
  const doc = useSpace((state) => state.doc);
  return (
    <group>
      {/* Everything static merges into a few draw calls; rebuilt when the office changes. */}
      <StaticBatch key={doc.id + doc.items.length}>
        <Floor />
        <Walls />
        <SpaceContents doc={doc} />
      </StaticBatch>
      <SunPatches />
      {!NO_CAST && (
        <>
          <Team />
          <RemotePlayers />
          <DevBots />
          <LocalPlayer />
        </>
      )}
      <MoveTarget />
    </group>
  );
}
