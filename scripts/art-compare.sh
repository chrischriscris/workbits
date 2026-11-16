#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
CURRENT="${1:-artifacts/shots/art-pass.png}"
OUT="${2:-artifacts/shots/art-compare.png}"
# The north-star reference is private and not in the public repo (art/README.md).
REFERENCE="${ART_REFERENCE:-art/style-scene.png}"
if [ ! -f "$REFERENCE" ]; then
  echo "No reference at $REFERENCE. It isn't in the public repo; set ART_REFERENCE=/path/to/reference.png." >&2
  exit 1
fi
mkdir -p "$(dirname "$OUT")"
ffmpeg -y -loglevel error \
  -i "$REFERENCE" \
  -i "$CURRENT" \
  -filter_complex "[0:v]scale=960:600:force_original_aspect_ratio=decrease,pad=960:600:(ow-iw)/2:(oh-ih)/2:color=0xf4eee5[a];[1:v]scale=960:600:force_original_aspect_ratio=decrease,pad=960:600:(ow-iw)/2:(oh-ih)/2:color=0xf4eee5[b];[a][b]hstack=inputs=2" \
  "$OUT"
echo "$OUT"
