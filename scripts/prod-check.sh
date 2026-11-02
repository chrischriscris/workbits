#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bun run build

cd "$ROOT/apps/server"
PORT=3201 node --import tsx src/index.ts > /tmp/opencode/prod-server.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 50); do
  if curl -fsS http://127.0.0.1:3201/health >/dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

cd "$ROOT"
bun scripts/prod-check.mjs http://127.0.0.1:3201
