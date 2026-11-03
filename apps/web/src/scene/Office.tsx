import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Status } from "@workbits/shared";
import { spawnFor, type Spawn } from "../data/spawns";
import { localCharacter, localCharacterId, teamCharacters } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAvatarStore } from "../state/avatar";
import {
  BENCH_DESK,
  BENCH_DESKS,
  BENCH_PODS,
  chairFor,
  useOfficeLayout,
  type DeskPlacement,
  type OfficeLayout,
} from "../state/officeLayout";
import { compileSpace, defaultLoft, deskItems } from "@workbits/shared";
import { useAppStore } from "../state/app";
import { palette } from "../theme";
import { EmoteBubble, TeamAvatar, type AvatarMotion, type AvatarPose } from "./avatars";
import { SpaceContents } from "./catalog";
import { RemotePlayers } from "./RemotePlayers";
import {
  Block,
  Desk,
  DeskPartition,
  OfficeChair,
  Pendant,
  Rug,
  Wall,
  type RugVariant,
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

const WALL_HEIGHT = 2.7;
const REAR_Z = -5.55;
const LEFT_X = -7.55;
const RIGHT_X = 7.5;
const FRONT_Z = 5.5;
const HALF_PI = Math.PI / 2;
const WALL_CENTER_X = (LEFT_X + RIGHT_X) / 2;


const tone = {
  charcoal: "#3f444c",
  plinth: "#ece3d3",
  plinthCap: "#f6f0e6",
  plinthFoot: "#d3c6b3",
};

/** Custom layouts keep their own desks; their rug/pendant stay centred here. */
const POD = { x: 0, z: 3.0 };

/** The default layout renders as the joined bench; custom layouts keep their own desks. */
function desksFor(layout: OfficeLayout) {
  return layout.id === "default" ? BENCH_DESKS : layout.desks;
}

const benchRug: Record<OfficeLayout["rug"], RugVariant> = {
  cream: "lines",
  sage: "sage",
  terracotta: "terracotta",
};

/* ------------------------------------------------------------------ */
/* Shell: plinth, floor, walls                                         */
/* ------------------------------------------------------------------ */

const FLOOR = { width: RIGHT_X - LEFT_X + 0.5, depth: FRONT_Z - REAR_Z + 0.55 };

function Floor() {
  const setTarget = useAppStore((state) => state.setTarget);
  // One continuous pale microcement floor, like the reference; rugs define zones.
  const concrete = useMemo(() => withRepeat(textures.concrete, FLOOR.width / 5, FLOOR.depth / 5), []);
  return (
    <group>
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
const SUN_PATCHES: Array<{ x: number; z: number; w: number; d: number }> = [
  { x: -5.5, z: 4.4, w: 3.0, d: 1.8 },
  { x: -0.9, z: 3.6, w: 3.4, d: 2.0 },
  { x: 3.2, z: -1.2, w: 3.2, d: 1.9 },
];

function SunPatches() {
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
          key={`${patch.x}|${patch.z}`}
          position={[patch.x, 0.045, patch.z]}
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
  const rearLength = RIGHT_X - LEFT_X + 0.14;
  const leftLength = FRONT_Z - REAR_Z - 0.09;
  return (
    <group>
      <Wall
        position={[WALL_CENTER_X, 0, REAR_Z]}
        length={rearLength}
        height={WALL_HEIGHT}
        openings={[
          { at: -4.85 - WALL_CENTER_X, width: 2.1, bottom: 0.8, top: 2.25, kind: "window", curtain: true },
          { at: 6.75 - WALL_CENTER_X, width: 1.0, bottom: 0, top: 2.2, kind: "door" },
        ]}
      />
      <Wall position={[LEFT_X, 0, (REAR_Z + FRONT_Z) / 2]} rotation={[0, HALF_PI, 0]} length={leftLength} height={WALL_HEIGHT} />
      {/* Charcoal pilasters where the cut walls end. */}
      <Block size={[0.26, WALL_HEIGHT + 0.06, 0.3]} position={[RIGHT_X - 0.08, (WALL_HEIGHT + 0.06) / 2, REAR_Z]} color={tone.charcoal} />
      <Block size={[0.3, WALL_HEIGHT + 0.06, 0.26]} position={[LEFT_X, (WALL_HEIGHT + 0.06) / 2, FRONT_Z - 0.1]} color={tone.charcoal} />
      <Block size={[0.3, WALL_HEIGHT + 0.06, 0.3]} position={[LEFT_X, (WALL_HEIGHT + 0.06) / 2, REAR_Z]} color={tone.charcoal} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */




const chairPalette = [
  { color: "#56627a", accent: "#f2efe9" },
  { color: "#5e6a80", accent: "#f2efe9" },
  { color: "#525d73", accent: "#ebe6dd" },
  { color: "#5a667c", accent: "#f2efe9" },
];

/** Centre: two joined pods with planted spines, a long planter at the front. */
function Engineering() {
  const layout = useOfficeLayout((state) => state.layout);
  const desks = desksFor(layout);
  const bench = layout.id === "default";
  const centers = bench ? BENCH_PODS : [POD];
  return (
    <group>
      {centers.map((center) => (
        <group key={`${center.x}|${center.z}`}>
          <Rug position={[center.x, 0.035, center.z]} width={bench ? 4.6 : 6.0} depth={bench ? 3.8 : 4.4} variant={benchRug[layout.rug]} />
          <Pendant position={[center.x, 2.05, center.z]} kind="bar" length={3.0} drop={0.6} light />
          {bench && <DeskPartition position={[center.x, 0, center.z]} length={BENCH_DESK.width * 2} depth={BENCH_DESK.depth} />}
        </group>
      ))}
      {desks.map((desk) => {
        const chair = chairFor(desk);
        const colors = chairPalette[desk.variant % chairPalette.length] ?? chairPalette[0]!;
        return (
          <group key={desk.id}>
            <Desk
              position={[desk.x, 0, desk.z]}
              rotation={[0, desk.rotation, 0]}
              variant={desk.variant}
              panel={!bench}
              width={bench ? BENCH_DESK.width : undefined}
              depth={bench ? BENCH_DESK.depth : undefined}
            />
            <OfficeChair
              position={[chair.x, 0, chair.z]}
              rotation={[0, chair.rotation, 0]}
              color={colors.color}
              accent={colors.accent}
            />
          </group>
        );
      })}
    </group>
  );
}


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

function placementFor(id: string, desks: DeskPlacement[]): Placement | undefined {
  const seat = seated[id];
  if (seat && desks.length > 0) {
    const desk = desks[seat.seat % desks.length]!;
    const chair = chairFor(desk);
    return {
      position: [chair.x, 0.08, chair.z],
      rotation: [0, chair.rotation, 0],
      pose: "sitting",
      motion: seat.motion,
    };
  }
  return placements[id];
}

function Team() {
  const players = useRealtimeStore((state) => state.players);
  const layout = useOfficeLayout((state) => state.layout);
  const desks = desksFor(layout);
  const occupied = new Set([
    localCharacterId,
    ...Object.values(players).map((player) => player.characterId),
  ]);
  return (
    <group>
      {teamCharacters
        .filter((character) => character.id !== localCharacterId)
        .map((character) => {
          const placement = placementFor(character.id, desks);
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
  const layout = useOfficeLayout((state) => state.layout);
  return useMemo(
    () => compileSpace(defaultLoft, { extraItems: deskItems(desksFor(layout), layout.id === "default") }),
    [layout],
  );
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
  return (
    <group>
      <Floor />
      <SunPatches />
      <Walls />
      <SpaceContents doc={defaultLoft} />
      <Engineering />
      {!NO_CAST && (
        <>
          <Team />
          <RemotePlayers />
          <LocalPlayer />
        </>
      )}
      <MoveTarget />
    </group>
  );
}
