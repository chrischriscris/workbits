# Verification harness

The harness is Workbits' `control-app`: a CLI + dev routes that let an agent drive, inspect, and prove the running product. It is part of the repo, not a throwaway script.

## Why

A passing build is not proof. The harness exists so every phase can answer:

- Does it actually work in a browser, with two users, at desktop and mobile sizes?
- Does it hold the performance budget?
- Is it accessible?
- Can a tenant access another tenant's data?
- What does it look like? (screenshots/video)

## CLI

```
bun run harness up                 # infra + migrate + seed + dev servers
bun run harness down
bun run harness seed --reset
bun run harness shot <route>       # deterministic screenshot
bun run harness gallery            # asset/avatar/theme contact sheet
bun run harness flow <name>        # E2E scenario with video + trace
bun run harness bots --n 30        # headless Colyseus clients
bun run harness voice              # two-context LiveKit test
bun run harness perf               # FPS, frame p95, draw calls, memory
bun run harness audit              # axe + console/network errors
bun run harness visual-diff        # baseline comparison
bun run harness report             # artifacts/<run>/report.md
```

### Commands

| Command | What it does | Evidence |
|---|---|---|
| `up` | starts docker services, waits for health, migrates, seeds, starts dev servers | logs |
| `shot` | opens a route, waits for `__WORKBITS_READY__`, screenshots desktop/mobile | PNG |
| `gallery` | renders every catalog item/avatar/theme on a neutral stage | PNG grid |
| `flow` | runs a named Playwright scenario with two contexts where needed | video, trace, JSON |
| `bots` | connects N Colyseus clients that wander/chat; measures tick/bandwidth | metrics JSON |
| `voice` | joins two fake-media contexts; moves near/far; switches rooms; asserts track/gain state | video, JSON |
| `perf` | samples frame time/draw calls/triangles/heap for 30 s | metrics JSON, chart |
| `audit` | axe-core + console errors + failed requests + CSP violations | JSON |
| `visual-diff` | pixelmatch against baselines, per route | diff PNG + % |
| `report` | aggregates the run into a human-readable report | `report.md` |

## Dev routes

- `/dev/gallery` — every furniture item, avatar part, palette, and theme.
- `/dev/scene?layout=<fixture>` — render a layout without auth/realtime.
- `/dev/voice-lab` — fake participants at fixed coordinates; gain/pan readout.
- `/dev/perf` — stress scene with N avatars/furniture; toggles for shadows/SSAO/DPR.
- `/dev/ui` — component gallery and states (empty, loading, error, mobile).

These routes ship behind `import.meta.env.DEV` or a `DEV_ROUTES=1` flag; never in production.

## Determinism

- `?e2e=1` freezes clock/animations, uses a fixed RNG seed, disables particles, hides the cursor, and uses fixture AI.
- `window.__WORKBITS_READY__` is set only after the canvas, fonts, and critical assets are loaded.
- Screenshots use a fixed viewport (1440×900 desktop, 390×844 mobile), device scale factor 1.
- Test auth bypass is `NODE_ENV=test && E2E_AUTH=1`, never deployable.

## Artifacts

```
artifacts/<timestamp>/
  report.md
  run.json
  screenshots/
  videos/
  traces/
  metrics/
  diffs/
```

`report.md` includes: commit, phase, commands run, pass/fail per gate, embedded screenshots, perf table, a11y summary, known gaps.

## Implementation sketch

- `packages/harness/src/cli.ts` — Commander/CAC commands.
- `packages/harness/src/playwright/` — browser fixtures, auth helper, two-context helper.
- `packages/harness/src/bots/` — Colyseus bot client (shared protocol).
- `packages/harness/src/metrics/` — frame-time sampler via `requestAnimationFrame`, `renderer.info`.
- `packages/harness/src/report/` — markdown/HTML report.
- Playwright config with `webServer` for the app; docker compose for Postgres/LiveKit.
- CI: GitHub Actions, artifacts uploaded, gate fails on perf/a11y/authz regression.

## Mapping to pstack

| pstack | Workbits |
|---|---|
| `control-app` | `packages/harness` + `/dev/*` routes |
| verification skill | phase gate in `docs/verification/gates.md` |
| evidence before done | screenshots/video/metrics in `artifacts/` |
| fearless parallelism | subagents with isolated scopes, parent reruns gates |
| write less | vertical slices, no filler features |
