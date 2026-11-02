# infra/

Deployment and local infrastructure.

```
infra/
  docker-compose.yml          # local: postgres, livekit, optional redis/minio
  docker-compose.prod.yml     # single-node: caddy, app, postgres, livekit
  Caddyfile                   # TLS, static web, /api, /rt, /livekit
  livekit.yaml                # dev config
  scripts/                    # migrate, seed, backup, restore, health
```

## Local ports (avoid host conflicts)

| Service | Port |
|---|---|
| Web | 3100 |
| API + realtime | 3101 |
| Postgres | 5433 |
| Redis (optional) | 6380 |
| LiveKit signaling | 7880 |
| LiveKit TURN/UDP | 7881/7882 |
| MinIO (optional) | 9002 |

The host already uses 3000 and 6379; do not bind those.

## Default topology

- One app process (Fastify + Colyseus).
- One Postgres.
- LiveKit (self-hosted dev, Cloud prod).
- Caddy for TLS/static/proxy.
- Redis/S3 only when scaling or when media persistence is needed.

See [`../docs/architecture/deployment.md`](../docs/architecture/deployment.md).
