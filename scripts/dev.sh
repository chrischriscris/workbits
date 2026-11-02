#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

if command -v docker >/dev/null 2>&1; then
  echo "Starting LiveKit…"
  docker compose -f infra/docker-compose.yml up -d livekit >/dev/null
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:7880 >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

trap 'kill 0' EXIT INT TERM

(cd apps/server && bun run dev) &
(cd apps/web && bun run dev) &

wait
