import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { palette } from "../theme";
import { textures } from "./textures";

type Placement = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export function Mat({
  color,
  roughness = 0.86,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
}: {
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

function GlassMat({ opacity = 0.18 }: { opacity?: number }) {
  return (
    <meshPhysicalMaterial
      color="#d7edf3"
      emissive="#b9dde7"
      emissiveIntensity={0.1}
      transparent
      opacity={opacity}
      roughness={0.05}
      metalness={0.04}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  );
}

function ScreenMat() {
  return <meshBasicMaterial map={textures.screen} toneMapped={false} />;
}

/* ------------------------------------------------------------------ */
/* Small props                                                         */
/* ------------------------------------------------------------------ */

export function Plant({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  pot = palette.terracotta,
  leaf = palette.sageDeep,
  tall = false,
}: Placement & { pot?: string; leaf?: string; tall?: boolean }) {
  const leaves = Array.from({ length: tall ? 9 : 7 }, (_, index) => {
    const angle = (index / (tall ? 9 : 7)) * Math.PI * 2 + 0.4;
    const radius = 0.16 + (index % 2) * 0.06;
    const height = 0.48 + (index % 3) * 0.14 + (tall ? 0.35 : 0);
    return (
      <mesh
        key={index}
        position={[
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ]}
        rotation={[0.5 + (index % 2) * 0.2, angle, 0.55]}
        scale={[0.09, 0.34 + (index % 3) * 0.06, 0.16]}
        castShadow
      >
        <sphereGeometry args={[1, 10, 8]} />
        <Mat color={index % 2 === 0 ? leaf : palette.olive} />
      </mesh>
    );
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.19, 0.24, 0.32, 18]} />
        <Mat color={pot} />
      </mesh>
      <mesh position={[0, 0.325, 0]} castShadow>
        <cylinderGeometry args={[0.205, 0.205, 0.025, 18]} />
        <Mat color="#6b4f3a" roughness={1} />
      </mesh>
      {leaves}
    </group>
  );
}

export function Books({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  count = 4,
}: Placement & { count?: number }) {
  const colors = ["#d98e73", "#5c6b7a", "#a8bfa3", "#e0a458", "#f4e9dc"];
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          position={[0, 0.035 + index * 0.055, 0]}
          rotation={[0, index * 0.08, 0]}
          castShadow
        >
          <boxGeometry args={[0.26 - index * 0.008, 0.05, 0.18]} />
          <Mat color={colors[index % colors.length] ?? palette.sage} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function Mug({ position = [0, 0, 0] }: Placement) {
  return (
    <group position={position}>
      <mesh position={[0, 0.055, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.045, 0.11, 16]} />
        <Mat color={palette.paper} roughness={0.5} />
      </mesh>
      <mesh position={[0.055, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.035, 0.009, 8, 16]} />
        <Mat color={palette.paper} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.108, 0]}>
        <cylinderGeometry args={[0.041, 0.041, 0.005, 16]} />
        <Mat color="#6f4e37" roughness={1} />
      </mesh>
    </group>
  );
}

export function Laptop({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  open = true,
}: Placement & { open?: boolean }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.42, 0.025, 0.28]} radius={0.012} position={[0, 0.012, 0]} castShadow>
        <Mat color="#3a4250" roughness={0.55} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0, 0.02, 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.33, 0.19]} />
        <Mat color="#4b5566" roughness={0.7} />
      </mesh>
      {open && (
        <group position={[0, 0.02, -0.14]} rotation={[-1.05, 0, 0]}>
          <RoundedBox args={[0.42, 0.28, 0.02]} radius={0.012} position={[0, 0.14, 0]} castShadow>
            <Mat color="#3a4250" roughness={0.55} metalness={0.2} />
          </RoundedBox>
          <mesh position={[0, 0.14, 0.012]}>
            <planeGeometry args={[0.37, 0.23]} />
            <ScreenMat />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function Monitor({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.72,
  height = 0.42,
}: Placement & { width?: number; height?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.28, 0.025, 0.18]} radius={0.02} position={[0, 0.012, 0]} castShadow>
        <Mat color="#4a5260" roughness={0.55} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0.18, -0.02]} castShadow>
        <boxGeometry args={[0.045, 0.34, 0.045]} />
        <Mat color="#4a5260" roughness={0.55} metalness={0.3} />
      </mesh>
      <RoundedBox
        args={[width + 0.04, height + 0.04, 0.035]}
        radius={0.03}
        position={[0, 0.42, 0]}
        castShadow
      >
        <Mat color="#252c38" roughness={0.45} metalness={0.25} />
      </RoundedBox>
      <mesh position={[0, 0.42, 0.021]}>
        <planeGeometry args={[width, height]} />
        <ScreenMat />
      </mesh>
    </group>
  );
}

