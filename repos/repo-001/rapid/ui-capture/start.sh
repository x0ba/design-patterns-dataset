#!/usr/bin/env bash
# Starts the Rapid UI (production build) plus all local stubs on $PORT (default 4487), in the foreground.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export PORT="${PORT:-4487}"
[ -f "$HERE/data/world.json" ] || node "$HERE/gen-world.mjs"
exec node "$HERE/stub-server.mjs"
