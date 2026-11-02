import { Html, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SeedCharacter } from "@workbits/shared";
import { palette, statusColor } from "../theme";
import { Mat } from "./props";

export type AvatarPose = "standing" | "sitting" | "sleeping";
export type AvatarMotion = "idle" | "walk" | "wave" | "type";

function usePhase(id: string) {
  return useMemo(() => {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash * 31 + id.charCodeAt(index)) % 1000;
    }
    return (hash / 1000) * Math.PI * 2;
  }, [id]);
}

function NameTag({
  character,
  isLocal,
  hidden,
  y = 1.96,
}: {
  character: SeedCharacter;
  isLocal?: boolean;
  hidden?: boolean;
  y?: number;
}) {
  return (
    <Html
      position={[0, y, 0]}
      center
      zIndexRange={[30, 0]}
      style={{ pointerEvents: "none", userSelect: "none", display: hidden ? "none" : undefined }}
    >
      <div className={`name-tag${isLocal ? " name-tag--you" : ""}`}>
        <span
          className="name-tag__dot"
          style={{ background: statusColor[character.status] ?? palette.green }}
        />
        <span className="name-tag__name">{character.displayName}</span>
        {isLocal && <span className="name-tag__you">you</span>}
      </div>
    </Html>
  );
}

function VoiceRing({ active }: { active?: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ring.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08;
    ring.current.scale.setScalar(active ? pulse : 0.001);
    const material = ring.current.material as THREE.MeshBasicMaterial;
    material.opacity = active ? 0.55 + Math.sin(state.clock.elapsedTime * 4) * 0.12 : 0;
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
      <ringGeometry args={[0.32, 0.4, 32]} />
      <meshBasicMaterial
        color={palette.accent}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function Hair({ character }: { character: SeedCharacter }) {
  const hair = character.avatar.hair;
  if (!hair) return null;
  const color = hair.color;
  const style = hair.style;

  const cap = (
    <mesh position={[0, 0.04, -0.13]} scale={[1.02, 0.76, 0.92]} castShadow>
      <sphereGeometry args={[0.29, 20, 14]} />
      <Mat color={color} roughness={0.95} />
    </mesh>
  );

  if (style === "curly-medium") {
    return (
      <group>
        {cap}
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 8) * Math.PI * 2;
          return (
            <mesh
              key={index}
              position={[
                Math.cos(angle) * 0.2,
                0.12 + (index % 2) * 0.06,
                Math.sin(angle) * 0.16 - 0.02,
              ]}
              scale={[0.12, 0.11, 0.12]}
              castShadow
            >
              <sphereGeometry args={[1, 10, 8]} />
              <Mat color={index % 2 === 0 ? color : "#3d2a1e"} roughness={1} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (style === "wavy-medium" || style === "medium-swept") {
    return (
      <group>
        {cap}
        <mesh position={[-0.14, 0.16, 0.16]} scale={[0.15, 0.1, 0.1]} castShadow>
          <sphereGeometry args={[1, 12, 10]} />
          <Mat color={color} roughness={1} />
        </mesh>
        <mesh position={[0.11, 0.18, 0.17]} rotation={[0, 0, -0.25]} scale={[0.16, 0.08, 0.09]} castShadow>
          <sphereGeometry args={[1, 12, 10]} />
          <Mat color={color} roughness={1} />
        </mesh>
        <mesh position={[-0.25, 0.03, -0.06]} scale={[0.08, 0.2, 0.14]} castShadow>
          <sphereGeometry args={[1, 10, 10]} />
          <Mat color={color} roughness={1} />
        </mesh>
        <mesh position={[0.25, 0.03, -0.06]} scale={[0.08, 0.2, 0.14]} castShadow>
          <sphereGeometry args={[1, 10, 10]} />
          <Mat color={color} roughness={1} />
        </mesh>
      </group>
    );
  }

  if (style === "slick-short") {
    return (
      <group>
        {cap}
        <mesh position={[0.02, 0.22, 0.08]} rotation={[0, 0, -0.2]} scale={[0.22, 0.06, 0.18]} castShadow>
          <sphereGeometry args={[1, 14, 8]} />
          <Mat color={color} roughness={0.8} />
        </mesh>
        <mesh position={[-0.24, 0.04, -0.04]} scale={[0.06, 0.16, 0.12]} castShadow>
          <sphereGeometry args={[1, 10, 8]} />
          <Mat color={color} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {cap}
      <mesh position={[0.05, 0.17, 0.17]} scale={[0.2, 0.09, 0.1]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <Mat color={color} roughness={1} />
      </mesh>
      <mesh position={[-0.13, 0.1, 0.18]} scale={[0.11, 0.07, 0.1]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <Mat color={color} roughness={1} />
      </mesh>
    </group>
  );
}

function Beard({ character }: { character: SeedCharacter }) {
  const beard = character.avatar.facialHair;
  if (!beard) return null;
  const color = beard.color;
  const style = beard.style;

  if (style === "short-beard" || style === "full-beard") {
    return (
      <group>
        <mesh position={[0, -0.13, 0.09]} scale={[0.235, 0.17, 0.17]} castShadow>
          <sphereGeometry args={[1, 18, 14]} />
          <Mat color={color} roughness={1} />
        </mesh>
        <mesh position={[0, -0.045, 0.25]} scale={[0.11, 0.025, 0.03]}>
          <sphereGeometry args={[1, 10, 8]} />
          <Mat color={color} roughness={1} />
        </mesh>
        <mesh position={[-0.22, -0.04, 0.1]} scale={[0.04, 0.12, 0.1]} castShadow>
          <sphereGeometry args={[1, 8, 8]} />
          <Mat color={color} roughness={1} />
        </mesh>
        <mesh position={[0.22, -0.04, 0.1]} scale={[0.04, 0.12, 0.1]} castShadow>
          <sphereGeometry args={[1, 8, 8]} />
          <Mat color={color} roughness={1} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, -0.045, 0.255]} scale={[0.09, 0.02, 0.02]}>
        <sphereGeometry args={[1, 10, 8]} />
        <Mat color={color} roughness={1} />
      </mesh>
      <mesh position={[0, -0.18, 0.22]} scale={[0.075, 0.08, 0.05]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <Mat color={color} roughness={1} />
      </mesh>
    </group>
  );
}

function Glasses({ character }: { character: SeedCharacter }) {
  const glasses = character.avatar.glasses;
  if (!glasses) return null;
  const color = glasses.color;
  const style = glasses.style;

  if (style === "sunglasses") {
    return (
      <group>
        {[-0.095, 0.095].map((x) => (
          <RoundedBox
            key={x}
            args={[0.13, 0.09, 0.018]}
            radius={0.015}
            position={[x, 0.02, 0.27]}
            castShadow
          >
            <meshStandardMaterial color="#1c1c1c" metalness={0.2} roughness={0.3} />
          </RoundedBox>
        ))}
        <mesh position={[0, 0.02, 0.28]}>
          <boxGeometry args={[0.06, 0.012, 0.012]} />
          <Mat color="#1c1c1c" metalness={0.4} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (style === "round") {
    return (
      <group>
        {[-0.095, 0.095].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.27]} rotation={[0, 0, 0]} castShadow>
            <torusGeometry args={[0.058, 0.008, 8, 18]} />
            <Mat color={color} metalness={0.3} roughness={0.35} />
          </mesh>
        ))}
        <mesh position={[0, 0.02, 0.275]}>
          <boxGeometry args={[0.055, 0.01, 0.01]} />
          <Mat color={color} metalness={0.3} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {[-0.095, 0.095].map((x) => (
        <group key={x} position={[x, 0.02, 0.27]}>
          <mesh position={[0, 0.045, 0]}>
            <boxGeometry args={[0.125, 0.008, 0.012]} />
            <Mat color={color} />
          </mesh>
          <mesh position={[0, -0.045, 0]}>
            <boxGeometry args={[0.125, 0.008, 0.012]} />
            <Mat color={color} />
          </mesh>
          <mesh position={[-0.06, 0, 0]}>
            <boxGeometry args={[0.008, 0.09, 0.012]} />
            <Mat color={color} />
          </mesh>
          <mesh position={[0.06, 0, 0]}>
            <boxGeometry args={[0.008, 0.09, 0.012]} />
            <Mat color={color} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.02, 0.275]}>
        <boxGeometry args={[0.06, 0.008, 0.01]} />
        <Mat color={color} />
      </mesh>
    </group>
  );
}

function Head({ character }: { character: SeedCharacter }) {
  const cfg = character.avatar;
  const skin = cfg.skin;
  return (
    <group position={[0, 1.38, 0]}>
      <mesh scale={[0.95, 1, 0.92]} castShadow>
        <sphereGeometry args={[0.28, 24, 18]} />
        <Mat color={skin} roughness={0.9} />
      </mesh>
      {[-0.27, 0.27].map((x) => (
        <mesh key={x} position={[x, -0.01, 0]} scale={[0.55, 0.8, 0.55]} castShadow>
          <sphereGeometry args={[0.09, 12, 10]} />
          <Mat color={skin} roughness={0.9} />
        </mesh>
      ))}
      <Hair character={character} />
      {[-0.095, 0.095].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.02, 0.238]}>
            <sphereGeometry args={[0.045, 14, 12]} />
            <meshStandardMaterial color="#fffdf8" roughness={0.35} />
          </mesh>
          <mesh position={[x, 0.02, 0.272]}>
            <sphereGeometry args={[0.021, 10, 10]} />
            <meshBasicMaterial color="#202531" />
          </mesh>
        </group>
      ))}
      {[-0.095, 0.095].map((x) => (
        <mesh key={x} position={[x, 0.095, 0.245]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]}>
          <boxGeometry args={[0.075, 0.012, 0.018]} />
          <Mat color="#3a2a22" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, -0.015, 0.272]}>
        <sphereGeometry args={[0.025, 10, 8]} />
        <Mat color={skin} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.09, 0.258]}>
        <boxGeometry args={[0.07, 0.014, 0.012]} />
        <Mat color="#7a4a42" roughness={1} />
      </mesh>
      <Beard character={character} />
      <Glasses character={character} />
      {cfg.headwear?.style === "cap" && (
        <group position={[0, 0.15, 0]}>
          <mesh position={[0, 0.05, -0.02]} castShadow>
            <sphereGeometry args={[0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat color={cfg.headwear.color} roughness={0.95} />
          </mesh>
          <RoundedBox args={[0.38, 0.035, 0.24]} radius={0.03} position={[0, 0.02, 0.2]} castShadow>
            <Mat color={cfg.headwear.color} roughness={0.95} />
          </RoundedBox>
        </group>
      )}
    </group>
  );
}

function BodyDetails({ character }: { character: SeedCharacter }) {
  const cfg = character.avatar;
  const isSuit = cfg.outfit.top === "suit-jacket";
  const isHoodie = cfg.outfit.top === "hoodie";
  const isGraphic = cfg.outfit.top === "graphic-tee";

  if (isSuit) {
    return (
      <group>
        <mesh position={[0, 0.92, 0.148]}>
          <planeGeometry args={[0.15, 0.34]} />
          <Mat color="#fbf7f1" roughness={0.8} />
        </mesh>
        <mesh position={[-0.1, 0.94, 0.155]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.08, 0.4, 0.01]} />
          <Mat color="#161616" roughness={0.8} />
        </mesh>
        <mesh position={[0.1, 0.94, 0.155]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.08, 0.4, 0.01]} />
          <Mat color="#161616" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.88, 0.163]}>
          <boxGeometry args={[0.035, 0.22, 0.012]} />
          <Mat color="#6b7280" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  if (isHoodie) {
    return (
      <group>
        <mesh position={[0, 1.02, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.17, 0.05, 8, 18]} />
          <Mat color={cfg.outfit.topColor} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.74, 0.16]}>
          <boxGeometry args={[0.22, 0.15, 0.02]} />
          <Mat color={cfg.outfit.topColor} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.83, 0.17]}>
          <boxGeometry args={[0.006, 0.18, 0.006]} />
          <Mat color="#fbf7f1" />
        </mesh>
      </group>
    );
  }

  if (isGraphic) {
    return (
      <mesh position={[0, 0.9, 0.15]}>
        <planeGeometry args={[0.14, 0.14]} />
        <Mat color="#e9f1ec" roughness={0.9} />
      </mesh>
    );
  }

  return null;
}

