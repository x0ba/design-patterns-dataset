#!/usr/bin/env bash
# Starts Fluent Reader's renderer in the browser, backed by a local Node server
# that replaces the Electron main process (SQLite, settings store) and stubs the
# outside web (feeds, favicons, images). Runs in the foreground.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/.."
export PORT="${PORT:-4432}"

# Build output must already exist (npm ci --ignore-scripts && npm run build)
if [ ! -f dist/index.js ]; then
    echo "dist/index.js missing; run: npm run build" >&2
    exit 1
fi

# Fresh, deterministic data with dates relative to now
node "$HERE/seed.mjs"
exec node "$HERE/server.mjs"