export function Keyboard({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.44, 0.018, 0.15]} radius={0.01} position={[0, 0.009, 0]} castShadow>
        <Mat color="#3a4250" roughness={0.7} />
      </RoundedBox>
      {Array.from({ length: 5 }, (_, row) => (
        <mesh key={row} position={[0, 0.02, -0.05 + row * 0.025]}>
          <boxGeometry args={[0.38, 0.004, 0.012]} />
          <Mat color="#596273" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Seating + tables                                                    */
/* ------------------------------------------------------------------ */

export function OfficeChair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = palette.slate,
  accent = palette.sage,
}: Placement & { color?: string; accent?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.47, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.32, 10]} />
        <Mat color="#4a5260" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.035, 18]} />
        <Mat color="#4a5260" metalness={0.4} roughness={0.4} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.22, 0.055, Math.sin(angle) * 0.22]}
            rotation={[0, -angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.2, 0.03, 0.04]} />
            <Mat color="#4a5260" metalness={0.35} roughness={0.5} />
          </mesh>
        );
      })}
      <RoundedBox args={[0.58, 0.1, 0.55]} radius={0.06} position={[0, 0.62, 0]} castShadow receiveShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.56, 0.62, 0.1]} radius={0.07} position={[0, 0.94, -0.25]} rotation={[-0.12, 0, 0]} castShadow>
        <Mat color={accent} />
      </RoundedBox>
      <mesh position={[0, 0.62, 0.25]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.04, 0.08]} />
        <Mat color={color} />
      </mesh>
    </group>
  );
}

export function Stool({ position = [0, 0, 0], color = palette.terracotta }: Placement & { color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.5, 14]} />
        <Mat color="#4a5260" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.12, 18]} />
        <Mat color={color} />
      </mesh>
    </group>
  );
}

export function Desk({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  variant = 0,
}: Placement & { variant?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.7, 0.08, 0.82]} radius={0.05} position={[0, 0.75, 0]} castShadow receiveShadow>
        <Mat color={palette.oak} roughness={0.75} />
      </RoundedBox>
      {([
        [-0.72, -0.3],
        [0.72, -0.3],
        [-0.72, 0.3],
        [0.72, 0.3],
      ] as Array<[number, number]>).map(([x, z], index) => (
        <mesh key={index} position={[x, 0.37, z]} castShadow>
          <boxGeometry args={[0.06, 0.72, 0.06]} />
          <Mat color="#7a8494" metalness={0.3} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0.25, 0.8, -0.16]} rotation={[0, -0.18, 0]}>
        <Monitor position={[0, 0, 0]} width={0.62} height={0.36} />
      </mesh>
      <Laptop position={[-0.45, 0.8, 0.08]} rotation={[0, 0.12, 0]} open={variant % 2 === 0} />
      <Keyboard position={[0.3, 0.8, 0.22]} rotation={[0, 0.02, 0]} />
      <Mug position={[0.66, 0.8, 0.05]} />
      <mesh position={[-0.62, 0.81, -0.24]} castShadow>
        <boxGeometry args={[0.24, 0.02, 0.3]} />
        <Mat color={palette.paper} />
      </mesh>
      <Books position={[-0.62, 0.82, -0.24]} count={2} />
      <Plant position={[0.72, 0.79, -0.26]} scale={0.26} pot="#e6dccb" leaf={palette.sageDeep} />
    </group>
  );
}

