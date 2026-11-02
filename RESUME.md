# Resume — Workbits diorama overhaul

**SUSPEND WARNING:** this PC is set to suspend at 50% battery. The work below is pushed to GitHub before that threshold.

- Repo: https://github.com/chrischriscris/workbits (private)
- Branch: `feat/foundation`; `main` mirrors the same commits.
- Latest render: `art/art-pass-latest.png` (committed) and `art/art-pass-compare.png`
- Normal UI render: `art/ui-latest.png` (committed; retake after resume)
- Target: `art/style-scene.png`
- Checklist: `docs/art/overhaul-checklist.md`
- Brief: `docs/art/overhaul-brief.md`

## State at suspend

- Compact 20×14 cutaway rebuilt by Opus: stone plinth, glass meeting room, kitchen, lounge, engineering bench, garden and nap nooks.
- Dense set dressing: reading nook, communal kitchen table, planting, wall art, warm oak floor.
- Sonnet rebuilt the chibi cast; parent scaled it 1.35× and recolored four hero outfits.
- Camera: high isometric angle, art-mode framing; SoftShadows + ContactShadows + SSAO + subtle saturation/contrast.
- `bun run typecheck` and `bun test` pass at the last checkpoint.
- Art mode: `http://localhost:3100/?art=1`; screenshot loop `bun run art:iterate`.

## Continue

1. Start: `bun run dev` → web :3100, server :3101, LiveKit :7880.
2. Take a fresh `bun run art:iterate` and compare to `art/style-scene.png`.
3. Remaining gaps: target has only 4 core zones and larger/plusher objects; ours has 6 rooms, so it reads smaller. Consider a hero crop or moving nap/garden to a second floor. Improve wall brightness, soft sunlight, plant leaf detail, and meeting-room plushness.
4. Run `bun run typecheck && bun test`, commit, push `feat/foundation` and `main`.
5. Do not mark the art pass finished until the image is reviewed; latest color-grade frame is committed as `art/art-pass-latest.png`.

## Git

```bash
cd /home/chus/Projects/workbits
git pull --ff-only
bun install
bun run dev
```