function HumanAvatar({
  character,
  pose,
  motion,
  speaking,
  isLocal,
  hidden,
}: {
  character: SeedCharacter;
  pose: AvatarPose;
  motion: AvatarMotion;
  speaking?: boolean;
  isLocal?: boolean;
  hidden?: boolean;
}) {
  const cfg = character.avatar;
  const root = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftLower = useRef<THREE.Group>(null);
  const rightLower = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const phase = usePhase(character.id);
  const sitting = pose === "sitting";
  const walking = motion === "walk";
  const typing = motion === "type";
  const waving = motion === "wave";
  const hasLegs = cfg.outfit.bottom !== "none";
  const skin = cfg.skin;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 1.5 + phase) * 0.012;
    if (root.current) {
      root.current.position.y = THREE.MathUtils.damp(
        root.current.position.y,
        (sitting ? 0.08 : 0) + bob,
        8,
        delta,
      );
    }

    const legSwing = walking ? Math.sin(t * 8 + phase) * 0.55 : 0;
    const legTarget = sitting ? -1.15 : 0;
    const lowerTarget = sitting ? 1.25 : 0;
    if (leftLeg.current) {
      leftLeg.current.rotation.x = THREE.MathUtils.damp(
        leftLeg.current.rotation.x,
        legTarget + legSwing,
        12,
        delta,
      );
    }
    if (rightLeg.current) {
      rightLeg.current.rotation.x = THREE.MathUtils.damp(
        rightLeg.current.rotation.x,
        legTarget - legSwing,
        12,
        delta,
      );
    }
    if (leftLower.current) {
      leftLower.current.rotation.x = THREE.MathUtils.damp(
        leftLower.current.rotation.x,
        lowerTarget + (walking ? Math.max(0, -Math.sin(t * 8 + phase)) * 0.45 : 0),
        12,
        delta,
      );
    }
    if (rightLower.current) {
      rightLower.current.rotation.x = THREE.MathUtils.damp(
        rightLower.current.rotation.x,
        lowerTarget + (walking ? Math.max(0, Math.sin(t * 8 + phase)) * 0.45 : 0),
        12,
        delta,
      );
    }

    const armBase = sitting ? -0.5 : 0;
    const swing = walking ? legSwing * 0.8 : 0;
    if (leftArm.current) {
      leftArm.current.rotation.x = THREE.MathUtils.damp(
        leftArm.current.rotation.x,
        armBase - swing + (typing ? -0.5 + Math.sin(t * 6 + phase) * 0.06 : 0),
        10,
        delta,
      );
      leftArm.current.rotation.z = THREE.MathUtils.damp(
        leftArm.current.rotation.z,
        typing ? 0.18 : 0.04,
        8,
        delta,
      );
    }
    if (rightArm.current) {
      const waveTarget = waving ? -2.25 + Math.sin(t * 6 + phase) * 0.18 : armBase + swing;
      rightArm.current.rotation.x = THREE.MathUtils.damp(
        rightArm.current.rotation.x,
        typing ? -0.5 - Math.sin(t * 6 + phase) * 0.06 : waveTarget,
        10,
        delta,
      );
      rightArm.current.rotation.z = THREE.MathUtils.damp(
        rightArm.current.rotation.z,
        waving ? 0.25 : typing ? -0.18 : -0.04,
        8,
        delta,
      );
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 1.2 + phase) * 0.015;
      head.current.rotation.y = Math.sin(t * 0.8 + phase) * 0.025;
    }
  });

  const forearmColor = cfg.outfit.top === "crew-tee" || cfg.outfit.top === "graphic-tee" ? skin : cfg.outfit.topColor;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <circleGeometry args={[0.34, 24]} />
        <meshBasicMaterial color="#2e3440" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <group ref={root}>
        {hasLegs && (
          <>
            <group ref={leftLeg} position={[-0.13, 0.55, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.075, 0.22, 4, 10]} />
                <Mat color={cfg.outfit.bottomColor} roughness={0.95} />
              </mesh>
              <group ref={leftLower} position={[0, -0.26, 0]}>
                <mesh position={[0, -0.11, 0]} castShadow>
                  <capsuleGeometry args={[0.065, 0.2, 4, 10]} />
                  <Mat color={cfg.outfit.bottomColor} roughness={0.95} />
                </mesh>
                <RoundedBox
                  args={[0.16, 0.09, 0.28]}
                  radius={0.045}
                  position={[0, -0.23, 0.06]}
                  castShadow
                >
                  <Mat color={cfg.outfit.shoesColor} roughness={0.7} />
                </RoundedBox>
              </group>
            </group>
            <group ref={rightLeg} position={[0.13, 0.55, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.075, 0.22, 4, 10]} />
                <Mat color={cfg.outfit.bottomColor} roughness={0.95} />
              </mesh>
              <group ref={rightLower} position={[0, -0.26, 0]}>
                <mesh position={[0, -0.11, 0]} castShadow>
                  <capsuleGeometry args={[0.065, 0.2, 4, 10]} />
                  <Mat color={cfg.outfit.bottomColor} roughness={0.95} />
                </mesh>
                <RoundedBox
                  args={[0.16, 0.09, 0.28]}
                  radius={0.045}
                  position={[0, -0.23, 0.06]}
                  castShadow
                >
                  <Mat color={cfg.outfit.shoesColor} roughness={0.7} />
                </RoundedBox>
              </group>
            </group>
          </>
        )}

        <RoundedBox args={[0.4, 0.18, 0.26]} radius={0.08} position={[0, 0.58, 0]} castShadow>
          <Mat color={cfg.outfit.bottomColor} roughness={0.95} />
        </RoundedBox>
        <RoundedBox args={[0.46, 0.58, 0.3]} radius={0.13} position={[0, 0.9, 0]} castShadow>
          <Mat color={cfg.outfit.topColor} roughness={0.9} />
        </RoundedBox>
        <BodyDetails character={character} />
        <mesh position={[0, 1.12, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.085, 0.12, 14]} />
          <Mat color={skin} roughness={0.9} />
        </mesh>

        {[-0.29, 0.29].map((x, index) => (
          <group key={x} ref={index === 0 ? leftArm : rightArm} position={[x, 1.02, 0]}>
            <mesh position={[0, -0.08, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.14, 4, 10]} />
              <Mat color={cfg.outfit.topColor} roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.24, 0]} castShadow>
              <capsuleGeometry args={[0.058, 0.16, 4, 10]} />
              <Mat color={forearmColor} roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.36, 0]} castShadow>
              <sphereGeometry args={[0.075, 12, 10]} />
              <Mat color={skin} roughness={0.9} />
            </mesh>
          </group>
        ))}

        <group ref={head} scale={1.16}>
          <Head character={character} />
        </group>

        {cfg.accessories.includes("gold-chain") && (
          <mesh position={[0, 1.16, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.012, 6, 20]} />
            <Mat color="#d4af37" metalness={0.7} roughness={0.3} />
          </mesh>
        )}
        {cfg.accessories.includes("gold-watch") && (
          <mesh position={[0.34, 0.72, 0.06]}>
            <boxGeometry args={[0.09, 0.05, 0.06]} />
            <Mat color="#d4af37" metalness={0.7} roughness={0.3} />
          </mesh>
        )}
        {cfg.accessories.includes("black-bracelet") && (
          <mesh position={[-0.34, 0.72, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.06, 0.01, 6, 16]} />
            <Mat color="#1a1a1a" roughness={0.8} />
          </mesh>
        )}
        {cfg.accessories.includes("earbud") && (
          <mesh position={[0.28, 1.38, 0.02]}>
            <sphereGeometry args={[0.03, 10, 8]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.3} />
          </mesh>
        )}
        {cfg.accessories.includes("sleep-mask") && pose !== "sleeping" && (
          <mesh position={[0, 1.46, 0.205]}>
            <boxGeometry args={[0.42, 0.1, 0.03]} />
            <Mat color="#1e2a44" roughness={0.9} />
          </mesh>
        )}
      </group>
      <VoiceRing active={speaking} />
      <NameTag character={character} isLocal={isLocal} hidden={hidden} />
    </group>
  );
}

