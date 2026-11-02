#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

trap 'kill 0' EXIT INT TERM

(cd apps/server && bun run dev) &
(cd apps/web && bun run dev) &

wait
