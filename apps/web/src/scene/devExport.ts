import * as THREE from "three";

/**
 * Dev-only: flatten the visible scene into world-space static meshes (skinned
 * characters frozen in their current pose) and return it as a base64 GLB.
 * Used to render the office offline in Blender for lighting experiments.
 */
export async function exportSceneGlb(scene: THREE.Scene): Promise<string> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  scene.updateMatrixWorld(true);
  const out = new THREE.Group();
  const position = new THREE.Vector3();

  const visible = (object: THREE.Object3D) => {
    for (let node: THREE.Object3D | null = object; node; node = node.parent) {
      if (!node.visible) return false;
    }
    return true;
  };

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !visible(object)) return;
    const material = object.material as THREE.Material | THREE.Material[];
    const first = Array.isArray(material) ? material[0] : material;
    if (first && first.transparent && (first as THREE.MeshBasicMaterial).opacity < 0.02) return;
    if (first instanceof THREE.MeshBasicMaterial || first instanceof THREE.ShadowMaterial) return;

    let geometry = object.geometry.clone();
    if (object instanceof THREE.SkinnedMesh) {
      // Bake the current pose into plain vertex positions.
      const attribute = geometry.getAttribute("position");
      for (let index = 0; index < attribute.count; index += 1) {
        object.getVertexPosition(index, position);
        attribute.setXYZ(index, position.x, position.y, position.z);
      }
      geometry.deleteAttribute("skinIndex");
      geometry.deleteAttribute("skinWeight");
      geometry.morphAttributes = {};
      // getVertexPosition returns posed positions in the mesh's local space.
      geometry.applyMatrix4(object.matrixWorld);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = object.name;
      out.add(mesh);
      return;
    }
    const mesh = new THREE.Mesh(geometry, material);
    object.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.name = object.name;
    out.add(mesh);
  });

  const exporter = new GLTFExporter();
  const buffer = (await exporter.parseAsync(out, { binary: true, onlyVisible: true })) as ArrayBuffer;
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
