# Workbits

**A browser-based isometric virtual office where remote teams can see each other, walk over, talk by proximity, chat, and work.**

Workbits is built to be a product, not an internal tool: multi-tenant architecture, customizable offices, AI-assisted world-building, and a deployment story that starts with one Node process and scales without a rewrite.

![Workbits demo](art/workbits-demo.png)

## Status — first playable demo

**Working locally now:**

- Isometric 3D office with lounge, engineering pod, glass meeting room, kitchen, nap room, and garden.
- The Workbits team seed pack: 8 characters (human, frog, crab mascot), name tags, statuses, roles, and desks.
- Click-to-walk and WASD movement with a floating move marker.
- Colyseus realtime presence: two tabs see each other; movement is server-validated.
- Shared text chat: Global, Office, Room, and DM UI, wired to the realtime room.
- Proximity voice via LiveKit: room token endpoint, mic publish, distance-based volume, deafen.
- Avatar Studio: prompt → three modular base avatars → apply and persist locally. No API key required.
- Rooms popover with click-to-walk navigation.
- Verification scripts: screenshots, headless bot, voice check, avatar studio, proximity math.

**Not done yet:** auth/orgs/invites, office editor, real AI room generation, chat persistence, billing, landing page, mobile polish, and multi-instance scale.

## Quick start

See [`HANDOFF.md`](HANDOFF.md) for the five-minute tour, what is real, and known gaps.

```bash
bun install
bun run dev
```

`bun run dev` starts the self-hosted LiveKit container (via Docker Compose), the realtime server on `:3101`, and the web app on `:3100`.

Open **http://localhost:3100**. Click the user chip in the top-right to switch demo characters, or open a second tab with:

```
http://localhost:3100/?character=jules
```

Click the mic to publish your microphone. Voice volume follows avatar distance; the meeting-room privacy switch is not wired yet.

## Verification

```bash
bun run verify
```

This runs typecheck, proximity math checks, a desktop screenshot, a realtime bot + chat test, a LiveKit publish check, and the Avatar Studio flow. The report and screenshots land in `artifacts/verify/<timestamp>/`. Artifacts are gitignored.

## Stack

| Layer | Choice |
|---|---|
| Client | React 19 + Vite + TypeScript + React Three Fiber + drei |
| Realtime | Colyseus 0.16 (Node + tsx) |
| API | Node HTTP + LiveKit token endpoint |
| Voice | LiveKit (self-hosted dev server; LiveKit Cloud for prod) |
| State | Zustand + server-authoritative presence messages |
| AI | Local modular avatar generator; provider adapter pending |
| Runtime | Bun for installs/scripts; Node for Colyseus |
| Deploy | Docker Compose + Caddy |

## Docs map

- [`PLAN.md`](PLAN.md) — product, architecture, phases, risks.
- [`AGENTS.md`](AGENTS.md) — how an agent works in this repo.
- [`docs/brief.md`](docs/brief.md) — the original directives, distilled.
- [`docs/decisions.md`](docs/decisions.md) — ADR log.
- [`docs/open-questions.md`](docs/open-questions.md) — what is still undecided.
- [`docs/progress.md`](docs/progress.md) — phase status and changelog.
- [`docs/backlog.md`](docs/backlog.md) — deliberately deferred ideas.
- [`docs/research/`](docs/research/) — technology, assets, models, pstack.
- [`docs/art/`](docs/art/) — style bible and team cast.
- [`docs/architecture/`](docs/architecture/) — system, data, realtime, voice, chat, AI, security, deployment.
- [`docs/verification/`](docs/verification/) — the harness and phase gates.
- [`docs/operations/`](docs/operations/) — model routing and usage.

## Repo layout

```
apps/web          React + Vite + R3F client
apps/server       Colyseus realtime + LiveKit token endpoint
packages/shared   shared types/schemas
infra             Docker Compose, Caddy, LiveKit, deploy scripts
art               concept references, demo screenshots, exports
seeds/team        optional, data-driven team demo pack
docs              product, architecture, research, verification, progress
```

## Non-negotiables

1. **Place first.** Presence and proximity are the product.
2. **One coherent art direction.** No pixel art, no mixed packs, no AI core geometry.
3. **Evidence, not assertions.** Screenshots, flows, metrics, and a report for every phase.
4. **Simple deployment by default.** One app process, Postgres, LiveKit, Caddy. Redis/S3 optional.
5. **Tenant isolation and authz from day one.**
6. **No copying.** References are direction, not assets, branding, or code.

---

Proprietary. All rights reserved. No license granted yet.
