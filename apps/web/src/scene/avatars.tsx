import { Html, RoundedBox } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SeedCharacter } from "@workbits/shared";
import { palette, statusColor } from "../theme";
import { Mat } from "./props";
import { CozyPerson, PERSON_HEIGHT, PERSON_HIP, PERSON_SCALE, cozyLook, withGeneratedHead } from "./people";

const emoteEmoji: Record<string, string> = {
  wave: "👋",
  clap: "👏",
  heart: "❤️",
};

export function EmoteBubble({ kind, y = 2.3 }: { kind?: string; y?: number }) {
  if (!kind) return null;
  return (
    <Html
      position={[0, y, 0]}
      center
      zIndexRange={[24, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className={`emote-bubble emote-bubble--${kind}`}>
        {emoteEmoji[kind] ?? "✨"}
      </div>
    </Html>
  );
}

export type AvatarPose = "standing" | "sitting" | "sleeping";
export type AvatarMotion = "idle" | "walk" | "wave" | "type";

type V3 = [number, number, number];
type Avatar = SeedCharacter["avatar"];

function usePhase(id: string) {
  return useMemo(() => {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash * 31 + id.charCodeAt(index)) % 1000;
    }
    return (hash / 1000) * Math.PI * 2;
  }, [id]);
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const sphereGeo = new THREE.SphereGeometry(1, 18, 14);
const sphereLo = new THREE.SphereGeometry(1, 10, 8);

const shellCache = new Map<string, THREE.SphereGeometry>();
/** Partial unit sphere (a cap, band or jaw shell). Cached so every avatar shares geometry. */
function shell(
  thetaStart: number,
  thetaLength: number,
  phiStart = 0,
  phiLength = Math.PI * 2,
  segW = 28,
  segH = 14,
) {
  const key = [thetaStart, thetaLength, phiStart, phiLength, segW, segH].join(":");
  let geo = shellCache.get(key);
  if (!geo) {
    geo = new THREE.SphereGeometry(1, segW, segH, phiStart, phiLength, thetaStart, thetaLength);
    shellCache.set(key, geo);
  }
  return geo;
}

function shade(color: string, amount: number) {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amount, 0, 1));
  return `#${c.getHexString()}`;
}

