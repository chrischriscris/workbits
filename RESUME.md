# Resume — make Workbits look like the diorama reference

Handoff from the 2026-11-02 session (Mac) to continue on another machine.
Read this first, then `docs/progress.md` (newest entries at the bottom of the
log) and `docs/decisions.md` ADR-012..014.

## Get running

```bash
git fetch && git switch art/diorama-pass   # not merged into main yet
bun install
bun run dev        # web :3100, realtime :3101, LiveKit :7880 (needs Docker)
bunx playwright install chromium-headless-shell   # `bun run verify` needs it
bun run verify     # quick tier, ~20s; `bun run verify:full` (~6 min) before pushing
```

## The goal

Make the office look like **`art/style-scene.png`** (the isometric diorama),
with chibi characters like **`art/references/kitchen-chibi.png`**, and the
team recognisable from **`art/team-reference.png`** (the group illustration;
it is the persona reference). Team photos (`seeds/team/photos/`, gitignored)
were never on the Mac; if they're on this machine they're the likeness
reference, but they must not be sent to any provider without the team's
consent (`seeds/team/README.md`).

How the user wants this worked:

- Always show **reference / before / after** side by side. Never claim it
  looks like the reference without that image. They called out twice that
  "it looks nothing like the reference"; be blunt about the remaining gap.
- Diagnose the dominant gap before tuning knobs. The cheap test that worked:
  render the same scene in Blender Cycles (below) to separate "rendering"
  from "assets".
- Compare zone by zone at the same pixel scale (`artWidth`/`artTarget`
  params) against crops of the reference; whole-frame thumbnails hide the
  difference.
- The user writes short; "see" means "sí" (yes), "go" means proceed.

## Where it stands

![reference vs now](docs/art/progress/reference-vs-now.jpg)

Branch `art/diorama-pass` (5 commits on top of main):

1. GLB prop pipeline (`packages/assets`, `scene/models.tsx`) + research notes.
2. Chibi cast from the Grab3D Character Mixer **Cozy** kit (CC0):
   `scene/people.tsx` assembles parts on one 19-bone rig from the seed
   avatar config; `scene/avatars.tsx` routes humans through it; sit/type are
   bone aims over the idle clip; accessories hang off bones.
3. Generated-head experiment (Chus) behind `?heads=gen`.
4. Art tooling: `scripts/art-score.sh` (DreamSim) and `scene/devExport.ts`.
5. Scene pass: compact 15 × 11 four-zone layout (ADR-014), two diagonal desk
   pods with chunky reference-style desks/monitors/partitions/chairs, plants
   built from broad leaves, microcement floor, warm grade, sun pools.

Progress images: `docs/art/progress/` (desks and plants vs reference,
real-time vs Cycles, cast lineup, generated head).

## Next, in order

The direction changed on 2026-11-02: offices become buildable documents
(ADR-015, `docs/architecture/spaces.md`, "Order of work"). Character tuning is
paused (the kit can't reach the reference; a bought/commissioned or generated
cast is a separate decision).

1. ~~Document + compiler + server-validated movement for today's loft~~ (done).
2. **Templates + room kits + camera follow + perf**: 6–10 plan templates in
   2–3 size classes, kits that furnish a room rect from its type, the camera
   at fixed human-scale zoom following the player, instanced/merged static
   geometry, measured fps with 50 avatars. Replaces Workspace Studio and the
   open `layout` message. Still one dev office, client-only.
3. Auth, orgs, tenant-scoped presence/history/occupancy/voice.
4. Many offices, persistence, switcher, publish protocol.
5. Editor.
6. Free procedural generator on top of the kits.

Known: the lounge furniture fences off dead corners (along the meeting glass
west of the door, behind the beanbag); fix when kits re-lay the lounge.

## Open decisions (ask the user)

- **Generated heads.** `AGENTS.md` forbids AI-generated core geometry. The
  test (portrait by Sol 6.1 via Codex, shape by Hunyuan3D-2.1 on HF ZeroGPU,
  front-projected texture) gave much better likeness but a smeared texture.
  Doing it properly needs the generator's own texturing (TRELLIS.2 or
  Hunyuan paint, 2–5 GPU-min per head: HF PRO or a paid tool like Tripo/
  Meshy). Needs a rule change first. See `docs/art/progress/generated-head-test.jpg`.
- Merge `art/diorama-pass` into main.

## Tools

- Look at the app: `bun scripts/art-view.mjs "<url>" out.png` (system Chrome,
  falls back to Playwright Chromium).
  - `?art` hides the UI; `&artWidth=8&artTarget=1.3,0.6,1.6` zooms/aims.
  - `?lineup` is a dev-only cast bench (`&zoom=200&focus=x,y,z`).
  - `&heads=gen` swaps in generated heads.
  - `&noCast` hides every character (compare props without avatars in the way).
- Reference / before / after strip: `bash scripts/art-triptych.sh ref.png before.png after.png out.jpg`.
  Reference zone crops: `magick art/style-scene.png -crop 760x560+1020+60 +repage ref-kitchen.png`
  (lounge `820x560+0+300`, meeting `760x560+330+0`).
- Score vs reference: `bash scripts/art-score.sh out.png` after
  `uv venv .venv-art && uv pip install --python .venv-art/bin/python dreamsim pillow`.
  DreamSim tracks framing/light, is nearly blind to characters and props;
  don't optimise it, look at the images.
- Cycles render of the live scene:
  ```bash
  bun scripts/art-export.mjs "http://localhost:3100/?art" artifacts/cycles/office.glb
  blender -b -P scripts/art-render-cycles.py -- artifacts/cycles/office.glb artifacts/cycles/out.png 96
  ```
  Transparent background; composite on `#f4eee5`. Uses Metal/OptiX/CUDA if
  available, else CPU (slow; drop samples).
- Image-to-3D (if the heads decision goes ahead): HF Spaces
  `microsoft/TRELLIS.2` and `tencent/Hunyuan3D-2.1` via `gradio_client`;
  needs an HF token (free quota is ~2 GPU-minutes/day, gone after one head).

## Gotchas learned

- GLTFLoader strips dots from bone names: `upperLeg.L` is `upperLegL`.
- The Cozy clips key head scale; apply `HEAD_SCALE` after the mixer each frame.
- drei `<Html>` reuses its DOM element across root re-creation; name tags use
  a remount key (`NameTag` in `avatars.tsx`). 2 "synchronously unmount"
  warnings remain and are harmless.
- `N8AO` from `@react-three/postprocessing` crashes with three r187; SSAO stays.
- Three's `Color.getHSL` works in linear space; pass `SRGBColorSpace` when
  tuning colours by eye.
- Don't run Prettier on this repo; it isn't configured and reformats files.
- The scene export occasionally misplaces a waving character's head.
- `artifacts/` is gitignored; commit images you want to keep under `docs/art/`.
