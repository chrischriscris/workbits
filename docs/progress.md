# Progress

Source of truth for what is actually done. Update at the end of every work session. Do not mark a phase done without evidence in `artifacts/`.

## Phase status

| Phase | Status | Evidence | Notes |
|---|---|---|---|
| 0 — Foundation | 🟡 Planning complete | `PLAN.md`, `docs/`, `art/` | Product code not started |
| 1 — The Room | ⚪ Not started | — | Style frame first |
| 2 — Presence | ⚪ Not started | — | — |
| 3 — Voice | ⚪ Not started | — | — |
| 4 — Chat | ⚪ Not started | — | — |
| 5 — Customization | ⚪ Not started | — | — |
| 6 — AI | ⚪ Not started | — | — |
| 7 — Product | ⚪ Not started | — | — |
| 8 — Ship | ⚪ Not started | — | — |

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
