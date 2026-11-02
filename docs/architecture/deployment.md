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

## Single-node production (default)

```
Caddy
 ├─ /            → static web (built assets)
 ├─ /api/*       → app:3101
 ├─ /rt/*        → app:3101 (WebSocket)
 └─ /livekit/*   → LiveKit Cloud or livekit:7880
app              one Node/Bun process (Fastify + Colyseus)
postgres
livekit          (optional if using LiveKit Cloud)
```

- `docker compose -f infra/docker-compose.prod.yml up -d`
- Migrations run on boot under a Postgres advisory lock.
- Health: `GET /api/health` (DB, LiveKit, storage), `GET /api/ready`.
- Caddy obtains TLS automatically.
- One app container is enough for 50 concurrent/floor.

## Environment

```bash
# app
NODE_ENV=production
PORT=3101
APP_URL=https://workbits.example.com
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://workbits.example.com

# livekit
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

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