export function Sofa({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = palette.sage,
  pillows = [palette.terracotta, palette.paper],
}: Placement & { color?: string; pillows?: string[] }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[2.5, 0.42, 0.95]} radius={0.1} position={[0, 0.4, 0]} castShadow receiveShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[2.45, 0.72, 0.28]} radius={0.1} position={[0, 0.86, -0.36]} castShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.26, 0.55, 0.95]} radius={0.08} position={[-1.18, 0.62, 0]} castShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.26, 0.55, 0.95]} radius={0.08} position={[1.18, 0.62, 0]} castShadow>
        <Mat color={color} />
      </RoundedBox>
      {[-0.62, 0.62].map((x, index) => (
        <RoundedBox
          key={index}
          args={[0.92, 0.16, 0.68]}
          radius={0.08}
          position={[x, 0.65, 0.08]}
          castShadow
        >
          <Mat color={index === 0 ? palette.sageDeep : palette.sage} />
        </RoundedBox>
      ))}
      {pillows.map((colorValue, index) => (
        <RoundedBox
          key={index}
          args={[0.36, 0.36, 0.14]}
          radius={0.08}
          position={[-0.85 + index * 1.7, 0.82, -0.18]}
          rotation={[0.15, index === 0 ? 0.1 : -0.1, 0.1]}
          castShadow
        >
          <Mat color={colorValue} />
        </RoundedBox>
      ))}
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 0.09, 0.32]} castShadow>
          <boxGeometry args={[0.08, 0.18, 0.08]} />
          <Mat color={palette.oakDark} />
        </mesh>
      ))}
    </group>
  );
}

export function Armchair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = palette.terracotta,
}: Placement & { color?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.95, 0.42, 0.9]} radius={0.1} position={[0, 0.38, 0]} castShadow receiveShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.95, 0.75, 0.24]} radius={0.1} position={[0, 0.82, -0.34]} castShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.2, 0.5, 0.85]} radius={0.08} position={[-0.4, 0.58, 0]} castShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.2, 0.5, 0.85]} radius={0.08} position={[0.4, 0.58, 0]} castShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.55, 0.14, 0.62]} radius={0.06} position={[0, 0.62, 0.04]} castShadow>
        <Mat color={palette.paper} />
      </RoundedBox>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.34, 0.16, 16]} />
        <Mat color={palette.oakDark} />
      </mesh>
    </group>
  );
}

export function Beanbag({
  position = [0, 0, 0],
  color = "#e0b84f",
}: Placement & { color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} scale={[0.62, 0.36, 0.62]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <Mat color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.38, -0.16]} scale={[0.5, 0.3, 0.4]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <Mat color={color} roughness={0.95} />
      </mesh>
    </group>
  );
}

export function CoffeeTable({ position = [0, 0, 0] }: Placement) {
  return (
    <group position={position}>
      <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.82, 0.82, 0.08, 32]} />
        <Mat color={palette.oakLight} roughness={0.75} />
      </mesh>
      {Array.from({ length: 3 }, (_, index) => {
        const angle = (index / 3) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.52, 0.21, Math.sin(angle) * 0.52]}
            rotation={[0, -angle, 0.12]}
            castShadow
          >
            <cylinderGeometry args={[0.035, 0.045, 0.42, 10]} />
            <Mat color={palette.oakDark} />
          </mesh>
        );
      })}
      <Books position={[-0.25, 0.48, 0.05]} count={3} />
      <Mug position={[0.2, 0.47, 0.22]} />
      <Plant position={[0.28, 0.47, -0.25]} scale={0.34} pot={palette.paper} />
    </group>
  );
}