function mix(a: string, b: string, t: number) {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

/** Lighter tone for dark fabrics, darker tone for light ones: a trim colour that always reads. */
function trim(color: string, amount = 0.07) {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(color).getHSL(hsl);
  return shade(color, hsl.l < 0.28 ? amount : -amount);
}

function Blob({
  p,
  s,
  r,
  color,
  roughness = 0.9,
  metalness = 0,
  cast,
  lo,
}: {
  p: V3;
  s: number | V3;
  r?: V3;
  color: string;
  roughness?: number;
  metalness?: number;
  cast?: boolean;
  lo?: boolean;
}) {
  const scale: V3 = typeof s === "number" ? [s, s, s] : s;
  return (
    <mesh geometry={lo ? sphereLo : sphereGeo} position={p} scale={scale} rotation={r} castShadow={cast}>
      <Mat color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Skull ellipsoid semi-axes. Everything on the face is placed against this surface. */
const HEAD = { a: 0.335, b: 0.304, c: 0.31 };
function faceZ(x: number, y: number) {
  const k = 1 - (x / HEAD.a) ** 2 - (y / HEAD.b) ** 2;
  return HEAD.c * Math.sqrt(Math.max(k, 0.01));
}

/* ------------------------------------------------------------------ */
/* HUD bits                                                            */
/* ------------------------------------------------------------------ */

function NameTag({
  character,
  isLocal,
  hidden,
  y = 1.86,
}: {
  character: SeedCharacter;
  isLocal?: boolean;
  hidden?: boolean;
  y?: number;
}) {
  // drei's <Html> keeps one DOM element per instance and recreates its React
  // root on it when its layout effect re-runs (e.g. a Suspense boundary
  // re-showing this subtree). The old root's deferred unmount then wipes the
  // new tag. Remounting with a fresh key gives each mount its own element.
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => {
    setGeneration((value) => value + 1);
  }, []);
  return (
    <Html
      key={generation}
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
      <ringGeometry args={[0.36, 0.44, 32]} />
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

function GroundShadow({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
      <circleGeometry args={[radius, 24]} />
      <meshBasicMaterial color="#2e3440" transparent opacity={0.17} depthWrite={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Hair                                                                */
/* ------------------------------------------------------------------ */

type Tone = "base" | "hi" | "lo";
type HairPiece = { p: V3; s: V3; r?: V3; tone?: Tone };

/** Front hairline pieces sit on the skull surface, so place them by x/y and let faceZ find z. */
function front(x: number, y: number, off = 0): V3 {
  return [x, y, faceZ(x, y) + off];
}

const sideLocks = (y: number, back: number): HairPiece[] => [
  { p: [-0.3, y, back], s: [0.075, 0.19, 0.12] },
  { p: [0.3, y, back], s: [0.075, 0.19, 0.12] },
];

const sideburns = (y: number, h = 0.1): HairPiece[] => [
  { p: [-0.305, y, 0.09], s: [0.05, h, 0.07] },
  { p: [0.305, y, 0.09], s: [0.05, h, 0.07] },
];

/** Deterministic curl layout over the upper skull for the curly style. */
const CURLS = (() => {
  const out: Array<{ p: V3; r: number; tone: Tone }> = [];
  const rings = [
    { theta: 0, n: 1, r: 0.105 },
    { theta: 0.5, n: 6, r: 0.108 },
    { theta: 0.98, n: 9, r: 0.105 },
    { theta: 1.4, n: 11, r: 0.095 },
  ];
  rings.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.n; i += 1) {
      const phi = (i / ring.n) * Math.PI * 2 + ringIndex * 0.45;
      if (ring.theta > 1.2 && Math.cos(phi) > 0.45) continue;
      const dir: V3 = [
        Math.sin(ring.theta) * Math.sin(phi),
        Math.cos(ring.theta),
        Math.sin(ring.theta) * Math.cos(phi),
      ];
      out.push({
        p: [dir[0] * 0.33, 0.015 + dir[1] * 0.31, dir[2] * 0.32 - 0.02],
        r: ring.r,
        tone: (i + ringIndex) % 3 === 0 ? "hi" : (i + ringIndex) % 3 === 1 ? "base" : "lo",
      });
    }
  });
  // forehead curls peeking over the brows
  ([-0.15, -0.05, 0.06, 0.16] as const).forEach((x, index) => {
    out.push({ p: front(x, 0.2 - (index % 2) * 0.02, 0.012), r: 0.075, tone: index % 2 ? "lo" : "hi" });
  });
  return out;
})();

function hairLayout(style: string): { len: number; tilt: number; pieces: HairPiece[] } {
  switch (style) {
    case "wavy-medium":
      return {
        len: 1.66,
        tilt: 0.45,
        pieces: [
          { p: [0, 0.27, -0.03], s: [0.26, 0.1, 0.25] },
          { p: [-0.1, 0.3, 0.06], s: [0.14, 0.07, 0.12], r: [0, 0, 0.3], tone: "hi" },
          { p: [0.12, 0.29, 0.0], s: [0.15, 0.07, 0.12], r: [0, 0, -0.25], tone: "hi" },
          { p: front(-0.17, 0.175), s: [0.13, 0.07, 0.075], r: [0.1, 0.1, 0.45] },
          { p: front(0, 0.2, 0.005), s: [0.15, 0.08, 0.08], r: [0.1, 0, 0.12], tone: "hi" },
          { p: front(0.17, 0.17), s: [0.13, 0.07, 0.07], r: [0.1, -0.1, -0.45], tone: "lo" },
          ...sideLocks(0.04, -0.12),
          ...sideburns(0.13),
          { p: [0, -0.06, -0.22], s: [0.27, 0.2, 0.14] },
          { p: [-0.15, -0.16, -0.2], s: [0.12, 0.1, 0.1], tone: "lo" },
          { p: [0.15, -0.16, -0.2], s: [0.12, 0.1, 0.1], tone: "lo" },
        ],
      };
    case "slick-short":
      return {
        len: 1.5,
        tilt: 0.55,
        pieces: [
          { p: [0, 0.28, 0.0], s: [0.27, 0.085, 0.28], r: [-0.2, 0, 0], tone: "hi" },
          { p: [0.03, 0.25, 0.15], s: [0.27, 0.08, 0.15], r: [0.3, 0, -0.12], tone: "hi" },
          { p: [0, 0.14, -0.2], s: [0.27, 0.22, 0.12], tone: "lo" },
          ...sideburns(0.03, 0.11),
        ],
      };
    case "medium-swept":
      return {
        len: 1.6,
        tilt: 0.45,
        pieces: [
          { p: [0.02, 0.27, -0.02], s: [0.26, 0.1, 0.24] },
          { p: [0.05, 0.24, 0.18], s: [0.26, 0.085, 0.12], r: [0.3, 0, -0.3], tone: "hi" },
          { p: front(-0.15, 0.2), s: [0.12, 0.07, 0.09], r: [0.2, 0.2, 0.5] },
          { p: front(0.2, 0.17), s: [0.1, 0.07, 0.09], r: [0, 0, -0.6], tone: "lo" },
          ...sideLocks(0.03, -0.1),
          ...sideburns(0.12),
          { p: [0, -0.04, -0.22], s: [0.25, 0.17, 0.13] },
        ],
      };
    default: {
      // short-textured: spiky top, short fringe
      // Three broad overlapping masses (crown, two swept sides) instead of a scatter of small tufts.
      return {
        len: 1.36,
        tilt: 0.5,
        pieces: [
          { p: [0, 0.275, 0.0], s: [0.27, 0.095, 0.27], r: [-0.1, 0, 0], tone: "hi" },
          { p: [-0.1, 0.285, 0.07], s: [0.17, 0.085, 0.17], r: [0.1, 0, 0.3], tone: "base" },
          { p: [0.11, 0.285, 0.06], s: [0.17, 0.085, 0.17], r: [0.1, 0, -0.3], tone: "hi" },
          { p: [0, 0.26, -0.15], s: [0.25, 0.1, 0.14], tone: "lo" },
          // soft fringe resting on the forehead
          { p: front(-0.11, 0.222, 0.004), s: [0.13, 0.045, 0.06], r: [0.15, 0.05, 0.3] },
          { p: front(0.06, 0.232, 0.004), s: [0.15, 0.042, 0.06], r: [0.15, -0.05, -0.2], tone: "hi" },
          { p: [0, -0.04, -0.23], s: [0.26, 0.19, 0.12], tone: "lo" },
          ...sideburns(0.04, 0.11),
        ],
      };
    }
  }
}

function Hair({ character }: { character: SeedCharacter }) {
  const hair = character.avatar.hair;
  if (!hair) return null;
  const color = hair.color;
  const tones: Record<Tone, string> = {
    base: color,
    hi: shade(color, 0.07),
    lo: shade(color, -0.03),
  };

  if (hair.style === "curly-medium") {
    return (
      <group>
        <mesh
          geometry={shell(0, 1.55)}
          position={[0, 0.0, -0.015]}
          rotation={[-0.55, 0, 0]}
          scale={[0.34, 0.32, 0.335]}
          castShadow
        >
          <Mat color={shade(color, -0.02)} roughness={0.95} />
        </mesh>
        {CURLS.map((curl, index) => (
          <Blob key={index} p={curl.p} s={curl.r} color={tones[curl.tone]} roughness={1} lo />
        ))}
      </group>
    );
  }

  const { len, tilt, pieces } = hairLayout(hair.style);
  return (
    <group>
      <mesh
        geometry={shell(0, len)}
        position={[0, 0.012, -0.015]}
        rotation={[-tilt, 0, 0]}
        scale={[0.355, 0.335, 0.345]}
        castShadow
      >
        <Mat color={color} roughness={0.85} />
      </mesh>
      {pieces.map((piece, index) => (
        <Blob
          key={index}
          p={piece.p}
          s={piece.s}
          r={piece.r}
          color={tones[piece.tone ?? "base"]}
          roughness={0.85}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Facial hair                                                         */
/* ------------------------------------------------------------------ */

const MOUTH_Y = -0.145;

/** Beards that wrap the whole jaw are a shell hugging the skull; the rest are patches. */
const jawShells: Record<string, { start: number; grow: number; chin: number }> = {
  "full-beard": { start: 1.9, grow: 0.026, chin: 1 },
  "short-beard": { start: 2.0, grow: 0.016, chin: 0.6 },
};

/** Z of the surface the mouth sits on, so the smile clears any beard. */
function mouthSurface(style?: string) {
  const jaw = style ? jawShells[style] : undefined;
  if (!jaw) return faceZ(0, MOUTH_Y) + 0.003;
  const scaleY = HEAD.b + jaw.grow;
  return (HEAD.c + jaw.grow) * Math.sqrt(1 - (MOUTH_Y / scaleY) ** 2) + 0.02;
}

function Moustache({ color, w, h }: { color: string; w: number; h: number }) {
  return (
    <>
      {([-1, 1] as const).map((side) => (
        <Blob
          key={side}
          p={[side * 0.052, -0.1, faceZ(0.052, -0.1) + 0.012]}
          s={[w, h, 0.03]}
          r={[0, 0, -side * 0.28]}
          color={color}
          roughness={1}
        />
      ))}
    </>
  );
}

function Beard({ style, color, skin }: { style: string; color: string; skin: string }) {
  const jaw = jawShells[style];
  if (jaw) {
    const grow = jaw.grow;
    const mz = mouthSurface(style);
    return (
      <group>
        <mesh
          geometry={shell(jaw.start, Math.PI - jaw.start, 0, Math.PI)}
          scale={[HEAD.a + grow, HEAD.b + grow, HEAD.c + grow]}
          castShadow
        >
          <Mat color={color} roughness={1} />
        </mesh>
        <Blob p={[0, -0.255, 0.14]} s={[0.13 * jaw.chin + 0.04, 0.085, 0.12]} color={color} roughness={1} cast />
        {sideburns(-0.04, 0.1).map((piece, index) => (
          <Blob key={index} p={piece.p} s={piece.s} color={color} roughness={1} />
        ))}
        <Blob p={[0, MOUTH_Y, mz - 0.026]} s={[0.1, 0.052, 0.03]} color={skin} roughness={0.9} />
        <Moustache color={color} w={0.065} h={0.022} />
      </group>
    );
  }

  const bold = style === "mustache-goatee" || style === "goatee";
  const chinW = style === "goatee" ? 0.095 : 0.075;
  return (
    <group>
      <Moustache color={color} w={bold ? 0.062 : 0.05} h={bold ? 0.022 : 0.016} />
      <Blob p={[0, -0.24, 0.182]} s={[chinW, 0.068, 0.05]} color={color} roughness={1} cast />
      {style === "goatee" && (
        <Blob p={[0, -0.2, 0.2]} s={[0.05, 0.05, 0.04]} color={color} roughness={1} />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Glasses                                                             */
/* ------------------------------------------------------------------ */

function Temple({ side, color }: { side: 1 | -1; color: string }) {
  const xs = [0.2, 0.255, 0.3, 0.33];
  const points = xs.map((x) => new THREE.Vector3(x, -0.02, faceZ(x, -0.02) + 0.01));
  return (
    <group scale={[side, 1, 1]}>
      {points.slice(0, -1).map((a, index) => {
        const b = points[index + 1]!;
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        const yaw = Math.atan2(b.x - a.x, b.z - a.z);
        return (
          <mesh
            key={index}
            position={[(a.x + b.x) / 2, a.y, (a.z + b.z) / 2]}
            rotation={[0, yaw, 0]}
          >
            <boxGeometry args={[0.011, 0.014, length + 0.004]} />
            <Mat color={color} roughness={0.5} metalness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

function Glasses({ character }: { character: SeedCharacter }) {
  const glasses = character.avatar.glasses;
  if (!glasses) return null;
  const frame = glasses.color;
  const sun = glasses.style === "sunglasses";
  const round = glasses.style === "round";
  const bar = 0.011;
  const w = round ? 0.17 : 0.175;
  const h = round ? 0.17 : sun ? 0.108 : 0.13;

  const lens = sun ? (
    <meshStandardMaterial
      color="#4a3f3a"
      roughness={0.12}
      metalness={0.1}
      transparent
      opacity={0.26}
      depthWrite={false}
    />
  ) : (
    <meshStandardMaterial
      color="#dcecf4"
      roughness={0.05}
      transparent
      opacity={0.2}
      depthWrite={false}
    />
  );

  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[side * 0.12, -0.03, faceZ(0.12, -0.03)]}
          rotation={[0, side * 0.33, 0]}
        >
          <group position={[0, 0, 0.036]}>
            {round ? (
              <>
                <mesh>
                  <circleGeometry args={[h / 2, 24]} />
                  {lens}
                </mesh>
                <mesh>
                  <torusGeometry args={[h / 2, 0.0075, 8, 28]} />
                  <Mat color={frame} metalness={0.5} roughness={0.35} />
                </mesh>
              </>
            ) : (
              <>
                <RoundedBox args={[w, h, 0.008]} radius={0.032} smoothness={3}>
                  {lens}
                </RoundedBox>
                {[
                  [0, h / 2, w + bar, bar],
                  [0, -h / 2, w + bar, bar],
                  [-w / 2, 0, bar, h],
                  [w / 2, 0, bar, h],
                ].map(([x, y, bw, bh]) => (
                  <mesh key={`${x}${y}`} position={[x ?? 0, y ?? 0, 0]}>
                    <boxGeometry args={[bw, bh, 0.014]} />
                    <Mat color={frame} roughness={0.4} metalness={0.2} />
                  </mesh>
                ))}
              </>
            )}
          </group>
        </group>
      ))}
      <mesh position={[0, 0.005, faceZ(0, 0) + 0.02]}>
        <boxGeometry args={[0.065, 0.012, 0.012]} />
        <Mat color={frame} roughness={0.4} metalness={0.2} />
      </mesh>
      <Temple side={1} color={frame} />
      <Temple side={-1} color={frame} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Head                                                                */
/* ------------------------------------------------------------------ */

function EyeMask({ raised }: { raised: boolean }) {
  const color = "#2a3556";
  const body = (
    <group>
      <mesh
        geometry={shell(1.2, 0.75, Math.PI / 2 - 1.15, 2.3, 24, 8)}
        scale={[0.352, 0.322, 0.332]}
        castShadow
      >
        <Mat color={color} roughness={0.9} />
      </mesh>
      <mesh geometry={shell(1.32, 0.4, 0, Math.PI * 2, 32, 4)} scale={[0.349, 0.319, 0.329]}>
        <Mat color={shade(color, 0.05)} roughness={0.9} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[side * 0.12, 0.02, 0.322]}
          rotation={[0, side * 0.35, Math.PI]}
        >
          <torusGeometry args={[0.045, 0.007, 6, 14, Math.PI]} />
          <meshBasicMaterial color="#e8dcc8" />
        </mesh>
      ))}
    </group>
  );
  if (raised) {
    return (
      <group position={[0, 0.2, -0.005]} rotation={[-0.38, 0, 0]} scale={1.07}>
        {body}
      </group>
    );
  }
  return <group position={[0, -0.03, 0]}>{body}</group>;
}

function Face({
  cfg,
  eyesRef,
  mouthRef,
  deadpan,
  closed,
}: {
  cfg: Avatar;
  eyesRef: RefObject<THREE.Group | null>;
  mouthRef: RefObject<THREE.Mesh | null>;
  deadpan?: boolean;
  closed?: boolean;
}) {
  const skin = cfg.skin;
  const browColor = cfg.hair ? mix(cfg.hair.color, "#3a2a22", 0.35) : "#3a2a22";
  const blush = mix(skin, "#e8737a", 0.45);
  const nose = mix(skin, "#e08a7a", 0.22);
  const mouthZ = mouthSurface(cfg.facialHair?.style);
  const tilt = deadpan ? 0 : 0.11;

  return (
    <group>
      {!closed && (
        <group ref={eyesRef} position={[0, -0.03, 0]}>
          {([-1, 1] as const).map((side) => (
            <group
              key={side}
              position={[side * 0.12, 0, faceZ(0.12, -0.03) - 0.012]}
              rotation={[0, side * 0.33, 0]}
            >
              <mesh scale={[0.054, 0.068, 0.03]}>
                <sphereGeometry args={[1, 16, 14]} />
                <meshStandardMaterial color="#21160f" roughness={0.22} />
              </mesh>
              <mesh position={[0.02, 0.026, 0.026]}>
                <sphereGeometry args={[0.0175, 10, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[-0.016, -0.026, 0.027]}>
                <sphereGeometry args={[0.008, 8, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[side * 0.12, 0.078, faceZ(0.12, 0.078) + 0.004]}
          rotation={[0, side * 0.35, Math.PI / 2 - side * tilt]}
        >
          <capsuleGeometry args={[0.0105, 0.055, 4, 8]} />
          <Mat color={browColor} roughness={1} />
        </mesh>
      ))}

      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[side * 0.205, -0.085, faceZ(0.205, -0.085) - 0.002]}
          scale={[0.052, 0.034, 0.012]}
          rotation={[0, side * 0.62, 0]}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color={blush} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}

      <mesh position={[0, -0.063, faceZ(0, -0.063) + 0.002]} scale={[0.03, 0.026, 0.028]}>
        <sphereGeometry args={[1, 12, 10]} />
        <Mat color={nose} roughness={0.8} />
      </mesh>

      <group position={[0, MOUTH_Y, mouthZ]} rotation={[0.32, 0, 0]}>
        {deadpan ? (
          <mesh position={[0, -0.01, 0]}>
            <boxGeometry args={[0.07, 0.0085, 0.008]} />
            <Mat color="#6e3f3a" roughness={0.9} />
          </mesh>
        ) : (
          <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.052, 0.0075, 6, 18, Math.PI]} />
            <Mat color="#6e3f3a" roughness={0.9} />
          </mesh>
        )}
        <mesh ref={mouthRef} position={[0, -0.012, 0.002]} scale={[0.034, 0.001, 0.012]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#5a2a2c" />
        </mesh>
      </group>
    </group>
  );
}

function Head({
  character,
  eyesRef,
  mouthRef,
  sleeping,
}: {
  character: SeedCharacter;
  eyesRef: RefObject<THREE.Group | null>;
  mouthRef: RefObject<THREE.Mesh | null>;
  sleeping?: boolean;
}) {
  const cfg = character.avatar;
  const skin = cfg.skin;
  const earInner = mix(skin, "#d9757a", 0.35);
  const hasMask = cfg.accessories.includes("sleep-mask") || sleeping;
  const maskDown = !!sleeping;

  return (
    <group>
      <mesh scale={[HEAD.a, HEAD.b, HEAD.c]} castShadow>
        <sphereGeometry args={[1, 32, 24]} />
        <Mat color={skin} roughness={0.85} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 0.328, -0.015, 0.0]} rotation={[0, side * 0.25, 0]}>
          <Blob p={[0, 0, 0]} s={[0.04, 0.07, 0.055]} color={skin} roughness={0.85} cast />
          <Blob p={[side * 0.012, -0.005, 0.004]} s={[0.022, 0.044, 0.034]} color={earInner} roughness={0.9} />
        </group>
      ))}

      <Hair character={character} />
      <Face
        cfg={cfg}
        eyesRef={eyesRef}
        mouthRef={mouthRef}
        deadpan={character.id === "felix"}
        closed={maskDown}
      />
      {cfg.facialHair && (
        <Beard style={cfg.facialHair.style} color={cfg.facialHair.color} skin={skin} />
      )}
      {!maskDown && <Glasses character={character} />}
      {hasMask && <EyeMask raised={!maskDown} />}

      {cfg.accessories.includes("earbud") && (
        <group position={[0.352, -0.02, 0.025]}>
          <Blob p={[0, 0, 0]} s={0.026} color="#f5f5f5" roughness={0.3} />
          <mesh position={[0.004, -0.04, 0.004]}>
            <capsuleGeometry args={[0.006, 0.05, 4, 6]} />
            <Mat color="#f5f5f5" roughness={0.3} />
          </mesh>
        </group>
      )}

      {cfg.headwear?.style === "cap" && (
        <group position={[0, 0.07, -0.01]} rotation={[-0.15, 0, 0]}>
          <mesh geometry={shell(0, Math.PI / 2)} scale={[0.365, 0.3, 0.375]} castShadow>
            <Mat color={cfg.headwear.color} roughness={0.95} />
          </mesh>
          <Blob
            p={[0, 0.0, 0.34]}
            s={[0.2, 0.016, 0.17]}
            r={[0.12, 0, 0]}
            color={shade(cfg.headwear.color, -0.04)}
            roughness={0.95}
            cast
          />
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

const TORSO_Y = 0.73;
const SHOULDER_Y = 0.9;

function Torso({ cfg }: { cfg: Avatar }) {
  const top = cfg.outfit.topColor;
  const kind = cfg.outfit.top;
  const skin = cfg.skin;
  const edge = trim(top);
  const hasTie = cfg.accessories.includes("tie");
  const tee = kind === "crew-tee" || kind === "graphic-tee";

  return (
    <group>
      <RoundedBox args={[0.44, 0.42, 0.3]} radius={0.13} smoothness={4} position={[0, TORSO_Y, 0]} castShadow>
        <Mat color={top} roughness={0.9} />
      </RoundedBox>

      <mesh position={[0, 0.975, 0]} castShadow>
        <cylinderGeometry args={[0.078, 0.092, 0.11, 14]} />
        <Mat color={skin} roughness={0.85} />
      </mesh>
      {/* shoulder yoke: bridges torso and sleeves so the arms grow out of the shirt */}
      <Blob
        p={[0, 0.885, 0]}
        s={[0.29, 0.075, 0.165]}
        color={top}
        roughness={0.9}
        cast
      />

      {tee && (
        <mesh position={[0, 0.932, 0.005]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.95, 1]}>
          <torusGeometry args={[0.1, 0.018, 8, 22]} />
          <Mat color={edge} roughness={0.95} />
        </mesh>
      )}

      {kind === "graphic-tee" && (
        <group position={[0, 0.78, 0.153]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.062, 0.062, 0.006, 20]} />
            <Mat color="#e9f1ec" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.006, 16]} />
            <Mat color="#d98e73" roughness={0.9} />
          </mesh>
        </group>
      )}

      {kind === "sweater" && (
        <>
          <mesh position={[0, 0.93, 0.005]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.95, 1]}>
            <torusGeometry args={[0.105, 0.028, 8, 22]} />
            <Mat color={edge} roughness={1} />
          </mesh>
          <RoundedBox args={[0.46, 0.07, 0.32]} radius={0.03} position={[0, 0.54, 0]}>
            <Mat color={edge} roughness={1} />
          </RoundedBox>
        </>
      )}

      {kind === "hoodie" && (
        <>
          <Blob p={[0, 0.9, -0.13]} s={[0.2, 0.12, 0.1]} color={top} roughness={0.95} cast />
          <mesh position={[0, 0.925, 0.015]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.95, 1]}>
            <torusGeometry args={[0.115, 0.034, 8, 22]} />
            <Mat color={top} roughness={0.95} />
          </mesh>
          <RoundedBox args={[0.46, 0.07, 0.32]} radius={0.03} position={[0, 0.54, 0]}>
            <Mat color={edge} roughness={1} />
          </RoundedBox>
          <RoundedBox args={[0.27, 0.12, 0.03]} radius={0.04} position={[0, 0.63, 0.15]}>
            <Mat color={shade(top, -0.04)} roughness={0.95} />
          </RoundedBox>
          {([-0.05, 0.05] as const).map((x) => (
            <group key={x} position={[x, 0.85, 0.15]}>
              <mesh>
                <capsuleGeometry args={[0.007, 0.1, 4, 6]} />
                <Mat color="#f4ecde" />
              </mesh>
              <Blob p={[0, -0.07, 0]} s={0.014} color="#f4ecde" lo />
            </group>
          ))}
        </>
      )}

      {kind === "suit-jacket" && (
        <>
          <RoundedBox args={[0.47, 0.13, 0.32]} radius={0.05} position={[0, 0.56, 0]} castShadow>
            <Mat color={top} roughness={0.85} />
          </RoundedBox>
          <RoundedBox args={[0.15, 0.31, 0.02]} radius={0.01} position={[0, 0.78, 0.15]}>
            <Mat color="#fbf7f1" roughness={0.8} />
          </RoundedBox>
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              <mesh position={[side * 0.1, 0.78, 0.158]} rotation={[0, 0, -side * 0.28]}>
                <boxGeometry args={[0.085, 0.33, 0.016]} />
                <Mat color={shade(top, 0.05)} roughness={0.75} />
              </mesh>
              <mesh position={[side * 0.052, 0.915, 0.162]} rotation={[0, 0, side * 0.7]}>
                <boxGeometry args={[0.07, 0.05, 0.012]} />
                <Mat color="#fbf7f1" roughness={0.8} />
              </mesh>
              <mesh position={[side * 0.135, 0.9, 0.165]} rotation={[0, 0, -side * 0.55]}>
                <boxGeometry args={[0.05, 0.075, 0.014]} />
                <Mat color={shade(top, 0.07)} roughness={0.75} />
              </mesh>
            </group>
          ))}
          {hasTie && (
            <group position={[0, 0.8, 0.171]}>
              <mesh position={[0, 0.07, 0]}>
                <boxGeometry args={[0.04, 0.04, 0.012]} />
                <Mat color="#6b7280" roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.04, 0]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.05, 0.05, 0.012]} />
                <Mat color="#6b7280" roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.08, 0]}>
                <boxGeometry args={[0.038, 0.14, 0.012]} />
                <Mat color="#6b7280" roughness={0.6} />
              </mesh>
            </group>
          )}
          {([0.67, 0.61] as const).map((y) => (
            <Blob key={y} p={[0.02, y, 0.158]} s={0.014} color={shade(top, 0.16)} roughness={0.4} lo />
          ))}
          <RoundedBox args={[0.07, 0.04, 0.016]} radius={0.008} position={[0.12, 0.76, 0.162]}>
            <Mat color={shade(top, 0.04)} roughness={0.8} />
          </RoundedBox>
        </>
      )}
    </group>
  );
}

