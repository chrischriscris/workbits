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

# `bun run verify` is the quick tier (about a minute): static checks, the
# browserless realtime/voice checks and one browser smoke test.
# `bun run verify:full` adds every browser check; run it at phase gates and
# before pushing.
MODE="quick"
[ "${1:-}" = "--full" ] && MODE="full"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="artifacts/verify/$STAMP"
mkdir -p "$OUT"
REPORT="$OUT/report.md"
TOTAL_START=$SECONDS

section() {
  printf '\n## %s\n\n' "$1" | tee -a "$REPORT"
}

timed() {
  local start=$SECONDS
  local status=0
  "$@" || status=$?
  printf '_%ss_\n' "$((SECONDS - start))" | tee -a "$REPORT"
  return $status
}

run() {
  local label="$1"
  shift
  section "$label"
  timed "$@" 2>&1 | tee -a "$REPORT"
}

# Browser and SwiftShader runs can occasionally miss their ready flag after a
# long sequence of launches. Retry those once; pure checks fail hard.
run_ui() {
  timed run_ui_inner "$@"
}

run_ui_inner() {
  local label="$1"
  shift
  section "$label"
  local log="$OUT/attempt-${LANE:-main}.log"
  if "$@" >"$log" 2>&1; then
    cat "$log" | tee -a "$REPORT"
    return 0
  fi
  printf '_Retrying once after a transient browser-launch failure._\n\n' | tee -a "$REPORT"
  sleep 1
  if "$@" >"$log" 2>&1; then
    cat "$log" | tee -a "$REPORT"
  else
    cat "$log" | tee -a "$REPORT"
    return 1
  fi
}

: >"$REPORT"
printf '# Workbits verification (%s) — %s\n' "$MODE" "$STAMP" >>"$REPORT"

run "Typecheck" bun run typecheck
run "Unit tests" bun test
run "Proximity gain math" bun scripts/gain-check.mjs
run "Voice room authorization" bun scripts/token-check.mjs

if [ "$MODE" = quick ]; then
  run_ui "Realtime presence + chat bot" bun run shot:multi
  printf '\nTotal: %ss (quick; `bun run verify:full` for every browser check)\n' "$((SECONDS - TOTAL_START))" | tee -a "$REPORT"
  printf '\nArtifacts: `%s`\n' "$OUT" | tee -a "$REPORT"
  exit 0
fi

# Browser checks run in three parallel lanes. Lane A uses the dev stack's
# realtime server (:3101); lanes B and C each get their own server, LiveKit
# room prefix and chat history, so their players and voice never meet. All
# lanes share the dev web server (:3100); pages reach their lane's server via
# the dev-only ?rt= param (scripts/lib/lane.mjs).
LANE_PIDS=()
cleanup() {
  for pid in "${LANE_PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT

start_lane_server() {
  local name="$1" port="$2"
  (
    cd apps/server
    PORT="$port" VOICE_ROOM="office:verify-$name" DATA_DIR="$ROOT/$OUT/data-$name" \
      exec node --import tsx src/index.ts
  ) >"$OUT/server-$name.log" 2>&1 &
  LANE_PIDS+=("$!")
}

wait_for_port() {
  local port="$1"
  for _ in $(seq 1 60); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then return 0; fi
    sleep 0.5
  done
  echo "lane server on :$port did not start" >&2
  return 1
}

start_lane_server b 3111
start_lane_server c 3121
wait_for_port 3111
wait_for_port 3121

lane_a() {
  run_ui "Single-client office screenshot" bun run shot http://127.0.0.1:3100/ "artifacts/shots/verify-office.png"
  run_ui "Voice token + publish" bun scripts/voice-check.mjs
  run_ui "Two-client proximity voice" bun scripts/voice-two.mjs
  run_ui "Private room isolation" bun scripts/voice-room-check.mjs
  run_ui "Mobile layout" bun scripts/mobile-shot.mjs
}

lane_b() {
  run_ui "Realtime presence + chat bot" bun run shot:multi
  run_ui "Realtime reconnect + voice rebind" bun scripts/reconnect-check.mjs
  run_ui "Avatar studio" bun scripts/forge-shot.mjs
  run_ui "Workspace studio" bun scripts/room-studio-shot.mjs
  run_ui "DM privacy" bun scripts/dm-check.mjs
  run_ui "Invite picker" bun scripts/join-shot.mjs
  run_ui "Status broadcast" bun scripts/status-check.mjs
}

lane_c() {
  run_ui "Emote broadcast" bun scripts/emote-check.mjs
  run_ui "Local assistant" bun scripts/assistant-check.mjs
  run_ui "Customization sync" bun scripts/sync-check.mjs
  run_ui "Navigation and composer" bun scripts/ui-check.mjs
  run_ui "Welcome page" bun scripts/welcome-check.mjs
  run_ui "Unread chat" bun scripts/unread-check.mjs
}

# Each lane writes its own report; they're appended in lane order afterwards
# so the output reads sequentially. A failing step stops its lane only.
run_lane() {
  local name="$1" port="$2"
  (
    export LANE="$name" WB_RT_PORT="$port" WB_VOICE_ROOM="office:verify-$name"
    [ "$name" = a ] && export WB_VOICE_ROOM="office:workbits-loft"
    REPORT="$OUT/lane-$name.md"
    : >"$REPORT"
    "lane_$name"
  ) >/dev/null 2>&1
}

printf '\nBrowser checks: 3 lanes in parallel…\n'
LANE_STATUS=()
run_lane a 3101 &
PID_A=$!
run_lane b 3111 &
PID_B=$!
run_lane c 3121 &
PID_C=$!
FAILED=0
for lane in a b c; do
  pid_var="PID_${lane^^}"
  if wait "${!pid_var}"; then LANE_STATUS+=("$lane ok"); else LANE_STATUS+=("$lane FAILED"); FAILED=1; fi
  cat "$OUT/lane-$lane.md" | tee -a "$REPORT"
done

printf '\nLanes: %s\n' "${LANE_STATUS[*]}" | tee -a "$REPORT"
printf 'Total: %ss\n' "$((SECONDS - TOTAL_START))" | tee -a "$REPORT"
printf '\nArtifacts: `%s`\n' "$OUT" | tee -a "$REPORT"
echo "Verification report: $REPORT"
exit "$FAILED"
