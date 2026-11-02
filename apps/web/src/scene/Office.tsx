import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Status } from "@workbits/shared";
import { spawnFor, type Spawn } from "../data/spawns";
import { localCharacter, localCharacterId, teamCharacters } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAvatarStore } from "../state/avatar";
import { chairFor, useOfficeLayout, type DeskPlacement, type OfficeLayout } from "../state/officeLayout";
import { useAppStore } from "../state/app";
import { palette } from "../theme";
import { EmoteBubble, TeamAvatar, type AvatarMotion, type AvatarPose } from "./avatars";
import { RemotePlayers } from "./RemotePlayers";
import {
  Armchair,
  Bench,
  Block,
  Books,
  Cat,
  CoffeeTable,
  CommunalTable,
  Credenza,
  Daybed,
  Desk,
  DeskPartition,
  FloorLamp,
  FoldingScreen,
  Fridge,
  GlassWall,
  KitchenRun,
  MeetingTable,
  Mug,
  OfficeChair,
  Pendant,
  Plant,
  Planter,
  Pouf,
  Rug,
  Shelf,
  SideTable,
  SlatDivider,
  Sofa,
  Stool,
  TableLamp,
  TallCabinet,
  Tree,
  Vase,
  Wall,
  WallArt,
  WallClock,
  Whiteboard,
  type RugVariant,
} from "./props";
import { textures, withRepeat } from "./textures";

/*
 * Compact cutaway diorama, 20 x 14 on a stone plinth.
 *
 *   x -10 ......................................... +10
 *   z -7  [ meeting (glass) ] slats [ kitchen run ...... fridge pantry  door ]
 *         [                 ]       [   aisle                           ]
 *         [ lounge  ]   [ engineering 2x2 bench ]  planter  [ garden nook ]
 *   z +7  [         ]   [                       ]           [ nap nook    ]
 *
 * Rear (z = -7) and left (x = -10) walls are cut away at 2.7; front and
 * right are open so the camera sees in.
 */

const WALL_HEIGHT = 2.7;
const REAR_Z = -7.05;
const LEFT_X = -10.05;
const REAR_FACE = REAR_Z + 0.09;
const LEFT_FACE = LEFT_X + 0.09;
const HALF_PI = Math.PI / 2;

const BOUNDS = { minX: -9.6, maxX: 10.1, minZ: -6.55, maxZ: 7.1 };

const tone = {
  cream: "#f1ece3",
  charcoal: "#3f444c",
  plinth: "#ece3d3",
  plinthCap: "#f6f0e6",
  plinthFoot: "#d3c6b3",
  rust: "#c4633f",
};

/**
 * Bench centre for the default layout: four oversized desks joined 2 x 2.
 * Desks are ~1.4x a standard desk so the bench reads as the hero vignette;
 * chairFor's 0.95 offset still tucks the chairs right up to the front edge.
 */
const BENCH = { x: 1.4, z: 3.2 };
const BENCH_DESK = { width: 2.5, depth: 1.2 };
const BENCH_DESKS: DeskPlacement[] = [
  { id: "d1", x: BENCH.x - BENCH_DESK.width / 2, z: BENCH.z - BENCH_DESK.depth / 2, rotation: Math.PI, variant: 0 },
  { id: "d2", x: BENCH.x + BENCH_DESK.width / 2, z: BENCH.z - BENCH_DESK.depth / 2, rotation: Math.PI, variant: 1 },
  { id: "d3", x: BENCH.x - BENCH_DESK.width / 2, z: BENCH.z + BENCH_DESK.depth / 2, rotation: 0, variant: 2 },
  { id: "d4", x: BENCH.x + BENCH_DESK.width / 2, z: BENCH.z + BENCH_DESK.depth / 2, rotation: 0, variant: 3 },
];

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

