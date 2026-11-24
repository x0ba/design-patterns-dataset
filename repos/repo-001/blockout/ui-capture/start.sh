#!/usr/bin/env bash
# Start Blockout's renderer in browser mode on $PORT (default 4474):
# re-seeds .ui-capture/data from the seed generator, then runs the local
# server that serves out/renderer and implements the Electron IPC surface.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export PORT="${PORT:-4474}"
node "$HERE/seed/dist/seed.mjs" "$HERE/data"
exec node "$HERE/server.mjs"
