import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { palette } from "../theme";
import type { V3 } from "./props";

/**
 * GLB prop pipeline.
 *
 * Models are authored/normalized in Blender to 1 unit = 1 m, Y up, origin at
 * the floor center of the footprint, and front facing +Z. Materials are
 * exported with Workbits slot names (`fabric`, `wood`, ...) and are replaced
 * here with palette materials so every prop shares one visual language.
 */
const MODELS = {
  sofa: "/assets/models/lounge/sofa.glb",
  armchair: "/assets/models/lounge/armchair.glb",
} as const;

export type ModelId = keyof typeof MODELS;

type GltfPropProps = {
  model: ModelId;
  position?: V3;
  rotation?: V3;
  scale?: number;
  /** Upholstery color. */
  color?: string;
  /** Leg/frame wood color. */
  wood?: string;
  /** Accent pillow color. */
  pillow?: string;
  /** Secondary pillow color. */
  pillowAlt?: string;
};

function slotMaterial(
  name: string,
  color: string,
  wood: string,
  pillow: string,
  pillowAlt: string,
) {
  const slot = name.toLowerCase();
  if (slot.includes("wood") || slot.includes("leg") || slot.includes("frame")) {
    return new THREE.MeshStandardMaterial({ color: wood, roughness: 0.72, metalness: 0 });
  }
  if (slot.includes("metal") || slot.includes("chrome")) {
    return new THREE.MeshStandardMaterial({ color: "#8f979f", roughness: 0.42, metalness: 0.35 });
  }
  if (slot.includes("pillow-alt")) {
    return new THREE.MeshStandardMaterial({ color: pillowAlt, roughness: 0.9, metalness: 0 });
  }
  if (slot.includes("pillow")) {
    return new THREE.MeshStandardMaterial({ color: pillow, roughness: 0.9, metalness: 0 });
  }
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 });
}

export function GltfProp({
  model,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = palette.sage,
  wood = "#c49a6c",
  pillow = palette.terracotta,
  pillowAlt = "#f4ecdc",
}: GltfPropProps) {
  const { scene } = useGLTF(MODELS[model]);

  const object = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const swap = (source: THREE.Material) =>
        slotMaterial(source.name, color, wood, pillow, pillowAlt);
      child.material = Array.isArray(child.material)
        ? child.material.map(swap)
        : swap(child.material);
    });
    return root;
  }, [color, pillow, pillowAlt, scene, wood]);

  return (
    <primitive
      object={object}
      position={position}
      rotation={rotation}
      scale={scale}
      dispose={null}
    />
  );
}

useGLTF.preload(MODELS.sofa);
useGLTF.preload(MODELS.armchair);