export function Rug({
  position = [0, 0, 0],
  width = 6,
  depth = 4,
  color,
  variant = "terracotta",
  rotation = [0, 0, 0],
}: Placement & {
  width?: number;
  depth?: number;
  color?: string;
  variant?: "terracotta" | "sage" | "cream";
}) {
  const map =
    variant === "sage" ? textures.rugSage : variant === "cream" ? textures.rugCream : textures.rug;
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <boxGeometry args={[width, 0.03, depth]} />
      {color ? <Mat color={color} roughness={1} /> : <meshStandardMaterial map={map} roughness={1} />}
    </mesh>
  );
}

export function Shelf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.2,
  height = 1.7,
}: Placement & { width?: number; height?: number }) {
  return (
    <group position={position} rotation={rotation}>
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]} castShadow>
          <boxGeometry args={[0.05, height, 0.32]} />
          <Mat color={palette.oakDark} />
        </mesh>
      ))}
      {[0.05, height * 0.36, height * 0.66, height - 0.02].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[width, 0.05, 0.34]} />
          <Mat color={palette.oakLight} />
        </mesh>
      ))}
      <Books position={[-0.25, height * 0.36, 0]} count={4} rotation={[0, 0.05, 0]} />
      <Books position={[0.2, height * 0.66, 0]} count={3} rotation={[0, -0.08, 0]} />
      <Plant position={[0.3, height * 0.66, 0]} scale={0.3} pot={palette.paper} />
      <mesh position={[-0.2, height * 0.05, 0]} castShadow>
        <boxGeometry args={[0.4, 0.22, 0.2]} />
        <Mat color={palette.terracotta} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Architecture                                                        */
/* ------------------------------------------------------------------ */

export function GlassWall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 4,
  height = 2.5,
}: Placement & { length?: number; height?: number }) {
  const posts = Math.max(2, Math.round(length / 1.4));
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[length, height, 0.035]} />
        <GlassMat opacity={0.38} />
      </mesh>
      {Array.from({ length: posts + 1 }, (_, index) => (
        <mesh
          key={index}
          position={[-length / 2 + (index / posts) * length, height / 2, 0]}
          castShadow
        >
          <boxGeometry args={[0.06, height, 0.08]} />
          <Mat color="#64748b" metalness={0.35} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, height, 0]} castShadow>
        <boxGeometry args={[length, 0.07, 0.09]} />
        <Mat color="#64748b" metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.035, 0]} castShadow>
        <boxGeometry args={[length, 0.07, 0.09]} />
        <Mat color="#64748b" metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Wall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 20,
  height = 2.8,
  windows = 3,
  windowOffsets,
}: Placement & { length?: number; height?: number; windows?: number; windowOffsets?: number[] }) {
  const windowWidth = 1.8;
  const offsets =
    windowOffsets ??
    Array.from({ length: windows }, (_, index) => {
      const spacing = length / (windows + 1);
      return -length / 2 + spacing * (index + 1);
    });
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[length, height, 0.18]} />
        <Mat color={palette.warmWhite} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.07, 0.1]} receiveShadow>
        <boxGeometry args={[length, 0.14, 0.04]} />
        <Mat color={palette.oak} />
      </mesh>
      {offsets.map((offset) => (
        <group key={offset} position={[offset, 1.55, 0.1]}>
          <mesh>
            <planeGeometry args={[windowWidth, 1.45]} />
            <GlassMat opacity={0.32} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[windowWidth + 0.12, 0.05, 0.04]} />
            <Mat color="#4a5260" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[-windowWidth / 2 - 0.06, 0, 0.02]}>
            <boxGeometry args={[0.05, 1.55, 0.04]} />
            <Mat color="#4a5260" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[windowWidth / 2 + 0.06, 0, 0.02]}>
            <boxGeometry args={[0.05, 1.55, 0.04]} />
            <Mat color="#4a5260" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, -0.02]}>
            <boxGeometry args={[windowWidth, 1.45, 0.02]} />
            <meshBasicMaterial color="#dff0f4" transparent opacity={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function WallArt({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  variant = 0,
  width = 1.2,
  height = 1.5,
}: Placement & { variant?: number; width?: number; height?: number }) {
  const texture = variant % 2 === 0 ? textures.posterA : textures.posterB;
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.05]} />
        <Mat color={palette.oakDark} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