function Arm({
  side,
  armRef,
  elbowRef,
  cfg,
}: {
  side: 1 | -1;
  armRef: RefObject<THREE.Group | null>;
  elbowRef: RefObject<THREE.Group | null>;
  cfg: Avatar;
}) {
  const top = cfg.outfit.topColor;
  const kind = cfg.outfit.top;
  const skin = cfg.skin;
  const short = kind === "crew-tee" || kind === "graphic-tee";
  const forearm = short ? skin : top;
  const cuff = kind === "suit-jacket" ? "#f6f2ea" : trim(top);
  const watch = side === 1 && cfg.accessories.includes("gold-watch");
  const bracelet = side === -1 && cfg.accessories.includes("black-bracelet");

  return (
    <group ref={armRef} position={[side * 0.275, SHOULDER_Y, 0]}>
      <Blob p={[0, 0, 0]} s={0.075} color={top} roughness={0.9} cast />
      <mesh position={[0, -0.09, 0]} castShadow>
        <capsuleGeometry args={[0.066, 0.1, 4, 10]} />
        <Mat color={top} roughness={0.9} />
      </mesh>
      {short && (
        <mesh position={[0, -0.165, 0]}>
          <cylinderGeometry args={[0.073, 0.073, 0.022, 14]} />
          <Mat color={trim(top, 0.04)} roughness={0.95} />
        </mesh>
      )}
      <group ref={elbowRef} position={[0, -0.18, 0]}>
        <mesh position={[0, -0.075, 0]} castShadow>
          <capsuleGeometry args={[0.057, 0.06, 4, 10]} />
          <Mat color={forearm} roughness={0.9} />
        </mesh>
        {!short && (
          <mesh position={[0, -0.145, 0]}>
            <cylinderGeometry args={[0.064, 0.064, 0.035, 14]} />
            <Mat color={cuff} roughness={0.95} />
          </mesh>
        )}
        {watch && (
          <group position={[0, -0.125, 0]}>
            <mesh>
              <cylinderGeometry args={[0.062, 0.062, 0.03, 14]} />
              <Mat color="#d4af37" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[side * 0.06, 0, 0]}>
              <boxGeometry args={[0.02, 0.04, 0.045]} />
              <Mat color="#e7c860" metalness={0.8} roughness={0.25} />
            </mesh>
          </group>
        )}
        {bracelet && (
          <mesh position={[0, -0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.06, 0.01, 6, 16]} />
            <Mat color="#1a1a1a" roughness={0.8} />
          </mesh>
        )}
        <group position={[0, -0.215, 0.005]}>
          <Blob p={[0, 0, 0]} s={[0.062, 0.07, 0.057]} color={skin} roughness={0.85} cast />
          <Blob p={[-side * 0.05, 0.012, 0.035]} s={[0.026, 0.04, 0.028]} color={skin} roughness={0.85} lo />
        </group>
      </group>
    </group>
  );
}

