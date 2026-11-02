import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { palette } from "../theme";
import { textures } from "./textures";

export type V3 = [number, number, number];

type Placement = {
  position?: V3;
  rotation?: V3;
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

/* ------------------------------------------------------------------ */
/* Kit: shared materials, shared geometry, baked (merged) props        */
/* ------------------------------------------------------------------ */

const ink = {
  charcoal: "#3f444c",
  metal: "#5a6069",
  chrome: "#c8cdd2",
  soil: "#6b4f3a",
  oak: "#dcbb8e",
  oakDeep: "#c49a6c",
  cream: "#f1ece3",
  white: "#f7f4ee",
  fabric: "#7d8894",
  leafLight: "#9cbb8c",
};

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/** Shared flat material. Same inputs always return the same instance. */
export function mat(color: string, roughness = 0.86, metalness = 0) {
  const key = `${color}|${roughness}|${metalness}`;
  let material = materialCache.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materialCache.set(key, material);
  }
  return material;
}

const vertexMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84 });

/** Wall plaster: pale cream with a faint warm self-lift so walls in shade stay creamy, not grey. */
const plasterMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.92,
  emissive: "#f2e6d2",
  emissiveIntensity: 0.1,
});

const glassMaterial = new THREE.MeshStandardMaterial({
  color: "#dcecf0",
  emissive: "#cfe6ec",
  emissiveIntensity: 0.08,
  transparent: true,
  opacity: 0.2,
  roughness: 0.08,
  metalness: 0.1,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const frostedMaterial = new THREE.MeshStandardMaterial({
  color: "#f2f5f3",
  transparent: true,
  opacity: 0.55,
  roughness: 0.6,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const screenMaterial = new THREE.MeshBasicMaterial({ map: textures.screen, toneMapped: false });
const viewMaterial = new THREE.MeshBasicMaterial({ map: textures.windowView });
const glowMaterial = new THREE.MeshBasicMaterial({ color: "#ffe9c4" });
const ledMaterial = new THREE.MeshStandardMaterial({
  color: "#fff4dc",
  emissive: "#ffe2a8",
  emissiveIntensity: 1.4,
});
const shadeMaterial = new THREE.MeshStandardMaterial({
  color: "#fbf6ec",
  emissive: "#ffe9c4",
  emissiveIntensity: 0.45,
  side: THREE.DoubleSide,
  roughness: 0.9,
});
const curtainMaterial = new THREE.MeshStandardMaterial({
  color: "#fbf8f2",
  transparent: true,
  opacity: 0.82,
  roughness: 1,
  side: THREE.DoubleSide,
});

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  leaf: new THREE.SphereGeometry(1, 8, 6),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 8),
  pot: new THREE.CylinderGeometry(1, 0.78, 1, 18),
  cone: new THREE.ConeGeometry(1, 1, 18, 1, true),
  torus: new THREE.TorusGeometry(1, 0.22, 6, 14),
  halfTorus: new THREE.TorusGeometry(1, 0.12, 6, 12, Math.PI),
  plane: new THREE.PlaneGeometry(1, 1),
  /** Smooth versions for big round furniture, where 18 sides read as facets. */
  round: new THREE.CylinderGeometry(1, 1, 1, 48),
  round3: new THREE.SphereGeometry(1, 40, 20),
};

const roundedCache = new Map<string, THREE.BufferGeometry>();

function rounded(w: number, h: number, d: number, radius: number) {
  const key = `${w}|${h}|${d}|${radius}`;
  let geometry = roundedCache.get(key);
  if (!geometry) {
    const r = Math.min(radius, Math.min(w, h, d) * 0.49);
    geometry = new RoundedBoxGeometry(w, h, d, r >= 0.05 ? 2 : 1, r);
    roundedCache.set(key, geometry);
  }
  return geometry;
}

/** One baked piece. `m` is an extra transform applied after p/r/s (for placing whole sub-props). */
type Part = { g: THREE.BufferGeometry; p?: V3; r?: V3; s?: V3 | number; c: string; m?: THREE.Matrix4 };

const box = (s: V3, p: V3, c: string, r?: V3): Part => ({ g: G.box, s, p, c, r });
const rbox = (s: V3, p: V3, c: string, radius = 0.04, r?: V3): Part => ({
  g: rounded(s[0], s[1], s[2], radius),
  p,
  c,
  r,
});
const cyl = (radius: number, h: number, p: V3, c: string, r?: V3, g = G.cyl): Part => ({
  g,
  s: [radius, h, radius],
  p,
  c,
  r,
});
const ball = (s: V3 | number, p: V3, c: string, r?: V3, g = G.sphere): Part => ({ g, s, p, c, r });

const bakeMatrix = new THREE.Matrix4();
const bakeQuat = new THREE.Quaternion();
const bakeEuler = new THREE.Euler();
const bakePos = new THREE.Vector3();
const bakeScale = new THREE.Vector3();
const bakeColor = new THREE.Color();
const ZERO: V3 = [0, 0, 0];
const ONE: V3 = [1, 1, 1];

/** Merge parts into one vertex-coloured geometry: one draw call per prop. */
function bake(parts: Part[]) {
  const pieces = parts.map((part) => {
    const geometry = part.g.index ? part.g.toNonIndexed() : part.g.clone();
    const s: V3 = typeof part.s === "number" ? [part.s, part.s, part.s] : (part.s ?? ONE);
    const p = part.p ?? ZERO;
    const r = part.r ?? ZERO;
    bakeMatrix.compose(
      bakePos.set(p[0], p[1], p[2]),
      bakeQuat.setFromEuler(bakeEuler.set(r[0], r[1], r[2])),
      bakeScale.set(s[0], s[1], s[2]),
    );
    geometry.applyMatrix4(bakeMatrix);
    if (part.m) geometry.applyMatrix4(part.m);
    bakeColor.set(part.c);
    const count = geometry.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      colors[index * 3] = bakeColor.r;
      colors[index * 3 + 1] = bakeColor.g;
      colors[index * 3 + 2] = bakeColor.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  });
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) throw new Error("bake: incompatible geometry parts");
  merged.computeBoundingSphere();
  return merged;
}

function transformParts(parts: Part[], matrix: THREE.Matrix4): Part[] {
  return parts.map((part) => ({ ...part, m: part.m ? matrix.clone().multiply(part.m) : matrix }));
}

/** Move a sub-prop (built around its own origin) into place inside a larger bake. */
function placed(parts: Part[], [x, y, z]: V3, rotationY = 0, scale = 1): Part[] {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)),
    new THREE.Vector3(scale, scale, scale),
  );
  return transformParts(parts, matrix);
}

/** Scale a cluster of parts about `origin` (usually its footprint centre). */
function grow(parts: Part[], scale: number, [x, y, z]: V3): Part[] {
  const matrix = new THREE.Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(new THREE.Matrix4().makeTranslation(-x, -y, -z));
  return transformParts(parts, matrix);
}

const bakedCache = new Map<string, THREE.BufferGeometry>();

function baked(key: string, build: () => Part[]) {
  let geometry = bakedCache.get(key);
  if (!geometry) {
    geometry = bake(build());
    bakedCache.set(key, geometry);
  }
  return geometry;
}

function BakedMesh({
  geometry,
  position,
  rotation,
  scale,
  castShadow = true,
  material = vertexMaterial,
}: Placement & { geometry: THREE.BufferGeometry; castShadow?: boolean; material?: THREE.Material }) {
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow
      dispose={null}
    />
  );
}

