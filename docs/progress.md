# Progress

Source of truth for what is actually done. Update at the end of every work session. Do not mark a phase done without evidence in `artifacts/`.

## Phase status

| Phase | Status | Evidence | Notes |
|---|---|---|---|
| 0 — Foundation | 🟢 Local foundation | `bun run dev`, `bun run typecheck` | Vite, Node/Colyseus, Docker LiveKit, seed data |
| 1 — The Room | 🟡 Playable style frame | `art/workbits-demo.png` | Art presentable; real-GPU perf not measured |
| 2 — Presence | 🟢 Working + reconnect | `bun run shot:multi`, `scripts/reconnect-check.mjs` | Message-based presence (ADR-011) |
| 3 — Voice | 🟢 Proximity + isolated meeting room | `scripts/voice-room-check.mjs`, `scripts/token-check.mjs` | Real-mic conversation still manual; auth-scoped identity pending |
| 4 — Chat | 🟢 Channels + private DMs + room scoping | `scripts/dm-check.mjs`, `scripts/sync-check.mjs` | Group membership not built |
| 5 — Customization | 🟢 Generated + tuned avatars, synced layouts | `scripts/forge-shot.mjs`, `scripts/sync-check.mjs` | Full drag-and-drop office editor not built |
| 6 — AI | 🟢 Local avatar, workspace, assistant | `scripts/assistant-check.mjs`, `apps/web/src/ai/` | No runtime LLM keys; provider adapter pending |
| 7 — Product | 🟡 Welcome page + demo product shell | `scripts/welcome-check.mjs`, `art/welcome.png` | Auth, billing, office editor |
| 8 — Ship | 🟡 Single-process prod + Docker | `bun run prod-check`, container run | TLS/Caddy, Postgres, multi-instance pending |

### Verification

`bun run verify` runs the current evidence pass. Latest report: `artifacts/verify/20261102T100004Z/report.md` (local, gitignored). Production: `bun run prod-check` plus the built Docker image.

## Done

- 2026-11-02 — Read and analyzed all five user references. Identified the 2D-sprite consistency failure and the modern isometric target.
- 2026-11-02 — Researched pstack, LiveKit spatial audio, WorkAdventure, Colyseus, R3F, CC0 asset sources, and AI 3D tools.
- 2026-11-02 — Wrote `PLAN.md`: product, architecture, data model, realtime/voice/chat/AI design, phases, risks, definition of done.
- 2026-11-02 — Locked non-functional requirements: performance budget, single-node hosting, scale-out path.
- 2026-11-02 — Generated three art-direction references with Sol via T3 Code; user approved the direction.
- 2026-11-02 — Created docs/agent structure: `AGENTS.md`, `CLAUDE.md`, `docs/`, ADRs, open questions, brief.
- 2026-11-02 — Named the project **Workbits**. Chose Bun for installs/scripts.
- 2026-11-02 — Verified usage telemetry: `codexbar` for Claude/Codex, `opencode stats` for OpenCode tokens. Added `bun run usage` and `docs/operations/`.
- 2026-11-02 — Smoke-tested all nine models through T3 Code: Luna, Astra, Sol, Terra, Opus 5.5, Sonnet 5.5, Haiku 5.5, DeepSeek V4.1 Flash, Kimi K3.1 Pro. All green; no provider failures.
- 2026-11-02 — Recorded the delegation policy: subagents only for parallel/bulk/fresh-context/other-model work, never as a default; handoff tax and cost are real. Claude weekly at 55% left, resets ~19:00 UTC; Claude is the workhorse for this run.
- 2026-11-02 — Received the team seed pack. Preserved the group reference in `art/team-reference.png`; raw photos in `seeds/team/photos/` (gitignored). Created `seeds/team/manifest.json`, `docs/art/team-cast.md`, and `docs/architecture/avatars.md`. No product code.
- 2026-11-02 — Recorded Codex/ChatGPT routing: Luna for bulk reads, Terra for copy, Sol for planning/critique and image generation, Astra only for rare critical calls. No fixed call budget; usage is checked with `codexbar`.