export function Kitchen({ position = [0, 0, 0] }: Placement) {
  return (
    <group position={position}>
      <RoundedBox args={[5.8, 0.9, 0.72]} radius={0.06} position={[0, 0.45, 0]} castShadow receiveShadow>
        <Mat color="#e7dccb" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[6, 0.08, 0.8]} radius={0.04} position={[0, 0.94, 0]} castShadow>
        <Mat color={palette.oakLight} roughness={0.7} />
      </RoundedBox>
      {Array.from({ length: 4 }, (_, index) => (
        <mesh key={index} position={[-2.1 + index * 1.4, 0.46, 0.37]}>
          <boxGeometry args={[1.18, 0.01, 0.02]} />
          <Mat color="#cfc2b0" />
        </mesh>
      ))}
      <mesh position={[-0.9, 0.955, 0]} castShadow>
        <boxGeometry args={[0.75, 0.04, 0.5]} />
        <Mat color="#9aa4ae" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[-0.9, 1.02, -0.2]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.22, 8]} />
        <Mat color="#9aa4ae" metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[-0.9, 1.12, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
        <Mat color="#9aa4ae" metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[1.0, 1.15, -0.02]} castShadow>
        <boxGeometry args={[0.36, 0.42, 0.34]} />
        <Mat color="#3a4250" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[1.0, 1.18, 0.16]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 14]} />
        <Mat color="#c9d3dc" metalness={0.6} roughness={0.25} />
      </mesh>
      <RoundedBox args={[0.9, 2.1, 0.72]} radius={0.08} position={[2.7, 1.05, 0]} castShadow>
        <Mat color="#dfe5e8" roughness={0.5} metalness={0.2} />
      </RoundedBox>
      <mesh position={[2.25, 1.15, 0.37]}>
        <boxGeometry args={[0.03, 0.7, 0.03]} />
        <Mat color="#8c98a3" metalness={0.5} />
      </mesh>
      {[-2.2, -1.4, -0.6, 0.2, 1.0].map((x, index) => (
        <group key={x} position={[x, 1.55, -0.36]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.04, 0.24]} />
            <Mat color={palette.oak} />
          </mesh>
          {index % 2 === 0 && <Mug position={[-0.1, 0.02, 0]} />}
          {index % 3 === 0 && <Plant position={[0.12, 0.02, 0]} scale={0.18} pot={palette.paper} />}
        </group>
      ))}
      <Shelf position={[-2.9, 0, -0.2]} width={0.9} height={1.5} rotation={[0, 0.05, 0]} />
      <Stool position={[-1.8, 0, 1.0]} />
      <Stool position={[-0.4, 0, 1.0]} />
      <Stool position={[1.0, 0, 1.0]} />
      <Plant position={[3.4, 0, 0.5]} scale={1.2} />
    </group>
  );
}

export function MeetingTable({ position = [0, 0, 0] }: Placement) {
  return (
    <group position={position}>
      <RoundedBox args={[2.8, 0.1, 1.4]} radius={0.18} position={[0, 0.78, 0]} castShadow receiveShadow>
        <Mat color={palette.oak} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 0.72, 16]} />
        <Mat color={palette.oakDark} />
      </mesh>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.7, 0.06, 24]} />
        <Mat color={palette.oakDark} />
      </mesh>
      <Laptop position={[-0.7, 0.84, 0.1]} rotation={[0, 0.2, 0]} />
      <Laptop position={[0.1, 0.84, -0.12]} rotation={[0, -0.15, 0]} />
      <Mug position={[0.7, 0.83, 0.2]} />
      <Books position={[0.9, 0.84, -0.2]} count={2} />
      <Plant position={[0, 0.84, 0]} scale={0.28} pot={palette.paper} />
      {([
        [-1.05, 1.15],
        [0, 1.25],
        [1.05, 1.15],
        [-1.05, -1.15],
        [0, -1.25],
        [1.05, -1.15],
      ] as Array<[number, number]>).map(([x, z], index) => (
        <group key={index} position={[x, 0, z]} rotation={[0, index < 3 ? Math.PI : 0, 0]}>
          <OfficeChair color={palette.slate} accent={palette.terracotta} />
        </group>
      ))}
    </group>
  );
}

