#!/bin/sh
# Starts Poznote locally: PHP 8.5 (WebAssembly, @php-wasm/node) behind a small
# Node front server that mirrors docker/nginx/default.conf. Serves on $PORT.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
cd "$REPO"
export PORT="${PORT:-4500}"
# Fresh copy of the seeded data volume on every start, so the UI always opens
# in the same established-user state.
if [ -d "$HERE/seed-data" ]; then
  rm -rf "$HERE/data"
  cp -R "$HERE/seed-data" "$HERE/data"
  rm -rf "$HERE/data/sessions"
  mkdir -p "$HERE/data/sessions"
fi
exec node "$HERE/server/server.mjs"