- 2026-11-02 — Built the first playable web slice: Vite/React/R3F office, procedural furniture and rooms, team avatars from the seed pack, camera pan/zoom, click-to-walk and WASD, roster, chat dock, controls, and product shell.
- 2026-11-02 — Added the Colyseus realtime server (0.16, Node + tsx) with authoritative movement bounds, presence messages, and shared chat. Verified with a headless bot: welcome snapshot, chat both directions, and a remote avatar in the scene.
- 2026-11-02 — Added `bun run shot`, `bun run shot:multi`, and the bot-check script. Known issue: conditional static-avatar replacement can emit a React `removeChild` console error; the scene remains usable.
- 2026-11-02 — Recorded ADR-011: message-based presence for the MVP, schema migration before scale.
- 2026-11-02 — Added self-hosted LiveKit (Docker dev server), a scoped token endpoint, and proximity voice on the client. Verified one client connects and publishes a mic track; UI shows `Proximity · live`. Proximity gain is distance-based and deafen-aware.
- 2026-11-02 — Added Avatar Studio (prompt → 3 local modular bases → apply/persist), rooms popover with click-to-walk, topbar character switcher, share/copy invite link, responsive camera and mobile layout, chat persistence to `apps/server/data/chat.jsonl`, and the `bun run verify` evidence pass.
- 2026-11-02 — Production `bun run build` passes. Current demo screenshot: `art/workbits-demo.png`.
- 2026-11-02 — Added Workspace Studio: data-driven engineering desks/chairs, deterministic prompt → 3 layouts, apply/reset/persist. Added mobile polish and share link.
- 2026-11-02 — Added server-routed private DMs with history filtering; verified Arlo receives a DM while Jules does not. Added avatar/workspace screenshots to the docs.
- 2026-11-02 — Verified two simultaneous browser voice clients; both publish a track and see the same 0.617 proximity gain at spawn distance. Added emote broadcast (wave/clap/heart), status broadcast, invite picker, and share-link onboarding.
- 2026-11-02 — Synced avatar configs and workspace layouts through the server; added zone-scoped room chat, per-person DM targets, live roster presence, and live locate. Verified with `scripts/sync-check.mjs` (avatar in welcome, layout broadcast, room chat isolation, roster).
- 2026-11-02 — Replaced the client-side meeting-room audio gate with real LiveKit room isolation. Tokens are minted from the server-authoritative zone, client room overrides are ignored, and unauthorized identities get 403. Verified two browser clients: one in the meeting room, one on the floor, no cross-room tracks. Added `voice-room-check` and `token-check`.
- 2026-11-02 — Added automatic realtime reconnect with backoff. Reconnect restores the player position/zone and status, rebinds voice to the new Colyseus identity, and preserves the mic state. Added emote bubbles for wave/clap/heart. Verified with `scripts/reconnect-check.mjs` and the updated `emote-check`.
- 2026-11-02 — Added the Workbits Assistant: a local, no-key chat panel that answers presence, room, meeting, and summary questions from live data and offers walk-to actions. Clearly labeled Local engine; provider seam documented in `docs/architecture/ai.md`.
- 2026-11-02 — Added manual avatar tuning (skin, hair style/color, top color, glasses, beard, cap, chain) on top of generated bases, with live sync to other clients. Updated `forge-shot` to assert the edited config reaches a remote observer.
- 2026-11-02 — Added single-process production serving (web build + Colyseus + token API), SPA fallback, cache headers, a multi-stage Dockerfile, and an app+LiveKit Compose stack. Verified locally and in the built container with `prod-check` (static, SPA, health, 403 token, hashed asset, same-origin realtime, clean console).
- 2026-11-02 — Added unit tests for proximity gain, zones, avatar/workspace generators, and assistant answers (22 passing), wired into `bun run verify`. Added occupancy-aware invites: the join screen waits offline, marks live seats, avoids the host, and only connects after a seat is chosen.
- 2026-11-02 — Removed dead camera/share/search controls, wired the roster invite button, added a chat emoji picker and unread badges. Added a navigation/composer UI check and an unread check to `bun run verify`.
- 2026-11-02 — Added generated 2D portraits derived from the avatar config across the roster, chat, profile, invite picker, and account chip. Removed the last dead UI controls so every visible button does something.
- 2026-11-02 — Added a responsive welcome/marketing page at `/welcome.html` using the real demo screenshot, honest demo caveats, and a CTA into the invite picker. Added desktop/mobile welcome checks to `bun run verify`.
- 2026-11-02 — Hardened voice token minting: each Colyseus session receives a private voice key in its welcome; the token endpoint requires it, so a broadcast session id cannot be used to mint someone else's voice token. Added no-key/wrong-key regression checks.
- 2026-11-02 — Art overhaul in progress: compact 20×14 cutaway diorama, stone plinth, new meeting/kitchen/lounge/engineering layout, denser props, softer camera, 1.35× cast scale, warm wardrobe alternates, reworked Kimi/Opus scene and Sonnet character passes, art-mode screenshot + comparison harness.
- 2026-11-02 — Started the model-based prop pipeline (ADR-012): Blender conversion contract, `packages/assets` manifest + license fields, `GltfProp` runtime loader with palette slot materials, and a lounge A/B slice converting the sofa and armchair to CC0 Quaternius GLBs (subdivision 1, smooth shading, authored accent pillows, re-materialed). Typecheck/build/22 tests pass. Evidence: `artifacts/art/lounge-slice/`.
- 2026-11-02 — Added the three-way reference / before / after comparison the slice was missing, then did a reference tone pass: pale washed-oak floor, softer key/ambient balance, SSAO/contrast/saturation tuning, wider art framing with a raised camera target, and a larger lounge sofa. It closed the color/framing gap but the comparison still shows the office far from `art/style-scene.png`; the remaining gap is room composition, character quality, and prop detail, not the loader. Evidence: `artifacts/art/lounge-slice/compare-reference-*.png` and `report.md`.
- 2026-11-02 — Reference composition pass (ADR-013), planned with Opus 5.5 via Claude Code and critiqued with Sol 6.1 via Codex: lowered the camera to `[20,15,20]`, removed the reading nook and bistro stools, moved the benchmark to x 2.4 and widened desks to 2.8 m, added a coffee island, extended the kitchen tile, grouped plants, tightened the lounge, raised contact shadows, and rebalanced avatar scale (humans 1.5, frog 1.25, crab 1.3). Updated the engineering anchor to `(2.4, 5.9)`, client/server spawns, and zone tests. Typecheck and 23 tests pass. The open plan now reads closer; characters remain the next benchmark.
- 2026-11-02 — Character benchmark with Sonnet 5.5 via Claude Code (two passes, `avatars.tsx` only): smoothed Chus/Felix hair masses, raised the hairline, clarified the sunglasses so eyes/brows read, thickened the neck/collar, and bridged the shoulders into the sleeves. Result is a real but partial improvement; the torso/limbs are still assembled primitives and the reference character quality needs a modeled/rigged human mesh. Evidence: `artifacts/art/char-bench/`. Typecheck/build/23 tests pass.
- 2026-11-02 — Researched the 2026 character pipeline: Meshy 7.1, Tripo P2, Rodin Gen-2.5, Ludo, 3D AI Studio, Kaedim, Hunyuan3D/TRELLIS, plus the agent layer (Blender MCP, Meshy/Tripo/Rodin MCPs) and rigged bases (Quaternius Universal Base Characters, Synty, VRM/VRoid). Verdict: no image-to-3D tool one-shots the reference cast; use a base mesh + Blender MCP cleanup + auto-rig, or a purchased/commissioned pack. Recommended a one-character bake-off before touching the cast. Doc: `docs/research/character-pipeline.md`.
- 2026-11-02 — Free CC0 character benchmark: downloaded Grab3D Casual Man/Woman (CC0, 54-bone Mixamo-compatible rig, walk/run), decimated 244k → 30k triangles, resized textures to 1K, added `GltfPerson` (SkeletonUtils clone + `useAnimations`), and replaced Jules in the scene as a quality benchmark. The style is dramatically closer to the reference; the primitive cast now reads oversized and blocky next to it. Assets + manifest entries added; one model integrated. Next: replace the human cast, normalize heights, and retarget idle/sit/type.
- 2026-11-02 — Replaced the human cast with chibi characters assembled at runtime from the Grab3D Character Mixer "Cozy" kit (CC0, shared 19-bone rig, idle/walk/wave clips). `cozyLook()` maps the seed avatar config to parts and slot colours; sunglasses, tie, chain, watch and sleep mask are small meshes on bones; sit/type are bone aims over the idle clip; heads scaled to 0.87 toward the reference's third-of-height. Aligned Jules, Mira, Felix and Fern's outfits with the group reference. Dropped the rejected Casual Man/Woman benchmark. Added a dev-only `?lineup` bench. Typecheck/build/23 tests pass. Evidence: `artifacts/art/cozy-cast/`.

