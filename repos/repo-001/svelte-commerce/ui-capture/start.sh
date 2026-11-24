#!/usr/bin/env bash
# Starts the Litekart API stub (127.0.0.1:${STUB_PORT:-4422}) and the SvelteKit production server on $PORT.
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-4421}"
export STUB_PORT="${STUB_PORT:-4422}"
export HOST="${HOST:-0.0.0.0}"
export ORIGIN="${ORIGIN:-http://localhost:$PORT}"
export NODE_ENV=production
# Storefront → local Litekart stub (instead of https://api.litekart.in)
export PUBLIC_LITEKART_API_URL="http://127.0.0.1:$STUB_PORT"
export PUBLIC_LITEKART_DOMAIN="localhost"
export PUBLIC_LITEKART_STORE_ID="store_northfield"
export PUBLIC_LOGIN_TYPE="EMAIL"
export PUBLIC_SITEMAP_URL="http://127.0.0.1:$STUB_PORT/sitemap"
[ -f .ui-capture/stub/db.json ] || node .ui-capture/stub/seed.mjs
node .ui-capture/stub/server.mjs &
STUB_PID=$!
APP_PID=""
cleanup() { kill $STUB_PID $APP_PID 2>/dev/null || true; }
trap cleanup EXIT INT TERM
for i in $(seq 1 50); do
  curl -sf "http://127.0.0.1:$STUB_PORT/api/stores/public-details" >/dev/null 2>&1 && break
  sleep 0.1
done
node --import ./.ui-capture/node-require-shim.mjs build/index.js &
APP_PID=$!
# Stay in the foreground until either process exits (portable to bash 3.2: no `wait -n`).
while kill -0 $STUB_PID 2>/dev/null && kill -0 $APP_PID 2>/dev/null; do sleep 1; done
