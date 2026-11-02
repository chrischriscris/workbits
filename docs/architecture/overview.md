# Architecture overview

## Shape

A modular monolith with one web client and one Node service. The service hosts both the REST API and the realtime game rooms. Postgres is the system of record. LiveKit handles media. Optional Redis/S3 are adapters, not requirements.

```
Browser
  React + Vite
  ├─ R3F scene (office, avatars, furniture)
  ├─ UI (roster, chat, editor, settings)
  ├─ Colyseus client (presence, movement, chat events)
  └─ LiveKit client (audio/video/screen)

Caddy (TLS, reverse proxy)
  ├─ /            → static web build
  ├─ /api/*       → Fastify
  ├─ /rt/*        → Colyseus (same Node process)
  └─ /livekit/*   → LiveKit (or LiveKit Cloud)

Fastify + Colyseus (one process)
  ├─ better-auth (orgs, members, invites, roles)
  ├─ REST (offices, layouts, chat history, uploads, AI, billing)
  ├─ OfficeRoom (per floor)
  ├─ OrgRoom (per org: chat events, presence)
  └─ adapters: Postgres, Redis (optional), S3 (optional), LiveKit, AI

Postgres
LiveKit (SFU)
S3/R2 (optional)
AI providers (optional)
```

## Components

| Component | Responsibility |
|---|---|
| `apps/web` | Rendering, input, UI, client prediction, LiveKit/Colyseus clients |
| `apps/server` | Auth, REST, realtime rooms, authz, persistence, token issuance, AI proxy |
| `packages/shared` | Zod schemas, protocol message types, constants, shared helpers |
| `packages/db` | Drizzle schema, migrations, seed |
| `packages/ui` | Design system and accessible primitives |
| `packages/harness` | CLI, Playwright flows, bots, perf/a11y/visual checks |
| `packages/assets` | Catalog manifests, footprints, thumbnails, license data |
| `infra` | Docker Compose, Caddy, LiveKit, deploy scripts |

## Trust boundaries

- The **server** owns positions, collisions, zone membership, seat occupancy, chat membership, and permissions.
- The **client** predicts movement for feel but never decides authority.
- **LiveKit tokens** are minted server-side, short-lived, and scoped to one room. The API secret never reaches the browser.
- **AI providers** receive only the minimum context; user content is data, not instructions.
- **Uploads** are validated and stored outside the web root.

## Key flows

### Join office

1. Client authenticates (session cookie/JWT).
2. `GET /api/offices/:id` returns office metadata and the published layout.
3. Client connects to Colyseus `OfficeRoom` with the access token and office/floor id.
4. Server validates membership, loads the floor, assigns a spawn/seat, and syncs state.
5. Client asks `/api/livekit/token` for the current audio zone; server authz + returns a scoped JWT.
6. Client connects to LiveKit and starts proximity audio.

### Move

1. Client sends `move` intent (target or direction) at ≤10 Hz.
2. Server validates speed, nav grid, collisions, and zone; updates state at 15 Hz.
3. Clients interpolate remote avatars; the local avatar predicts and reconciles.
4. Zone change triggers a status update and (if private) a LiveKit room switch.

### Chat

1. Client sends `chat.send` to `OrgRoom` with channel id + client message id.
2. Server checks membership, rate limit, sanitization; persists; broadcasts `chat.message`.
3. Client optimistically renders; reconciles on ack; unread counts update.
4. History/search goes through REST with pagination.

### AI room generation

1. Client sends a prompt to `/api/ai/room`.
2. Server calls the LLM for a structured program (Zod schema).
3. Deterministic solver packs rooms/furniture from the catalog.
4. Validator checks reachability, overlaps, doors, nav connectivity.
5. Client previews in the editor; accept → save draft → publish.

## Non-goals

- Microservices, Kubernetes, message queues, GraphQL.
- Native apps, recording, enterprise SSO in v1.
- Server-side rendering of the app (marketing can be static).

## Scale

1. Single node (default): in-memory presence, local media, 50/floor.
2. CDN + object storage for media.
3. Redis presence/driver + N realtime instances + sticky sessions.
4. LiveKit Cloud/cluster for media.
5. Multi-region: LiveKit regions, read replicas, regional storage.

See [`deployment.md`](deployment.md) and [`../decisions.md`](../decisions.md).
