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
import { useAppStore } from "../state/app";
import { palette } from "../theme";
import { EmoteBubble, TeamAvatar, type AvatarMotion, type AvatarPose } from "./avatars";
import { RemotePlayers } from "./RemotePlayers";
import {
  Beanbag,
  Block,
  Books,
  Cat,
  CoffeeTable,
  Credenza,
  Daybed,
  Desk,
  DeskPartition,
  FloorLamp,
  Fridge,
  GlassWall,
  Planter,
  KitchenRun,
  MeetingTable,
  OfficeChair,
  Pendant,
  Plant,
  Pouf,
  Rug,
  Sectional,
  Shelf,
  SideTable,
  SlatDivider,
  TableLamp,
  TallCabinet,
  Tree,
  Vase,
  Wall,
  WallArt,
  WallClock,
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
const REAR_FACE = REAR_Z + 0.09;
const LEFT_FACE = LEFT_X + 0.09;
const HALF_PI = Math.PI / 2;
const WALL_CENTER_X = (LEFT_X + RIGHT_X) / 2;

const BOUNDS = { minX: LEFT_FACE + 0.35, maxX: RIGHT_X + 0.1, minZ: REAR_FACE + 0.45, maxZ: FRONT_Z + 0.1 };

const tone = {
  cream: "#f1ece3",
  charcoal: "#3f444c",
  plinth: "#ece3d3",
  plinthCap: "#f6f0e6",
  plinthFoot: "#d3c6b3",
  rust: "#c4633f",
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
      <SlatDivider position={[-1.85, 0, -4.7]} rotation={[0, HALF_PI, 0]} length={1.5} height={2.62} />
      <WallClock position={[-1.45, 1.75, REAR_FACE + 0.03]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

/** Glass box, back-left: x -7.5..-2.2, z -5.5..-0.9, door gap at x -3.6..-2.7. */
function MeetingRoom() {
  return (
    <group>
      <GlassWall position={[-5.55, 0, -0.9]} length={3.9} height={2.6} />
      <GlassWall position={[-2.45, 0, -0.9]} length={0.5} height={2.6} />
      <GlassWall position={[-3.15, 2.2, -0.9]} length={0.9} height={0.4} />
      <GlassWall position={[-2.2, 0, -3.2]} rotation={[0, HALF_PI, 0]} length={4.6} height={2.6} />

      <Rug position={[-4.8, 0.035, -3.2]} width={4.6} depth={3.6} variant="cream" />
      <MeetingTable position={[-4.8, 0, -3.25]} length={3.4} width={1.45} chairScale={1.2} />
      <Pendant position={[-4.8, 1.62, -3.25]} kind="bell" drop={1.2} size={1.6} light />

      <WallArt position={[LEFT_FACE + 0.03, 1.62, -3.25]} rotation={[0, HALF_PI, 0]} variant={0} width={1.7} height={1.3} />
      <Credenza position={[LEFT_FACE + 0.25, 0, -3.25]} rotation={[0, HALF_PI, 0]} length={1.9} height={0.62} depth={0.42} />
      <Vase position={[LEFT_FACE + 0.25, 0.62, -3.85]} color="#e8dccb" />
      <Books position={[LEFT_FACE + 0.25, 0.62, -3.1]} count={3} rotation={[0, 1.4, 0]} />

      <Plant position={[-7.0, 0, -5.0]} scale={1.2} pot={tone.cream} kind="tall" />
      <Plant position={[-2.75, 0, -5.0]} scale={1.15} pot={tone.cream} kind="leafy" />
      <Plant position={[-7.05, 0, -1.4]} scale={1.1} pot={palette.terracotta} kind="leafy" />
    </group>
  );
}

/** Back-right: one long counter run on the rear wall, fridge, pantry, door. */
function KitchenArea() {
  return (
    <group>
      <KitchenRun position={[1.45, 0, REAR_FACE + 0.33]} length={5.8} />
      <Fridge position={[4.95, 0, REAR_FACE + 0.35]} />
      <TallCabinet position={[5.9, 0, REAR_FACE + 0.32]} height={2.25} />
      <Plant position={[5.9, 2.25, REAR_FACE + 0.3]} scale={0.62} pot={tone.cream} kind="trailing" />
      <Plant position={[7.05, 0, -4.4]} scale={1.2} pot={tone.cream} kind="leafy" />
      <Rug position={[1.6, 0.035, -4.4]} width={2.6} depth={0.75} variant="lines" />
    </group>
  );
}

/** Left/front: sage sofa on the left wall, one ivory rug, coffee table, pouf. */
function Lounge() {
  return (
    <group>
      <Rug position={[-5.6, 0.035, 2.7]} width={4.0} depth={4.4} variant="ivory" />
      {/* Corner sectional on the left wall, its return coming out at the back end. */}
      <Sectional position={[LEFT_FACE + 0.52, 0, 2.65]} rotation={[0, HALF_PI, 0]} scale={1.1} />
      <CoffeeTable position={[-5.3, 0, 2.95]} radius={0.62} scale={1.15} />
      <Pouf position={[-4.35, 0, 2.05]} scale={1.15} color={palette.terracotta} />
      <Beanbag position={[-5.22, 0, 0.42]} rotation={[0, 0.5, 0]} scale={1.4} />
      <Cat position={[-4.45, 0.06, 4.5]} rotation={[0, -0.7, 0]} />

      <SideTable position={[-7.0, 0, -0.35]} />
      <TableLamp position={[-7.05, 0.55, -0.4]} />
      <FloorLamp position={[-7.05, 0, 4.55]} />

      <WallArt position={[LEFT_FACE + 0.03, 1.92, 2.9]} rotation={[0, HALF_PI, 0]} variant={1} width={1.9} height={1.2} />

      <Shelf position={[-5.5, 0, 5.05]} width={2.2} height={0.8} depth={0.36} seed={2} />
      <Plant position={[-7.0, 0, 5.0]} scale={1.15} pot={tone.cream} kind="tall" />
      <Plant position={[-3.75, 0, -0.45]} scale={1.05} pot={tone.cream} kind="leafy" />
    </group>
  );
}

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
      {/* Long low planter on the open front edge, like the reference. */}
      <Planter position={[-1.3, 0, 5.0]} length={3.2} width={0.55} height={0.5} />
    </group>
  );
}

/** Right edge between the kitchen and the nap nook: a bookcase and a big tree. */
function RightEdge() {
  return (
    <group>
      <Shelf position={[6.55, 0, -1.9]} width={1.5} height={1.95} depth={0.38} seed={6} />
      <Tree position={[6.75, 0, 0.55]} scale={1.1} />
      <Plant position={[5.6, 0, -1.95]} scale={0.95} pot={palette.terracotta} kind="leafy" />
    </group>
  );
}

/** Front-right corner: a compact nook behind low half-height glass. */
const NAP_BED = { x: 6.4, z: 3.85 };

function NapNook() {
  return (
    <group>
      <GlassWall position={[6.05, 0, 2.0]} length={2.9} height={1.3} frosted />
      <GlassWall position={[4.6, 0, 3.1]} rotation={[0, HALF_PI, 0]} length={2.2} height={1.3} />
      <Rug position={[6.25, 0.035, 3.9]} width={2.3} depth={2.6} variant="blush" />
      <Daybed position={[NAP_BED.x, 0, NAP_BED.z]} />
      <SideTable position={[5.25, 0, 2.5]} />
      <TableLamp position={[5.23, 0.55, 2.45]} light />
      <Books position={[5.33, 0.55, 2.62]} count={2} rotation={[0, -0.4, 0]} />
      <Plant position={[7.1, 0, 5.05]} scale={0.95} pot={palette.terracotta} kind="leafy" />
    </group>
  );
}

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
  const position = useRef(new THREE.Vector3(...START));
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

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;

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
      const speed = 2.5;
      position.current.x += dx * speed * delta;
      position.current.z += dz * speed * delta;
    } else if (target) {
      const offsetX = target.x - position.current.x;
      const offsetZ = target.z - position.current.z;
      const distance = Math.hypot(offsetX, offsetZ);
      if (distance < 0.12) {
        setTarget(null);
      } else {
        // Never step past the target: at low frame rates a full step would
        // overshoot and jitter around it (across zone edges) instead of landing.
        const step = Math.min(distance, Math.min(2.9, 1.1 + distance) * delta);
        position.current.x += (offsetX / distance) * step;
        position.current.z += (offsetZ / distance) * step;
        dx = offsetX;
        dz = offsetZ;
      }
    }

    position.current.x = THREE.MathUtils.clamp(position.current.x, BOUNDS.minX, BOUNDS.maxX);
    position.current.z = THREE.MathUtils.clamp(position.current.z, BOUNDS.minZ, BOUNDS.maxZ);
    node.position.set(position.current.x, 0, position.current.z);

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
      useRealtimeStore.getState().setLocalPosition({
        x: position.current.x,
        z: position.current.z,
      });
      useRealtimeStore.getState().sendMove({
        x: position.current.x,
        z: position.current.z,
        rotation: node.rotation.y,
        moving: isMoving,
      });
    }
  });

  return (
    <group ref={group} position={START}>
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
      <MeetingRoom />
      <KitchenArea />
      <Lounge />
      <Engineering />
      <RightEdge />
      <NapNook />
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