export function Bed({ position = [0, 0, 0] }: Placement) {
  return (
    <group position={position}>
      <RoundedBox args={[2.3, 0.28, 1.65]} radius={0.08} position={[0, 0.25, 0]} castShadow receiveShadow>
        <Mat color={palette.oakDark} />
      </RoundedBox>
      <RoundedBox args={[2.2, 0.24, 1.55]} radius={0.1} position={[0, 0.44, 0]} castShadow>
        <Mat color="#f7f1e6" roughness={1} />
      </RoundedBox>
      <RoundedBox args={[2.3, 0.9, 0.16]} radius={0.08} position={[0, 0.78, -0.82]} castShadow>
        <Mat color={palette.oakDark} />
      </RoundedBox>
      <RoundedBox args={[0.75, 0.18, 0.42]} radius={0.1} position={[-0.5, 0.62, -0.45]} rotation={[0.08, 0, 0]} castShadow>
        <Mat color={palette.paper} />
      </RoundedBox>
      <RoundedBox args={[2.15, 0.18, 1.35]} radius={0.1} position={[0, 0.58, 0.08]} castShadow>
        <Mat color="#3d5a80" roughness={1} />
      </RoundedBox>
      <mesh position={[0, 0.69, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.1, 1.3]} />
        <Mat color="#4b6b95" roughness={1} />
      </mesh>
      <mesh position={[0.95, 0.66, 0.55]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.1]} />
        <Mat color="#2e3440" />
      </mesh>
    </group>
  );
}

export function FloorLamp({ position = [0, 0, 0], color = palette.paper }: Placement & { color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.24, 0.04, 18]} />
        <Mat color={palette.slate} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 1.7, 8]} />
        <Mat color={palette.slate} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.34, 0.34, 18, 1, true]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} emissive="#ffe9c4" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshBasicMaterial color="#ffe9c4" />
      </mesh>
      <pointLight position={[0, 1.55, 0]} intensity={0.6} distance={3.5} color="#ffd9a0" />
    </group>
  );
}

export function Whiteboard({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[2.3, 1.3, 0.06]} />
        <Mat color="#4a5260" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.25, 0.04]}>
        <planeGeometry args={[2.16, 1.16]} />
        <Mat color="#fbfcf9" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.58, 0.02]} castShadow>
        <boxGeometry args={[2.3, 0.05, 0.18]} />
        <Mat color="#4a5260" metalness={0.3} roughness={0.4} />
      </mesh>
      {[palette.terracotta, palette.sage, palette.accent, palette.amber].map((color, index) => (
        <mesh key={color} position={[0.6 + index * 0.12, 0.62, 0.06]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 6]} />
          <Mat color={color} />
        </mesh>
      ))}
      <mesh position={[-0.45, 1.35, 0.05]}>
        <planeGeometry args={[0.6, 0.03]} />
        <Mat color={palette.slate} />
      </mesh>
      <mesh position={[-0.3, 1.25, 0.05]}>
        <planeGeometry args={[0.9, 0.03]} />
        <Mat color={palette.slate} />
      </mesh>
      <mesh position={[-0.5, 1.15, 0.05]}>
        <planeGeometry args={[0.5, 0.025]} />
        <Mat color={palette.terracotta} />
      </mesh>
      <mesh position={[0.55, 1.35, 0.05]}>
        <circleGeometry args={[0.18, 24]} />
        <Mat color={palette.sage} />
      </mesh>
      <mesh position={[0.55, 1.35, 0.052]}>
        <circleGeometry args={[0.09, 24]} />
        <Mat color={palette.terracotta} />
      </mesh>
    </group>
  );
}

