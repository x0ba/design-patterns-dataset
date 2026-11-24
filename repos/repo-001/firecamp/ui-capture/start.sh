#!/usr/bin/env bash
# Starts the Firecamp web UI together with the local stub of the Firecamp Cloud API (REST + socket.io).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PORT="${PORT:-4406}"
# fresh, deterministic seed data on every start
node "$HERE/seed/generate.js" "$HERE/data/db.json"
exec node "$HERE/stub-server/server.js"
