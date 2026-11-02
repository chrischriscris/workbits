# Deployment

## Local development

Ports are chosen to avoid the host's existing services (3000 and 6379 are already in use).

| Service | Port |
|---|---|
| Web (Vite) | 3100 |
| API + Colyseus | 3101 |
| Postgres | 5433 |
| Redis (optional) | 6380 |
| LiveKit signaling | 7880 |
| LiveKit TURN/UDP | 7881/7882 |
| MinIO (optional) | 9002 |

Flow:

```bash
bun install
bun run infra:up      # postgres + livekit (+ redis/minio if enabled)
bun run db:migrate
bun run db:seed
bun run dev           # web + server
```

Open `http://localhost:3100`, log in with a seeded demo user (credentials printed by the seed).

## Single-node production (implemented)

The current demo deploys as one Node process that serves the built web app, Colyseus, and the LiveKit token endpoint. No Postgres, Redis, or reverse proxy is required.

```
app (:3101)
 ├─ /                  → apps/web/dist (SPA fallback)
 ├─ /assets/*          → hashed assets, immutable cache
 ├─ /health            → JSON status
 ├─ /livekit/token     → room-scoped token, 403 for outsiders
 └─ / (WebSocket)      → Colyseus office room
livekit (:7880)        → self-hosted dev server or LiveKit Cloud
```

```bash
bun run build
bun run start          # http://localhost:3101
bun run prod-check     # evidence: static, SPA, health, token, same-origin realtime
```

Docker:

```bash
docker compose -f infra/docker-compose.prod.yml up --build
# http://localhost:3200
```

The image is multi-stage (`oven/bun` build → `node:24-alpine` runtime with `tsx`). LiveKit is a sibling container; the token endpoint returns a browser-reachable `LIVEKIT_URL`.

**Not in this mode yet:** TLS/Caddy, Postgres, auth/orgs, Redis, multi-instance, and S3. Those are the next layers, not rewrites:

```
Caddy (TLS)
 └─ app containers (sticky WebSockets)
     ├─ Postgres (orgs, users, layouts, chat)
     ├─ Redis (presence + rate limits)
     └─ LiveKit Cloud / cluster
```

## Environment

```bash
# app (current production mode)
NODE_ENV=production
PORT=3101
WEB_DIST=./apps/web/dist          # optional; computed from the server path by default

# livekit
LIVEKIT_URL=wss://...             # must be reachable by the browser
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# planned, not read yet
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://workbits.example.com

# optional
REDIS_URL=redis://...
S3_ENDPOINT=...
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
RESEND_API_KEY=...
```

Only `VITE_*` values reach the client. Never expose server secrets.

## Horizontal scale

1. Add Redis (`REDIS_URL`) and enable the Colyseus Redis presence/driver.
2. Run N app containers behind Caddy with sticky sessions (cookie or IP hash).
3. Shared Postgres; connection pooling (PgBouncer or provider pooler).
4. Move media to S3/R2 + CDN.
5. LiveKit Cloud or a LiveKit cluster for media fan-out.
6. Multi-region: LiveKit regions, read replicas, regional storage.

No application rewrite; the room code and schema stay the same.

## Backups and operations

- Nightly `pg_dump` to encrypted object storage; retain 30 days; test restore monthly.
- Structured logs (pino) with request IDs; no message/voice content.
- Metrics: connections, tick time, room count, error rate, AI spend.
- Sentry for exceptions; uptime check on `/api/health`.
- Graceful shutdown: stop accepting, drain rooms, close DB.
- Zero-downtime deploy: two app containers + Caddy health checks (requires Redis presence).

## CI

- `bun install --frozen-lockfile`
- typecheck, lint, unit tests
- build web + server
- E2E smoke with Postgres + LiveKit (docker services)
- Playwright screenshots/artifacts uploaded
- dependency audit

## Cost notes

- LiveKit Cloud free tier for dev/demo; paid at scale.
- Postgres/Redis managed or self-hosted.
- Object storage cheap; CDN for assets.
- AI costs metered per org; caps enforced.

## Risks

- Stateful WebSockets make serverless a poor default.
- Sticky sessions required for multi-instance Colyseus.
- LiveKit needs UDP/TURN; Cloud avoids the ops burden.
- Single-node restart drops in-memory presence; clients reconnect.
