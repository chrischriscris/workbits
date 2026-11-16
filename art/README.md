# art/

Concept references and style frames. These are design artifacts, not shipping game assets.

| File | Purpose |
|---|---|
| `style-scene.png` | Room composition, camera, palette, lighting (kept local, not in the public repo) |
| `style-characters.png` | Character quality/consistency bar |
| `style-product.png` | Product shell: sidebar, roster, composer, controls |

The scene reference, the chibi reference and the team illustrations are kept out of the public repo (see `.gitignore`); local copies make the art scripts work.

## Rules

- Original designs only. Do not copy SoWork, WorkAdventure, WoW, or any reference assets.
- Concept images are direction; the in-engine style frame is the source of truth.
- Keep a license/source record for every shipped asset in `packages/assets`.
- Name exports predictably: `<category>-<name>-<variant>.png`.
- Do not commit huge source files; keep only review-ready exports.
