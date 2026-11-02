#!/usr/bin/env bash
# Reference | before | after, same height, labelled.
#   bash scripts/art-triptych.sh ref.png before.png after.png out.jpg [height]
set -euo pipefail
REF="$1"; BEFORE="$2"; AFTER="$3"; OUT="$4"; H="${5:-560}"
mkdir -p "$(dirname "$OUT")"
label() { magick "$1" -resize "x$H" -gravity north -background '#f4eee5' -splice 0x34 -font DejaVu-Sans -pointsize 22 -fill '#3f444c' -annotate +0+5 "$2" -bordercolor '#f4eee5' -border 6 "miff:-"; }
magick <(label "$REF" reference) <(label "$BEFORE" before) <(label "$AFTER" after) +append -quality 88 "$OUT"
echo "$OUT"
