#!/usr/bin/env bash
# DreamSim score of a render vs the reference. Needs a Python with `dreamsim`:
#   uv venv .venv-art && uv pip install --python .venv-art/bin/python dreamsim pillow
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p .cache
PY="${ART_PY:-.venv-art/bin/python}"
exec "$PY" -I scripts/art-score.py "$@"