/** A single box (optionally rounded) with a shared material. */
export function Block({
  size,
  position,
  rotation,
  color,
  radius = 0,
  roughness,
  metalness,
  castShadow = true,
  receiveShadow = true,
}: {
  size: V3;
  position?: V3;
  rotation?: V3;
  color: string;
  radius?: number;
  roughness?: number;
  metalness?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  return (
    <mesh
      geometry={radius > 0 ? rounded(size[0], size[1], size[2], radius) : G.box}
      scale={radius > 0 ? 1 : size}
      position={position}
      rotation={rotation}
      material={mat(color, roughness, metalness)}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      dispose={null}
    />
  );
}

function rng(seed: number) {
  let value = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pick<T>(items: readonly T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length] as T;
}

function tint(color: string, amount: number) {
  const base = new THREE.Color(color);
  base.lerp(new THREE.Color(amount > 0 ? "#ffffff" : "#000000"), Math.abs(amount));
  return `#${base.getHexString()}`;
}

const bookColors = ["#d98e73", "#5c6b7a", "#a8bfa3", "#e0b878", "#efe6d6", "#8a6f5a", "#c7d3dc", "#b5654d"];
const mugColors = [palette.paper, "#a8bfa3", "#d98e73", "#e8dccb", "#7f9fb8", palette.paper];

/* ------------------------------------------------------------------ */
/* Part generators (composable into larger bakes)                      */
/* ------------------------------------------------------------------ */

function mugParts([x, y, z]: V3, color: string = palette.paper): Part[] {
  return [
    cyl(0.05, 0.11, [x, y + 0.055, z], color, undefined, G.pot),
    { g: G.torus, s: [0.034, 0.034, 0.05], p: [x + 0.055, y + 0.06, z], r: [0, 0, Math.PI / 2], c: color },
    cyl(0.043, 0.006, [x, y + 0.106, z], "#6f4e37"),
  ];
}

function bookStackParts(count: number, [x, y, z]: V3, seed = 0): Part[] {
  return Array.from({ length: count }, (_, index) =>
    box(
      [0.26 - index * 0.012, 0.045, 0.19 - (index % 2) * 0.012],
      [x, y + 0.023 + index * 0.047, z],
      pick(bookColors, index + seed),
      [0, (index % 3) * 0.09 - 0.08, 0],
    ),
  );
}

/** Upright books filling `width` along x, starting at the left edge. */
function bookRowParts(width: number, [x, y, z]: V3, seed: number, maxHeight = 0.27): Part[] {
  const random = rng(seed * 31 + 7);
  const parts: Part[] = [];
  let cursor = x - width / 2;
  let index = 0;
  while (cursor < x + width / 2 - 0.04) {
    const thickness = 0.035 + random() * 0.035;
    const height = maxHeight * (0.68 + random() * 0.32);
    const lean = cursor + thickness > x + width / 2 - 0.05 && random() > 0.5;
    parts.push(
      box(
        [thickness, height, 0.17 + random() * 0.03],
        [cursor + thickness / 2, y + height / 2 - (lean ? 0.01 : 0), z],
        pick(bookColors, Math.floor(random() * 8) + index),
        lean ? [0, 0, -0.22] : undefined,
      ),
    );
    cursor += thickness + 0.004;
    index += 1;
  }
  return parts;
}

function jarParts([x, y, z]: V3, fill: string, height = 0.2): Part[] {
  return [
    cyl(0.06, height, [x, y + height / 2, z], "#e4ebe8"),
    cyl(0.052, height * 0.62, [x, y + height * 0.33, z], fill),
    cyl(0.063, 0.035, [x, y + height + 0.017, z], ink.oak),
  ];
}

function vaseParts([x, y, z]: V3, color: string, height = 0.26, stems = true): Part[] {
  const parts: Part[] = [
    ball([0.09, height * 0.45, 0.09], [x, y + height * 0.4, z], color),
    cyl(0.04, height * 0.35, [x, y + height * 0.82, z], color),
  ];
  if (stems) {
    for (let index = 0; index < 4; index += 1) {
      const angle = index * 1.6;
      parts.push(
        cyl(0.006, 0.36, [x + Math.cos(angle) * 0.04, y + height + 0.14, z + Math.sin(angle) * 0.04], "#b7a07a", [
          Math.sin(angle) * 0.25,
          0,
          Math.cos(angle) * 0.25,
        ], G.cylLow),
        ball([0.03, 0.07, 0.03], [x + Math.cos(angle) * 0.09, y + height + 0.32, z + Math.sin(angle) * 0.09], "#e3cfa6", undefined, G.leaf),
      );
    }
  }
  return parts;
}

function basketParts([x, y, z]: V3, width = 0.34): Part[] {
  return [
    rbox([width, 0.22, 0.24], [x, y + 0.11, z], "#cfae7d", 0.03),
    box([width * 0.92, 0.012, 0.25], [x, y + 0.14, z], "#b8955f"),
    box([width * 0.92, 0.012, 0.25], [x, y + 0.07, z], "#b8955f"),
  ];
}

function keyboardParts([x, y, z]: V3): Part[] {
  return [
    rbox([0.44, 0.018, 0.14], [x, y + 0.009, z], "#e9ebee", 0.008),
    box([0.4, 0.006, 0.1], [x, y + 0.02, z], "#cdd2d8"),
  ];
}

/* ------------------------------------------------------------------ */
/* Small props                                                         */
/* ------------------------------------------------------------------ */

export type PlantKind = "leafy" | "tall" | "bush" | "trailing" | "succulent";

function leafDirection(angle: number, tilt: number): V3 {
  return [-Math.sin(tilt) * Math.cos(angle), Math.cos(tilt), Math.sin(tilt) * Math.sin(angle)];
}

/**
 * One broad arching blade from `base`: an inner segment along `tilt`, then a
 * drooping outer segment. Flattened ellipsoids, blade face mostly skyward.
 */
function bladeParts([x, y, z]: V3, angle: number, tilt: number, length: number, width: number, color: string, droop = 0.55): Part[] {
  const innerTilt = tilt;
  const outerTilt = Math.min(tilt + droop, 2.1);
  const inner = leafDirection(angle, innerTilt);
  const outer = leafDirection(angle, outerTilt);
  const a = length * 0.56;
  const b = length * 0.5;
  const elbow: V3 = [x + inner[0] * a * 0.9, y + inner[1] * a * 0.9, z + inner[2] * a * 0.9];
  return [
    ball([0.024, a * 0.5, width * 0.5], [x + inner[0] * a * 0.5, y + inner[1] * a * 0.5, z + inner[2] * a * 0.5], color, [0, angle, innerTilt], G.leaf),
    ball([0.022, b * 0.5, width * 0.44], [elbow[0] + outer[0] * b * 0.45, elbow[1] + outer[1] * b * 0.45, elbow[2] + outer[2] * b * 0.45], tint(color, 0.05), [0, angle, outerTilt], G.leaf),
  ];
}

const pothosGreens = ["#78a35a", "#8fb86f", "#6a9550", "#a5c882", "#82ad63"];

/** Flat heart-ish leaf whose tip points along `yaw`, dipped `droop` below horizontal. */
function heartLeaf([x, y, z]: V3, yaw: number, droop: number, size: number, color: string): Part {
  const reach = size * 0.85;
  const dir: V3 = [Math.cos(droop) * Math.cos(yaw), -Math.sin(droop), -Math.cos(droop) * Math.sin(yaw)];
  return ball(
    [size, size * 0.13, size * 0.82],
    [x + dir[0] * reach, y + dir[1] * reach, z + dir[2] * reach],
    color,
    [0, yaw, -droop],
    G.leaf,
  );
}

/**
 * Pothos: a loose crown of broad heart leaves and long vines spilling over
 * the rim, the reference's shelf plant. Pot radius `r`, rim height `h`.
 */
function pothosParts(r: number, h: number): Part[] {
  const parts: Part[] = [ball([r * 0.8, 0.06, r * 0.8], [0, h + 0.03, 0], "#5d8746")];
  for (let index = 0; index < 24; index += 1) {
    const angle = index * 2.4;
    const ring = index % 3;
    const base: V3 = [Math.cos(angle) * r * 0.3 * ring, h + 0.05 + (2 - ring) * 0.035, -Math.sin(angle) * r * 0.3 * ring];
    parts.push(heartLeaf(base, angle, ring === 0 ? -0.2 : ring === 1 ? 0.15 : 0.5, 0.115, pick(pothosGreens, index)));
  }
  for (let vine = 0; vine < 7; vine += 1) {
    const angle = (vine / 7) * Math.PI * 2 + 0.4;
    const length = 6 + ((vine * 3) % 6);
    const out: V3 = [Math.cos(angle), 0, -Math.sin(angle)];
    const side: V3 = [Math.sin(angle), 0, Math.cos(angle)];
    for (let step = 0; step < length; step += 1) {
      const reach = r + 0.02 + step * 0.012;
      const sway = (step % 2 ? 1 : -1) * 0.03;
      const base: V3 = [out[0] * reach + side[0] * sway, h - 0.01 - step * 0.075, out[2] * reach + side[2] * sway];
      const size = 0.09 - step * 0.003;
      parts.push(heartLeaf(base, angle + (step % 2 ? 0.75 : -0.75), 1.05, size, pick(pothosGreens, vine + step)));
    }
  }
  return parts;
}

function plantParts(kind: PlantKind, pot: string, leaf: string): Part[] {
  const tallPot = kind === "tall";
  const r = tallPot ? 0.24 : 0.2;
  const h = tallPot ? 0.42 : 0.32;
  const shades = [leaf, palette.olive, ink.leafLight, tint(leaf, 0.08)];
  const parts: Part[] = [
    cyl(r, h, [0, h / 2, 0], pot, undefined, G.pot),
    cyl(r + 0.014, 0.04, [0, h - 0.018, 0], tint(pot, 0.06)),
    cyl(r - 0.012, 0.01, [0, h + 0.006, 0], ink.soil),
  ];

  if (kind === "leafy") {
    // Full rubber-plant clump: an upright crown over two arching rings.
    parts.push(ball([0.19, 0.15, 0.19], [0, h + 0.1, 0], palette.olive));
    for (let index = 0; index < 21; index += 1) {
      const ring = index % 3;
      const angle = (index / 21) * Math.PI * 2 + ring * 0.35;
      const tilt = ring === 0 ? 0.3 : ring === 1 ? 0.75 : 1.1;
      const length = ring === 0 ? 0.46 : ring === 1 ? 0.42 : 0.35;
      parts.push(...bladeParts([0, h + 0.04 + ring * 0.015, 0], angle, tilt, length, 0.24, pick(shades, index)));
    }
  } else if (kind === "tall") {
    // Bird-of-paradise: upright stems ending in big paddle leaves. Kept fairly
    // vertical so it fills height without poking through walls or glass.
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2 + 0.3;
      const tilt = 0.05 + (index % 4) * 0.08;
      const length = 0.55 + ((index * 5) % 4) * 0.14;
      const dir = leafDirection(angle, tilt);
      parts.push(
        cyl(0.014, length, [dir[0] * length * 0.5, h + dir[1] * length * 0.5, dir[2] * length * 0.5], palette.olive, [0, angle, tilt], G.cylLow),
        ...bladeParts([dir[0] * length, h + dir[1] * length, dir[2] * length], angle, tilt + 0.22, 0.88, 0.25, pick(shades, index), 0.32),
      );
    }
    // A low skirt of shorter leaves hides the bare stems above the pot.
    for (let index = 0; index < 5; index += 1) {
      parts.push(...bladeParts([0, h, 0], index * 1.26 + 0.6, 0.45, 0.42, 0.24, pick(shades, index + 1), 0.45));
    }
  } else if (kind === "bush") {
    // Pothos-style mound: three tiers of broad leaves, no balls.
    parts.push(ball([0.16, 0.12, 0.16], [0, h + 0.1, 0], tint(palette.olive, -0.04)));
    for (let index = 0; index < 30; index += 1) {
      const tier = index % 3;
      const angle = (index / 30) * Math.PI * 2 * 3 + tier * 0.5;
      const tilt = tier === 0 ? 0.25 : tier === 1 ? 0.7 : 1.15;
      const length = tier === 0 ? 0.34 : tier === 1 ? 0.36 : 0.3;
      parts.push(...bladeParts([0, h + 0.05 + (2 - tier) * 0.04, 0], angle, tilt, length, 0.22, pick(shades, index), 0.4));
    }
  } else if (kind === "trailing") {
    parts.push(...pothosParts(r, h));
  } else {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const tilt = index % 2 === 0 ? 0.5 : 0.25;
      const dir: V3 = [-Math.sin(tilt) * Math.cos(angle), Math.cos(tilt), Math.sin(tilt) * Math.sin(angle)];
      parts.push(
        ball([0.045, 0.1, 0.045], [dir[0] * 0.08, h + dir[1] * 0.08, dir[2] * 0.08], index % 2 === 0 ? "#8fae8b" : "#a9c4a1", [0, angle, tilt], G.leaf),
      );
    }
  }
  return parts;
}

export function Plant({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  pot = palette.terracotta,
  leaf = palette.sageDeep,
  tall = false,
  kind,
}: Placement & { pot?: string; leaf?: string; tall?: boolean; kind?: PlantKind }) {
  const resolved: PlantKind = kind ?? (tall ? "tall" : "leafy");
  const geometry = baked(`plant|${resolved}|${pot}|${leaf}`, () => plantParts(resolved, pot, leaf));
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} scale={scale} />;
}

