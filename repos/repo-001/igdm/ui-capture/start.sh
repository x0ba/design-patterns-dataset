#!/usr/bin/env bash
# Starts IGdm's real main process (under Node, with an Electron shim) plus the
# local Instagram API/CDN stubs, serving the UI at http://localhost:${PORT:-4439}/
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT"
export PORT="${PORT:-4439}"
# build renderer HTML from pug if missing (normally already built)
[ -f browser/index.html ] || node_modules/.bin/gulp html
# fresh seed (timestamps relative to now) + saved session for the seeded account
node "$HERE/seed/generate.js"
exec node "$HERE/server.js"
