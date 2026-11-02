import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { localCharacter, localCharacterId, teamCharacters } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore } from "../state/app";
import { palette } from "../theme";
import { TeamAvatar, type AvatarMotion, type AvatarPose } from "./avatars";
import { RemotePlayers } from "./RemotePlayers";
import {
  Armchair,
  Beanbag,
  Bed,
  Books,
  Cat,
  CoffeeTable,
  Desk,
  FloorLamp,
  GlassWall,
  Kitchen,
  Laptop,
  MeetingTable,
  MoneyCase,
  Monitor,
  Mug,
  OfficeChair,
  Plant,
  Rug,
  Shelf,
  Sofa,
  Stool,
  StringLights,
  Tree,
  Wall,
  WallArt,
  WallClock,
  Whiteboard,
} from "./props";
import { textures } from "./textures";

/* ------------------------------------------------------------------ */
/* Floor + walls                                                       */
/* ------------------------------------------------------------------ */

function Floor() {
  const setTarget = useAppStore((state) => state.setTarget);
  return (
    <group>
      <mesh position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={palette.water} roughness={0.95} />
      </mesh>
      <RoundedBox args={[27.8, 0.4, 19.8]} radius={0.12} position={[0, -0.33, 0]} receiveShadow>
        <meshStandardMaterial color={palette.grass} roughness={1} />
      </RoundedBox>
      <RoundedBox
        args={[26.4, 0.34, 18.4]}
        radius={0.1}
        position={[0, -0.14, 0]}
        receiveShadow
        onPointerDown={(event) => {
          event.stopPropagation();
          setTarget({ x: event.point.x, z: event.point.z });
        }}
      >
        <meshStandardMaterial map={textures.wood} roughness={0.86} />
      </RoundedBox>
      <mesh position={[-7.8, 0.038, -6.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9.1, 3.7]} />
        <meshStandardMaterial map={textures.tile} roughness={0.82} />
      </mesh>
      <mesh position={[7, 0.038, -4.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8.4, 7.4]} />
        <meshStandardMaterial map={textures.tile} roughness={0.82} />
      </mesh>
      <mesh position={[9.2, 0.039, 4.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.4, 3.4]} />
        <meshStandardMaterial color="#e9dfcf" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Walls() {
  return (
    <group>
      <Wall position={[0, 0, -9.06]} length={26} height={2.8} windows={5} />
      <Wall
        position={[-13.06, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        length={18}
        height={2.8}
        windows={3}
      />
      <WallArt position={[-4.9, 1.72, -8.92]} variant={0} />
      <WallArt position={[0.9, 1.72, -8.92]} variant={1} width={1.45} height={1.1} />
      <WallClock position={[-7.6, 2.2, -8.92]} />
      <WallArt
        position={[-12.92, 1.72, 2.2]}
        rotation={[0, Math.PI / 2, 0]}
        variant={1}
        width={1.35}
        height={1.5}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

function Lounge() {
  return (
    <group>
      <Rug position={[-6.6, 0.095, 2.8]} width={7.4} depth={5.5} />
      <Sofa position={[-8.85, 0, 2.55]} rotation={[0, Math.PI / 2, 0]} />
      <CoffeeTable position={[-6.15, 0, 2.8]} />
      <Armchair position={[-4.5, 0, 1.2]} rotation={[0, 0.4, 0]} color={palette.terracotta} />
      <Armchair position={[-4.7, 0, 4.8]} rotation={[0, -Math.PI / 2, 0]} color={palette.terracotta} />
      <MoneyCase position={[-6.9, 0.48, 2.45]} rotation={[0, 0.4, 0]} />
      <FloorLamp position={[-9.6, 0, 6.3]} />
      <Shelf
        position={[-10.55, 0, 0.6]}
        rotation={[0, Math.PI / 2, 0]}
        width={1.7}
        height={1.85}
      />
      <Plant position={[-9.7, 0, 7.5]} scale={1.35} />
      <Plant position={[-3.9, 0, 7.35]} scale={0.85} />
      <Plant position={[-10.0, 0, 4.9]} scale={0.6} pot={palette.paper} />
      <Books position={[-6.4, 0.48, 3.1]} count={2} rotation={[0, 0.2, 0]} />
      <Mug position={[-5.7, 0.48, 2.5]} />
    </group>
  );
}

function Engineering() {
  return (
    <group>
      <Rug position={[-0.1, 0.095, 3.0]} width={8.2} depth={6.4} variant="cream" />
      <Desk position={[-1.2, 0, 1.45]} />
      <Desk position={[1.65, 0, 1.45]} variant={1} />
      <Desk position={[-1.2, 0, 4.7]} rotation={[0, Math.PI, 0]} variant={2} />
      <Desk position={[1.65, 0, 4.7]} rotation={[0, Math.PI, 0]} variant={3} />
      <OfficeChair position={[-1.2, 0, 2.4]} rotation={[0, Math.PI, 0]} color={palette.slate} accent={palette.sage} />
      <OfficeChair position={[1.65, 0, 2.4]} rotation={[0, Math.PI, 0]} color={palette.terracotta} accent={palette.sand} />
      <OfficeChair position={[-1.2, 0.0, 3.75]} rotation={[0, 0, 0]} color={palette.slate} accent={palette.terracotta} />
      <OfficeChair position={[1.65, 0.0, 3.75]} rotation={[0, 0, 0]} color={palette.slate} accent={palette.sage} />
      <RoundedBox args={[5.7, 0.5, 0.36]} radius={0.08} position={[0.2, 0.25, 3.1]} castShadow>
        <meshStandardMaterial color={palette.oakLight} roughness={0.8} />
      </RoundedBox>
      {[-1.5, 0.2, 1.9].map((x) => (
        <Plant key={x} position={[x, 0.5, 3.1]} scale={0.35} pot={palette.paper} />
      ))}
      <Whiteboard position={[4.75, 0, 2.4]} rotation={[0, -Math.PI / 2, 0]} />
      <Shelf position={[4.75, 0, 6.1]} rotation={[0, -Math.PI / 2, 0]} width={1.5} height={1.6} />
      <Plant position={[4.55, 0, 0.0]} scale={1.15} />
      <Plant position={[4.3, 0, 7.2]} scale={0.8} />
      <Mug position={[2.4, 0.81, 4.3]} />
    </group>
  );
}

function MeetingRoom() {
  return (
    <group>
      <Rug position={[7, 0.095, -4.5]} width={6.4} depth={5.2} variant="cream" />
      <GlassWall position={[4.9, 0, -1.06]} length={3.2} />
      <GlassWall position={[9.3, 0, -1.06]} length={3.2} />
      <GlassWall position={[3.3, 0, -4.5]} rotation={[0, Math.PI / 2, 0]} length={7.2} />
      <GlassWall position={[10.9, 0, -4.5]} rotation={[0, Math.PI / 2, 0]} length={7.2} />
      <MeetingTable position={[7, 0, -4.5]} />
      <Monitor position={[7, 1.35, -8.75]} width={1.12} height={0.64} />
      <Laptop position={[6.2, 0.84, -4.9]} rotation={[0, 0.4, 0]} />
      <Laptop position={[7.9, 0.84, -3.95]} rotation={[0, -0.5, 0]} />
      <Plant position={[10.15, 0, -7.75]} scale={0.95} />
      <Plant position={[3.8, 0, -7.7]} scale={0.7} pot={palette.paper} />
      <Mug position={[6.1, 0.84, -3.8]} />
      <Mug position={[7.55, 0.84, -4.1]} />
      <Shelf position={[9.7, 0, -7.2]} rotation={[0, -Math.PI / 2, 0]} width={1.6} height={1.15} />
      <Whiteboard position={[3.55, 0, -4.8]} rotation={[0, Math.PI / 2, 0]} />
      <RoundedBox args={[3.2, 0.8, 0.45]} radius={0.08} position={[7, 0.4, -8.35]} castShadow>
        <meshStandardMaterial color={palette.oak} roughness={0.75} />
      </RoundedBox>
      <Plant position={[8.2, 0.8, -8.35]} scale={0.42} />
      <Books position={[6.3, 0.82, -8.35]} count={3} />
      <Mug position={[7.6, 0.82, -8.35]} />
    </group>
  );
}

function KitchenArea() {
  return (
    <group>
      <Kitchen position={[-7.8, 0, -7.05]} />
      <Plant position={[-3.75, 0, -7.8]} scale={1.0} />
      <Shelf
        position={[-12.55, 0, -5.7]}
        rotation={[0, Math.PI / 2, 0]}
        width={1.2}
        height={1.55}
      />
      <Mug position={[-5.2, 1.0, -6.9]} />
      <Mug position={[-4.9, 1.0, -6.9]} />
    </group>
  );
}

function DiningNook() {
  return (
    <group>
      <Rug position={[-4.9, 0.095, -4.25]} width={3.6} depth={3.0} color="#eadcc8" />
      <CoffeeTable position={[-4.9, 0, -4.25]} />
      <Stool position={[-6.0, 0, -4.25]} />
      <Stool position={[-3.8, 0, -4.25]} />
      <Stool position={[-4.9, 0, -3.25]} />
      <Mug position={[-5.2, 0.48, -4.0]} />
      <Mug position={[-4.6, 0.48, -4.4]} />
      <Plant position={[-6.4, 0, -5.8]} scale={0.7} pot={palette.paper} />
    </group>
  );
}

function LibraryNook() {
  return (
    <group>
      <Rug position={[1.3, 0.095, -6.6]} width={4.6} depth={4.1} color="#e7ddcf" />
      <Shelf position={[1.3, 0, -8.55]} width={2.6} height={2.15} />
      <Armchair position={[0.2, 0, -5.4]} rotation={[0, Math.PI, 0]} color={palette.sage} />
      <Armchair position={[2.4, 0, -5.4]} rotation={[0, Math.PI, 0]} color={palette.terracotta} />
      <Plant position={[-0.6, 0, -8.0]} scale={1.0} />
      <FloorLamp position={[3.4, 0, -7.6]} />
      <Books position={[0.2, 0.6, -5.9]} count={3} />
      <Mug position={[2.2, 0.55, -5.9]} />
    </group>
  );
}

function NapRoom() {
  return (
    <group>
      <Rug position={[9.2, 0.095, 5.15]} width={3.8} depth={2.9} color="#e7dcc8" />
      <GlassWall
        position={[6.65, 0, 4.55]}
        rotation={[0, Math.PI / 2, 0]}
        length={4.8}
        height={1.85}
      />
      <Bed position={[9.2, 0, 4.8]} />
      <Shelf
        position={[11.7, 0, 2.3]}
        rotation={[0, -Math.PI / 2, 0]}
        width={1.2}
        height={1.55}
      />
      <FloorLamp position={[7.65, 0, 6.5]} />
      <Plant position={[11.35, 0, 6.8]} scale={0.95} pot={palette.paper} />
      <Plant position={[7.35, 0, 3.2]} scale={0.55} />
    </group>
  );
}

function Garden() {
  return (
    <group>
      <Tree position={[7.4, 0, 10.1]} scale={1.15} />
      <Tree position={[11.5, 0, 10.45]} scale={0.9} />
      <Tree position={[-10.8, 0, 10.0]} scale={1.0} />
      <StringLights position={[9.3, 0, 9.7]} length={7.5} />
      <Rug position={[9.1, 0.01, 9.3]} width={3.4} depth={2.2} color={palette.terracotta} />
      <CoffeeTable position={[9.1, 0, 9.3]} />
      <Stool position={[11.0, 0, 9.6]} />
      <Plant position={[5.9, 0, 9.3]} scale={0.75} />
    </group>
  );
}

function Pendant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.5, 6]} />
        <meshStandardMaterial color="#404856" metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <coneGeometry args={[0.42, 0.34, 20, 1, true]} />
        <meshStandardMaterial color={palette.oakLight} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <sphereGeometry args={[0.11, 14, 12]} />
        <meshBasicMaterial color="#ffe9c4" />
      </mesh>
      <pointLight position={[0, -0.05, 0]} intensity={0.8} distance={4.5} color="#ffd9a0" />
    </group>
  );
}

function Pendants() {
  return (
    <group>
      <Pendant position={[-7.8, 2.55, -6.7]} />
      <Pendant position={[7, 2.55, -4.5]} />
      <Pendant position={[-8.2, 2.55, 2.8]} />
      <Pendant position={[-1.2, 2.55, 3.1]} />
      <Pendant position={[-4.9, 2.55, -4.25]} />
      <Pendant position={[1.3, 2.55, -6.6]} />
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

const placements: Record<string, Placement> = {
  jules: { position: [-5.9, 0, 3.8], rotation: [0, 0.55, 0], motion: "wave" },
  mira: { position: [-4.5, 0.08, 1.2], rotation: [0, 0.4, 0], pose: "sitting" },
  felix: { position: [2.5, 0, 3.3], rotation: [0, -0.6, 0], pose: "standing", motion: "idle" },
  fern: { position: [-2.4, 0, 3.0], rotation: [0, 0.7, 0], pose: "standing", motion: "idle" },
  arlo: { position: [-2.6, 0.28, 5.2], rotation: [0, 0.5, 0], pose: "sitting" },
  theo: { position: [9.2, 0.68, 3.95], rotation: [0, 0, 0], pose: "sleeping" },
  clawd: { position: [-5.7, 0, 2.6], rotation: [0, 0.2, 0] },
};

function Team() {
  const players = useRealtimeStore((state) => state.players);
  const occupied = new Set([
    localCharacterId,
    ...Object.values(players).map((player) => player.characterId),
  ]);
  return (
    <group>
      <Beanbag position={[-2.6, 0, 5.2]} color="#e0b84f" />
      <Cat position={[-1.9, 0, 5.9]} rotation={[0, -0.7, 0]} />
      {teamCharacters
        .filter((character) => !occupied.has(character.id))
        .map((character) => {
          const placement = placements[character.id];
          if (!placement) return null;
          return (
            <TeamAvatar
              key={character.id}
              character={character}
              position={placement.position}
              rotation={placement.rotation}
              pose={placement.pose}
              motion={placement.motion}
              speaking={character.id === "jules"}
            />
          );
        })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Local player                                                        */
/* ------------------------------------------------------------------ */

const SPAWNS: Record<string, [number, number, number]> = {
  chus: [-3.5, 0, 6.5],
  jules: [-5.9, 0, 3.8],
  mira: [-4.5, 0, 1.2],
  felix: [2.5, 0, 3.3],
  fern: [-2.4, 0, 3.0],
  arlo: [-2.6, 0, 5.2],
  theo: [9.2, 0, 3.95],
  clawd: [-5.7, 0, 2.6],
};
const START = SPAWNS[localCharacterId] ?? SPAWNS.chus!;

function LocalPlayer() {
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

    position.current.x = THREE.MathUtils.clamp(position.current.x, -11.7, 11.7);
    position.current.z = THREE.MathUtils.clamp(position.current.z, -8.3, 8.8);
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
        character={localCharacter}
        position={[0, 0, 0]}
        pose="standing"
        motion={moving ? "walk" : "idle"}
        isLocal
      />
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
      <Lounge />
      <Engineering />
      <MeetingRoom />
      <KitchenArea />
      <DiningNook />
      <LibraryNook />
      <NapRoom />
      <Garden />
      <Pendants />
      <Team />
      <RemotePlayers />
      <LocalPlayer />
      <MoveTarget />
    </group>
  );
}