function Shoe({ cfg }: { cfg: Avatar }) {
  const kind = cfg.outfit.shoes;
  const color = cfg.outfit.shoesColor;

  if (kind === "none") {
    return (
      <group>
        <Blob p={[0, -0.215, 0.06]} s={[0.078, 0.06, 0.135]} color={color} roughness={1} cast />
        <Blob p={[0, -0.185, 0.0]} s={[0.07, 0.04, 0.06]} color={shade(color, 0.08)} roughness={1} lo />
      </group>
    );
  }

  if (kind === "dress-shoes") {
    return (
      <group>
        <RoundedBox args={[0.15, 0.04, 0.27]} radius={0.018} position={[0, -0.26, 0.055]} castShadow>
          <Mat color="#050505" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.14, 0.075, 0.25]} radius={0.035} position={[0, -0.215, 0.05]} castShadow>
          <Mat color={color} roughness={0.32} metalness={0.1} />
        </RoundedBox>
      </group>
    );
  }

  const accent = "#7d8594";
  return (
    <group>
      <RoundedBox args={[0.155, 0.05, 0.28]} radius={0.022} position={[0, -0.258, 0.055]} castShadow>
        <Mat color="#ece6da" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.14, 0.075, 0.24]} radius={0.035} position={[0, -0.21, 0.05]} castShadow>
        <Mat color={color} roughness={0.75} />
      </RoundedBox>
      <Blob p={[0, -0.215, 0.148]} s={[0.066, 0.042, 0.06]} color={color} roughness={0.75} />
      <RoundedBox args={[0.146, 0.05, 0.065]} radius={0.02} position={[0, -0.215, -0.04]}>
        <Mat color={accent} roughness={0.8} />
      </RoundedBox>
      {([0.07, 0.1] as const).map((z) => (
        <mesh key={z} position={[0, -0.172, z]}>
          <boxGeometry args={[0.07, 0.008, 0.012]} />
          <Mat color={accent} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Leg({
  side,
  legRef,
  lowerRef,
  cfg,
}: {
  side: 1 | -1;
  legRef: RefObject<THREE.Group | null>;
  lowerRef: RefObject<THREE.Group | null>;
  cfg: Avatar;
}) {
  const color = cfg.outfit.bottomColor;
  const cuffed = cfg.outfit.bottom !== "suit-pants";
  return (
    <group ref={legRef} position={[side * 0.105, 0.5, 0]}>
      <mesh position={[0, -0.1, 0]} castShadow>
        <capsuleGeometry args={[0.077, 0.12, 4, 10]} />
        <Mat color={color} roughness={0.95} />
      </mesh>
      <group ref={lowerRef} position={[0, -0.22, 0]}>
        <mesh position={[0, -0.1, 0]} castShadow>
          <capsuleGeometry args={[0.068, 0.09, 4, 10]} />
          <Mat color={color} roughness={0.95} />
        </mesh>
        {cuffed && (
          <mesh position={[0, -0.185, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.035, 14]} />
            <Mat color={shade(color, 0.04)} roughness={0.95} />
          </mesh>
        )}
        <Shoe cfg={cfg} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Human                                                               */
/* ------------------------------------------------------------------ */

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
  const leftElbow = useRef<THREE.Group>(null);
  const rightElbow = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const phase = usePhase(character.id);
  const sitting = pose === "sitting";
  const walking = motion === "walk";
  const typing = motion === "type";
  const waving = motion === "wave";
  const hasLegs = cfg.outfit.bottom !== "none";

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 1.5 + phase) * 0.012;
    if (root.current) {
      root.current.position.y = THREE.MathUtils.damp(
        root.current.position.y,
        (sitting ? 0.1 : 0) + bob,
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
    const elbowBase = typing ? -0.75 : walking ? -0.25 : sitting ? -0.35 : -0.1;
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
    if (leftElbow.current) {
      leftElbow.current.rotation.x = THREE.MathUtils.damp(
        leftElbow.current.rotation.x,
        elbowBase + (typing ? Math.sin(t * 6 + phase) * 0.06 : 0),
        10,
        delta,
      );
    }
    if (rightElbow.current) {
      rightElbow.current.rotation.x = THREE.MathUtils.damp(
        rightElbow.current.rotation.x,
        waving ? -0.5 + Math.sin(t * 7 + phase) * 0.3 : elbowBase,
        10,
        delta,
      );
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 1.2 + phase) * 0.015;
      head.current.rotation.y = Math.sin(t * 0.8 + phase) * 0.025;
    }
    if (eyes.current) {
      const cycle = (t + phase * 2) % 4.2;
      const blink = cycle < 0.14 ? Math.abs(cycle / 0.07 - 1) : 1;
      eyes.current.scale.y = Math.max(0.1, blink);
    }
    if (mouth.current) {
      mouth.current.scale.y = speaking ? 0.006 + Math.abs(Math.sin(t * 9 + phase)) * 0.03 : 0.001;
    }
  });

  return (
    <group>
      <GroundShadow radius={0.38} />
      <group ref={root}>
        {hasLegs && (
          <>
            <Leg side={-1} legRef={leftLeg} lowerRef={leftLower} cfg={cfg} />
            <Leg side={1} legRef={rightLeg} lowerRef={rightLower} cfg={cfg} />
            <RoundedBox args={[0.4, 0.16, 0.27]} radius={0.07} position={[0, 0.515, 0]} castShadow>
              <Mat color={cfg.outfit.bottomColor} roughness={0.95} />
            </RoundedBox>
          </>
        )}

        <Torso cfg={cfg} />
        <Arm side={-1} armRef={leftArm} elbowRef={leftElbow} cfg={cfg} />
        <Arm side={1} armRef={rightArm} elbowRef={rightElbow} cfg={cfg} />

        <group ref={head} position={[0, 1.26, 0]}>
          <Head character={character} eyesRef={eyes} mouthRef={mouth} />
        </group>

        {cfg.accessories.includes("gold-chain") && (
          <group position={[0, 0.925, 0.105]} rotation={[-0.35, 0, 0]}>
            <mesh position={[0, -0.01, 0]} rotation={[0, 0, Math.PI]} scale={[1, 1.15, 1]}>
              <torusGeometry args={[0.115, 0.009, 6, 24, Math.PI]} />
              <Mat color="#d4af37" metalness={0.7} roughness={0.3} />
            </mesh>
            <Blob p={[0, -0.145, 0.004]} s={0.02} color="#e7c860" metalness={0.8} roughness={0.25} lo />
          </group>
        )}
      </group>
      <VoiceRing active={speaking} />
      <NameTag character={character} isLocal={isLocal} hidden={hidden} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Frog                                                                */
/* ------------------------------------------------------------------ */

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
  const eyeLeft = useRef<THREE.Group>(null);
  const eyeRight = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const phase = usePhase(character.id);
  // Softened toward the Cozy cast: matte, a little less saturated.
  const skin = mix(cfg.skin, "#6f8f5e", 0.5);
  const darker = shade(skin, -0.09);
  const belly = mix(cfg.belly ?? "#b7d98a", "#efe8cf", 0.25);
  const hoodie = mix(cfg.outfit.topColor, "#5a6f96", 0.35);
  const blush = mix(skin, "#f08a8a", 0.6);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      root.current.position.y = 0.1 + Math.sin(t * 1.8 + phase) * 0.015;
    }
    const cycle = (t + phase * 2) % 4.6;
    const blink = Math.max(0.1, cycle < 0.14 ? Math.abs(cycle / 0.07 - 1) : 1);
    if (eyeLeft.current) eyeLeft.current.scale.y = blink;
    if (eyeRight.current) eyeRight.current.scale.y = blink;
    if (mouth.current) {
      mouth.current.scale.y = speaking ? 0.012 + Math.abs(Math.sin(t * 9 + phase)) * 0.05 : 0.001;
    }
  });

  return (
    <group>
      <GroundShadow radius={0.46} />
      <group ref={root}>
        {/* body */}
        <Blob p={[0, 0.34, 0]} s={[0.42, 0.34, 0.36]} color={skin} cast />
        <Blob p={[0, 0.32, 0.2]} s={[0.3, 0.26, 0.2]} color={belly} />
        {/* hoodie wrapped round the middle */}
        <Blob p={[0, 0.46, 0.01]} s={[0.435, 0.19, 0.37]} color={hoodie} roughness={0.95} cast />
        <mesh position={[0, 0.6, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.85, 1]}>
          <torusGeometry args={[0.28, 0.045, 8, 24]} />
          <Mat color={trim(hoodie, 0.05)} roughness={0.95} />
        </mesh>
        <RoundedBox args={[0.3, 0.1, 0.03]} radius={0.04} position={[0, 0.4, 0.37]}>
          <Mat color={shade(hoodie, -0.05)} roughness={0.95} />
        </RoundedBox>

        {/* head */}
        <Blob p={[0, 0.86, 0.03]} s={[0.45, 0.32, 0.38]} color={skin} cast />
        {/* eyes: bulging, round, friendly */}
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.22, 1.05, 0.08]}>
            <Blob p={[0, 0, 0]} s={[0.165, 0.15, 0.16]} color={skin} cast />
            <group ref={side === -1 ? eyeLeft : eyeRight} position={[0, 0.01, 0.1]} rotation={[0, side * 0.25, 0]}>
              <mesh scale={[0.115, 0.115, 0.07]}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshStandardMaterial color="#fffdf8" roughness={0.6} />
              </mesh>
              <mesh position={[side * -0.01, -0.005, 0.05]} scale={[0.07, 0.078, 0.04]}>
                <sphereGeometry args={[1, 14, 10]} />
                <meshStandardMaterial color="#1d1a18" roughness={0.5} />
              </mesh>
              <mesh position={[0.02, 0.025, 0.085]}>
                <sphereGeometry args={[0.02, 8, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          </group>
        ))}
        {/* smile + nostrils + blush */}
        <group position={[0, 0.79, 0.39]} rotation={[0.28, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.15, 0.0125, 6, 22, Math.PI]} />
            <Mat color="#3d5a2c" roughness={1} />
          </mesh>
          <mesh ref={mouth} position={[0, -0.12, 0.004]} scale={[0.08, 0.001, 0.02]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#5a2a2c" />
          </mesh>
        </group>
        {([-0.05, 0.05] as const).map((x) => (
          <Blob key={x} p={[x, 0.93, 0.405]} s={0.012} color={darker} lo />
        ))}
        {([-1, 1] as const).map((side) => (
          <mesh
            key={side}
            position={[side * 0.3, 0.76, 0.28]}
            scale={[0.06, 0.04, 0.014]}
            rotation={[0, side * 0.9, 0]}
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color={blush} transparent opacity={0.7} depthWrite={false} />
          </mesh>
        ))}
        {/* spots + sprout */}
        {(
          [
            [-0.14, 1.0, -0.14, 0.05],
            [0.08, 1.02, -0.18, 0.04],
            [-0.32, 0.9, -0.05, 0.035],
          ] as const
        ).map(([x, y, z, r]) => (
          <Blob key={x} p={[x, y, z]} s={[r, r * 0.55, r]} color={darker} lo />
        ))}
        <group position={[0, 1.13, -0.12]}>
          <mesh position={[0, 0.04, 0]} rotation={[0.1, 0, 0]}>
            <capsuleGeometry args={[0.012, 0.07, 4, 6]} />
            <Mat color="#4f8f3a" />
          </mesh>
          <Blob p={[-0.06, 0.1, 0]} s={[0.065, 0.025, 0.04]} r={[0, 0, 0.4]} color="#79b95a" lo />
          <Blob p={[0.06, 0.11, 0]} s={[0.065, 0.025, 0.04]} r={[0, 0, -0.4]} color="#8ccb68" lo />
        </group>

        {/* arms reaching for the keys */}
        {([-1, 1] as const).map((side) => (
          <group key={side}>
            <mesh position={[side * 0.31, 0.45, 0.17]} rotation={[1.1, 0, side * 0.3]} castShadow>
              <capsuleGeometry args={[0.07, 0.2, 4, 10]} />
              <Mat color={hoodie} roughness={0.95} />
            </mesh>
            <Blob p={[side * 0.21, 0.52, 0.36]} s={[0.075, 0.055, 0.085]} color={skin} cast />
            {([-0.035, 0, 0.035] as const).map((dx) => (
              <Blob key={dx} p={[side * 0.21 + dx, 0.52, 0.435]} s={0.026} color={skin} lo />
            ))}
          </group>
        ))}
        {/* folded legs + feet */}
        {([-1, 1] as const).map((side) => (
          <group key={side}>
            <Blob p={[side * 0.38, 0.22, 0.02]} s={[0.15, 0.17, 0.24]} color={skin} cast />
            {/* chunky white sneakers, like the persona picture */}
            <group position={[side * 0.28, 0.06, 0.4]} rotation={[-0.35, side * 0.15, 0]}>
              {/* ankle cuff, rounded toe, thick sole */}
              <RoundedBox args={[0.17, 0.16, 0.15]} radius={0.06} position={[0, 0.07, -0.06]} castShadow>
                <Mat color="#f6f4f0" roughness={0.85} />
              </RoundedBox>
              <Blob p={[0, 0.03, 0.06]} s={[0.09, 0.07, 0.13]} color="#f6f4f0" roughness={0.85} cast />
              <RoundedBox args={[0.19, 0.04, 0.32]} radius={0.018} position={[0, -0.025, 0.0]}>
                <Mat color="#d8d2c8" roughness={0.9} />
              </RoundedBox>
              <Blob p={[0, 0.075, 0.03]} s={[0.05, 0.02, 0.06]} color="#c9ced6" lo />
            </group>
          </group>
        ))}

        {/* laptop on the lap, lid toward the room */}
        <RoundedBox args={[0.5, 0.024, 0.32]} radius={0.012} position={[0, 0.6, 0.38]}>
          <Mat color="#aeb6c4" roughness={0.45} metalness={0.3} />
        </RoundedBox>
        <mesh position={[0, 0.615, 0.4]}>
          <boxGeometry args={[0.4, 0.004, 0.18]} />
          <Mat color="#3a4250" roughness={0.6} />
        </mesh>
        <group position={[0, 0.612, 0.54]} rotation={[1.78, 0, 0]}>
          <RoundedBox args={[0.5, 0.016, 0.3]} radius={0.01} position={[0, 0, -0.15]}>
            <Mat color="#9aa3b2" roughness={0.4} metalness={0.35} />
          </RoundedBox>
          <mesh position={[0, 0.011, -0.15]}>
            <cylinderGeometry args={[0.035, 0.035, 0.004, 18]} />
            <Mat color="#dbe7ff" emissive="#9cbcff" emissiveIntensity={0.5} />
          </mesh>
        </group>
      </group>
      <VoiceRing active={speaking} />
      <NameTag character={character} isLocal={isLocal} hidden={hidden} y={1.6} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Crab                                                                */
/* ------------------------------------------------------------------ */

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
  const wingLeft = useRef<THREE.Group>(null);
  const wingRight = useRef<THREE.Group>(null);
  const phase = usePhase(character.id);
  const skin = cfg.skin;
  const dark = shade(skin, -0.1);
  const light = shade(skin, 0.1);
  const wing = cfg.wings?.color ?? "#f5f5f5";
  const blush = mix(skin, "#ff9aa2", 0.5);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      root.current.position.y = 1.15 + Math.sin(t * 2.2 + phase) * 0.08;
      root.current.rotation.z = Math.sin(t * 1.6 + phase) * 0.05;
    }
    if (wingLeft.current) wingLeft.current.rotation.z = 0.5 + Math.sin(t * 12) * 0.35;
    if (wingRight.current) wingRight.current.rotation.z = -0.5 - Math.sin(t * 12) * 0.35;
  });

  const feathers: Array<[number, number, number, string]> = [
    [0.35, 0.3, 0.0, wing],
    [0.05, 0.34, 0.01, shade(wing, -0.03)],
    [-0.28, 0.28, 0.02, shade(wing, -0.06)],
  ];

  return (
    <group>
      <GroundShadow radius={0.32} />
      <group ref={root}>
        {/* chunky soft box body, like the persona picture */}
        <RoundedBox args={[0.62, 0.44, 0.46]} radius={0.15} smoothness={5} castShadow>
          <Mat color={skin} roughness={0.92} />
        </RoundedBox>
        <RoundedBox args={[0.46, 0.06, 0.34]} radius={0.03} position={[0, -0.215, 0.02]}>
          <Mat color={dark} roughness={0.95} />
        </RoundedBox>
        {/* simple Cozy-style eyes */}
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.12, 0.06, 0.232]}>
            <Blob p={[0, 0, 0]} s={[0.042, 0.06, 0.02]} color="#1d1a18" roughness={0.5} />
            <mesh position={[0.012, 0.022, 0.016]}>
              <sphereGeometry args={[0.012, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        {/* smile + cheeks */}
        <mesh position={[0, -0.05, 0.234]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.04, 0.009, 6, 14, Math.PI]} />
          <Mat color="#7a3a30" roughness={1} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh
            key={side}
            position={[side * 0.2, -0.03, 0.232]}
            scale={[0.05, 0.032, 0.008]}
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color={blush} transparent opacity={0.75} depthWrite={false} />
          </mesh>
        ))}

        {/* pincers */}
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.33, -0.06, 0.1]} rotation={[0, 0, -side * 0.35]}>
            <mesh position={[side * 0.04, -0.01, 0.02]} rotation={[0, 0, side * 1.1]} castShadow>
              <capsuleGeometry args={[0.03, 0.08, 4, 8]} />
              <Mat color={skin} roughness={0.9} />
            </mesh>
            <group position={[side * 0.1, 0.0, 0.07]}>
              <Blob p={[0, 0, 0]} s={[0.095, 0.085, 0.08]} color={skin} cast />
              <Blob p={[side * 0.03, 0.085, 0.01]} s={[0.04, 0.06, 0.04]} r={[0, 0, side * 0.35]} color={light} />
              <Blob p={[side * -0.035, 0.07, 0.01]} s={[0.032, 0.05, 0.036]} r={[0, 0, side * -0.3]} color={skin} />
            </group>
          </group>
        ))}
        {/* four stubby legs */}
        {([-0.21, -0.07, 0.07, 0.21] as const).map((x) => (
          <RoundedBox key={x} args={[0.09, 0.22, 0.11]} radius={0.04} position={[x, -0.3, 0.0]} castShadow>
            <Mat color={skin} roughness={0.92} />
          </RoundedBox>
        ))}

        {/* wings */}
        {([-1, 1] as const).map((side) => (
          <group
            key={side}
            ref={side === -1 ? wingLeft : wingRight}
            position={[side * 0.3, 0.1, -0.02]}
            rotation={[0.1, side * 0.5, side * 0.5]}
            scale={1.3}
          >
            {feathers.map(([rz, h, dz, c], index) => (
              <Blob
                key={index}
                p={[side * 0.07 + side * index * 0.02, 0.17, dz - index * 0.012]}
                s={[0.085, h * 0.62, 0.016]}
                r={[0, 0, -side * rz * 0.5]}
                color={c}
                roughness={0.8}
                cast
              />
            ))}
          </group>
        ))}
      </group>
      <VoiceRing active={speaking} />
      <NameTag character={character} isLocal={isLocal} hidden={hidden} y={1.85} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sleeping                                                            */