function FrogAvatar({
  character,
  speaking,
  isLocal,
  hidden,
}: {
  character: SeedCharacter;
  speaking?: boolean;
  isLocal?: boolean;
  hidden?: boolean;
}) {
  const cfg = character.avatar;
  const root = useRef<THREE.Group>(null);
  const phase = usePhase(character.id);
  useFrame((state) => {
    if (!root.current) return;
    root.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 1.8 + phase) * 0.015;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#2e3440" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <group ref={root}>
        <mesh position={[0, 0.36, 0]} scale={[0.42, 0.36, 0.34]} castShadow>
          <sphereGeometry args={[1, 22, 16]} />
          <Mat color={cfg.skin} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.38, 0.18]} scale={[0.3, 0.26, 0.18]} castShadow>
          <sphereGeometry args={[1, 18, 14]} />
          <Mat color={cfg.belly ?? "#b7d98a"} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.44, 0.1]} castShadow>
          <boxGeometry args={[0.5, 0.28, 0.3]} />
          <Mat color={cfg.outfit.topColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.86, 0]} scale={[0.42, 0.36, 0.38]} castShadow>
          <sphereGeometry args={[1, 22, 16]} />
          <Mat color={cfg.skin} roughness={0.9} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <group key={x} position={[x, 1.08, 0.16]}>
            <mesh scale={[0.15, 0.17, 0.15]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color="#fffdf8" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.01, 0.12]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshBasicMaterial color="#111111" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.82, 0.3]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.22, 0.025, 0.02]} />
          <Mat color="#3d5a2c" roughness={1} />
        </mesh>
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} position={[x, 0.4, 0.15]} rotation={[0.2, 0, x > 0 ? -0.4 : 0.4]} castShadow>
            <capsuleGeometry args={[0.07, 0.22, 4, 10]} />
            <Mat color={cfg.skin} roughness={0.9} />
          </mesh>
        ))}
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.13, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.18, 4, 10]} />
            <Mat color={cfg.skin} roughness={0.9} />
          </mesh>
        ))}
        <RoundedBox args={[0.46, 0.03, 0.3]} radius={0.02} position={[0, 0.58, 0.28]} rotation={[0.15, 0, 0]}>
          <Mat color="#3a4250" roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[0.42, 0.3, 0.02]} radius={0.02} position={[0, 0.72, 0.18]} rotation={[-1.0, 0, 0]}>
          <Mat color="#3a4250" roughness={0.6} />
        </RoundedBox>
      </group>
      <VoiceRing active={speaking} />
      <NameTag character={character} isLocal={isLocal} hidden={hidden} y={1.6} />
    </group>
  );
}

