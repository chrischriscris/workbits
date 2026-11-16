import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Merges the static office (shell, furniture) into one mesh per material once
 * it has mounted: hundreds of draw calls become a handful (perf, ADR-015).
 * Skips anything textured, transparent, skinned, instanced or mirrored, which
 * keeps screens, glass, the floor and avatars as they are. Re-mount (key) to
 * rebuild after the office changes.
 */
export function StaticBatch({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null);
  const wait = useRef(2);
  const built = useRef<{ merged: THREE.Mesh[]; hidden: THREE.Object3D[] } | null>(null);

  useFrame(() => {
    const group = root.current;
    if (!group || built.current) return;
    if (wait.current > 0) {
      wait.current -= 1; // let every child mount and lay out first
      return;
    }
    group.updateMatrixWorld(true);
    const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      if ((mesh as unknown as THREE.SkinnedMesh).isSkinnedMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh) return;
      const material = mesh.material;
      if (Array.isArray(material)) return;
      const standard = material as THREE.MeshStandardMaterial;
      if (standard.transparent || standard.map || standard.alphaMap || mesh.userData.noBatch) return;
      if (mesh.matrixWorld.determinant() < 0) return;
      const list = byMaterial.get(material) ?? [];
      list.push(mesh);
      byMaterial.set(material, list);
    });

    const merged: THREE.Mesh[] = [];
    const hidden: THREE.Object3D[] = [];
    for (const [material, meshes] of byMaterial) {
      if (meshes.length < 2) continue;
      const wantsColor = (material as THREE.MeshStandardMaterial).vertexColors === true;
      const pieces: THREE.BufferGeometry[] = [];
      const used: THREE.Mesh[] = [];
      for (const mesh of meshes) {
        const source = mesh.geometry;
        if (!source.getAttribute("position")) continue;
        if (wantsColor && !source.getAttribute("color")) continue;
        const piece = source.index ? source.toNonIndexed() : source.clone();
        for (const name of Object.keys(piece.attributes)) {
          if (name !== "position" && name !== "normal" && !(wantsColor && name === "color")) piece.deleteAttribute(name);
        }
        if (!piece.getAttribute("normal")) piece.computeVertexNormals();
        piece.morphAttributes = {};
        piece.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, mesh.matrixWorld));
        pieces.push(piece);
        used.push(mesh);
      }
      if (pieces.length < 2) {
        pieces.forEach((piece) => piece.dispose());
        continue;
      }
      const geometry = mergeGeometries(pieces, false);
      pieces.forEach((piece) => piece.dispose());
      if (!geometry) continue;
      geometry.computeBoundingSphere();
      const batch = new THREE.Mesh(geometry, material);
      batch.castShadow = used.some((mesh) => mesh.castShadow);
      batch.receiveShadow = used.some((mesh) => mesh.receiveShadow);
      batch.matrixAutoUpdate = false;
      group.add(batch);
      merged.push(batch);
      for (const mesh of used) {
        mesh.visible = false;
        hidden.push(mesh);
      }
    }
    built.current = { merged, hidden };
  });

  useEffect(
    () => () => {
      const state = built.current;
      if (!state) return;
      for (const mesh of state.merged) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
      }
      for (const object of state.hidden) object.visible = true;
    },
    [],
  );

  return <group ref={root}>{children}</group>;
}
