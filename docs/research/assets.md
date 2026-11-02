# Asset research

## Strategy

**Core:** a procedural, palette-driven 3D kit for rooms, furniture, and avatars. This guarantees a consistent look, infinite customization, and no license surprises.

**Accents:** curated CC0 packs (Kenney, Quaternius, KayKit) re-materialed into the Workbits palette. Good for props, plants, and variety.

**AI:** textures, posters, rugs, whiteboard content, and optional image-to-3D decor. Never core avatar geometry or structural furniture in v1.

**Upgrade path:** paid Synty/KayKit packs or commissioned outfits can replace accents without code changes. Decide after the first real style frame.

## Candidate sources

| Source | License | Use | Notes |
|---|---|---|---|
| [Kenney](https://kenney.nl/assets) | CC0 | Furniture kit, props, UI, audio | Chunky, clean; re-material to avoid the "Kenney look" |
| [Quaternius](https://quaternius.com) | CC0 | Furniture, characters, Universal Animation Library | Rigged characters + animations; best free character base |
| [KayKit](https://kaylousberg.com) | CC0 / paid | Props, furniture, characters | Check each pack; some are paid |
| [Poly Haven](https://polyhaven.com) | CC0 | HDRIs, textures, some models | Useful for lighting tests, not core |
| [Mixamo](https://mixamo.com) | Free commercial, no raw redistribution | Animation retargeting | Adobe account; don't redistribute raw files |
| [Synty POLYGON](https://syntystore.com) | Paid commercial | Office/city packs, characters | Budget decision; high quality but a distinct look |
| [Kenney Game Assets All-in-1](https://kenney.itch.io) | CC0 | Bulk source | Optional |

## Character pipeline

1. Base: Quaternius Universal Base Characters + modular outfits, or a custom base mesh.
2. Rig: humanoid, glTF, retargetable.
3. Animations: idle, walk, sit, type, wave, emote. Retarget with Blender or Mixamo.
4. Materials: palette masks (skin, hair, top, bottom, shoes) so the avatar creator can recolor without new textures.
5. Modular parts: body types, hair, tops, bottoms, shoes, accessories, glasses.
6. Export: GLB + Draco, thumbnail, metadata.
7. QA: `/dev/gallery` lineup, consistency check, poly budget, no missing textures.

## Furniture pipeline

- Procedural primitives for the core kit: desks, chairs, monitors, sofas, tables, shelves, plants, rugs, glass walls, doors, kitchen counters.
- Metadata per item: footprint (grid cells), height, snap points, category, tags, thumbnail, license.
- Re-material everything to the Workbits palette.
- Keep silhouettes readable at 45°; avoid thin details that alias.

## AI asset pipeline (later)

- Generate a concept/texture with an image model.
- For textures: seamless/tileable check, palette match, then apply to a known mesh.
- For props: image-to-3D (Meshy/Tripo) → retopo/scale/pivot → material match → QA gate. Reject if topology, scale, or style fails.
- For posters/rugs: generate an image, crop to the frame/rug aspect, store in S3, apply as a texture.
- Never let AI output directly into the live catalog without validation.

## Licenses and commercial use

- CC0: no attribution required, commercial use allowed. Still keep a manifest.
- Mixamo: free for commercial use, but raw animation files cannot be redistributed as assets. Use in the product, don't ship a raw asset pack.
- Meshy/Tripo free tiers: often CC BY 4.0 or non-commercial; paid plans grant commercial rights. Verify before shipping.
- Paid Synty: allowed in games/products, but not as redistributable assets. Keep purchase records.
- Every catalog entry must have `license`, `source`, and `attribution` fields.

## Pending

- The user's model/seed references. Add them to `docs/research/models.md` with a verdict.
