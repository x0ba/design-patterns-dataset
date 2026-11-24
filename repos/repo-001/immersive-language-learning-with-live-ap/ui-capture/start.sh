#!/bin/bash
# Starts Immergo (FastAPI server + production build) with local stubs on $PORT (default 4446).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT"
export PORT="${PORT:-4446}"
set -a; . "$HERE/env.local"; set +a
export PYTHONUNBUFFERED=1
# Build once if dist/ is missing (normally prebuilt by .ui-capture/build.sh)
if [ ! -f dist/index.html ] || ! grep -q seed-prefs dist/index.html; then
  "$HERE/build.sh"
fi
exec "$ROOT/venv/bin/python" "$HERE/run.py"
