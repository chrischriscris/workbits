#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="artifacts/art/$STAMP"
mkdir -p "$OUT"
bun scripts/art-shot.mjs http://127.0.0.1:3100 "$OUT/current.png"
bash scripts/art-compare.sh "$OUT/current.png" "$OUT/compare.png" >/dev/null
cp art/style-scene.png "$OUT/target.png"
printf 'Art iteration: %s\n' "$OUT"
printf '  current: %s/current.png\n  compare: %s/compare.png\n' "$OUT" "$OUT"
