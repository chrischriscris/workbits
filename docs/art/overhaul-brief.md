# Diorama art overhaul — working brief

Target: `art/style-scene.png` (and `art/compare-target-current.png`).
Current build: `art/workbits-demo.png`.

Goal: the in-app 3D office should read like the approved warm cutaway diorama at a glance —
compact plinth, whole office in frame, dense props, soft warm light, large expressive chibi cast.
Keep the product mechanics (movement, realtime, voice, rooms, customization) intact.

## Non-negotiables

- One coherent warm 3D diorama. No pixel art, no fantasy chrome, no photoreal textures, no AI-generated core geometry.
- Original assets and layout; SoWork is direction only.
- Keep all six room ids/anchors working: lounge, engineering, meeting, kitchen, garden, nap.
- Keep local movement and remote players working. Do not change server/network code.
- TypeScript strict; no `any`.
- Do not touch files outside the assigned scope. No package changes, no server restarts, no commits.
- Run `bun run typecheck` when done.

## New compact floor plan

Shell: x −10…10, z −7…7. Plinth 20.8 × 14.8, warm stone sides, light floor.
Rear wall at z ≈ −7.05; left wall at x ≈ −10.05; height ≈ 2.7. Open front/right.

| Room | Bounds | Notes |
|---|---|---|
| Meeting | x −9.4…−2.4, z −6.5…−1.2 | Glass front + right, charcoal frames, door gap. One long oak table, 6 terracotta chairs, pendant, plants, art. |
| Kitchen | x −1.5…9.4, z −6.5…−3.0 | Long rear cabinet run, sink/faucet, coffee machine, fridge, open shelves, mugs/jars, trailing plants. |
| Lounge | x −9.4…−4.2, z −0.2…6.2 | Sage 3-seat sofa against left wall, oval/round coffee table, rust pouf, cream/sage rug, console/bookshelf, floor lamp, big plant, abstract art. |
| Engineering | x −3.4…6.4, z 0…6.4 | 2×2 joined desk bench, low privacy panels, 4 monitors, 4 chairs, plants, notebooks, mugs. |
| Garden nook | x 6.8…9.6, z 0…3.0 | Compact indoor green corner: tree/plants, bench, planter, soft light. Keep `garden` anchor here. |
| Nap nook | x 6.8…9.6, z 3.4…6.4 | Compact glass/quiet nook: daybed or bed, side table, lamp, plant, screen. Keep `nap` anchor here. |

Remove the old dining nook, library nook, outdoor lawn/pond/string-lights, and old room positions.
Keep a clear walkable aisle between kitchen and engineering and around the desk bench.

## Visual priorities (highest return first)

1. **Silhouette/composition**: full plinth in frame with margin; cutaway walls; warm ivory background, no water/grass horizon. Camera is handled separately; do not edit `OfficeScene.tsx`.
2. **Architecture**: stone plinth, pale walls with baseboard/trim, white ceiling cut edges, charcoal glass frames, a real door gap, one actual window with sheer curtain, a short oak-slat divider.
3. **Density**: joined engineering bench, full kitchen cabinetry, meeting room set, lounge set, 10–15 plants at varied scales, books/mugs/jars/objects, layered rugs, framed art, planters. Remove empty floor.
4. **Materials**: light oak floor, pale tile zones, matte sage/terracotta/cream fabrics, charcoal metal, neutral glass, pale blue screens.
5. **Characters**: `avatars.tsx` is a separate task; keep `TeamAvatar` API and placements. Position them around the new layout; keep all 8 cast members.
6. **Lighting/postprocessing** is a separate task; expose geometry that reads well with soft warm shadows.

## Existing code

- `apps/web/src/scene/Office.tsx` — layout, rooms, static cast placements, local player, click-to-walk.
- `apps/web/src/scene/props.tsx` — furniture/props. Extend here as needed.
- `apps/web/src/scene/textures.ts` — procedural textures. Improve floor/rug/screen/art as needed.
- `apps/web/src/scene/OfficeScene.tsx` — camera/lighting/postprocessing; **do not edit**.
- `apps/web/src/scene/avatars.tsx` — characters; **do not edit**.
- `apps/web/src/data/team.ts` / `data/spawns.ts` — room anchors/spawns; parent updates.

Use existing components where possible (`Sofa`, `CoffeeTable`, `Desk`, `OfficeChair`, `Shelf`, `Plant`, `Rug`, `Kitchen`, `MeetingTable`, `Bed`, `FloorLamp`, `Pendant`, etc.). Add new props only when they materially improve the target read (`DiningChair`, `KitchenRun`, `DeskPartition`, `Curtain`, `SlatDivider`, `Pouf`).