- 2026-11-02 — Art pass 2: people 2.0x and frog/crab 1.55x to match the reference's person-to-furniture ratio; tighter art (21) and app (22) framing; calmer planters; local `RoomEnvironment` IBL with a warmer, lower sun picked from a scored sweep. Added `scripts/art-score.sh` (DreamSim vs `art/style-scene.png`): frame 0.191 → 0.154. Fixed name tags vanishing (drei `<Html>` root reuse; unmount warnings 10 → 2). Generated-head experiment for Chus (Sol portrait → Hunyuan3D shape → front-projected texture) behind `?heads=gen`; likeness better, texture not shippable on free GPU quota. Evidence: `artifacts/art/cozy-cast/report.md`.

- 2026-11-02 — Compact floor plan (ADR-014): 20 × 14 → 15 × 11 with the reference's four zones plus a small nap nook; garden zone, kitchen communal table, coffee island, whiteboard and front planters removed; zones, anchors, spawns, server clamps and tests updated; whole room framed at 19.5. Fixed the stale restored-position assertion in `reconnect-check.mjs`. `bun run verify` passes end to end (installed Playwright's headless Chromium, which was missing). Evidence: `artifacts/art/cozy-cast/compact/`.

- 2026-11-02 — Reference pass on detail and tone: rebuilt the desk area (chunky desks with front pedestals, thick-bezel monitors, tall planted partitions, ribbed task chairs); warmer grade; pale microcement floor replacing wood and kitchen tile; plants rebuilt from broad leaves (bush, trailing, fiddle-leaf tree). Cycles render test (`artifacts/art/cycles-test/`) showed the gap was mostly assets, partly lighting; added a dev-only scene export (`devExport.ts`) for offline renders. `bun run verify` passes. Evidence: `artifacts/art/desk-slice/`, `artifacts/art/grade-floor-plants/`.

