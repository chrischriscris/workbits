import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { teamCharacters } from "../data/team";
import { TeamAvatar, type AvatarMotion, type AvatarPose } from "./avatars";
import { OfficeChair } from "./props";

/**
 * Dev-only character bench (`?lineup`): the cast standing in a row, plus a
 * seated/typing and a sleeping row, at the office camera angle and light.
 */
const params = new URLSearchParams(window.location.search);
const zoom = Number(params.get("zoom") ?? 120);
const focus = (params.get("focus") ?? "0,0.9,0").split(",").map(Number) as [number, number, number];

export function Lineup() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.__WORKBITS_READY__ = true;
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const humans = teamCharacters;
  const seated: { id: string; pose: AvatarPose; motion?: AvatarMotion }[] = [
    { id: "fern", pose: "sitting", motion: "type" },
    { id: "felix", pose: "sitting", motion: "type" },
    { id: "mira", pose: "sitting" },
  ];

  return (
    <Canvas
      shadows
      orthographic
      camera={{ position: [20, 15, 20], zoom, near: -100, far: 200 }}
      style={{ position: "fixed", inset: 0, background: "#efe9df" }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.16;
        camera.position.set(20 + focus[0], 15 + focus[1], 20 + focus[2]);
        camera.lookAt(...focus);
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.22} color="#fff6ea" />
        <hemisphereLight args={["#fff8ec", "#e2d8c8", 0.68]} />
        <directionalLight castShadow position={[-10, 18, 8]} intensity={2.2} color="#fff1d9" shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[4, 8, 16]} intensity={0.48} color="#fff7e8" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#e9e1d4" roughness={0.95} />
        </mesh>
        {/* Row along the camera's screen-x axis: (1, 0, -1). */}
        {humans.map((character, index) => {
          const offset = (index - (humans.length - 1) / 2) * 1.25;
          return (
            <TeamAvatar
              key={character.id}
              character={character}
              position={[offset * 0.707, 0, -offset * 0.707]}
              rotation={[0, 0.785, 0]}
              pose="standing"
              motion={character.id === "jules" ? "wave" : "idle"}
            />
          );
        })}
        {seated.map((entry, index) => {
          const character = teamCharacters.find((c) => c.id === entry.id);
          if (!character) return null;
          const offset = (index - 1) * 1.5;
          const x = 2.4 + offset * 0.707;
          const z = 2.4 - offset * 0.707;
          return (
            <group key={entry.id}>
              <OfficeChair position={[x, 0, z]} rotation={[0, 0.785, 0]} />
              <TeamAvatar
                character={character}
                position={[x, 0.08, z]}
                rotation={[0, 0.785, 0]}
                pose={entry.pose}
                motion={entry.motion}
              />
            </group>
          );
        })}
      </Suspense>
    </Canvas>
  );
}