/* ------------------------------------------------------------------ */

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
  const look = useMemo(() => cozyLook(character.avatar), [character.avatar]);
  const phase = usePhase(character.id);
  return (
    <group position={position} rotation={rotation} visible={!hidden}>
      <Suspense fallback={null}>
        {/* Lying face-up, head on the pillow at the placement, feet toward +z. */}
        <group position={[0, 0.06, 1.0 * SLEEP_SCALE - 0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={SLEEP_SCALE}>
          <CozyPerson look={look} phase={phase / (Math.PI * 2)} />
        </group>
        {/* Blanket from the shoulders to past the feet. */}
        <RoundedBox args={[1.05, 0.24, 1.45]} radius={0.1} smoothness={4} position={[0, 0.25, 1.05]} castShadow receiveShadow>
          <Mat color="#3d5a80" roughness={1} />
        </RoundedBox>
        <Html position={[0.55, 0.85, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div className="zzz">z&nbsp;z&nbsp;z</div>
        </Html>
        <NameTag character={character} hidden={hidden} y={1.15} />
      </Suspense>
    </group>
  );
}

const SEAT_TOP = 0.67;
/** Beds are 2.15 long; sleepers shrink a little to fit. */
const SLEEP_SCALE = PERSON_SCALE * 0.88;

function CozyAvatar({
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
  // The sleep mask only goes on in bed.
  const look = useMemo(
    () => withGeneratedHead(character.id, { ...cozyLook(character.avatar), sleepMask: undefined }),
    [character.id, character.avatar],
  );
  const phase = usePhase(character.id);
  const sitting = pose === "sitting";
  // The tag lives inside the same Suspense as the model: an R3F <Html> that
  // mounts next to a suspending sibling can lose its DOM root.
  return (
    <Suspense fallback={null}>
      <group
        position={[0, sitting ? SEAT_TOP - 0.08 - PERSON_HIP * PERSON_SCALE : 0, sitting ? 0.04 * PERSON_SCALE : 0]}
        scale={PERSON_SCALE}
      >
        <CozyPerson look={look} pose={pose} motion={motion} phase={phase / (Math.PI * 2)} />
      </group>
      <VoiceRing active={speaking} />
      <NameTag
        character={character}
        isLocal={isLocal}
        hidden={hidden}
        y={PERSON_HEIGHT * PERSON_SCALE + (sitting ? 0.34 : 0.22)}
      />
    </Suspense>
  );
}

function TeamAvatarInner({
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
      <group position={position} rotation={rotation} visible={!hidden} scale={1.55}>
        <FrogAvatar character={character} speaking={speaking} isLocal={isLocal} hidden={hidden} />
      </group>
    );
  }
  if (character.species === "crab") {
    return (
      <group position={position} rotation={rotation} visible={!hidden} scale={1.55}>
        <CrabAvatar character={character} speaking={speaking} isLocal={isLocal} hidden={hidden} />
      </group>
    );
  }
  return (
    <group position={position} rotation={rotation} visible={!hidden}>
      <CozyAvatar
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

type TeamAvatarProps = Parameters<typeof TeamAvatarInner>[0];

/**
 * Each avatar gets its own Suspense boundary. An R3F <Html> name tag that
 * commits in the same boundary as a still-loading model can lose its DOM root
 * (the "synchronously unmount a root" warning), which dropped whole tags.
 */
export function TeamAvatar(props: TeamAvatarProps) {
  return (
    <Suspense fallback={null}>
      <TeamAvatarInner {...props} />
    </Suspense>
  );
}