- 2026-11-02 — Two diagonal 2×2 desk pods (8 desks at 1.8 × 1.0) replace the single bench, with a long planter on the open front edge; Felix moves to the second pod; engineering anchor moves to `(-1.3, 3.8)`; server desk validation widened to x -3..4, z -0.4..4.9. Soft additive sun pools on the floor. `bun run verify` passes.

- 2026-11-02 — Furniture to the desk standard (RESUME step 1). Kitchen: pale slab-front oak with dark pulls, thick white counter, espresso station, floating shelves with an LED wall wash, bigger mugs, pothos with long vines (replaces the `trailing` plant everywhere), two-door stainless fridge, matching pantry; tiled backsplash and most counter clutter removed. Lounge: corner `Sectional` replaces the GLB sofa and armchair, round 3-leg coffee table, plump tufted pouf, narrower bird-of-paradise leaves. Meeting room: smooth tub-shell chairs on slim splayed legs, bare table with tapered legs, cream bell pendant. Added `?noCast` (hide characters) and `scripts/art-triptych.sh`. Typecheck and 23 tests pass. `bun run verify` passes (about 17 min) after fixing a low-frame-rate walk overshoot that broke private room isolation on SwiftShader, and giving the office screenshot a 120s budget. Evidence: `docs/art/progress/{kitchen,lounge,meeting,full}-reference-before-after.jpg`.

## Next

1. **Auth, orgs, invites, Postgres.** Replace demo identities with better-auth sessions; scope every row by `org_id`; make invite links single-use; add cross-tenant denial tests.
2. **Full office editor.** Drag/rotate/delete furniture with snap, undo/redo, collision/reachability validation, and publish/draft. Workspace Studio is the current generator slice.
3. **LLM provider.** Keep the deterministic fallbacks; add a server-side provider adapter for the assistant, avatar prompt interpretation, and room programs. Add budget/audit controls.
4. **Chat depth.** Group channels, read receipts, replies/reactions/mentions, rate limits, moderation, and channel membership authz.
5. **Performance on real hardware.** Measure FPS/frame p95/draw calls on a 1080p integrated-GPU laptop and a phone; reduce draw calls/shadows if over budget.
6. **Production edges.** Caddy/TLS, Postgres/Redis persistence, LiveKit public URL/keys, backups, and a 50-bot load test.

## Blockers

- Public launch needs domain/TLS, Postgres, Stripe test keys, email provider, and runtime AI keys.
- Performance budget is not yet verified on real hardware; the current evidence is functional, not a GPU benchmark.
- The known React `synchronously unmount a root` console warning from the R3F HTML name-tag path is still present; it is non-visual.

## Changelog

- **2026-11-02** — Planning phase. No product code. Repo initialized, docs created, art refs generated.
