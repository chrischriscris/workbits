# Contributing to Workbits

Thanks for helping. This is a young project; the fastest way to get oriented is to run it, walk around, and read [`docs/progress.md`](docs/progress.md) (newest entries at the bottom).

## Setup

You need [Bun](https://bun.sh) 1.4+, Node 22+, and Docker.

```bash
bun install
bun run dev        # LiveKit (Docker), realtime server on :3101, web app on :3100
```

Open http://localhost:3100. Open a second tab with `?character=jules` to see presence, chat and voice between two people.

For the browser checks, install Playwright's Chromium once:

```bash
bunx playwright install chromium-headless-shell
```

## Checks

With `bun run dev` running:

| Command | When | Time |
|---|---|---|
| `bun run verify` | before every push | ~1 min |
| `bun run verify:full` | before asking for review on anything that touches the scene, realtime, voice or UI | ~6 min |
| `bun scripts/perf-check.mjs --prod --vsync` | when a change could affect frame rate (needs system Chrome and a GPU; `bun run build` first) | ~2 min |

CI runs typecheck, unit tests, the build and the server-side checks on every pull request.

## Where things live

- `packages/shared/src/space/`: offices as documents. The compiler (rooms, walls, walkable grid, A*), the default loft, room kits and templates. Server and client both use it, so movement and room membership can't drift.
- `apps/server/`: Colyseus room (presence, chat, server-validated movement, office switching) and the LiveKit token endpoint.
- `apps/web/src/scene/`: the React Three Fiber scene. `props.tsx` is the procedural furniture kit, `catalog.tsx` maps document items to it, `people.tsx` builds the avatars.
- `docs/architecture/spaces.md` and `docs/decisions.md`: why things are the way they are. ADR-015 covers buildable offices.

## Conventions

- **Bun** for installs and scripts (`bun add`, `bun run`, `bunx`); the server runs on Node.
- **TypeScript** everywhere; `bun run typecheck` must pass. There is no formatter configured; match the surrounding style and don't reformat files you aren't changing.
- **Evidence for visual changes.** If a change affects how the office looks, include before/after screenshots in the PR. `bun scripts/art-view.mjs "<url>" out.png` takes one; `?art` hides the UI, `?noCast` hides characters, `?office=atelier&seats=12&seed=3` renders a template locally.
- **Commits** read like `feat(scope): what changed` / `fix: …` / `docs: …`, with the why in the body when it isn't obvious.
- **Assets.** Original work or properly licensed only (CC0 preferred), with the source and licence recorded in `packages/assets`. Reference images are direction, never assets. Some private references the art scripts expect aren't in this repo.
- **No secrets.** Use `.env` (gitignored); `.env.example` lists the variables.
- **Security.** Authz is enforced on the server. There's no auth yet (it's the next big step), so don't add features that assume a trusted client.

## Pull requests

1. Branch from `main`.
2. Keep a PR to one coherent change; say what was wrong or missing, what you changed, and how you checked it.
3. CI must pass before merging; `main` is protected.

If you're picking something up, the open issues labelled `good first issue` are a good start, and [`RESUME.md`](RESUME.md) lists what's next.

AI agents working in this repo: read [`AGENTS.md`](AGENTS.md) too.
