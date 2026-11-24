#!/usr/bin/env bash
# Serves the YomiNinja UI (Next.js static export) plus a local stand-in for the
# Electron main process's socket.io IPC transport, on $PORT (default 4444).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PORT="${PORT:-4444}"
# Re-seed if the data file is missing (seed is deterministic apart from generated ids).
if [ ! -f "$HERE/data/db.json" ]; then node "$HERE/seed.js"; fi
exec node "$HERE/server.js"
