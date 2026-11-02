# Slice 1 — model-based lounge

Status: slice 1 complete (2026-11-02) — pipeline pass, visual read partial.
Decision: ADR-012 (see `docs/decisions.md`)

## Goal

Prove that a GLB-based prop kit reads closer to `art/style-scene.png` than the
procedural primitive kit, without breaking layout, collision, customization, or
the performance budget.

The slice is deliberately narrow: **the lounge seating**. Sofa and armchair
move to GLB first because they carry the most visual weight. The coffee table,
pouf, rug, floor lamp, and plants stay procedural until a model clearly beats
them in the same A/B. No server, realtime, room anchor, or Workspace Studio
changes.

## Acceptance criteria

1. Lounge seating loads from GLB files through one shared loader/material path.
2. The scene renders with the same camera, lighting, and palette.
3. `bun run typecheck` passes and `bun run dev` boots.
4. Desktop screenshot at 1440×900 for before/after comparison.
5. Draw calls stay under the existing budget (<400) and the room does not
   regress frame time versus the procedural baseline.
6. A license manifest entry exists for every shipped model.
7. If the slice fails the visual read, record why and stop; do not roll out.

## Scope

In:

- `packages/assets/` — manifest and import notes (first real content).
- `apps/web/public/assets/models/` — exported GLBs.
- `apps/web/src/scene/models.tsx` — loader + material normalization.
- `apps/web/src/scene/Office.tsx` — lounge placements only.

Out:

- `avatars.tsx`, server, realtime, chat, voice, seeds.
- Architecture, glass, walls, plinth, desk layouts (stay procedural).

Note: `OfficeScene.tsx` was out of scope for the seat swap, but the follow-up
reference tone pass changed the camera, lights, and grade there. See the report.

## Pipeline contract

- **Scale:** 1 unit = 1 m, Y up, origin at floor center of footprint.
- **Forward:** +Z, so a model faces the camera by default at rotation 0.
- **Materials:** every mesh gets a Workbits material slot (fabric, wood, metal,
  glass, plant, screen, ceramic). Per-model GLB materials are discarded; the
  manifest declares the slots and colors.
- **Geometry:** merge static parts per prop; reuse one geometry per variant.
- **Draw calls:** one mesh per material slot per prop; instance repeated props.
- **License:** `license`, `source`, `author`, `url`, `attribution` in the
  manifest; no entry ships without them.

## Steps

1. Source one CC0 kit and record the license.
2. Build `packages/assets/manifest.json` with the seven lounge entries.
3. Add the GLB loader with slot-based material override.
4. Swap the lounge placements; keep procedural fallbacks behind a flag.
5. Capture before/after screenshots and draw-call counts.
6. Review against `art/style-scene.png`; pass or stop.
7. Update `docs/progress.md`.

## Result

The sofa and armchair were converted, re-materialed, and given authored accent
pillows. The pipeline passes; the visual read is closer but not concept-level.
The remaining lounge pieces stay procedural because the available CC0 models
(coffee table, stool) were not better than the existing shapes. Source detail —
seams, piping, fabric variation — is now the bottleneck, not the loader.

## Evidence

- `artifacts/art/lounge-slice/before.png` — procedural lounge baseline.
- `artifacts/art/lounge-slice/after.png` — GLB sofa + armchair.
- `artifacts/art/lounge-slice/report.md` — verdict, checks, next steps.
- `bun run typecheck`, `bun run build`, `bun test` (22 pass).
