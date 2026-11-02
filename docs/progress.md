# Progress

Source of truth for what is actually done. Update at the end of every work session. Do not mark a phase done without evidence in `artifacts/`.

## Phase status

| Phase | Status | Evidence | Notes |
|---|---|---|---|
| 0 — Foundation | 🟢 Local foundation | `bun run dev`, `bun run typecheck` | Vite, Node/Colyseus, Docker LiveKit, seed data |
| 1 — The Room | 🟡 Playable style frame | `art/workbits-demo.png`, `artifacts/shots/office-18.png` | Art still being polished |
| 2 — Presence | 🟢 Working + reconnect | `bun run shot:multi`, `scripts/reconnect-check.mjs` | Message-based presence (ADR-011) |
| 3 — Voice | 🟢 Proximity + isolated meeting room | `scripts/voice-room-check.mjs`, `scripts/token-check.mjs` | Real-mic conversation still manual; auth-scoped identity pending |
| 4 — Chat | 🟢 Channels + private DMs + room scoping | `scripts/dm-check.mjs`, `scripts/sync-check.mjs` | Group membership not built |
| 5 — Customization | 🟢 Generated + tuned avatars, synced layouts | `scripts/forge-shot.mjs`, `scripts/sync-check.mjs` | Full drag-and-drop office editor not built |
| 6 — AI | 🟢 Local avatar, workspace, assistant | `scripts/assistant-check.mjs`, `apps/web/src/ai/` | No runtime LLM keys; provider adapter pending |
| 7 — Product | 🟡 Welcome page + demo product shell | `scripts/welcome-check.mjs`, `art/welcome.png` | Auth, billing, office editor |
| 8 — Ship | 🟡 Single-process prod + Docker | `bun run prod-check`, container run | TLS/Caddy, Postgres, multi-instance pending |

### Verification

`bun run verify` runs the current evidence pass. Latest report: `artifacts/verify/20261102T093721Z/report.md` (local, gitignored). Production: `bun run prod-check` plus the built Docker image.

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

## Next

1. Receive the user's model/seed references and record them in `docs/research/models.md`.
2. Get explicit **go** for the all-night build.
3. Phase 0: monorepo, infra, auth, orgs/offices, seed data, harness skeleton.
4. Phase 1: real style frame in the actual renderer.

## Blockers

- None for local build.
- Public launch needs domain/deploy target, Stripe test keys, email provider, runtime AI key.

## Changelog

- **2026-11-02** — Planning phase. No product code. Repo initialized, docs created, art refs generated.