export function WallClock({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: Placement) {
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.23, 0.23, 0.04, 28]} />
        <Mat color={palette.oakDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <circleGeometry args={[0.2, 28]} />
        <Mat color={palette.warmWhite} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.045, 0.035]}>
        <boxGeometry args={[0.012, 0.12, 0.01]} />
        <Mat color={palette.ink} />
      </mesh>
      <mesh position={[0.04, -0.02, 0.035]} rotation={[0, 0, 1.1]}>
        <boxGeometry args={[0.01, 0.1, 0.01]} />
        <Mat color={palette.ink} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <Mat color={palette.terracotta} />
      </mesh>
    </group>
  );
}

export function MoneyCase({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.85, 0.12, 0.55]} radius={0.03} position={[0, 0.08, 0]} castShadow>
        <Mat color="#8a5a32" roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.85, 0.12, 0.55]} radius={0.03} position={[0, 0.42, -0.44]} rotation={[-1.15, 0, 0]} castShadow>
        <Mat color="#8a5a32" roughness={0.7} />
      </RoundedBox>
      {Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => (
          <mesh
            key={`${row}-${col}`}
            position={[-0.24 + col * 0.24, 0.17 + row * 0.08, -0.12 + row * 0.04]}
            castShadow
          >
            <boxGeometry args={[0.22, 0.07, 0.32]} />
            <Mat color={row % 2 === 0 ? "#7fb069" : "#93c47d"} roughness={0.9} />
          </mesh>
        )),
      )}
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 0.17, 0.28]}>
          <boxGeometry args={[0.07, 0.06, 0.03]} />
          <Mat color="#d4af37" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function Cat({ position = [0, 0, 0], color = "#e8d3b0" }: Placement & { color?: string }) {
  return (
    <group position={position} scale={0.75}>
      <mesh position={[0, 0.18, 0]} scale={[0.28, 0.2, 0.42]} castShadow>
        <sphereGeometry args={[1, 18, 14]} />
        <Mat color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 0.28, 0.32]} scale={[0.2, 0.18, 0.2]} castShadow>
        <sphereGeometry args={[1, 18, 14]} />
        <Mat color={color} roughness={1} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.42, 0.3]} rotation={[0, 0, x > 0 ? -0.25 : 0.25]} castShadow>
          <coneGeometry args={[0.07, 0.12, 8]} />
          <Mat color={color} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, -0.42]} rotation={[0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.025, 0.45, 8]} />
        <Mat color={color} roughness={1} />
      </mesh>
    </group>
  );
}

export function Tree({ position = [0, 0, 0], scale = 1 }: Placement) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.8, 10]} />
        <Mat color="#8a5a3c" roughness={1} />
      </mesh>
      {([
        [0, 2.2, 0, 0.75],
        [-0.45, 1.9, 0.2, 0.55],
        [0.45, 2.0, -0.15, 0.6],
        [0.1, 2.55, 0.2, 0.5],
      ] as Array<[number, number, number, number]>).map(([x, y, z, size], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <sphereGeometry args={[size, 16, 12]} />
          <Mat color={index % 2 === 0 ? palette.sageDeep : palette.olive} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function StringLights({
  position = [0, 0, 0],
  length = 8,
}: Placement & { length?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: 12 }, (_, index) => {
        const x = -length / 2 + (index / 11) * length;
        const y = 1.8 + Math.sin((index / 11) * Math.PI) * 0.55;
        return (
          <mesh key={index} position={[x, y, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#ffe2a8" />
          </mesh>
        );
      })}
    </group>
  );
}
