import { useAnimations, useGLTF } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { AvatarConfig } from "@workbits/shared";
import { perfTools } from "../lib/perfMode";

/**
 * Chibi people assembled at runtime from the Grab3D Character Mixer "Cozy"
 * kit (CC0). Every part is skinned to the same 19-bone rig and uses flat
 * materials named after colour slots, so a character is just a list of parts
 * plus a colour per slot, derived from the seed avatar config.
 */
const BASE = "/assets/models/cozy";
const SKELETON = `${BASE}/skeleton.glb`;
const ANIMATIONS = `${BASE}/animations.glb`;
const partUrl = (id: string) => `${BASE}/parts/${id}.glb`;

/**
 * Rig units are metres for a ~1.1 m chibi. The reference diorama has people
 * about 2.3x counter height, so they dominate the furniture.
 */
export const PERSON_SCALE = 2.0;
/** Hip height in rig units, for seating. */
export const PERSON_HIP = 0.3;
/** Head-top height in rig units, for name tags and bubbles. */
export const PERSON_HEIGHT = 1.1;
const HEAD_SCALE = 0.87;

type Colors = Record<string, string>;
type PartSpec = { id: string; colors: Colors };
type Fit = "classic" | "slim" | "chubby";

export type CozyLook = {
  fit: Fit;
  /** Experimental generated head (replaces the kit head, hair and face). */
  headModel?: string;
  parts: PartSpec[];
  sunglasses?: string;
  tie?: string;
  chain?: string;
  watch?: string;
  bracelet?: string;
  sleepMask?: string;
  earbud?: boolean;
  /** Ears and nose the kit heads lack. */
  face?: { skin: string };
};

function shade(hex: string, amount: number) {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl, THREE.SRGBColorSpace);
  color.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amount, 0, 1), THREE.SRGBColorSpace);
  return `#${color.getHexString()}`;
}

function liftHair(hex: string) {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl, THREE.SRGBColorSpace);
  if (hsl.l >= 0.15) return hex;
  color.setHSL(hsl.l < 0.02 ? 0.06 : hsl.h, Math.max(hsl.s, 0.25), 0.15, THREE.SRGBColorSpace);
  return `#${color.getHexString()}`;
}

/**
 * Generated-head experiment, off unless the URL has `?heads=gen`. AGENTS.md
 * rules out AI-generated core geometry, so this stays a benchmark until the
 * team decides otherwise.
 */
const generatedHeads: Record<string, string> = {
  chus: "/assets/models/heads/chus.glb",
};
const useGeneratedHeads =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("heads") === "gen";

export function withGeneratedHead(id: string, look: CozyLook): CozyLook {
  const headModel = useGeneratedHeads ? generatedHeads[id] : undefined;
  if (!headModel) return look;
  return {
    ...look,
    headModel,
    sunglasses: undefined,
    earbud: false,
    parts: look.parts.filter((part) => !/^(head|hair|face)_/.test(part.id)),
  };
}

const hairParts: Record<string, string> = {
  "wavy-medium": "hair_curly",
  "curly-medium": "hair_spiky",
  "short-textured": "hair_curly",
  "slick-short": "hair_tousled",
  "medium-swept": "hair_tousled",
  spiky: "hair_spiky",
  bob: "hair_bob",
  buns: "hair_buns",
  long: "hair_long",
  ponytail: "hair_ponytail",
  braids: "hair_braids",
};

const headParts: Record<string, string> = {
  laughing: "head_cheeky",
  cheeky: "head_scamp",
  dreamy: "head_dreamy",
};