function CrabAvatar({
  character,
  speaking,
  isLocal,
  hidden,
}: {
  character: SeedCharacter;
  speaking?: boolean;
  isLocal?: boolean;
  hidden?: boolean;
}) {
  const cfg = character.avatar;
  const root = useRef<THREE.Group>(null);
  const wingLeft = useRef<THREE.Mesh>(null);
  const wingRight = useRef<THREE.Mesh>(null);
  const phase = usePhase(character.id);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      root.current.position.y = 1.15 + Math.sin(t * 2.2 + phase) * 0.08;
      root.current.rotation.z = Math.sin(t * 1.6 + phase) * 0.05;
    }
    if (wingLeft.current) wingLeft.current.rotation.z = 0.5 + Math.sin(t * 12) * 0.35;
    if (wingRight.current) wingRight.current.rotation.z = -0.5 - Math.sin(t * 12) * 0.35;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <circleGeometry args={[0.3, 24]} />
        <meshBasicMaterial color="#2e3440" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <group ref={root}>
        <mesh scale={[0.28, 0.22, 0.24]} castShadow>
          <sphereGeometry args={[1, 20, 14]} />
          <Mat color={cfg.skin} roughness={0.9} />
        </mesh>
        {[-0.12, 0.12].map((x) => (
          <group key={x} position={[x, 0.14, 0.15]}>
            <mesh scale={[0.06, 0.08, 0.06]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#fffdf8" />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshBasicMaterial color="#111111" />
            </mesh>
          </group>
        ))}
        {[-0.3, 0.3].map((x) => (
          <group key={x} position={[x, -0.02, 0.12]} rotation={[0, 0, x > 0 ? -0.4 : 0.4]}>
            <mesh position={[0, -0.08, 0]} scale={[0.09, 0.16, 0.1]} castShadow>
              <sphereGeometry args={[1, 10, 8]} />
              <Mat color={cfg.skin} roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.02, 0.02]} scale={[0.06, 0.14, 0.06]} castShadow>
              <sphereGeometry args={[1, 8, 8]} />
              <Mat color={cfg.skin} roughness={0.9} />
            </mesh>
          </group>
        ))}
        {[-0.12, -0.04, 0.04, 0.12].map((x) => (
          <mesh key={x} position={[x, -0.18, 0.02]} rotation={[0, 0, 0.2]} castShadow>
            <capsuleGeometry args={[0.018, 0.12, 4, 8]} />
            <Mat color={cfg.skin} roughness={0.9} />
          </mesh>
        ))}
        <mesh ref={wingLeft} position={[-0.18, 0.14, -0.18]} rotation={[0.3, 0.2, 0.5]} scale={[0.22, 0.34, 0.03]} castShadow>
          <sphereGeometry args={[1, 12, 8]} />
          <Mat color={cfg.wings?.color ?? "#f5f5f5"} roughness={0.8} />
        </mesh>
        <mesh ref={wingRight} position={[0.18, 0.14, -0.18]} rotation={[0.3, -0.2, -0.5]} scale={[0.22, 0.34, 0.03]} castShadow>
          <sphereGeometry args={[1, 12, 8]} />
          <Mat color={cfg.wings?.color ?? "#f5f5f5"} roughness={0.8} />
        </mesh>
      </group>
      <VoiceRing active={speaking} />
      <NameTag character={character} isLocal={isLocal} hidden={hidden} y={1.85} />
    </group>
  );
}

