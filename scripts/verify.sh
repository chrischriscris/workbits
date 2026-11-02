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

# Browser and SwiftShader runs can occasionally miss their ready flag after a
# long sequence of launches. Retry those once; pure checks fail hard.
run_ui() {
  local label="$1"
  shift
  section "$label"
  local log="$OUT/attempt.log"
  if "$@" >"$log" 2>&1; then
    cat "$log" | tee -a "$OUT/report.md"
    return 0
  fi
  printf '_Retrying once after a transient browser-launch failure._\n\n' | tee -a "$OUT/report.md"
  sleep 1
  if "$@" >"$log" 2>&1; then
    cat "$log" | tee -a "$OUT/report.md"
  else
    cat "$log" | tee -a "$OUT/report.md"
    return 1
  fi
}

: >"$OUT/report.md"
printf '# Workbits verification — %s\n' "$STAMP" >>"$OUT/report.md"

run "Typecheck" bun run typecheck
run "Unit tests" bun test
run "Proximity gain math" bun scripts/gain-check.mjs
run_ui "Single-client office screenshot" bun run shot http://127.0.0.1:3100/ "artifacts/shots/verify-office.png"
run_ui "Realtime presence + chat bot" bun run shot:multi
run_ui "Voice token + publish" bun scripts/voice-check.mjs
run_ui "Two-client proximity voice" bun scripts/voice-two.mjs
run "Voice room authorization" bun scripts/token-check.mjs
run_ui "Private room isolation" bun scripts/voice-room-check.mjs
run_ui "Realtime reconnect + voice rebind" bun scripts/reconnect-check.mjs
run_ui "Avatar studio" bun scripts/forge-shot.mjs
run_ui "Workspace studio" bun scripts/room-studio-shot.mjs
run_ui "DM privacy" bun scripts/dm-check.mjs
run_ui "Invite picker" bun scripts/join-shot.mjs
run_ui "Status broadcast" bun scripts/status-check.mjs
run_ui "Emote broadcast" bun scripts/emote-check.mjs
run_ui "Local assistant" bun scripts/assistant-check.mjs
run_ui "Customization sync" bun scripts/sync-check.mjs
run_ui "Navigation and composer" bun scripts/ui-check.mjs
run_ui "Welcome page" bun scripts/welcome-check.mjs
run_ui "Unread chat" bun scripts/unread-check.mjs
run_ui "Mobile layout" bun scripts/mobile-shot.mjs

printf '\nArtifacts: `%s`\n' "$OUT" | tee -a "$OUT/report.md"
echo "Verification report: $OUT/report.md"