/** Map the seed avatar config onto Cozy parts and colours. */
export function cozyLook(avatar: AvatarConfig): CozyLook {
  const fit: Fit = avatar.body.includes("slim")
    ? "slim"
    : avatar.body.includes("chubby")
      ? "chubby"
      : "classic";
  const skin = avatar.skin;
  // Near-black hair renders as a flat helmet; keep enough value to show form.
  const hairColor = liftHair(avatar.hair?.color ?? "#2a1c17");
  const eyes = avatar.eyes?.color && avatar.eyes.color !== "#FFFFFF" ? avatar.eyes.color : "#2a211d";
  const { outfit } = avatar;
  const accessories = new Set(avatar.accessories);
  const parts: PartSpec[] = [
    { id: `body_${fit}`, colors: { skin, secondary: outfit.bottomColor } },
    {
      id: headParts[avatar.eyes?.style ?? ""] ?? "head_sunny",
      colors: { skin, hair: hairColor, eyes },
    },
  ];

  if (avatar.hair) {
    parts.push({ id: hairParts[avatar.hair.style] ?? "hair_tousled", colors: { hair: hairColor } });
  }

  const facial = avatar.facialHair;
  if (facial) {
    // The kit's beard is a full jaw mass; goatees read better as the mustache.
    const beard = /beard/.test(facial.style);
    parts.push({ id: beard ? "face_beard" : "face_mustache", colors: { hair: liftHair(facial.color) } });
  }

  const glasses = avatar.glasses;
  if (glasses) parts.push({ id: "face_glasses", colors: { metal: glasses.color } });

  const top = outfit.top;
  const suit = top === "suit-jacket";
  const knit = suit || top === "hoodie" || top === "sweater";
  const trim = suit || accessories.has("white-shirt") ? "#f7f4ee" : shade(outfit.topColor, -0.06);
  parts.push({
    id: knit ? "top_sweater" : "top_tshirt",
    colors: {
      primary: outfit.topColor,
      secondary: trim,
      // The kit's chest decal: keep it as a print on graphic tees only.
      accent: top === "graphic-tee" ? avatar.palette.accent : outfit.topColor,
    },
  });

  if (outfit.bottom !== "none") {
    parts.push({
      id: "bottom_pants",
      colors: { primary: outfit.bottomColor, secondary: shade(outfit.bottomColor, -0.12) },
    });
  }
  if (outfit.shoes !== "none") {
    parts.push({
      id: "shoes_sneakers",
      colors: {
        primary: outfit.shoesColor,
        secondary: "#f7f4ee",
        accent: shade(outfit.shoesColor, -0.1),
      },
    });
  }
  if (accessories.has("backpack")) {
    parts.push({
      id: "back_backpack",
      colors: { primary: "#2f3238", secondary: "#24262b", accent: "#3a3e45", metal: "#c8cdd5" },
    });
  }

  return {
    fit,
    parts,
    sunglasses: glasses?.style === "sunglasses" ? glasses.color : undefined,
    tie: suit || accessories.has("tie") ? "#2b2f36" : undefined,
    chain: accessories.has("gold-chain") ? "#e2b44f" : undefined,
    watch: accessories.has("gold-watch") ? "#e2b44f" : undefined,
    bracelet: accessories.has("black-bracelet") ? "#1c1c1c" : undefined,
    sleepMask: accessories.has("sleep-mask") ? "#1f2a44" : undefined,
    face: { skin },
    earbud: accessories.has("earbud"),
  };
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

const materialCache = new Map<string, THREE.Material>();

/**
 * Clone and recolour a slot material. Every character material gets a little
 * self-illumination so faces stay soft and readable in shadow, like the
 * plush reference renders, instead of going muddy.
 */
function recolor(source: THREE.Material, colors: Colors) {
  const color = colors[source.name];
  const key = `${source.uuid}|${color ?? ""}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  const next = source.clone() as THREE.MeshStandardMaterial;
  if (color) next.color.set(color);
  next.roughness = 0.78;
  next.metalness = source.name === "metal" ? 0.4 : 0;
  next.emissive.copy(next.color);
  next.emissiveIntensity = 0.14;
  materialCache.set(key, next);
  return next;
}

/** GLTFLoader strips dots from node names, so `upperLeg.L` is `upperLegL`. */
function findBones(root: THREE.Object3D) {
  const bones: Record<string, THREE.Bone> = {};
  root.traverse((child) => {
    if (child instanceof THREE.Bone) bones[child.name] = child;
  });
  return bones;
}

/** Re-bind a part's skinned meshes onto the shared rig, recoloured. */
function attachPart(
  rig: THREE.Object3D,
  bones: Record<string, THREE.Bone>,
  part: THREE.Object3D,
  spec: PartSpec,
  fit: Fit,
  skeletons: Map<string, THREE.Skeleton>,
) {
  const meshes: THREE.SkinnedMesh[] = [];
  part.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) meshes.push(child);
  });
  for (const source of meshes) {
    // Parts on the same rig and bind pose share one skeleton: three uploads a
    // bone texture per skeleton every frame, so per-part skeletons multiplied
    // that cost by the number of parts (perf, ADR-015).
    const key = `${source.skeleton.bones.map((bone) => bone.name).join(",")}|${source.skeleton.boneInverses
      .map((matrix) => matrix.elements.map((value) => value.toFixed(4)).join(","))
      .join(";")}`;
    let skeleton = skeletons.get(key);
    if (!skeleton) {
      skeleton = new THREE.Skeleton(
        source.skeleton.bones.map((bone) => bones[bone.name]!),
        source.skeleton.boneInverses,
      );
      skeletons.set(key, skeleton);
    }
    const mesh = new THREE.SkinnedMesh(
      source.geometry,
      Array.isArray(source.material)
        ? source.material.map((m) => recolor(m, spec.colors))
        : recolor(source.material, spec.colors),
    );
    mesh.name = spec.id;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.bind(skeleton, source.bindMatrix);
    if (source.morphTargetDictionary && fit !== "classic") {
      mesh.updateMorphTargets();
      const index = mesh.morphTargetDictionary?.[fit];
      if (index !== undefined && mesh.morphTargetInfluences) mesh.morphTargetInfluences[index] = 1;
    }
    rig.add(mesh);
  }
}

function addTo(bone: THREE.Bone | undefined, object: THREE.Object3D) {
  if (bone) bone.add(object);
}

function solid(geometry: THREE.BufferGeometry, color: string, roughness = 0.7, metalness = 0) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness, metalness }),
  );
  mesh.castShadow = true;
  return mesh;
}

/**
 * Ears and a button nose: the reference faces have them, the kit heads don't
 * (they do paint thin brows). Soft, low-contrast shapes in the head bone's space (face front is
 * about z 0.21, eyes about y 0.19), so they read at diorama distance without
 * turning the chibi into a caricature.
 */
function addFace(bones: Record<string, THREE.Bone>, face: { skin: string }) {
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  for (const side of [-1, 1]) {
    const ear = solid(sphere, face.skin, 0.85);
    ear.scale.set(0.026, 0.044, 0.034);
    ear.position.set(side * 0.226, 0.145, -0.005);
    ear.rotation.y = side * 0.35;
    addTo(bones.head, ear);
    const inner = solid(sphere, shade(face.skin, -0.06), 0.9);
    inner.scale.set(0.01, 0.028, 0.02);
    inner.position.set(side * 0.243, 0.145, 0.0);
    inner.rotation.y = side * 0.35;
    addTo(bones.head, inner);

  }
  const nose = solid(sphere, shade(face.skin, -0.035), 0.8);
  nose.scale.set(0.018, 0.014, 0.013);
  nose.position.set(0, 0.152, 0.214);
  addTo(bones.head, nose);
}

/** Perf bisection switch: `?fx=-mixer` freezes animation. */
const NO_MIXER =
  perfTools && typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("fx") ?? "").includes("-mixer");

/** Dev-only comparison switch: `?fx=-merge` keeps avatar parts separate. */
const NO_MERGE =
  perfTools && typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("fx") ?? "").includes("-merge");

/**
 * One material for every merged avatar: slot colours live in vertex colours,
 * and the kit look's faint self-glow (emissive = 0.14 × colour) is kept by
 * scaling the emissive term by the vertex colour.
 */
const avatarMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.78,
  metalness: 0,
  emissive: new THREE.Color(0.14, 0.14, 0.14),
});
avatarMaterial.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "vec3 totalEmissiveRadiance = emissive;",
    "vec3 totalEmissiveRadiance = emissive * vColor.rgb;",
  );
};

/**
 * Merge an avatar's kit parts into one skinned mesh per shared skeleton (perf,
 * ADR-015): ~20 draw calls per person become one. Morph-based body fits are
 * baked into positions first. Groups whose bind matrices differ are left alone.
 */
function mergeSkinnedParts(rig: THREE.Object3D) {
  const bySkeleton = new Map<THREE.Skeleton, THREE.SkinnedMesh[]>();
  rig.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || Array.isArray(mesh.material)) return;
    const list = bySkeleton.get(mesh.skeleton) ?? [];
    list.push(mesh);
    bySkeleton.set(mesh.skeleton, list);
  });
  for (const [skeleton, meshes] of bySkeleton) {
    if (meshes.length < 2) continue;
    const bind = meshes[0]!.bindMatrix;
    if (!meshes.every((mesh) => mesh.bindMatrix.equals(bind))) continue;
    const pieces: THREE.BufferGeometry[] = [];
    for (const mesh of meshes) {
      const source = mesh.geometry;
      const piece = (source.index ? source.toNonIndexed() : source.clone()) as THREE.BufferGeometry;
      // Bake active morph targets (body fits) into the base shape.
      const influences = mesh.morphTargetInfluences ?? [];
      for (const name of ["position", "normal"] as const) {
        const base = piece.getAttribute(name) as THREE.BufferAttribute | undefined;
        const targets = piece.morphAttributes[name];
        if (!base || !targets) continue;
        influences.forEach((weight, index) => {
          const target = targets[index];
          if (!weight || !target) return;
          for (let i = 0; i < base.count; i += 1) {
            for (let axis = 0; axis < 3; axis += 1) {
              const from = base.getComponent(i, axis);
              const value = target.getComponent(i, axis);
              base.setComponent(i, axis, piece.morphTargetsRelative ? from + value * weight : from + (value - from) * weight);
            }
          }
        });
      }
      piece.morphAttributes = {};
      piece.morphTargetsRelative = false;
      const color = (mesh.material as THREE.MeshStandardMaterial).color;
      const count = piece.getAttribute("position").count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      piece.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      for (const name of Object.keys(piece.attributes)) {
        if (!["position", "normal", "skinIndex", "skinWeight", "color"].includes(name)) piece.deleteAttribute(name);
      }
      if (!piece.getAttribute("normal")) piece.computeVertexNormals();
      pieces.push(piece);
    }
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((piece) => piece.dispose());
    if (!geometry) continue;
    const merged = new THREE.SkinnedMesh(geometry, avatarMaterial);
    merged.name = "avatar-body";
    merged.castShadow = true;
    merged.receiveShadow = true;
    merged.frustumCulled = false;
    meshes[0]!.parent!.add(merged);
    merged.bind(skeleton, bind);
    for (const mesh of meshes) mesh.removeFromParent();
  }
}

/** Small authored extras the kit lacks, hung off bones in rig units. */
function addExtras(bones: Record<string, THREE.Bone>, look: CozyLook) {
  if (look.face && !look.headModel) addFace(bones, look.face);
  if (look.sunglasses) {
    for (const x of [-0.098, 0.098]) {
      const lens = solid(new THREE.CircleGeometry(0.058, 24), "#1d1b1f", 0.25, 0.1);
      lens.position.set(x, 0.165, 0.215);
      lens.rotation.y = x * 1.4;
      addTo(bones.head, lens);
    }
  }
  if (look.sleepMask) {
    const mask = solid(new THREE.CapsuleGeometry(0.055, 0.2, 6, 16), look.sleepMask, 0.9);
    mask.rotation.z = Math.PI / 2;
    mask.scale.set(1, 1, 0.55);
    mask.position.set(0, 0.165, 0.19);
    addTo(bones.head, mask);
  }
  if (look.tie) {
    const knot = solid(new THREE.SphereGeometry(0.022, 12, 8), look.tie);
    knot.position.set(0, 0.075, 0.118);
    const blade = solid(new THREE.ConeGeometry(0.03, 0.15, 4), look.tie);
    blade.rotation.set(Math.PI - 0.12, Math.PI / 4, 0);
    blade.scale.set(1, 1, 0.4);
    blade.position.set(0, 0.0, 0.122);
    addTo(bones.chest, knot);
    addTo(bones.chest, blade);
  }
  if (look.chain) {
    const chain = solid(new THREE.TorusGeometry(0.105, 0.012, 8, 32), look.chain, 0.3, 0.8);
    chain.rotation.x = Math.PI / 2 - 0.55;
    chain.position.set(0, 0.06, 0.035);
    const pendant = solid(new THREE.SphereGeometry(0.022, 12, 8), look.chain, 0.3, 0.8);
    pendant.position.set(0, -0.005, 0.125);
    addTo(bones.chest, chain);
    addTo(bones.chest, pendant);
  }
  const band = (color: string, bone: THREE.Bone | undefined) => {
    const ring = solid(new THREE.TorusGeometry(0.036, 0.011, 8, 20), color, 0.35, 0.6);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.09, 0);
    addTo(bone, ring);
  };
  if (look.watch) band(look.watch, bones.lowerArmL);
  if (look.bracelet) band(look.bracelet, bones.lowerArmR);
  if (look.earbud) {
    const bud = solid(new THREE.SphereGeometry(0.022, 12, 8), "#f5f5f5", 0.4);
    bud.position.set(0.215, 0.13, 0.0);
    addTo(bones.head, bud);
  }
}

/* ------------------------------------------------------------------ */
/* Posing                                                              */
/* ------------------------------------------------------------------ */

export type PersonPose = "standing" | "sitting" | "sleeping";
export type PersonMotion = "idle" | "walk" | "wave" | "type";

const UP = new THREE.Vector3(0, 1, 0);
const tmpQuat = new THREE.Quaternion();
const tmpDir = new THREE.Vector3();

/** Point a bone's +Y along a direction given in the character root's space. */
function aim(bone: THREE.Bone | undefined, root: THREE.Object3D, x: number, y: number, z: number) {
  if (!bone?.parent) return;
  root.getWorldQuaternion(tmpQuat);
  tmpDir.set(x, y, z).normalize().applyQuaternion(tmpQuat);
  bone.parent.getWorldQuaternion(tmpQuat).invert();
  tmpDir.applyQuaternion(tmpQuat);
  bone.quaternion.setFromUnitVectors(UP, tmpDir);
  bone.updateMatrixWorld(true);
}

function poseSitting(bones: Record<string, THREE.Bone>, root: THREE.Object3D) {
  for (const side of ["L", "R"] as const) {
    const sx = side === "L" ? 1 : -1;
    aim(bones[`upperLeg${side}`], root, sx * 0.08, -0.08, 1);
    aim(bones[`lowerLeg${side}`], root, sx * 0.04, -1, 0.12);
  }
}

function poseTyping(bones: Record<string, THREE.Bone>, root: THREE.Object3D, t: number) {
  for (const side of ["L", "R"] as const) {
    const sx = side === "L" ? 1 : -1;
    const tap = Math.sin(t * 9 + (side === "L" ? 0 : 1.7)) * 0.06;
    aim(bones[`upperArm${side}`], root, sx * 0.35, -0.75, 0.55);
    aim(bones[`lowerArm${side}`], root, -sx * 0.32, -0.08 + tap, 1);
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/** Head-bone-local placement for a generated head normalised to height 1. */
const HEAD_FIT = { y: -0.06, z: 0.01, height: 0.66 };

function GeneratedHead({ url, bone }: { url: string; bone: THREE.Bone }) {
  const { scene } = useGLTF(url);
  const head = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      // Same soft self-illumination as the kit parts, so it sits in the cast.
      const material = (child.material as THREE.MeshStandardMaterial).clone();
      material.roughness = 0.78;
      material.metalness = 0;
      material.emissive.set("#ffffff");
      material.emissiveMap = material.map;
      material.emissiveIntensity = 0.14;
      child.material = material;
    });
    return clone;
  }, [scene]);
  return createPortal(
    <primitive object={head} position={[0, HEAD_FIT.y, HEAD_FIT.z]} scale={HEAD_FIT.height} />,
    bone,
  );
}

type CozyPersonProps = {
  look: CozyLook;
  pose?: PersonPose;
  motion?: PersonMotion;
  phase?: number;
};

/** A rigged chibi in rig units (feet at y=0, ~1.1 tall); scale it outside. */
export function CozyPerson({ look, pose = "standing", motion = "idle", phase = 0 }: CozyPersonProps) {
  const urls = useMemo(() => look.parts.map((part) => partUrl(part.id)), [look]);
  const skeleton = useGLTF(SKELETON);
  const animations = useGLTF(ANIMATIONS).animations;
  const parts = useGLTF(urls);
  const group = useRef<THREE.Group>(null);

  const { rig, bones } = useMemo(() => {
    const rig = cloneSkeleton(skeleton.scene);
    const bones = findBones(rig);
    const skeletons = new Map<string, THREE.Skeleton>();
    look.parts.forEach((spec, index) => attachPart(rig, bones, parts[index]!.scene, spec, look.fit, skeletons));
    if (!NO_MERGE) mergeSkinnedParts(rig);
    addExtras(bones, look);
    return { rig, bones };
  }, [skeleton, parts, look]);

  const { actions, mixer } = useAnimations(animations, group);
  const lastHeadScale = useRef(new THREE.Vector3(-1, -1, -1));
  // Perf bisection switch (?fx=-mixer): freeze the clips.
  if (NO_MIXER) mixer.timeScale = 0;

  const clip = motion === "walk" ? "walk" : motion === "wave" && pose === "standing" ? "wave" : "idle";
  useEffect(() => {
    const action = actions[clip];
    if (!action) return;
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.time = (phase % 1) * action.getClip().duration;
    action.fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, clip, phase]);

  useFrame((state) => {
    if (!group.current) return;
    // The kit's head is ~45% of height; the reference sits closer to a third.
    // Clips key head scale, so apply this after the mixer every frame.
    // Only on frames where the mixer wrote a fresh head scale: clips that don't key
    // it (the wave) leave the bone alone, and multiplying again shrank the head.
    const head = bones.head;
    if (head && !head.scale.equals(lastHeadScale.current)) {
      head.scale.multiplyScalar(HEAD_SCALE);
      lastHeadScale.current.copy(head.scale);
    }
    if (pose === "sitting") poseSitting(bones, group.current);
    if (motion === "type") poseTyping(bones, group.current, state.clock.elapsedTime + phase);
  });

  return (
    <group ref={group}>
      <primitive object={rig} dispose={null} />
      {look.headModel && bones.head && <GeneratedHead url={look.headModel} bone={bones.head} />}
    </group>
  );
}

useGLTF.preload(SKELETON);
useGLTF.preload(ANIMATIONS);
