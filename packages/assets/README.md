# packages/assets

Asset manifest and pipeline notes for Workbits.

## Layout

- `manifest.json` — every shipped model: file, footprint, height, material slots,
  source, license, and the modifications applied.
- Shipped geometry lives in `apps/web/public/assets/models/<category>/`.
  Vite serves it at `/assets/models/...`.
- Raw source packs (FBX/OBJ/Blend) are **not** committed. Keep them in a local
  cache and record the source URL and license in the manifest.

## Model contract

- 1 unit = 1 meter, Y up, origin at the floor center of the footprint.
- Front faces +Z.
- One mesh, materials named after their slot (`fabric`, `wood`, `metal`, ...).
- Smooth shading; subdivision only when it materially improves the silhouette.
- Origin at floor level so placements are simple `[x, 0, z]`.

## Conversion (Blender)

1. Import the source (FBX/OBJ/glTF).
2. Join to one mesh, apply transforms.
3. Scale to the target width, center the footprint, set the lowest point to z=0.
4. Rename materials to Workbits slots.
5. Shade smooth by angle (35–40°); add subdivision level 1 for soft furniture.
6. Export GLB with `export_yup=True`, `export_apply=True`.
7. Add a manifest entry with source, license, footprint, height, and changes.

## Runtime

`apps/web/src/scene/models.tsx` loads a GLB through drei's `useGLTF`, clones it,
and replaces each material with a palette material based on the slot name.
Placements use existing `position` / `rotation` / `scale` props.

## Licensing

Every entry needs `license`, `licenseUrl`, `author`, and `url`. CC0 is preferred.
Paid packs are allowed if purchase records exist; do not redistribute raw files.