export function SleepingAvatar({
  character,
  position,
  rotation = [0, 0, 0],
  hidden,
}: {
  character: SeedCharacter;
  position: [number, number, number];
  rotation?: [number, number, number];
  hidden?: boolean;
}) {
  const cfg = character.avatar;
  return (
    <group position={position} rotation={rotation} visible={!hidden}>
      <group position={[0, 0.02, 0]} rotation={[-0.95, 0, 0]}>
        <mesh scale={[0.95, 1, 0.92]} castShadow>
          <sphereGeometry args={[0.28, 24, 18]} />
          <Mat color={cfg.skin} roughness={0.9} />
        </mesh>
        <Hair character={character} />
        <mesh position={[0, 0.06, 0.22]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.4, 0.12, 0.03]} />
          <Mat color="#1e2a44" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.11, 0.25]} scale={[0.11, 0.025, 0.03]}>
          <sphereGeometry args={[1, 10, 8]} />
          <Mat color={cfg.facialHair?.color ?? "#2a1c17"} roughness={1} />
        </mesh>
      </group>
      <mesh position={[0.1, -0.18, 0.3]} scale={[0.68, 0.2, 0.75]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <Mat color="#3d5a80" roughness={1} />
      </mesh>
      <Html position={[0.55, 0.75, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
        <div className="zzz">z&nbsp;z&nbsp;z</div>
      </Html>
      <NameTag character={character} hidden={hidden} y={1.15} />
    </group>
  );
}

export function TeamAvatar({
  character,
  position,
  rotation = [0, 0, 0],
  pose = "standing",
  motion = "idle",
  speaking,
  isLocal,
  hidden,
}: {
  character: SeedCharacter;
  position: [number, number, number];
  rotation?: [number, number, number];
  pose?: AvatarPose;
  motion?: AvatarMotion;
  speaking?: boolean;
  isLocal?: boolean;
  hidden?: boolean;
}) {
  if (pose === "sleeping") {
    return <SleepingAvatar character={character} position={position} rotation={rotation} hidden={hidden} />;
  }
  if (character.species === "frog") {
    return (
      <group position={position} rotation={rotation} visible={!hidden}>
        <FrogAvatar character={character} speaking={speaking} isLocal={isLocal} hidden={hidden} />
      </group>
    );
  }
  if (character.species === "crab") {
    return (
      <group position={position} rotation={rotation} visible={!hidden}>
        <CrabAvatar character={character} speaking={speaking} isLocal={isLocal} hidden={hidden} />
      </group>
    );
  }
  return (
    <group position={position} rotation={rotation} visible={!hidden}>
      <HumanAvatar
        character={character}
        pose={pose}
        motion={motion}
        speaking={speaking}
        isLocal={isLocal}
        hidden={hidden}
      />
    </group>
  );
}
