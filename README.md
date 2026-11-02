# Workbits

**A browser-based isometric virtual office where remote teams can see each other, walk over, talk by proximity, chat, and work.**

Workbits is built to be a product, not an internal tool: multi-tenant from day one, customizable offices, AI-assisted world-building, and a deployment story that starts with one Node process and scales without a rewrite.

![Workbits art direction](art/style-scene.png)

## Status

**Planning + art direction approved. Product code has not started.**

- ✅ Vision, scope, architecture, phases, and verification plan
- ✅ Art direction locked: warm stylized 3D diorama, chibi modular characters
- ✅ Concept references generated in `art/`
- ✅ Decisions and open questions recorded
- ⏸️ Waiting for the user's **go** and the model/seed references

## What it does

- **Isometric office** — orthographic diorama, cutaway walls, soft shadows, 60 fps target.
- **Multiple offices, floors, rooms, and workspaces** — assignable desks, meeting rooms, phone booths, lounges.
- **Proximity voice** — LiveKit SFU, distance-based gain/pan, private-room isolation, mute/deafen/PTT, screen share in meetings.
- **Text chat** — Global, Office, Room, Group, and DM channels; history, unread, replies, reactions, files, search.
- **Customization** — office editor (furniture, floors, walls, themes), modular avatar creator, templates, permissions.
- **AI** — prompt-to-office layouts, avatar/decor generation, NPC teammates, chat assistant; constrained and schema-validated.
- **Product shell** — orgs, invites, roles, guest links, onboarding, pricing, Stripe test billing, admin.

## Stack

| Layer | Choice |
|---|---|
| Client | React 19 + Vite + TypeScript + React Three Fiber + drei |
| Realtime | Colyseus + Redis (optional) |
| API | Fastify + Zod + Drizzle + Postgres |
| Auth | better-auth (orgs, invites, roles, OAuth) |
| Voice | LiveKit |
| Chat | Colyseus events + Postgres history |
| AI | Vercel AI SDK, provider-agnostic |
| Runtime | Bun for install/scripts; Node 24 validated for server where needed |
| Deploy | Docker Compose + Caddy; LiveKit Cloud in prod |

## Docs map

- [`PLAN.md`](PLAN.md) — the master plan: product, architecture, phases, risks.
- [`AGENTS.md`](AGENTS.md) — how an agent works in this repo.
- [`docs/brief.md`](docs/brief.md) — the original directives, distilled.
- [`docs/decisions.md`](docs/decisions.md) — ADR log.
- [`docs/open-questions.md`](docs/open-questions.md) — what is still undecided.
- [`docs/progress.md`](docs/progress.md) — phase status and changelog.
- [`docs/backlog.md`](docs/backlog.md) — deliberately deferred ideas.
- [`docs/research/`](docs/research/) — technology, assets, models, pstack.
- [`docs/art/`](docs/art/) — style bible and reference analysis.
- [`docs/architecture/`](docs/architecture/) — system, data, realtime, voice, chat, AI, security, deployment.
- [`docs/verification/`](docs/verification/) — the harness and phase gates.

## Repo layout

```
apps/          web client, API/realtime server
packages/      shared schemas, db, ui, harness, asset catalog
infra/         docker-compose, Caddy, LiveKit, deploy scripts
art/           concept references and style frames
docs/          product, architecture, research, verification, progress
```

## Non-negotiables

1. **Place first.** Presence and proximity are the product.
2. **One coherent art direction.** No pixel art, no mixed packs, no AI core geometry.
3. **Evidence, not assertions.** Every phase ships with screenshots, video, metrics, and a written gate.
4. **Simple deployment by default.** One Node process, Postgres, LiveKit, Caddy. Redis and S3 are optional.
5. **Tenant isolation and authz from day one.**
6. **No copying.** The references are direction, not assets, branding, or code.

## Next

1. User sends the model/seed references.
2. User says **go**.
3. Phase 0: monorepo, infra, auth, orgs/offices, seed data, harness skeleton.
4. Phase 1: the real style frame — a playable, beautiful room.

---

Proprietary. All rights reserved. No license granted yet.
