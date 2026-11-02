#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="artifacts/verify/$STAMP"
mkdir -p "$OUT"

section() {
  printf '\n## %s\n\n' "$1" | tee -a "$OUT/report.md"
}

run() {
  local label="$1"
  shift
  section "$label"
  "$@" 2>&1 | tee -a "$OUT/report.md"
}

: >"$OUT/report.md"
printf '# Workbits verification — %s\n' "$STAMP" >>"$OUT/report.md"

run "Typecheck" bun run typecheck
run "Proximity gain math" bun scripts/gain-check.mjs
run "Single-client office screenshot" bun run shot http://127.0.0.1:3100/ "artifacts/shots/verify-office.png"
run "Realtime presence + chat bot" bun run shot:multi
run "Voice token + publish" bun scripts/voice-check.mjs
run "Avatar studio" bun scripts/forge-shot.mjs
run "Workspace studio" bun scripts/room-studio-shot.mjs
run "DM privacy" bun scripts/dm-check.mjs
run "Mobile layout" bun scripts/mobile-shot.mjs

printf '\nArtifacts: `%s`\n' "$OUT" | tee -a "$OUT/report.md"
echo "Verification report: $OUT/report.md"
