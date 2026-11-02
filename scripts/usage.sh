#!/usr/bin/env bash
# Workbits usage snapshot.
# Claude + Codex: via the local codexbar widget/CLI.
# OpenCode: via the local opencode stats DB (tokens/cost; plan quota is dashboard-only).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p artifacts/usage
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="artifacts/usage/$STAMP"
mkdir -p "$OUT"

CODEXBAR="$(command -v codexbar || true)"
if [ -z "$CODEXBAR" ] && [ -x "$HOME/.local/bin/codexbar" ]; then
  CODEXBAR="$HOME/.local/bin/codexbar"
fi

echo "== Claude / Codex =="
if [ -n "$CODEXBAR" ]; then
  if "$CODEXBAR" usage --provider all --format json >"$OUT/codexbar.json" 2>"$OUT/codexbar.err"; then
    jq -r '.providers[] | "\(.name) [\(.plan // "?")] " + ([.windows[] | "\(.label): \(.used_percent)% used"] | join(" | "))' "$OUT/codexbar.json"
  else
    echo "codexbar failed: $(head -1 "$OUT/codexbar.err")"
  fi
else
  echo "codexbar not found"
fi

echo
echo "== OpenCode (local) =="
if command -v opencode >/dev/null 2>&1; then
  if opencode stats --days 1 --json --cost >"$OUT/opencode.json" 2>"$OUT/opencode.err"; then
    jq -r '"Today: \(.steps) steps | in=\(.tokens.input) out=\(.tokens.output) cache_read=\(.tokens.cache.read)"' "$OUT/opencode.json"
    jq -r '.models[] | "  - \(.model.providerID)/\(.model.id): steps=\(.steps) in=\(.tokens.input) out=\(.tokens.output) reasoning=\(.tokens.reasoning) cache_read=\(.tokens.cache.read)"' "$OUT/opencode.json"
  else
    echo "opencode stats failed: $(head -1 "$OUT/opencode.err")"
  fi
else
  echo "opencode not found"
fi

echo
echo "snapshot: $OUT"