function Floor() {
  const setTarget = useAppStore((state) => state.setTarget);
  const zones = useMemo(
    () => ({
      kitchen: withRepeat(textures.tile, 11.9 / 2.4, 4.1 / 2.4),
      garden: withRepeat(textures.stone, 3.7 / 1.5, 3.3 / 1.5),
    }),
    [],
  );
  return (
    <group>
      {/* Thick pale limestone plinth: inset foot for a shadow line, slab, bright cap. */}
      <Block size={[20.6, 0.18, 14.6]} position={[0, -0.99, 0]} color={tone.plinthFoot} radius={0.04} />
      <Block size={[20.9, 0.86, 14.9]} position={[0, -0.47, 0]} color={tone.plinth} radius={0.05} />
      <Block size={[20.96, 0.05, 14.96]} position={[0, -0.03, 0]} color={tone.plinthCap} radius={0.02} />
      <mesh
        receiveShadow
        onPointerDown={(event) => {
          event.stopPropagation();
          setTarget({ x: event.point.x, z: event.point.z });
        }}
      >
        <boxGeometry args={[20.6, 0.04, 14.6]} />
        <meshStandardMaterial map={textures.wood} roughness={0.82} />
      </mesh>
      <mesh position={[4.35, 0.024, -4.95]} rotation={[-HALF_PI, 0, 0]} receiveShadow>
        <planeGeometry args={[11.9, 4.1]} />
        <meshStandardMaterial map={zones.kitchen} roughness={0.7} />
      </mesh>
      <mesh position={[8.45, 0.024, 1.45]} rotation={[-HALF_PI, 0, 0]} receiveShadow>
        <planeGeometry args={[3.7, 3.3]} />
        <meshStandardMaterial map={zones.garden} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Walls() {
  return (
    <group>
      <Wall
        position={[-0.07, 0, REAR_Z]}
        length={20.14}
        height={WALL_HEIGHT}
        openings={[
          { at: -6.6 + 0.07, width: 2.3, bottom: 0.8, top: 2.25, kind: "window", curtain: true },
          { at: 9.2 + 0.07, width: 1.0, bottom: 0, top: 2.2, kind: "door" },
        ]}
      />
      <Wall position={[LEFT_X, 0, 0.02]} rotation={[0, HALF_PI, 0]} length={13.96} height={WALL_HEIGHT} />
      {/* Charcoal pilasters where the cut walls end. */}
      <Block size={[0.26, WALL_HEIGHT + 0.06, 0.3]} position={[9.92, (WALL_HEIGHT + 0.06) / 2, REAR_Z]} color={tone.charcoal} />
      <Block size={[0.3, WALL_HEIGHT + 0.06, 0.26]} position={[LEFT_X, (WALL_HEIGHT + 0.06) / 2, 6.9]} color={tone.charcoal} />
      <Block size={[0.3, WALL_HEIGHT + 0.06, 0.3]} position={[LEFT_X, (WALL_HEIGHT + 0.06) / 2, REAR_Z]} color={tone.charcoal} />
      <SlatDivider position={[-1.95, 0, -6.13]} rotation={[0, HALF_PI, 0]} length={1.66} height={2.62} />
      <WallClock position={[-1.62, 1.75, REAR_FACE + 0.03]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

/** Glass box, back-left: x -10..-2.4, z -7..-1.2, door gap at x -4.4..-3.4. */
function MeetingRoom() {
  return (
    <group>
      <GlassWall position={[-7.18, 0, -1.2]} length={5.56} height={2.6} />
      <GlassWall position={[-2.9, 0, -1.2]} length={1.0} height={2.6} />
      <GlassWall position={[-3.9, 2.2, -1.2]} length={1.0} height={0.4} />
      <GlassWall position={[-2.4, 0, -4.08]} rotation={[0, HALF_PI, 0]} length={5.76} height={2.6} />

      <Rug position={[-6.05, 0.035, -4.0]} width={6.3} depth={4.7} variant="cream" />
      <MeetingTable position={[-5.95, 0, -4.0]} length={4.8} width={1.7} chairScale={1.25} />
      <Pendant position={[-5.95, 1.72, -4.0]} kind="dome" drop={0.7} size={1.6} light />

      {/* Big print over a low credenza on the side wall, a tall one on the back. */}
      <WallArt position={[LEFT_FACE + 0.03, 1.62, -4.0]} rotation={[0, HALF_PI, 0]} variant={0} width={2.0} height={1.45} />
      <Credenza position={[LEFT_FACE + 0.25, 0, -4.0]} rotation={[0, HALF_PI, 0]} length={2.3} height={0.62} depth={0.42} />
      <Vase position={[LEFT_FACE + 0.25, 0.62, -4.75]} color="#e8dccb" />
      <Books position={[LEFT_FACE + 0.25, 0.62, -3.9]} count={3} rotation={[0, 1.4, 0]} />
      <Plant position={[LEFT_FACE + 0.25, 0.62, -3.2]} scale={0.5} pot={palette.terracotta} kind="trailing" />
      <WallArt position={[-3.95, 1.55, REAR_FACE + 0.03]} variant={1} width={1.1} height={1.4} />

      <Plant position={[-9.2, 0, -6.2]} scale={1.2} pot={tone.cream} kind="tall" />
      <Plant position={[-3.05, 0, -6.3]} scale={1.2} pot={tone.cream} kind="leafy" />
      <Plant position={[-9.35, 0, -1.8]} scale={1.15} pot={palette.terracotta} kind="leafy" />
      {/* Large plant in the front glass corner, inside the room. */}
      <Plant position={[-3.0, 0, -1.8]} scale={1.2} pot={tone.cream} kind="leafy" />
    </group>
  );
}

/** Back-right: long rear run, fridge, pantry, communal table, bistro perch. */
function KitchenArea() {
  return (
    <group>
      <KitchenRun position={[2.1, 0, REAR_FACE + 0.33]} length={6.8} />
      <Fridge position={[6.05, 0, REAR_FACE + 0.35]} />
      <TallCabinet position={[7.0, 0, REAR_FACE + 0.32]} height={2.25} />
      <Plant position={[7.0, 2.25, REAR_FACE + 0.3]} scale={0.62} pot={tone.cream} kind="trailing" />
      <Plant position={[8.1, 0, -6.3]} scale={1.2} pot={tone.cream} kind="leafy" />
      <WallArt position={[8.12, 1.72, REAR_FACE + 0.03]} variant={0} width={1.0} height={1.25} />
      {/* Big floor plant beside the slats, framing the coffee station. */}
      <Plant position={[-1.3, 0, -4.75]} scale={1.3} pot={tone.cream} kind="tall" />
      <Rug position={[2.6, 0.035, -5.85]} width={2.6} depth={0.75} variant="lines" />

      {/* Communal oak table on the tile, aisle kept along the counter. */}
      <Rug position={[4.3, 0.035, -4.12]} width={3.5} depth={2.5} variant="sage" />
      <CommunalTable position={[4.3, 0, -4.15]} />
      <Pendant position={[4.3, 1.78, -4.15]} kind="dome" drop={0.55} size={1.15} />

      <SideTable position={[7.7, 0, -4.3]} height={1.02} />
      <Mug position={[7.62, 1.02, -4.25]} color={palette.sage} />
      <Plant position={[7.78, 1.02, -4.36]} scale={0.26} pot={palette.paper} kind="succulent" />
      <Stool position={[7.15, 0, -4.0]} color={palette.sage} />
      <Stool position={[8.25, 0, -4.6]} color={palette.terracotta} />

      {/* Right strip: tall bookcase facing the room, plants either side. */}
      <Shelf position={[9.45, 0, -2.2]} width={1.5} height={1.95} depth={0.38} seed={6} />
      <Plant position={[8.2, 0, -2.4]} scale={1.15} pot={palette.terracotta} kind="leafy" />
      <Plant position={[9.85, 0, -1.25]} scale={1.0} pot={tone.cream} kind="bush" />
      <Plant position={[9.05, 0, -1.4]} scale={0.6} pot={palette.paper} kind="trailing" />
    </group>
  );
}

/** Centre-right: soft reading corner on a round jute rug, between kitchen and planter. */
function ReadingNook() {
  return (
    <group>
      <Rug position={[5.0, 0.035, -1.1]} width={3.1} depth={3.1} variant="jute" shape="round" />
      <CoffeeTable position={[5.0, 0, -1.0]} scale={1.1} radius={0.6} />
      <Armchair position={[3.95, 0, -1.85]} rotation={[0, 0.88, 0]} color={palette.sage} />
      <Armchair position={[6.05, 0, -1.85]} rotation={[0, -0.88, 0]} color={palette.terracotta} />
      <Pouf position={[5.4, 0, 0.1]} scale={0.9} color="#e9dcc6" />
      <SideTable position={[3.45, 0, -0.8]} height={0.55} />
      <TableLamp position={[3.42, 0.55, -0.86]} />
      <Mug position={[3.55, 0.55, -0.7]} color={palette.paper} />
      <FloorLamp position={[6.75, 0, -2.35]} light={false} />
      <Plant position={[3.05, 0, -2.2]} scale={1.05} pot={tone.cream} kind="tall" />
      <Plant position={[6.6, 0, -0.15]} scale={0.95} pot={palette.terracotta} kind="leafy" />
      <Pendant position={[5.0, 1.95, -1.0]} kind="cone" drop={0.45} size={1.3} />
    </group>
  );
}

/** Left/front: big sage sofa on the left wall, one ivory rug, coffee table, pouf. */
function Lounge() {
  return (
    <group>
      <Rug position={[-7.2, 0.035, 2.6]} width={5.2} depth={4.8} variant="ivory" />
      <Sofa position={[-9.3, 0, 2.6]} rotation={[0, HALF_PI, 0]} scale={1.2} pillows={[tone.rust, "#f4ecdc", "#ead9c0"]} />
      <CoffeeTable position={[-7.35, 0, 2.6]} scale={1.2} />
      <Pouf position={[-7.9, 0, 4.45]} scale={1.2} color={palette.terracotta} />
      <Armchair position={[-5.85, 0, 1.35]} rotation={[0, -Math.PI / 4, 0]} color="#ece0cc" />
      <Cat position={[-6.4, 0.06, 4.55]} rotation={[0, -0.7, 0]} />

      <SideTable position={[-9.45, 0, 0.45]} />
      <TableLamp position={[-9.5, 0.55, 0.4]} />
      <Mug position={[-9.35, 0.55, 0.58]} color={palette.terracotta} />
      <FloorLamp position={[-9.5, 0, 4.75]} />

      <WallArt position={[LEFT_FACE + 0.03, 1.92, 2.6]} rotation={[0, HALF_PI, 0]} variant={1} width={2.1} height={1.3} />
      <WallArt position={[LEFT_FACE + 0.03, 1.75, -0.2]} rotation={[0, HALF_PI, 0]} variant={2} width={0.5} height={0.65} />
      <WallArt position={[LEFT_FACE + 0.03, 1.72, 5.45]} rotation={[0, HALF_PI, 0]} variant={2} width={0.75} height={0.95} />

      <Shelf position={[-7.3, 0, 6.45]} width={2.6} height={0.85} depth={0.36} seed={2} />
      <Plant position={[-9.12, 0, 6.15]} scale={1.2} pot={tone.cream} kind="tall" />
      <Plant position={[-9.4, 0, -0.45]} scale={0.9} pot={palette.terracotta} kind="bush" />
      <Plant position={[-4.75, 0, 0.35]} scale={1.1} pot={tone.cream} kind="leafy" />
      <Plant position={[-5.15, 0, 6.4]} scale={1.0} pot={palette.terracotta} kind="leafy" />
    </group>
  );
}

const chairPalette = [
  { color: "#7d8894", accent: "#f2efe9" },
  { color: "#8b97a3", accent: "#f2efe9" },
  { color: "#7d8894", accent: "#e7e2d9" },
  { color: "#6f7b88", accent: "#f2efe9" },
];

/** Centre/front: joined bench with a planted spine, planter divider on the right. */
function Engineering() {
  const layout = useOfficeLayout((state) => state.layout);
  const desks = desksFor(layout);
  const bench = layout.id === "default";
  return (
    <group>
      <Rug position={[BENCH.x, 0.035, BENCH.z]} width={bench ? 6.4 : 6.0} depth={bench ? 4.8 : 4.7} variant={benchRug[layout.rug]} />
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
      {bench && <DeskPartition position={[BENCH.x, 0, BENCH.z]} length={BENCH_DESK.width * 2} depth={BENCH_DESK.depth} />}
      <Pendant position={[BENCH.x, 2.05, BENCH.z]} kind="bar" length={bench ? 4.2 : 3.0} drop={0.6} light />

      <Whiteboard position={[-2.55, 0, BENCH.z]} rotation={[0, HALF_PI, 0]} stand />
      <Plant position={[-2.9, 0, 0.75]} scale={1.0} pot={tone.cream} kind="tall" />
      <Plant position={[-2.85, 0, 5.6]} scale={0.95} pot={palette.terracotta} kind="leafy" />

      <Credenza position={[3.9, 0, 0.45]} length={1.8} />
      <Plant position={[3.3, 0.68, 0.45]} scale={0.5} pot={tone.cream} kind="bush" />
      <Books position={[4.0, 0.68, 0.45]} count={3} rotation={[0, -0.2, 0]} />
      <Vase position={[4.5, 0.68, 0.45]} color="#e8dccb" />

      <Planter position={[5.85, 0, 3.0]} rotation={[0, HALF_PI, 0]} length={4.0} width={0.5} height={0.5} />
      {/* Dense low planter along the front-right edge, foliage spilling over. */}
      <Planter position={[4.75, 0, 6.6]} length={3.0} width={0.55} height={0.42} />
    </group>
  );
}

/** Right strip, back half: an L of planters around a bench under a ficus. */
function GardenNook() {
  return (
    <group>
      <Tree position={[9.3, 0, 0.3]} scale={1.15} />
      <Planter position={[9.95, 0, 1.75]} rotation={[0, HALF_PI, 0]} length={2.0} width={0.4} height={0.4} />
      <Planter position={[8.75, 0, 2.85]} length={1.9} width={0.4} height={0.4} />
      <Bench position={[9.32, 0, 1.75]} rotation={[0, -HALF_PI, 0]} length={1.5} />
      <SideTable position={[8.72, 0, 1.85]} height={0.45} />
      <Mug position={[8.67, 0.45, 1.77]} color={palette.paper} />
      <Books position={[8.77, 0.45, 1.95]} count={2} rotation={[0, 0.4, 0]} />
      {/* Pot cluster at the back-left, layered small to large. */}
      <Plant position={[7.45, 0, 0.15]} scale={1.1} pot={tone.cream} kind="leafy" />
      <Plant position={[8.15, 0, -0.05]} scale={0.85} pot={palette.terracotta} kind="bush" />
      <Plant position={[7.85, 0, 0.6]} scale={0.7} pot={palette.paper} kind="succulent" />
      <Plant position={[7.05, 0, 2.45]} scale={1.05} pot={palette.terracotta} kind="tall" />
      <Plant position={[7.5, 0, 2.7]} scale={0.6} pot={tone.cream} kind="trailing" />
    </group>
  );
}

/** Right strip, front half: a compact nook behind low half-height glass. */
function NapNook() {
  return (
    <group>
      <GlassWall position={[8.675, 0, 3.4]} length={2.55} height={1.3} frosted />
      <GlassWall position={[7.4, 0, 4.5]} rotation={[0, HALF_PI, 0]} length={2.2} height={1.3} />
      <Rug position={[8.65, 0.035, 4.75]} width={2.3} depth={2.4} variant="blush" />
      <Daybed position={[8.75, 0, 4.85]} />
      <SideTable position={[7.78, 0, 3.85]} />
      <TableLamp position={[7.76, 0.55, 3.8]} light />
      <Books position={[7.86, 0.55, 3.97]} count={2} rotation={[0, -0.4, 0]} />
      <Plant position={[9.8, 0, 3.95]} scale={0.95} pot={palette.terracotta} kind="leafy" />
      <Planter position={[8.75, 0, 6.7]} length={1.7} width={0.4} height={0.38} />
      <Plant position={[9.85, 0, 6.2]} scale={0.95} pot={tone.cream} kind="leafy" />
      <FoldingScreen position={[7.55, 0, 6.3]} rotation={[0, 0.5, 0]} />
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
  felix: { seat: 1, motion: "type" },
  mira: { seat: 2 },
};

const placements: Record<string, Placement> = {
  jules: { position: [2.75, 0, -4.15], rotation: [0, 0.55, 0], motion: "wave" },
  clawd: { position: [3.35, 0, -3.0], rotation: [0, -2.6, 0] },
  arlo: { position: [-5.5, 0, 4.55], rotation: [0, -1.2, 0] },
  theo: { position: [8.75, 0.68, 4.05], rotation: [0, 0, 0], pose: "sleeping" },
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
        const speed = Math.min(2.9, 1.1 + distance);
        position.current.x += (offsetX / distance) * speed * delta;
        position.current.z += (offsetZ / distance) * speed * delta;
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

export function Office() {
  return (
    <group>
      <Floor />
      <Walls />
      <MeetingRoom />
      <KitchenArea />
      <ReadingNook />
      <Lounge />
      <Engineering />
      <GardenNook />
      <NapNook />
      <Team />
      <RemotePlayers />
      <LocalPlayer />
      <MoveTarget />
    </group>
  );
}
