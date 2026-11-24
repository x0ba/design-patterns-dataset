#!/usr/bin/env bash
# One-time build (needs network for npm): installs deps, builds server + React UI,
# and places the UI (plus the browser-data seed page) where the server serves it.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT" && mise install
cd "$ROOT/server" && npm ci --ignore-scripts && npm run build
cd "$ROOT/clients/catai-react" && npm ci && npm run build
rm -rf "$ROOT/server/www/catai-react"
mkdir -p "$ROOT/server/www"
cp -r "$ROOT/clients/catai-react/dist" "$ROOT/server/www/catai-react"
node "$HERE/browser-seed/generate.mjs" "$ROOT/server/www/catai-react"