/** Potted ficus: slim trunk, a broad layered crown of rounded leaf clusters. */
export function Tree({ position = [0, 0, 0], scale = 1, pot = ink.cream }: Placement & { pot?: string }) {
  const geometry = baked(`tree|${pot}`, () => {
    const shades = [palette.sageDeep, palette.olive, ink.leafLight, "#8aa883"];
    const parts: Part[] = [
      cyl(0.32, 0.52, [0, 0.26, 0], pot, undefined, G.pot),
      cyl(0.335, 0.045, [0, 0.5, 0], tint(pot, 0.06)),
      cyl(0.31, 0.01, [0, 0.525, 0], ink.soil),
      cyl(0.04, 1.3, [0.03, 1.15, 0], "#8a6a4f", [0, 0, -0.05], G.cylLow),
      cyl(0.026, 0.8, [-0.12, 1.2, 0.04], "#8a6a4f", [0.1, 0, 0.4], G.cylLow),
      cyl(0.026, 0.7, [0.16, 1.25, -0.04], "#8a6a4f", [-0.1, 0, -0.45], G.cylLow),
    ];
    // Fiddle-leaf crown: a dark core so gaps never show through, then broad
    // leaves pointing outward from an ellipsoid shell.
    parts.push(ball([0.3, 0.27, 0.3], [0, 1.74, 0], tint(palette.sageDeep, -0.1)));
    const random = rng(311);
    for (let index = 0; index < 64; index += 1) {
      const angle = index * 2.399;
      const elevation = -0.6 + random() * 1.8;
      const ring = Math.cos(elevation);
      // Same azimuth convention as leafDirection, so every leaf points outward.
      const base: V3 = [-Math.cos(angle) * 0.3 * ring, 1.74 + Math.sin(elevation) * 0.27, Math.sin(angle) * 0.3 * ring];
      const tilt = Math.max(0.2, Math.PI / 2 - elevation * 0.8);
      parts.push(...bladeParts(base, angle, tilt, 0.42 + random() * 0.1, 0.3, pick(shades, index), 0.25));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} scale={scale} />;
}

export function Books({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  count = 4,
}: Placement & { count?: number }) {
  const geometry = baked(`books|${count}`, () => bookStackParts(count, [0, 0, 0]));
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function BookRow({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.5,
  seed = 1,
}: Placement & { width?: number; seed?: number }) {
  const geometry = baked(`bookrow|${width}|${seed}`, () => bookRowParts(width, [0, 0, 0], seed));
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function Mug({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = palette.paper,
}: Placement & { color?: string }) {
  const geometry = baked(`mug|${color}`, () => mugParts([0, 0, 0], color));
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow={false} />;
}

export function Vase({
  position = [0, 0, 0],
  color = ink.cream,
  height = 0.26,
  stems = true,
}: Placement & { color?: string; height?: number; stems?: boolean }) {
  const geometry = baked(`vase|${color}|${height}|${stems}`, () => vaseParts([0, 0, 0], color, height, stems));
  return <BakedMesh geometry={geometry} position={position} />;
}

export function Notebook({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = palette.terracotta,
}: Placement & { color?: string }) {
  const geometry = baked(`notebook|${color}`, () => [
    box([0.22, 0.02, 0.3], [0, 0.01, 0], color),
    box([0.2, 0.004, 0.28], [0.008, 0.021, 0], ink.white),
    cyl(0.006, 0.18, [0.06, 0.026, 0.02], ink.charcoal, [Math.PI / 2, 0, 0.4], G.cylLow),
  ]);
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} castShadow={false} />;
}

export function Laptop({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  open = true,
}: Placement & { open?: boolean }) {
  const base = baked("laptop-base", () => [
    rbox([0.42, 0.022, 0.28], [0, 0.011, 0], "#cfd4da", 0.01),
    box([0.34, 0.004, 0.13], [0, 0.023, 0.04], "#9aa3ad"),
  ]);
  const lid = baked("laptop-lid", () => [rbox([0.42, 0.28, 0.016], [0, 0.14, 0], "#cfd4da", 0.008)]);
  return (
    <group position={position} rotation={rotation}>
      <BakedMesh geometry={base} />
      {open ? (
        <group position={[0, 0.02, -0.14]} rotation={[-0.32, 0, 0]}>
          <BakedMesh geometry={lid} />
          <mesh position={[0, 0.145, 0.009]} scale={[0.37, 0.23, 1]} geometry={G.plane} material={screenMaterial} dispose={null} />
        </group>
      ) : (
        <BakedMesh geometry={lid} position={[0, 0.03, 0.14]} rotation={[-Math.PI / 2, 0, 0]} />
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
  // Chunky toy proportions: thick bezel, solid neck and foot.
  const lift = 0.26;
  const body = baked(`monitor|${width}|${height}`, () => [
    rbox([0.36, 0.035, 0.26], [0, 0.0175, 0], "#d9dde2", 0.016),
    rbox([0.08, lift + 0.04, 0.06], [0, (lift + 0.04) / 2, -0.06], "#d9dde2", 0.025),
    rbox([width + 0.08, height + 0.08, 0.065], [0, lift + height / 2, -0.02], "#2a2f37", 0.03),
  ]);
  return (
    <group position={position} rotation={rotation}>
      <BakedMesh geometry={body} />
      <mesh
        position={[0, lift + height / 2, 0.0135]}
        scale={[width, height, 1]}
        geometry={G.plane}
        material={screenMaterial}
        dispose={null}
      />
    </group>
  );
}

export function Keyboard({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  const geometry = baked("keyboard", () => keyboardParts([0, 0, 0]));
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} castShadow={false} />;
}

export function DeskLamp({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  const geometry = baked("desklamp", () => [
    cyl(0.07, 0.02, [0, 0.01, 0], ink.charcoal),
    cyl(0.01, 0.32, [0.04, 0.17, 0], ink.charcoal, [0, 0, -0.25], G.cylLow),
    cyl(0.01, 0.26, [0.13, 0.36, 0], ink.charcoal, [0, 0, 1.0], G.cylLow),
    { g: G.cone, s: [0.07, 0.1, 0.07], p: [0.24, 0.36, 0], r: [0, 0, 0.5], c: ink.charcoal },
  ]);
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

/* ------------------------------------------------------------------ */
/* Seating + tables                                                    */
/* ------------------------------------------------------------------ */

export function OfficeChair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = ink.fabric,
  accent = ink.white,
}: Placement & { color?: string; accent?: string }) {
  // Chunky task chair: white shell, padded seat, ribbed back, arms, wide star base.
  const geometry = baked(`officechair|${color}|${accent}`, () => {
    const rib = tint(color, 0.08);
    const parts: Part[] = [
      cyl(0.075, 0.09, [0, 0.1, 0], ink.charcoal),
      cyl(0.035, 0.34, [0, 0.31, 0], ink.chrome, undefined, G.cylLow),
      rbox([0.56, 0.07, 0.52], [0, 0.52, 0], accent, 0.03),
      rbox([0.6, 0.13, 0.56], [0, 0.615, 0.01], color, 0.06),
      rbox([0.09, 0.3, 0.06], [0, 0.72, -0.29], accent, 0.03),
      // Thin white frame around a thicker dark mesh back that shows from both sides.
      rbox([0.64, 0.68, 0.05], [0, 1.03, -0.31], accent, 0.03, [-0.12, 0, 0]),
      rbox([0.55, 0.59, 0.1], [0, 1.03, -0.31], color, 0.04, [-0.12, 0, 0]),
    ];
    for (let index = 0; index < 5; index += 1) {
      for (const side of [-1, 1]) {
        parts.push(box([0.48, 0.016, 0.012], [0, 0.82 + index * 0.1, -0.31 + side * 0.052 - index * 0.012], rib, [-0.12, 0, 0]));
      }
    }
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      parts.push(
        rbox([0.32, 0.05, 0.07], [Math.cos(angle) * 0.17, 0.075, Math.sin(angle) * 0.17], ink.charcoal, 0.02, [0, -angle, 0]),
        ball(0.045, [Math.cos(angle) * 0.33, 0.045, Math.sin(angle) * 0.33], "#2a2e34", undefined, G.leaf),
      );
    }
    for (const x of [-0.31, 0.31]) {
      parts.push(
        rbox([0.05, 0.24, 0.05], [x, 0.74, -0.02], accent, 0.02),
        rbox([0.09, 0.045, 0.32], [x, 0.865, 0.0], accent, 0.02),
      );
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

/** Plush upholstered meeting chair: thick seat, rounded back, padded arms. */
/** Curved chair back: a bevelled annular sector extruded upward, opening toward +z. */
const chairBackGeometry = (() => {
  const shape = new THREE.Shape();
  const inner = 0.2;
  const outer = 0.245;
  const from = 0.25;
  const to = Math.PI - 0.25;
  shape.absarc(0, 0, outer, from, to, false);
  shape.absarc(0, 0, inner, to, from, true);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.018,
    bevelSegments: 3,
    curveSegments: 28,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0.025, 0);
  return geometry;
})();

/**
 * Upholstered shell chair on slim splayed black legs, like the reference's
 * meeting room: thin seat cushion, a back that curves round into low arms.
 * Seat faces +z.
 */
export function DiningChair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = palette.terracotta,
}: Placement & { color?: string }) {
  const geometry = baked(`diningchair|${color}`, () => {
    const shell = tint(color, -0.05);
    const seatY = 0.46;
    const parts: Part[] = [
      rbox([0.5, 0.05, 0.46], [0, seatY - 0.02, 0.02], shell, 0.02),
      rbox([0.48, 0.07, 0.46], [0, seatY + 0.035, 0.03], color, 0.035),
    ];
    // Back shell: one smooth tub wrapping round into low arms.
    parts.push({ g: chairBackGeometry, p: [0, seatY + 0.02, 0.04], c: color });
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as Array<[number, number]>) {
      parts.push(cyl(0.014, 0.46, [sx * 0.2, 0.22, sz * 0.19 + 0.02], "#2b2f35", [-sz * 0.13, 0, sx * 0.13], G.cylLow));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} scale={scale} />;
}

export function Stool({ position = [0, 0, 0], color = palette.terracotta }: Placement & { color?: string }) {
  const geometry = baked(`stool|${color}`, () => [
    cyl(0.025, 0.62, [0, 0.31, 0], ink.charcoal, undefined, G.cylLow),
    cyl(0.18, 0.02, [0, 0.01, 0], ink.charcoal),
    { g: G.torus, s: [0.14, 0.14, 0.06], p: [0, 0.26, 0], r: [Math.PI / 2, 0, 0], c: ink.charcoal },
    rbox([0.38, 0.08, 0.38], [0, 0.66, 0], color, 0.035),
  ]);
  return <BakedMesh geometry={geometry} position={position} />;
}

const deskTop = 0.77;

export function Desk({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  variant = 0,
  panel = true,
  width = 1.8,
  depth = 0.85,
}: Placement & { variant?: number; panel?: boolean; width?: number; depth?: number }) {
  const v = ((variant % 4) + 4) % 4;
  const hw = width / 2;
  const hd = depth / 2;
  // Items keep their size; their spots stretch with the top. Front edge is +z.
  const kx = width / 1.8;
  const front = (z: number) => z + hd - 0.425;
  // Chunky toy proportions: thick rounded top, square legs, and a white
  // drawer pedestal flush with the front so its drawers read from the aisle.
  const top = 0.075;
  const pedestal = { width: 0.5, depth: Math.min(0.62, depth - 0.2) };
  const pedestalX = hw - 0.36;
  const pedestalZ = hd - 0.05 - pedestal.depth / 2;
  const body = baked(`desk-body|${width}|${depth}`, () => {
    const pedestalHeight = deskTop - top - 0.02;
    const pedestalFront = pedestalZ + pedestal.depth / 2;
    const parts: Part[] = [
      rbox([width, top, depth], [0, deskTop - top / 2, 0], ink.oak, 0.028),
      rbox([pedestal.width, pedestalHeight, pedestal.depth], [pedestalX, pedestalHeight / 2, pedestalZ], "#f3efe7", 0.035),
    ];
    for (const y of [0.18, 0.4]) {
      parts.push(box([pedestal.width - 0.06, 0.012, 0.008], [pedestalX, y, pedestalFront + 0.002], "#ddd6ca"));
    }
    for (const y of [0.1, 0.3, 0.52]) {
      parts.push(rbox([0.16, 0.025, 0.025], [pedestalX, y, pedestalFront + 0.012], "#b9b2a7", 0.01));
    }
    const legHeight = deskTop - top;
    for (const z of [-hd + 0.07, hd - 0.07]) {
      parts.push(rbox([0.085, legHeight, 0.085], [-hw + 0.07, legHeight / 2, z], ink.oakDeep, 0.025));
    }
    parts.push(rbox([0.085, legHeight, 0.085], [hw - 0.07, legHeight / 2, -hd + 0.07], ink.oakDeep, 0.025));
    return parts;
  });
  const items = baked(`desk-items|${v}|${width}|${depth}`, () => {
    const parts: Part[] = [
      ...grow(keyboardParts([0.08 * kx, deskTop, front(0.14)]), 1.15, [0.08 * kx, deskTop, front(0.14)]),
      rbox([0.07, 0.024, 0.11], [0.46 * kx, deskTop + 0.012, front(0.16)], "#e9ebee", 0.008),
      // Desk mat under keyboard and mouse.
      rbox([0.82, 0.006, 0.3], [0.2 * kx, deskTop + 0.003, front(0.15)], "#4a5058", 0.003),
    ];
    if (v % 2 === 1) {
      parts.push(...grow(bookStackParts(3, [-0.58 * kx, deskTop, front(-0.05)], v), 1.15, [-0.58 * kx, deskTop, front(-0.05)]));
      parts.push(cyl(0.05, 0.12, [-0.84 * kx, deskTop + 0.06, front(0.2)], ink.charcoal));
      parts.push(cyl(0.005, 0.16, [-0.83 * kx, deskTop + 0.14, front(0.2)], palette.terracotta, [0, 0, 0.15], G.cylLow));
      parts.push(cyl(0.005, 0.16, [-0.85 * kx, deskTop + 0.14, front(0.21)], palette.slate, [0.1, 0, -0.1], G.cylLow));
    }
    if (v === 2 || v === 3) {
      parts.push(box([0.09, 0.003, 0.09], [0.66 * kx, deskTop + 0.002, front(0.28)], "#f3d77a", [0, 0.2, 0]));
      parts.push(box([0.09, 0.003, 0.09], [0.76 * kx, deskTop + 0.002, front(0.24)], "#f2b8a2", [0, -0.1, 0]));
    }
    if (v === 0) {
      parts.push(box([0.26, 0.014, 0.34], [-0.2 * kx, deskTop + 0.007, front(0.12)], ink.white, [0, 0.15, 0]));
    }
    return parts;
  });
  return (
    <group position={position} rotation={rotation}>
      <BakedMesh geometry={body} />
      <BakedMesh geometry={items} castShadow={false} />
      <Monitor position={[0.08 * kx, deskTop, -hd + 0.34]} width={width >= 1.8 ? 0.92 : 0.7} height={width >= 1.8 ? 0.55 : 0.42} />
      {v % 2 === 0 && <Laptop position={[-0.6 * kx, deskTop, front(0.02)]} rotation={[0, 0.3, 0]} />}
      {v !== 1 && <Mug position={[0.68 * kx, deskTop, front(0.02)]} color={pick(mugColors, v + 1)} scale={1.25} />}
      {v % 2 === 1 && <Plant position={[-0.78 * kx, deskTop, -hd + 0.2]} scale={0.42} pot={ink.cream} kind="leafy" />}
      {v === 2 && <DeskLamp position={[0.78 * kx, deskTop, -hd + 0.15]} rotation={[0, 2.2, 0]} />}
      {v === 3 && <Notebook position={[-0.44 * kx, deskTop, front(0.12)]} rotation={[0, -0.3, 0]} color={palette.sage} />}
      {panel && (
        <Block size={[width - 0.04, 0.36, 0.03]} position={[0, deskTop + 0.18, -hd + 0.015]} color="#e8e1d4" radius={0.012} />
      )}
    </group>
  );
}

/**
 * Privacy cross for a joined 2 x 2 bench: a double cream spine with a planted
 * trough along x, and a single cream panel along z splitting left from right.
 * `depth` is one desk's depth (the cross arms reach that far each way).
 */
export function DeskPartition({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 3.6,
  depth = 0.85,
}: Placement & { length?: number; depth?: number }) {
  // Tall, thick cream screens with a planted trough and binders, like a
  // furniture-catalogue bench rather than thin panels.
  const geometry = baked(`deskpartition|${length}|${depth}`, () => {
    const panel = "#ece3d4";
    const rail = ink.oak;
    const tall = 0.58;
    const arm = depth - 0.26;
    const parts: Part[] = [
      rbox([length - 0.06, tall, 0.06], [0, deskTop + tall / 2, -0.19], panel, 0.025),
      rbox([length - 0.06, tall, 0.06], [0, deskTop + tall / 2, 0.19], panel, 0.025),
      rbox([length - 0.12, 0.24, 0.32], [0, deskTop + 0.12, 0], rail, 0.03),
      box([length - 0.2, 0.012, 0.27], [0, deskTop + 0.245, 0], ink.soil),
    ];
    for (const side of [-1, 1]) {
      parts.push(rbox([0.06, tall, arm], [0, deskTop + tall / 2, side * (0.22 + arm / 2)], panel, 0.025));
    }
    // Binders in a cubby at each end.
    for (const end of [-1, 1]) {
      for (let index = 0; index < 5; index += 1) {
        parts.push(
          rbox(
            [0.075, 0.36, 0.26],
            [end * (length / 2 - 0.22 - index * 0.085), deskTop + 0.3, 0],
            pick(["#f3eee6", "#ddd2c2", "#f3eee6", "#a8bfa3", "#e9e2d6"], index + (end > 0 ? 2 : 0)),
            0.012,
          ),
        );
      }
    }
    const count = Math.max(2, Math.round((length - 1.2) / 0.9));
    for (let index = 0; index < count; index += 1) {
      const x = -length / 2 + 0.85 + (index * (length - 1.7)) / Math.max(1, count - 1);
      const kind = pick<PlantKind>(["leafy", "bush", "leafy", "tall"], index);
      parts.push(...placed(plantParts(kind, ink.cream, palette.sageDeep), [x, deskTop + 0.1, 0], index * 1.1, kind === "tall" ? 0.75 : 1.0));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function Sofa({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = palette.sage,
  pillows = [palette.terracotta, palette.paper, ink.cream],
}: Placement & { color?: string; pillows?: string[] }) {
  const geometry = baked(`sofa|${color}|${pillows.join(",")}`, () => {
    const light = tint(color, 0.07);
    const deep = tint(color, -0.05);
    const parts: Part[] = [
      rbox([2.8, 0.3, 1.0], [0, 0.25, 0], deep, 0.09),
      rbox([2.8, 0.68, 0.26], [0, 0.7, -0.37], color, 0.12),
      rbox([0.26, 0.6, 1.0], [-1.27, 0.52, 0], color, 0.12),
      rbox([0.26, 0.6, 1.0], [1.27, 0.52, 0], color, 0.12),
    ];
    for (const x of [-0.77, 0, 0.77]) {
      parts.push(rbox([0.76, 0.24, 0.76], [x, 0.51, 0.1], light, 0.1));
      parts.push(rbox([0.78, 0.52, 0.26], [x, 0.84, -0.22], light, 0.12, [-0.16, 0, 0]));
    }
    for (const [x, z] of [
      [-1.25, 0.4],
      [1.25, 0.4],
      [-1.25, -0.4],
      [1.25, -0.4],
    ] as Array<[number, number]>) {
      parts.push(cyl(0.035, 0.12, [x, 0.06, z], ink.oakDeep, undefined, G.cylLow));
    }
    pillows.forEach((pillow, index) => {
      const x = index === 0 ? -0.92 : index === 1 ? 0.92 : -0.38;
      parts.push(rbox([0.46, 0.42, 0.16], [x, 0.86, -0.04], pillow, 0.1, [0.18, index === 1 ? -0.15 : 0.12, index === 2 ? -0.12 : 0.08]));
    });
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} scale={scale} />;
}

export function Armchair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = palette.terracotta,
}: Placement & { color?: string }) {
  const geometry = baked(`armchair|${color}`, () => {
    const parts: Part[] = [
      rbox([0.95, 0.3, 0.88], [0, 0.3, 0], color, 0.08),
      rbox([0.95, 0.68, 0.22], [0, 0.72, -0.34], color, 0.09, [-0.08, 0, 0]),
      rbox([0.2, 0.46, 0.86], [-0.39, 0.56, 0], tint(color, -0.04), 0.08),
      rbox([0.2, 0.46, 0.86], [0.39, 0.56, 0], tint(color, -0.04), 0.08),
      rbox([0.56, 0.14, 0.62], [0, 0.5, 0.06], tint(color, 0.08), 0.06),
      rbox([0.34, 0.32, 0.12], [0.08, 0.72, -0.18], palette.paper, 0.07, [0.15, -0.15, 0.08]),
    ];
    for (const [x, z] of [
      [-0.38, 0.34],
      [0.38, 0.34],
      [-0.38, -0.34],
      [0.38, -0.34],
    ] as Array<[number, number]>) {
      parts.push(cyl(0.03, 0.15, [x, 0.075, z], ink.oakDeep, undefined, G.cylLow));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

/**
 * Corner sectional like the reference: boxy square arms, tight seat and back
 * cushions, short tapered legs. Main run along local x facing +z; the return
 * sits at the +x end and comes forward `returnDepth`, seats facing -x.
 */
export function Sectional({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = "#a9bc9c",
  length = 2.7,
  returnDepth = 1.05,
  pillows = [palette.terracotta, "#f1e7d6", "#e9d9bd"],
}: Placement & { color?: string; length?: number; returnDepth?: number; pillows?: string[] }) {
  const geometry = baked(`sectional|${color}|${length}|${returnDepth}|${pillows.join(",")}`, () => {
    const light = tint(color, 0.06);
    const deep = tint(color, -0.08);
    const D = 0.95;
    const W = 0.95;
    const half = length / 2;
    const arm = 0.2;
    const back = 0.22;
    const seatTop = 0.47;
    const front = D / 2 + returnDepth;
    const rx = half - W / 2;
    const parts: Part[] = [
      // Plinths.
      rbox([length, 0.26, D], [0, 0.23, 0], deep, 0.06),
      rbox([W, 0.26, returnDepth + 0.02], [rx, 0.23, D / 2 + returnDepth / 2 - 0.01], deep, 0.06),
      // Back along the main run and down the return's outer side.
      rbox([length - back, 0.46, back], [-back / 2, 0.62, -D / 2 + back / 2], color, 0.08),
      rbox([back, 0.46, D + returnDepth], [half - back / 2, 0.62, (front - D / 2) / 2], color, 0.08),
      // Square arms: left end of the main run, front end of the return.
      rbox([arm, 0.6, D], [-half + arm / 2, 0.4, 0], color, 0.07),
      rbox([W, 0.6, arm], [rx, 0.4, front - arm / 2], color, 0.07),
    ];
    // Seat cushions: two on the main run, corner + chaise on the return.
    const seatStart = -half + arm;
    const seatEnd = half - back;
    const corner = rx - W / 2;
    const seatWidth = (corner - seatStart) / 2;
    const rear = -D / 2 + back;
    const cushion = (x0: number, x1: number, z0: number, z1: number) =>
      rbox([x1 - x0 - 0.03, 0.15, z1 - z0 - 0.03], [(x0 + x1) / 2, seatTop - 0.075, (z0 + z1) / 2], light, 0.06);
    parts.push(cushion(seatStart, seatStart + seatWidth, rear, D / 2));
    parts.push(cushion(seatStart + seatWidth, corner, rear, D / 2));
    parts.push(cushion(corner, seatEnd, rear, D / 2));
    parts.push(cushion(corner, seatEnd, D / 2, front - arm));
    // Back cushions, leaning back.
    for (let index = 0; index < 3; index += 1) {
      const x0 = index < 2 ? seatStart + index * seatWidth : corner;
      const x1 = index < 2 ? x0 + seatWidth : seatEnd - 0.14;
      parts.push(rbox([x1 - x0 - 0.05, 0.4, 0.17], [(x0 + x1) / 2, 0.68, rear + 0.07], light, 0.08, [-0.14, 0, 0]));
    }
    parts.push(rbox([0.17, 0.4, D / 2 - rear - 0.05], [seatEnd - 0.07, 0.68, (rear + 0.14 + D / 2) / 2], light, 0.08, [0, 0, -0.14]));
    parts.push(rbox([0.17, 0.4, front - arm - D / 2 - 0.05], [seatEnd - 0.07, 0.68, (D / 2 + front - arm) / 2], light, 0.08, [0, 0, -0.14]));
    // Legs.
    for (const [x, z] of [
      [-half + 0.08, -D / 2 + 0.08],
      [-half + 0.08, D / 2 - 0.08],
      [half - 0.08, -D / 2 + 0.08],
      [half - 0.08, front - 0.08],
      [rx - W / 2 + 0.08, front - 0.08],
    ] as Array<[number, number]>) {
      parts.push(cyl(0.032, 0.11, [x, 0.055, z], ink.oakDeep, undefined, G.pot));
    }
    // Pillows: one by the left arm, a pair in the corner.
    const pillow = (p: V3, r: V3, c: string) => rbox([0.52, 0.48, 0.16], p, c, 0.1, r);
    parts.push(pillow([-half + arm + 0.28, 0.7, -D / 2 + back + 0.2], [0.2, 0.25, 0.08], pick(pillows, 2)));
    parts.push(pillow([seatEnd - 0.52, 0.72, -D / 2 + back + 0.18], [0.2, -0.2, -0.06], pick(pillows, 0)));
    parts.push(pillow([seatEnd - 1.02, 0.7, -D / 2 + back + 0.17], [0.18, 0.1, 0.06], pick(pillows, 1)));
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} scale={scale} />;
}

export function Pouf({ position = [0, 0, 0], scale = 1, color = palette.terracottaDeep }: Placement & { color?: string }) {
  // Plump tufted drum: a squashed ball over a round core, button in a dimple.
  const geometry = baked(`pouf|${color}`, () => {
    const parts: Part[] = [
      cyl(0.38, 0.3, [0, 0.2, 0], tint(color, -0.04), undefined, G.round),
      ball([0.42, 0.22, 0.42], [0, 0.24, 0], color, undefined, G.round3),
      ball([0.39, 0.1, 0.39], [0, 0.36, 0], tint(color, 0.04), undefined, G.round3),
      ball([0.04, 0.015, 0.04], [0, 0.455, 0], tint(color, -0.25)),
    ];
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      parts.push(box([0.3, 0.006, 0.012], [Math.cos(angle) * 0.17, 0.452, -Math.sin(angle) * 0.17], tint(color, -0.12), [0, angle, 0.12]));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} scale={scale} />;
}

export function Beanbag({
  position = [0, 0, 0],
  color = "#e0b84f",
}: Placement & { color?: string }) {
  const geometry = baked(`beanbag|${color}`, () => [
    ball([0.62, 0.36, 0.62], [0, 0.28, 0], color),
    ball([0.5, 0.3, 0.4], [0, 0.38, -0.16], tint(color, -0.05)),
  ]);
  return <BakedMesh geometry={geometry} position={position} />;
}

/** Round oak coffee table on three slim splayed legs, styled with a plant, books and a mug. */
export function CoffeeTable({ position = [0, 0, 0], scale = 1, radius = 0.5 }: Placement & { radius?: number }) {
  const geometry = baked(`coffeetable|${radius}`, () => {
    const top = 0.44;
    const parts: Part[] = [
      cyl(radius, 0.05, [0, top - 0.025, 0], palette.oakLight, undefined, G.round),
      cyl(radius - 0.012, 0.012, [0, top - 0.054, 0], ink.oakDeep, undefined, G.round),
    ];
    for (let index = 0; index < 3; index += 1) {
      const angle = (index / 3) * Math.PI * 2 + 0.5;
      const reach = radius * 0.62;
      const splay = 0.16;
      parts.push(
        cyl(0.026, top - 0.03, [Math.cos(angle) * (reach + 0.035), (top - 0.03) / 2, -Math.sin(angle) * (reach + 0.035)], ink.oakDeep, [
          -Math.sin(angle) * splay,
          0,
          -Math.cos(angle) * splay,
        ], G.pot),
      );
    }
    parts.push(...grow(bookStackParts(2, [radius * 0.25, top, radius * 0.25], 2), 1.3, [radius * 0.25, top, radius * 0.25]));
    parts.push(...grow(mugParts([-radius * 0.15, top, radius * 0.45], palette.paper), 1.25, [-radius * 0.15, top, radius * 0.45]));
    parts.push(...placed(plantParts("leafy", palette.paper, palette.sageDeep), [-radius * 0.25, top, -radius * 0.2], 0.3, 0.38));
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} scale={scale} />;
}

export function SideTable({ position = [0, 0, 0], height = 0.55 }: Placement & { height?: number }) {
  const geometry = baked(`sidetable|${height}`, () => [
    cyl(0.26, 0.04, [0, height - 0.02, 0], ink.oak),
    cyl(0.025, height - 0.04, [0, (height - 0.04) / 2, 0], ink.charcoal, undefined, G.cylLow),
    cyl(0.17, 0.025, [0, 0.012, 0], ink.charcoal),
  ]);
  return <BakedMesh geometry={geometry} position={position} />;
}

export function TableLamp({
  position = [0, 0, 0],
  light = false,
}: Placement & { light?: boolean }) {
  const geometry = baked("tablelamp", () => [
    ball([0.1, 0.12, 0.1], [0, 0.12, 0], "#d7c3a5"),
    cyl(0.012, 0.16, [0, 0.3, 0], ink.metal, undefined, G.cylLow),
  ]);
  return (
    <group position={position}>
      <BakedMesh geometry={geometry} />
      <mesh position={[0, 0.44, 0]} scale={[0.17, 0.2, 0.17]} geometry={G.cone} material={shadeMaterial} castShadow dispose={null} />
      {light && <pointLight position={[0, 0.36, 0]} intensity={0.55} distance={3} color="#ffd9a0" />}
    </group>
  );
}

export type RugVariant = "terracotta" | "sage" | "cream" | "lines" | "blush" | "ivory" | "jute";

const rugMaterials = new Map<RugVariant, THREE.MeshStandardMaterial>();

function rugMaterial(variant: RugVariant) {
  let material = rugMaterials.get(variant);
  if (!material) {
    const map = {
      terracotta: textures.rug,
      sage: textures.rugSage,
      cream: textures.rugCream,
      lines: textures.rugLines,
      blush: textures.rugBlush,
      ivory: textures.rugIvory,
      jute: textures.rugJute,
    }[variant];
    material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    rugMaterials.set(variant, material);
  }
  return material;
}

const roundRug = new THREE.CylinderGeometry(0.5, 0.5, 1, 48);

export function Rug({
  position = [0, 0, 0],
  width = 6,
  depth = 4,
  color,
  variant = "terracotta",
  rotation = [0, 0, 0],
  shape = "rect",
}: Placement & {
  width?: number;
  depth?: number;
  color?: string;
  variant?: RugVariant;
  shape?: "rect" | "round";
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={[width, 0.03, depth]}
      geometry={shape === "round" ? roundRug : G.box}
      material={color ? mat(color, 1) : rugMaterial(variant)}
      receiveShadow
      dispose={null}
    />
  );
}

/** Open oak bookcase with books, baskets, vases and a few plants. Front faces +z. */
export function Shelf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.2,
  height = 1.7,
  depth = 0.34,
  seed = 1,
  backed = true,
}: Placement & { width?: number; height?: number; depth?: number; seed?: number; backed?: boolean }) {
  const levels = Math.max(1, Math.round((height - 0.05) / 0.42));
  const bays = Math.max(1, Math.floor(width / 0.75));
  const bayWidth = width / bays;
  const levelHeight = (height - 0.03) / levels;
  const key = `shelf|${width}|${height}|${depth}|${seed}|${backed}`;

  const layout = useMemo(() => {
    const plants: Array<{ position: V3; kind: PlantKind }> = [];
    const random = rng(seed * 97 + Math.round(width * 10));
    const contents: Array<{ bay: number; level: number; kind: number }> = [];
    for (let level = 0; level < levels; level += 1) {
      for (let bay = 0; bay < bays; bay += 1) {
        contents.push({ bay, level, kind: Math.floor(random() * 4) });
      }
    }
    for (const item of contents) {
      if (item.kind === 3 && levelHeight > 0.3) {
        plants.push({
          position: [-width / 2 + bayWidth * (item.bay + 0.5), 0.05 + item.level * levelHeight, 0],
          kind: item.level === levels - 1 ? "trailing" : "bush",
        });
      }
    }
    plants.push({ position: [width / 2 - 0.22, height, 0], kind: width > 1 ? "trailing" : "leafy" });
    return { contents, plants };
  }, [bayWidth, bays, height, levelHeight, levels, seed, width]);

  const geometry = baked(key, () => {
    const parts: Part[] = [];
    for (let bay = 0; bay <= bays; bay += 1) {
      parts.push(box([0.04, height, depth], [-width / 2 + bay * bayWidth, height / 2, 0], ink.oakDeep));
    }
    for (let level = 0; level <= levels; level += 1) {
      parts.push(box([width + 0.04, 0.04, depth + 0.02], [0, 0.02 + level * levelHeight, 0], ink.oak));
    }
    if (backed) parts.push(box([width, height, 0.015], [0, height / 2, -depth / 2 + 0.008], "#efe6d8"));
    for (const item of layout.contents) {
      const x = -width / 2 + bayWidth * (item.bay + 0.5);
      const y = 0.04 + item.level * levelHeight;
      const inner = bayWidth - 0.1;
      const maxBook = Math.min(0.3, levelHeight - 0.08);
      if (item.kind === 0) {
        parts.push(...bookRowParts(inner * 0.9, [x, y, 0.02], seed + item.bay * 7 + item.level * 3, maxBook));
      } else if (item.kind === 1) {
        parts.push(...bookRowParts(inner * 0.5, [x - inner * 0.22, y, 0.02], seed + item.level + 11, maxBook));
        parts.push(...vaseParts([x + inner * 0.25, y, 0.02], pick(["#e8dccb", palette.sage, palette.terracotta], item.level), Math.min(0.2, maxBook * 0.7), false));
      } else if (item.kind === 2) {
        parts.push(...basketParts([x, y, 0.03], Math.min(inner * 0.8, 0.5)));
      } else if (levelHeight <= 0.3) {
        parts.push(...bookStackParts(3, [x, y, 0.02], item.bay));
      } else {
        parts.push(...bookStackParts(2, [x - inner * 0.25, y, 0.02], item.level));
      }
    }
    parts.push(...bookStackParts(2, [-width / 2 + 0.25, height, 0.02], seed));
    return parts;
  });

  return (
    <group position={position} rotation={rotation}>
      <BakedMesh geometry={geometry} />
      {layout.plants.map((plant, index) => (
        <Plant key={index} position={plant.position} scale={0.42} pot={pick([ink.cream, palette.terracotta, "#e8dccb"], index + seed)} kind={plant.kind} />
      ))}
    </group>
  );
}

/** Low oak cabinet with doors. Front faces +z. */
export function Credenza({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 1.8,
  height = 0.68,
  depth = 0.45,
}: Placement & { length?: number; height?: number; depth?: number }) {
  const geometry = baked(`credenza|${length}|${height}|${depth}`, () => {
    const doors = Math.max(2, Math.round(length / 0.5));
    const parts: Part[] = [
      rbox([length, height - 0.1, depth], [0, 0.1 + (height - 0.1) / 2, 0], ink.oak, 0.02),
      box([length + 0.02, 0.03, depth + 0.02], [0, height - 0.005, 0], tint(ink.oak, 0.08)),
    ];
    for (let index = 1; index < doors; index += 1) {
      parts.push(box([0.01, height - 0.16, 0.006], [-length / 2 + (index * length) / doors, 0.1 + (height - 0.1) / 2, depth / 2 + 0.002], ink.oakDeep));
    }
    for (let index = 0; index < doors; index += 1) {
      parts.push(box([0.012, 0.12, 0.02], [-length / 2 + ((index + 0.5) * length) / doors + (index % 2 === 0 ? 0.16 : -0.16), height * 0.62, depth / 2 + 0.01], ink.metal));
    }
    for (const x of [-length / 2 + 0.08, length / 2 - 0.08]) {
      for (const z of [-depth / 2 + 0.06, depth / 2 - 0.06]) {
        parts.push(box([0.03, 0.1, 0.03], [x, 0.05, z], ink.charcoal));
      }
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

/**
 * Low oak planter box packed with foliage; trailing plants along both long
 * edges spill over the sides. Long axis along x. One draw call.
 */
export function Planter({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 3,
  width = 0.55,
  height = 0.6,
}: Placement & { length?: number; width?: number; height?: number }) {
  const geometry = baked(`planter|${length}|${width}|${height}`, () => {
    const parts: Part[] = [
      rbox([length, height, width], [0, height / 2, 0], ink.oak, 0.025),
      box([length + 0.03, 0.035, width + 0.03], [0, height - 0.012, 0], tint(ink.oak, 0.08)),
      box([length - 0.1, 0.01, width - 0.1], [0, height + 0.01, 0], ink.soil),
      box([length - 0.04, 0.06, width - 0.04], [0, 0.03, 0], ink.oakDeep),
    ];
    const slats = Math.round(length / 0.16);
    for (let index = 1; index < slats; index += 1) {
      const x = -length / 2 + (index * length) / slats;
      parts.push(box([0.01, height - 0.1, 0.004], [x, height / 2, width / 2 + 0.002], ink.oakDeep));
      parts.push(box([0.01, height - 0.1, 0.004], [x, height / 2, -width / 2 - 0.002], ink.oakDeep));
    }
    const leaf = palette.sageDeep;
    // A few big, lush specimens read as one planting at diorama distance;
    // many small ones read as noise.
    const spine = Math.max(2, Math.round(length / 0.85));
    for (let index = 0; index < spine; index += 1) {
      const x = -length / 2 + 0.4 + (index * (length - 0.8)) / (spine - 1);
      const kind = pick<PlantKind>(["leafy", "tall", "leafy", "bush"], index);
      const scale = kind === "tall" ? 0.95 : 1.3;
      parts.push(...placed(plantParts(kind, ink.charcoal, leaf), [x, height - 0.3 * scale, 0], index * 1.3, scale));
    }
    const edge = Math.max(1, Math.round(length / 1.4));
    for (let index = 0; index < edge; index += 1) {
      const x = -length / 2 + 0.6 + (index * (length - 1.2)) / Math.max(1, edge - 1);
      parts.push(...placed(plantParts("trailing", ink.charcoal, leaf), [x, height - 0.26, width * 0.3], index * 0.8, 1.0));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

/** Garden bench with a cushion. Seat faces +z. */
export function Bench({ position = [0, 0, 0], rotation = [0, 0, 0], length = 1.6 }: Placement & { length?: number }) {
  const geometry = baked(`bench|${length}`, () => {
    const parts: Part[] = [
      rbox([length, 0.06, 0.48], [0, 0.42, 0], ink.oak, 0.02),
      rbox([length - 0.06, 0.08, 0.42], [0, 0.49, 0.01], palette.sage, 0.035),
      rbox([length, 0.36, 0.05], [0, 0.72, -0.22], ink.oak, 0.02, [-0.1, 0, 0]),
      rbox([0.36, 0.32, 0.12], [-length / 2 + 0.3, 0.66, -0.14], palette.terracotta, 0.06, [0.2, 0.15, 0.06]),
      rbox([0.32, 0.3, 0.12], [length / 2 - 0.32, 0.66, -0.14], palette.paper, 0.06, [0.2, -0.12, -0.06]),
    ];
    for (const x of [-length / 2 + 0.08, length / 2 - 0.08]) {
      parts.push(box([0.06, 0.4, 0.44], [x, 0.2, 0], ink.oakDeep));
      parts.push(box([0.05, 0.3, 0.05], [x, 0.58, -0.2], ink.oakDeep));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

/** Three-panel folding screen. */
export function FoldingScreen({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  const geometry = baked("foldingscreen", () => {
    const parts: Part[] = [];
    [-0.5, 0, 0.5].forEach((x, index) => {
      const angle = index === 1 ? 0 : 0.45 * (index === 0 ? 1 : -1);
      const offsetZ = index === 1 ? 0 : -0.1;
      parts.push(rbox([0.5, 1.55, 0.035], [x * 0.96, 0.82, offsetZ], "#e9dcc4", 0.015, [0, angle, 0]));
      parts.push(rbox([0.52, 0.04, 0.05], [x * 0.96, 1.6, offsetZ], ink.oakDeep, 0.01, [0, angle, 0]));
      parts.push(rbox([0.52, 0.04, 0.05], [x * 0.96, 0.06, offsetZ], ink.oakDeep, 0.01, [0, angle, 0]));
    });
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

/* ------------------------------------------------------------------ */
/* Architecture                                                        */
/* ------------------------------------------------------------------ */

/** Glass partition with charcoal frames. Runs along local x. */
export function GlassWall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 4,
  height = 2.5,
  frosted = false,
}: Placement & { length?: number; height?: number; frosted?: boolean }) {
  const frame = baked(`glasswall|${length}|${height}`, () => {
    const posts = Math.max(1, Math.round(length / 1.6));
    const parts: Part[] = [
      box([length + 0.05, 0.06, 0.07], [0, height - 0.03, 0], ink.charcoal),
      box([length + 0.05, 0.06, 0.07], [0, 0.03, 0], ink.charcoal),
    ];
    for (let index = 0; index <= posts; index += 1) {
      parts.push(box([0.05, height, 0.07], [-length / 2 + (index / posts) * length, height / 2, 0], ink.charcoal));
    }
    return parts;
  });
  return (
    <group position={position} rotation={rotation}>
      <BakedMesh geometry={frame} />
      <mesh
        position={[0, height / 2, 0]}
        scale={[length, height - 0.1, 1]}
        geometry={G.plane}
        material={frosted ? frostedMaterial : glassMaterial}
        dispose={null}
      />
    </group>
  );
}

export type WallOpening = {
  /** Centre along the wall's local x. */
  at: number;
  width: number;
  bottom: number;
  top: number;
  kind: "window" | "door";
  curtain?: boolean;
};

const curtainCache = new Map<string, THREE.BufferGeometry>();

function curtainGeometry(width: number, height: number) {
  const key = `${width}|${height}`;
  let geometry = curtainCache.get(key);
  if (!geometry) {
    geometry = new THREE.PlaneGeometry(width, height, 28, 1);
    const position = geometry.getAttribute("position");
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      position.setZ(index, Math.sin((x / width) * Math.PI * 7) * 0.035);
    }
    geometry.computeVertexNormals();
    curtainCache.set(key, geometry);
  }
  return geometry;
}

/** Sheer gathered curtain panel. */
export function Curtain({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.6,
  height = 2,
}: Placement & { width?: number; height?: number }) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={curtainGeometry(width, height)}
      material={curtainMaterial}
      dispose={null}
    />
  );
}

/**
 * Cutaway wall along local x, interior face toward +z. Openings become real
 * gaps with frames; the top edge gets a white "cut" cap.
 */
export function Wall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 20,
  height = 2.7,
  thickness = 0.18,
  openings = [],
}: Placement & { length?: number; height?: number; thickness?: number; openings?: WallOpening[] }) {
  const key = `wall|${length}|${height}|${thickness}|${JSON.stringify(openings)}`;
  // Plaster (lifted by a faint warm emissive) and charcoal trim bake separately,
  // so the lift never greys out the frames.
  const build = () => {
    const wall = "#faf3e7";
    const base = "#eadfcd";
    const cap = "#fefcf8";
    const parts: Part[] = [];
    const trim: Part[] = [];
    const face = thickness / 2;
    const full = (from: number, to: number) => {
      if (to - from < 0.001) return;
      const mid = (from + to) / 2;
      parts.push(box([to - from, height, thickness], [mid, height / 2, 0], wall));
      parts.push(box([to - from, 0.12, 0.025], [mid, 0.06, face + 0.012], base));
      parts.push(box([to - from, 0.04, thickness + 0.03], [mid, height + 0.02, 0], cap));
    };
    const sorted = [...openings].sort((a, b) => a.at - b.at);
    let cursor = -length / 2;
    for (const opening of sorted) {
      const left = opening.at - opening.width / 2;
      const right = opening.at + opening.width / 2;
      full(cursor, left);
      if (opening.bottom > 0) {
        parts.push(box([opening.width, opening.bottom, thickness], [opening.at, opening.bottom / 2, 0], wall));
        parts.push(box([opening.width, 0.12, 0.025], [opening.at, 0.06, face + 0.012], base));
      }
      parts.push(box([opening.width, height - opening.top, thickness], [opening.at, (height + opening.top) / 2, 0], wall));
      parts.push(box([opening.width, 0.04, thickness + 0.03], [opening.at, height + 0.02, 0], cap));
      // Frame.
      const frameDepth = thickness + 0.04;
      const span = opening.top - opening.bottom;
      trim.push(box([0.06, span, frameDepth], [left + 0.03, opening.bottom + span / 2, 0], ink.charcoal));
      trim.push(box([0.06, span, frameDepth], [right - 0.03, opening.bottom + span / 2, 0], ink.charcoal));
      trim.push(box([opening.width, 0.06, frameDepth], [opening.at, opening.top - 0.03, 0], ink.charcoal));
      if (opening.kind === "window") {
        trim.push(box([opening.width, 0.05, frameDepth], [opening.at, opening.bottom + 0.025, 0], ink.charcoal));
        parts.push(box([opening.width + 0.1, 0.04, 0.16], [opening.at, opening.bottom - 0.02, face + 0.06], cap));
        trim.push(box([0.04, span, 0.05], [opening.at, opening.bottom + span / 2, 0], ink.charcoal));
      } else {
        // Glass door leaf with a pull handle.
        trim.push(box([0.04, span - 0.06, 0.05], [opening.at - opening.width / 2 + 0.08, opening.bottom + (span - 0.06) / 2, 0.02], ink.charcoal));
        trim.push(box([opening.width - 0.12, 0.08, 0.05], [opening.at, 0.1, 0.02], ink.charcoal));
        trim.push(box([0.03, 0.5, 0.03], [opening.at + opening.width / 2 - 0.16, 1.05, face + 0.03], ink.chrome));
      }
      cursor = right;
    }
    full(cursor, length / 2);
    return { parts, trim };
  };
  const shell = baked(key, () => build().parts);
  const frames = openings.length > 0 ? baked(`${key}|trim`, () => build().trim) : null;

  return (
    <group position={position} rotation={rotation}>
      <BakedMesh geometry={shell} material={plasterMaterial} />
      {frames && <BakedMesh geometry={frames} />}
      {openings.map((opening) => {
        const span = opening.top - opening.bottom;
        const centreY = opening.bottom + span / 2;
        return (
          <group key={opening.at}>
            <mesh
              position={[opening.at, centreY, -thickness / 2 + 0.01]}
              scale={[opening.width - 0.08, span - 0.08, 1]}
              geometry={G.plane}
              material={viewMaterial}
              dispose={null}
            />
            <mesh
              position={[opening.at, centreY, 0.02]}
              scale={[opening.width - 0.1, span - 0.1, 1]}
              geometry={G.plane}
              material={glassMaterial}
              dispose={null}
            />
            {opening.curtain && (
              <>
                <Block
                  size={[opening.width + 0.7, 0.02, 0.02]}
                  position={[opening.at, opening.top + 0.14, thickness / 2 + 0.1]}
                  color={ink.charcoal}
                  castShadow={false}
                />
                <Curtain
                  position={[opening.at + opening.width / 2 + 0.08, (opening.top + 0.12) / 2 + 0.02, thickness / 2 + 0.1]}
                  width={0.62}
                  height={opening.top + 0.1}
                />
                <Curtain
                  position={[opening.at - opening.width / 2 - 0.12, (opening.top + 0.12) / 2 + 0.02, thickness / 2 + 0.1]}
                  width={0.4}
                  height={opening.top + 0.1}
                />
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Vertical oak slat divider. Runs along local x. */
export function SlatDivider({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 1.6,
  height = 2.6,
}: Placement & { length?: number; height?: number }) {
  const geometry = baked(`slats|${length}|${height}`, () => {
    const parts: Part[] = [
      box([length, 0.05, 0.12], [0, 0.025, 0], ink.oakDeep),
      box([length, 0.05, 0.12], [0, height - 0.025, 0], ink.oakDeep),
    ];
    const count = Math.round(length / 0.1);
    for (let index = 0; index < count; index += 1) {
      parts.push(
        box([0.05, height - 0.1, 0.08], [-length / 2 + 0.05 + (index * (length - 0.1)) / Math.max(1, count - 1), height / 2, 0], index % 3 === 1 ? ink.oakDeep : ink.oak),
      );
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function WallArt({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  variant = 0,
  width = 1.2,
  height = 1.5,
}: Placement & { variant?: number; width?: number; height?: number }) {
  const texture = pick([textures.posterA, textures.posterB, textures.posterC], variant);
  return (
    <group position={position} rotation={rotation}>
      <Block size={[width + 0.08, height + 0.08, 0.04]} color={ink.oak} />
      <mesh position={[0, 0, 0.021]} scale={[width, height, 1]} geometry={G.plane} material={mat(ink.white, 0.9)} dispose={null} />
      <mesh position={[0, 0, 0.023]} scale={[width * 0.84, height * 0.86, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Wall-mounted display. Faces +z. */
export function WallScreen({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.5,
  height = 0.86,
}: Placement & { width?: number; height?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <Block size={[width + 0.06, height + 0.06, 0.05]} color="#2b313a" radius={0.015} />
      <mesh position={[0, 0, 0.027]} scale={[width, height, 1]} geometry={G.plane} material={screenMaterial} dispose={null} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Kitchen                                                             */
/* ------------------------------------------------------------------ */

/** Pale honey oak for kitchen joinery (the reference's is lighter and less orange than the desks). */
const joinery = { oak: "#e8d6bc", shade: "#c8b093", kick: "#7d6a58", handle: "#3d4249", counter: "#f6f3ee" };

/** A slab door/drawer front proud of the carcass, with a dark pull. Front face at `z`. */
function frontParts(
  w: number,
  h: number,
  [x, y, z]: V3,
  pull: "top" | "bottom" | "left" | "right" | "none" = "top",
): Part[] {
  const parts: Part[] = [rbox([w - 0.022, h - 0.022, 0.034], [x, y, z - 0.017], joinery.oak, 0.014)];
  const inset = 0.07;
  if (pull === "top") parts.push(rbox([Math.min(0.22, w * 0.45), 0.022, 0.03], [x, y + h / 2 - inset, z + 0.012], joinery.handle, 0.009));
  if (pull === "bottom") parts.push(rbox([Math.min(0.22, w * 0.45), 0.022, 0.03], [x, y - h / 2 + inset, z + 0.012], joinery.handle, 0.009));
  if (pull === "left" || pull === "right") {
    const side = pull === "left" ? -1 : 1;
    parts.push(rbox([0.022, Math.min(0.24, h * 0.4), 0.03], [x + side * (w / 2 - 0.06), y, z + 0.012], joinery.handle, 0.009));
  }
  return parts;
}

/** Espresso machine + grinder, built around the machine's footprint centre at counter height 0. */
function espressoParts(): Part[] {
  const body = "#2f343a";
  const steel = "#cfd4d8";
  return [
    rbox([0.42, 0.46, 0.38], [0, 0.23, 0], body, 0.05),
    rbox([0.44, 0.035, 0.4], [0, 0.475, 0], steel, 0.012),
    rbox([0.3, 0.09, 0.02], [0, 0.37, 0.19], steel, 0.008),
    ball(0.018, [-0.08, 0.37, 0.205], "#e2b25a"),
    ball(0.018, [0.08, 0.37, 0.205], "#8fc19a"),
    cyl(0.055, 0.06, [0, 0.27, 0.23], steel),
    rbox([0.04, 0.03, 0.17], [0.04, 0.235, 0.32], "#1f2328", 0.012, [0, -0.5, 0]),
    rbox([0.32, 0.03, 0.15], [0, 0.03, 0.25], steel, 0.01),
    ...grow(mugParts([0, 0.045, 0.25], palette.paper), 1.2, [0, 0.045, 0.25]),
    // Grinder.
    rbox([0.14, 0.26, 0.17], [0.33, 0.13, -0.02], body, 0.03),
    cyl(0.07, 0.16, [0.33, 0.34, -0.02], "#8a6a4d", undefined, G.pot),
    cyl(0.074, 0.02, [0.33, 0.43, -0.02], body),
  ];
}

/**
 * Full rear kitchen run: slab-front oak base cabinets with dark pulls, a thick
 * white counter, espresso station, undermount sink, two floating shelves with
 * an LED wash, big mugs and pothos spilling over, an upper cabinet at the end.
 * Back edge sits at local z = -0.33 (put that against the wall).
 */
export function KitchenRun({ position = [0, 0, 0], length = 6.8 }: Placement & { length?: number }) {
  const half = length / 2;
  const sinkX = -half + length * 0.42;
  const coffeeX = -half + 0.45;
  const shelfStart = -half + 0.12;
  const shelfEnd = half - 1.62;
  const shelfLength = shelfEnd - shelfStart;
  const shelfMid = (shelfStart + shelfEnd) / 2;
  const counter = 0.945;
  const shelves = [1.5, 1.93];
  const shelfDepth = 0.28;
  const shelfZ = -0.33 + shelfDepth / 2;
  const frontZ = 0.275;

  const cabinets = baked(`kitchen-base|${length}`, () => {
    const parts: Part[] = [
      box([length, 0.8, 0.56], [0, 0.48, -0.04], joinery.shade),
      box([length - 0.04, 0.08, 0.5], [0, 0.04, -0.07], joinery.kick),
      rbox([length + 0.04, 0.065, 0.64], [0, counter - 0.0325, -0.01], joinery.counter, 0.022),
    ];
    const units = Math.max(2, Math.round(length / 0.6));
    const unit = length / units;
    for (let index = 0; index < units; index += 1) {
      const x = -half + (index + 0.5) * unit;
      if (index === 0 || index === units - 3) {
        for (let drawer = 0; drawer < 3; drawer += 1) {
          parts.push(...frontParts(unit, 0.262, [x, 0.08 + 0.131 + drawer * 0.262, frontZ], "top"));
        }
      } else {
        parts.push(...frontParts(unit, 0.786, [x, 0.08 + 0.393, frontZ], "top"));
      }
    }
    // Upper cabinet at the right end: two doors, pulls along the bottom.
    const upperX = half - 0.76;
    const upperZ = -0.33 + 0.18;
    parts.push(box([1.48, 0.76, 0.34], [upperX, 1.96, upperZ - 0.01], joinery.shade));
    for (const side of [-1, 1]) {
      parts.push(...frontParts(0.74, 0.78, [upperX + side * 0.37, 1.96, upperZ + 0.185], "bottom"));
    }
    // Floating shelves: thick oak slabs, no brackets.
    for (const y of shelves) {
      parts.push(rbox([shelfLength, 0.055, shelfDepth], [shelfMid, y, shelfZ], palette.oakLight, 0.014));
    }
    return parts;
  });

  const counterItems = baked(`kitchen-items|${length}`, () => {
    const parts: Part[] = [
      // Undermount sink + tall gooseneck tap.
      rbox([0.62, 0.008, 0.42], [sinkX, counter + 0.002, 0.0], "#c3c9ce", 0.004),
      rbox([0.52, 0.01, 0.32], [sinkX, counter + 0.005, 0.0], "#79818a", 0.004),
      ...grow(
        [
          cyl(0.028, 0.05, [sinkX, counter + 0.025, -0.24], ink.chrome),
          cyl(0.016, 0.32, [sinkX, counter + 0.16, -0.24], ink.chrome, undefined, G.cylLow),
          { g: G.halfTorus, s: 0.09, p: [sinkX, counter + 0.32, -0.15], r: [0, Math.PI / 2, 0], c: ink.chrome },
          cyl(0.018, 0.06, [sinkX, counter + 0.3, -0.06], ink.chrome, undefined, G.cylLow),
        ],
        1.35,
        [sinkX, counter, -0.24],
      ),
      ...placed(espressoParts(), [coffeeX, counter, -0.06], 0, 1.15),
      // Cutting board leaning on the wall + a kettle, left of the sink.
      rbox([0.34, 0.46, 0.03], [sinkX - 0.62, counter + 0.23, -0.29], palette.oak, 0.03, [-0.14, 0, 0]),
      ...grow(
        [
          cyl(0.1, 0.2, [sinkX - 0.55, counter + 0.1, -0.04], "#efe9df", undefined, G.pot),
          cyl(0.05, 0.03, [sinkX - 0.55, counter + 0.215, -0.04], "#3a3f46"),
          { g: G.halfTorus, s: 0.07, p: [sinkX - 0.55, counter + 0.205, -0.04], c: "#3a3f46" },
          cyl(0.014, 0.12, [sinkX - 0.45, counter + 0.13, -0.04], "#efe9df", [0, 0, -0.9], G.cylLow),
        ],
        1.2,
        [sinkX - 0.55, counter, -0.04],
      ),
      // A French press and two mugs right of the sink, a fruit bowl further on.
      ...grow(
        [
          cyl(0.055, 0.2, [sinkX + 0.6, counter + 0.1, -0.12], "#d7e2e6"),
          cyl(0.06, 0.03, [sinkX + 0.6, counter + 0.215, -0.12], "#3a3f46"),
          cyl(0.008, 0.06, [sinkX + 0.6, counter + 0.25, -0.12], "#3a3f46"),
          cyl(0.052, 0.07, [sinkX + 0.6, counter + 0.035, -0.12], "#7a5a43"),
          ...mugParts([sinkX + 0.78, counter, -0.02], palette.paper),
        ],
        1.35,
        [sinkX + 0.65, counter, -0.1],
      ),
      ...grow(
        [
          cyl(0.17, 0.08, [half - 0.75, counter + 0.04, -0.02], ink.cream, [Math.PI, 0, 0], G.pot),
          ball(0.06, [half - 0.8, counter + 0.1, 0.01], "#e9a04a"),
          ball(0.06, [half - 0.7, counter + 0.1, -0.05], "#e9a04a"),
          ball(0.055, [half - 0.74, counter + 0.16, 0.0], "#a9c46c"),
        ],
        1.25,
        [half - 0.75, counter, 0],
      ),
    ];

    // Shelves: big mugs in loose groups with air between, pothos spilling over.
    const [lower, upper] = shelves.map((y) => y + 0.0275) as [number, number];
    const z = shelfZ + 0.01;
    const mug = (x: number, y: number, color: string) => grow(mugParts([x, y, z], color), 1.55, [x, y, z]);
    const shelfMugs = [palette.paper, "#efe6d6", palette.paper, "#9fb3c0", palette.paper, "#c9d6c4"];
    const step = shelfLength / 14;
    [0.6, 1.4, 2.2].forEach((slot, index) => parts.push(...mug(shelfStart + slot * step, lower, pick(shelfMugs, index))));
    [6.6, 7.4].forEach((slot, index) => parts.push(...grow(jarParts([shelfStart + slot * step, lower, z], index ? "#efe6d0" : "#c69a5b", 0.2), 1.35, [shelfStart + slot * step, lower, z])));
    [10.4, 11.2, 12.0].forEach((slot, index) => parts.push(...mug(shelfStart + slot * step, lower, pick(shelfMugs, index + 3))));
    [2.6, 3.4, 4.2].forEach((slot, index) => parts.push(...mug(shelfStart + slot * step, upper, pick(shelfMugs, index + 1))));
    [8.2, 9.0].forEach((slot, index) => parts.push(...mug(shelfStart + slot * step, upper, pick(shelfMugs, index + 4))));
    parts.push(...grow(vaseParts([shelfStart + 13.1 * step, upper, z], palette.terracotta, 0.22, false), 1.35, [shelfStart + 13.1 * step, upper, z]));
    parts.push(...placed(plantParts("trailing", ink.cream, palette.sageDeep), [shelfStart + 0.9 * step, upper, z], 0.4, 0.72));
    parts.push(...placed(plantParts("trailing", ink.cream, palette.sageDeep), [shelfStart + 5.6 * step, upper, z], 1.6, 0.8));
    parts.push(...placed(plantParts("trailing", palette.terracotta, palette.sageDeep), [shelfStart + 4.4 * step, lower, z], 1.1, 0.62));
    parts.push(...placed(plantParts("trailing", ink.cream, palette.sageDeep), [shelfStart + 11.6 * step, upper, z], 0.7, 0.66));
    // Pothos on top of the upper cabinet, vines down its face.
    parts.push(...placed(plantParts("trailing", ink.cream, palette.sageDeep), [half - 1.15, 2.34, -0.17], 0.9, 0.72));
    return parts;
  });

  const glow = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: textures.wallGlow,
        color: "#ffcf8f",
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  return (
    <group position={position}>
      <BakedMesh geometry={cabinets} />
      <BakedMesh geometry={counterItems} />
      {shelves.map((y) => (
        <group key={y}>
          <mesh position={[shelfMid, y - 0.03, shelfZ + shelfDepth / 2 - 0.03]} scale={[shelfLength - 0.12, 0.008, 0.02]} geometry={G.box} material={ledMaterial} dispose={null} />
          <mesh position={[shelfMid, y - 0.27, -0.322]} scale={[shelfLength, 0.5, 1]} geometry={G.plane} material={glow} raycast={() => null} dispose={null} />
        </group>
      ))}
    </group>
  );
}

/** Kept for older call sites: a full kitchen run. */
export function Kitchen({ position = [0, 0, 0] }: Placement) {
  return <KitchenRun position={position} />;
}

const stainlessMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.3 });

/** Tall two-door fridge in brushed stainless: fridge over freezer, bar pulls on the left. */
export function Fridge({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  const geometry = baked("fridge", () => {
    const steel = "#a3abb2";
    const door = "#b2b9bf";
    const pull = "#e3e6e8";
    return [
      rbox([0.86, 1.96, 0.66], [0, 1.02, -0.02], steel, 0.05),
      rbox([0.84, 1.2, 0.05], [0, 1.385, 0.31], door, 0.035),
      rbox([0.84, 0.7, 0.05], [0, 0.415, 0.31], door, 0.035),
      rbox([0.04, 0.62, 0.05], [-0.35, 1.27, 0.36], pull, 0.018),
      rbox([0.04, 0.34, 0.05], [-0.35, 0.58, 0.36], pull, 0.018),
      box([0.82, 0.06, 0.6], [0, 0.03, -0.04], "#4f565c"),
    ];
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} material={stainlessMaterial} />;
}

/** Floor-to-ceiling pantry: two slab doors over two, oak like the kitchen run. */
export function TallCabinet({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.9,
  height = 2.2,
}: Placement & { width?: number; height?: number }) {
  const geometry = baked(`tallcabinet|${width}|${height}`, () => {
    const split = 0.08 + (height - 0.08) * 0.62;
    const lowerH = split - 0.08;
    const upperH = height - split;
    const frontZ = 0.31;
    const parts: Part[] = [
      box([width, height - 0.08, 0.58], [0, 0.08 + (height - 0.08) / 2, -0.01], joinery.shade),
      box([width - 0.04, 0.08, 0.52], [0, 0.04, -0.04], joinery.kick),
    ];
    for (const side of [-1, 1]) {
      const pull = side < 0 ? "right" : "left";
      parts.push(...frontParts(width / 2, lowerH, [(side * width) / 4, 0.08 + lowerH / 2, frontZ], pull));
      parts.push(...frontParts(width / 2, upperH, [(side * width) / 4, split + upperH / 2, frontZ], pull));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

/* ------------------------------------------------------------------ */
/* Meeting + nap                                                       */
/* ------------------------------------------------------------------ */

/** Long oak table with six upholstered chairs. Long axis along x. */
export function MeetingTable({
  position = [0, 0, 0],
  length = 3.4,
  width = 1.2,
  chairColor = palette.terracotta,
  chairScale = 1,
}: Placement & { length?: number; width?: number; chairColor?: string; chairScale?: number }) {
  const table = baked(`meetingtable|${length}|${width}`, () => {
    const top = 0.76;
    const parts: Part[] = [
      rbox([length, 0.05, width], [0, top - 0.025, 0], palette.oakLight, 0.022),
      box([length - 0.5, 0.05, width - 0.4], [0, top - 0.075, 0], ink.oakDeep),
    ];
    for (const x of [-length / 2 + 0.28, length / 2 - 0.28]) {
      for (const z of [-width / 2 + 0.18, width / 2 - 0.18]) {
        parts.push(cyl(0.038, top - 0.05, [x, (top - 0.05) / 2, z], ink.oakDeep, [Math.PI, 0, 0], G.pot));
      }
    }
    // Sparse, like the reference: a conference puck, two mugs, a closed notebook.
    parts.push(cyl(0.09, 0.035, [length * 0.1, top + 0.018, 0.1], ink.charcoal, undefined, G.round));
    parts.push(...grow(mugParts([-length * 0.22, top, 0.3], palette.paper), 1.25, [-length * 0.22, top, 0.3]));
    parts.push(...grow(mugParts([length * 0.28, top, -0.32], "#e8dccb"), 1.25, [length * 0.28, top, -0.32]));
    return parts;
  });
  const xs = [-length / 3, 0, length / 3];
  const offset = width / 2 + 0.16 * chairScale;
  return (
    <group position={position}>
      <BakedMesh geometry={table} />
      <Laptop position={[-length * 0.3, 0.76, 0.12]} rotation={[0, 0.35, 0]} />
      <Notebook position={[length * 0.32, 0.76, 0.22]} rotation={[0, -0.25, 0]} color={palette.sage} />
      <Plant position={[-0.15, 0.76, -0.05]} scale={0.6} pot={palette.paper} kind="leafy" />
      {xs.map((x) => (
        <group key={x}>
          <DiningChair position={[x, 0, -offset]} color={chairColor} scale={chairScale} />
          <DiningChair position={[x, 0, offset]} rotation={[0, Math.PI, 0]} color={chairColor} scale={chairScale} />
        </group>
      ))}
    </group>
  );
}

/** Oak café chair with a cushion and a spindle back. Seat faces +z. */
function cafeChairParts(cushion: string): Part[] {
  const parts: Part[] = [
    rbox([0.46, 0.05, 0.44], [0, 0.45, 0], ink.oak, 0.02),
    rbox([0.42, 0.06, 0.38], [0, 0.5, 0.02], cushion, 0.03),
    rbox([0.46, 0.12, 0.045], [0, 0.88, -0.21], ink.oak, 0.02, [-0.08, 0, 0]),
  ];
  for (const x of [-0.19, 0.19]) {
    parts.push(cyl(0.022, 0.45, [x, 0.22, 0.17], ink.oakDeep, undefined, G.cylLow));
    parts.push(cyl(0.022, 0.88, [x, 0.44, -0.19], ink.oakDeep, [-0.06, 0, 0], G.cylLow));
  }
  for (const x of [-0.08, 0, 0.08]) {
    parts.push(cyl(0.012, 0.32, [x, 0.66, -0.2], ink.oak, [-0.08, 0, 0], G.cylLow));
  }
  return parts;
}

/**
 * Communal kitchen table: oak trestle table, two café chairs on the far side,
 * one at the +x end, a cushioned bench on the near side, and everyday clutter
 * (mugs, books, fruit, a planted centrepiece). Long axis along x. One draw call.
 */
export function CommunalTable({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 2.3,
  width = 0.95,
}: Placement & { length?: number; width?: number }) {
  const geometry = baked(`communaltable|${length}|${width}`, () => {
    const top = 0.76;
    const parts: Part[] = [
      rbox([length, 0.06, width], [0, top - 0.03, 0], ink.oak, 0.025),
      box([length - 0.02, 0.012, width - 0.02], [0, top - 0.065, 0], ink.oakDeep),
      box([length - 0.9, 0.06, 0.08], [0, 0.32, 0], ink.oakDeep),
    ];
    for (const x of [-length / 2 + 0.32, length / 2 - 0.32]) {
      parts.push(rbox([0.09, top - 0.1, 0.12], [x, (top - 0.06) / 2, 0], ink.oakDeep, 0.02));
      parts.push(rbox([0.1, 0.07, width - 0.16], [x, 0.035, 0], ink.oakDeep, 0.02));
      parts.push(rbox([0.1, 0.05, width - 0.24], [x, top - 0.1, 0], ink.oakDeep, 0.015));
    }
    // Seating.
    const back = -width / 2 - 0.3;
    parts.push(...placed(cafeChairParts(palette.sage), [-length * 0.22, 0, back], 0));
    parts.push(...placed(cafeChairParts(palette.terracotta), [length * 0.24, 0, back], 0.08));
    parts.push(...placed(cafeChairParts("#e8dccb"), [length / 2 + 0.34, 0, 0.05], -Math.PI / 2));
    const front = width / 2 + 0.33;
    parts.push(
      rbox([length - 0.45, 0.06, 0.38], [0, 0.42, front], ink.oak, 0.02),
      rbox([length - 0.55, 0.06, 0.32], [0, 0.47, front], "#e9dcc6", 0.03),
      rbox([0.3, 0.26, 0.1], [-length / 2 + 0.55, 0.62, front - 0.05], palette.terracotta, 0.05, [-0.2, 0.2, 0.05]),
    );
    for (const x of [-length / 2 + 0.38, length / 2 - 0.38]) {
      parts.push(box([0.06, 0.39, 0.32], [x, 0.195, front], ink.oakDeep));
    }
    // Table runner, mugs at each place, books, fruit bowl, papers.
    parts.push(box([length * 0.62, 0.006, 0.32], [0, top + 0.003, 0], "#efe6d6"));
    const y = top;
    [
      [-length * 0.22, -0.25, palette.paper],
      [length * 0.24, -0.27, "#a8bfa3"],
      [-length * 0.3, 0.27, "#d98e73"],
      [length * 0.1, 0.3, "#7f9fb8"],
      [length / 2 - 0.2, 0.08, "#e8dccb"],
    ].forEach(([x, z, color]) => parts.push(...grow(mugParts([x as number, y, z as number], color as string), 1.2, [x as number, y, z as number])));
    parts.push(...grow(bookStackParts(3, [length * 0.36, y, 0.22], 1), 1.15, [length * 0.36, y, 0.22]));
    parts.push(box([0.22, 0.005, 0.3], [-length * 0.06, y + 0.004, 0.3], ink.white, [0, 0.25, 0]));
    parts.push(
      ...grow(
        [
          cyl(0.15, 0.07, [-length * 0.27, y + 0.035, 0.0], ink.cream, [Math.PI, 0, 0], G.pot),
          ball(0.05, [-length * 0.27 - 0.05, y + 0.09, 0.02], "#e9a04a"),
          ball(0.05, [-length * 0.27 + 0.05, y + 0.09, -0.03], "#e9a04a"),
          ball(0.045, [-length * 0.27, y + 0.14, 0.0], "#a9c46c"),
          ball(0.045, [-length * 0.27 + 0.03, y + 0.09, 0.06], "#d9634a"),
        ],
        1.2,
        [-length * 0.27, y, 0],
      ),
    );
    parts.push(...placed(plantParts("leafy", ink.cream, palette.sageDeep), [length * 0.03, y + 0.006, 0], 0.4, 0.5));
    parts.push(...placed(plantParts("trailing", palette.terracotta, palette.sageDeep), [length * 0.2, y + 0.006, -0.05], 1.1, 0.34));
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function Bed({ position = [0, 0, 0] }: Placement) {
  const geometry = baked("bed", () => [
    rbox([2.3, 0.28, 1.65], [0, 0.25, 0], palette.oakDark, 0.08),
    rbox([2.2, 0.24, 1.55], [0, 0.44, 0], "#f7f1e6", 0.1),
    rbox([2.3, 0.9, 0.16], [0, 0.78, -0.82], palette.oakDark, 0.08),
    rbox([0.75, 0.18, 0.42], [-0.5, 0.62, -0.45], palette.paper, 0.1, [0.08, 0, 0]),
    rbox([2.15, 0.18, 1.35], [0, 0.58, 0.08], "#3d5a80", 0.1),
  ]);
  return <BakedMesh geometry={geometry} position={position} />;
}

/** Narrow daybed, long axis along z, headboard at -z. Mattress top ≈ 0.6. */
export function Daybed({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  const geometry = baked("daybed", () => {
    const parts: Part[] = [
      rbox([1.2, 0.26, 2.15], [0, 0.23, 0], ink.oak, 0.05),
      rbox([1.1, 0.22, 2.04], [0, 0.46, 0.02], "#f7f2e8", 0.08),
      rbox([1.22, 0.8, 0.14], [0, 0.6, -1.06], palette.sage, 0.07),
      rbox([1.26, 0.06, 0.18], [0, 1.02, -1.06], ink.oak, 0.025),
      rbox([0.62, 0.15, 0.34], [-0.12, 0.62, -0.78], palette.paper, 0.07, [0.1, 0.08, 0]),
      rbox([0.5, 0.13, 0.3], [0.28, 0.61, -0.82], palette.terracotta, 0.06, [0.12, -0.15, 0]),
      rbox([1.14, 0.06, 0.62], [0, 0.6, 0.66], palette.terracottaDeep, 0.03),
      rbox([0.05, 0.3, 0.62], [0.58, 0.46, 0.66], palette.terracottaDeep, 0.02),
    ];
    for (const x of [-0.52, 0.52]) {
      for (const z of [-0.95, 0.95]) parts.push(cyl(0.035, 0.1, [x, 0.05, z], ink.oakDeep, undefined, G.cylLow));
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function FloorLamp({
  position = [0, 0, 0],
  color = palette.paper,
  light = true,
}: Placement & { color?: string; light?: boolean }) {
  const geometry = baked(`floorlamp`, () => [
    cyl(0.18, 0.03, [0, 0.015, 0], ink.charcoal),
    cyl(0.016, 1.55, [0, 0.79, 0], ink.charcoal, undefined, G.cylLow),
  ]);
  return (
    <group position={position}>
      <BakedMesh geometry={geometry} />
      <mesh position={[0, 1.72, 0]} scale={0.22} castShadow dispose={null}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={color} emissive="#ffe9c4" emissiveIntensity={0.55} roughness={0.9} />
      </mesh>
      {light && <pointLight position={[0, 1.6, 0]} intensity={0.6} distance={3.5} color="#ffd9a0" />}
    </group>
  );
}

/** Ceiling pendant. `position` is the bottom of the shade; the cord runs up `drop`. */
export function Pendant({
  position = [0, 0, 0],
  kind = "dome",
  drop = 0.8,
  length = 2.4,
  light = false,
  size = 1,
}: Placement & { kind?: "dome" | "cone" | "bell" | "bar"; drop?: number; length?: number; light?: boolean; size?: number }) {
  return (
    <group position={position}>
      {kind === "bar" ? (
        <>
          {[-length / 2 + 0.15, length / 2 - 0.15].map((x) => (
            <Block key={x} size={[0.008, drop, 0.008]} position={[x, 0.06 + drop / 2, 0]} color={ink.charcoal} castShadow={false} />
          ))}
          <Block size={[length, 0.06, 0.12]} position={[0, 0.04, 0]} color={ink.charcoal} radius={0.02} castShadow={false} />
          <mesh position={[0, 0.005, 0]} scale={[length - 0.08, 0.01, 0.08]} geometry={G.box} material={ledMaterial} dispose={null} />
        </>
      ) : (
        <>
          <Block size={[0.01, drop, 0.01]} position={[0, 0.28 + drop / 2, 0]} color={ink.charcoal} castShadow={false} />
          <mesh
            position={[0, 0.15, 0]}
            scale={
              kind === "dome" ? [0.42 * size, 0.3 * size, 0.42 * size] : kind === "bell" ? [0.24 * size, 0.24 * size, 0.24 * size] : [0.3 * size, 0.32 * size, 0.3 * size]
            }
            geometry={kind === "dome" ? domeGeometry : kind === "bell" ? bellGeometry : G.cone}
            material={kind === "dome" ? mat("#f4eee4", 0.7) : kind === "bell" ? shadeMaterial : mat(ink.oak, 0.8)}
            dispose={null}
          />
          <mesh position={[0, 0.05, 0]} scale={0.08 * size} geometry={G.sphere} material={glowMaterial} dispose={null} />
        </>
      )}
      {light && <pointLight position={[0, -0.1, 0]} intensity={0.8} distance={4.5} color="#ffd9a0" />}
    </group>
  );
}

const domeGeometry = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
/** Bell shade: narrow neck flaring to a wide lip, unit size, open at the bottom. */
const bellGeometry = new THREE.LatheGeometry(
  [
    [0.0, 1.0],
    [0.16, 1.0],
    [0.2, 0.9],
    [0.3, 0.62],
    [0.52, 0.3],
    [0.86, 0.08],
    [1.0, 0.0],
  ].map(([x, y]) => new THREE.Vector2(x, y)),
  40,
);
domeGeometry.translate(0, -0.5, 0);

export function Whiteboard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  stand = false,
}: Placement & { stand?: boolean }) {
  const geometry = baked(`whiteboard|${stand}`, () => {
    const parts: Part[] = [
      box([2.0, 1.15, 0.05], [0, 1.3, 0], "#d9dde2"),
      box([1.9, 1.05, 0.01], [0, 1.3, 0.026], "#fbfcf9"),
      box([2.0, 0.04, 0.14], [0, 0.72, 0.04], "#d9dde2"),
      box([0.5, 0.025, 0.004], [-0.45, 1.5, 0.032], palette.slate),
      box([0.8, 0.025, 0.004], [-0.3, 1.4, 0.032], palette.slate),
      box([0.45, 0.022, 0.004], [-0.5, 1.3, 0.032], palette.terracotta),
      box([0.6, 0.022, 0.004], [-0.38, 1.2, 0.032], palette.slate),
      box([0.16, 0.16, 0.004], [0.45, 1.45, 0.032], "#f3d77a"),
      box([0.16, 0.16, 0.004], [0.65, 1.45, 0.032], "#f2b8a2"),
      box([0.16, 0.16, 0.004], [0.45, 1.25, 0.032], "#b8d4b0"),
      box([0.16, 0.16, 0.004], [0.65, 1.25, 0.032], "#bcd3ea"),
      box([0.16, 0.16, 0.004], [0.55, 1.05, 0.032], "#f3d77a"),
    ];
    [palette.terracotta, palette.sage, palette.accent].forEach((color, index) => {
      parts.push(cyl(0.012, 0.12, [0.5 + index * 0.12, 0.75, 0.06], color, [0, 0, Math.PI / 2], G.cylLow));
    });
    if (stand) {
      for (const x of [-0.95, 0.95]) {
        parts.push(box([0.04, 1.85, 0.04], [x, 0.93, -0.03], ink.metal));
        parts.push(box([0.06, 0.03, 0.6], [x, 0.04, -0.03], ink.metal));
      }
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function WallClock({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: Placement) {
  const geometry = baked("wallclock", () => [
    cyl(0.23, 0.04, [0, 0, 0], palette.oakDark, [Math.PI / 2, 0, 0]),
    cyl(0.2, 0.006, [0, 0, 0.022], palette.warmWhite, [Math.PI / 2, 0, 0]),
    box([0.012, 0.12, 0.01], [0, 0.045, 0.03], palette.ink),
    box([0.01, 0.1, 0.01], [0.04, -0.02, 0.03], palette.ink, [0, 0, 1.1]),
    ball(0.012, [0, 0, 0.032], palette.terracotta, undefined, G.leaf),
  ]);
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function MoneyCase({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placement) {
  const geometry = baked("moneycase", () => {
    const parts: Part[] = [
      rbox([0.85, 0.12, 0.55], [0, 0.08, 0], "#8a5a32", 0.03),
      rbox([0.85, 0.12, 0.55], [0, 0.42, -0.44], "#8a5a32", 0.03, [-1.15, 0, 0]),
    ];
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        parts.push(box([0.22, 0.07, 0.32], [-0.24 + col * 0.24, 0.17 + row * 0.08, -0.12 + row * 0.04], row % 2 === 0 ? "#7fb069" : "#93c47d"));
      }
    }
    return parts;
  });
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} />;
}

export function Cat({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = "#e8d3b0",
}: Placement & { color?: string }) {
  const geometry = baked(`cat|${color}`, () => [
    ball([0.28, 0.2, 0.42], [0, 0.18, 0], color),
    ball([0.2, 0.18, 0.2], [0, 0.28, 0.32], color),
    { g: G.cone, s: [0.07, 0.12, 0.07], p: [-0.1, 0.42, 0.3], r: [0, 0, 0.25], c: color },
    { g: G.cone, s: [0.07, 0.12, 0.07], p: [0.1, 0.42, 0.3], r: [0, 0, -0.25], c: color },
    cyl(0.03, 0.45, [0, 0.2, -0.42], color, [0.4, 0, 0], G.cylLow),
  ]);
  return <BakedMesh geometry={geometry} position={position} rotation={rotation} scale={0.75} />;
}
