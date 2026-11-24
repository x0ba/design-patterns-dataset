#!/usr/bin/env bash
# Starts the local Deutsche Bahn API stub and the BetterBahn production server (foreground).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
export PORT="${PORT:-4454}"
STUB_PORT="${STUB_PORT:-4455}"
export TZ=Europe/Berlin
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export HOSTNAME=0.0.0.0
# everything is local: don't route the app's server-side fetches through a proxy
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
export NO_PROXY="localhost,127.0.0.1"
# point the app's DB integrations at the stub
export DB_VENDO_BASE_URL="http://127.0.0.1:${STUB_PORT}"
export BAHN_WEB_BASE_URL="http://127.0.0.1:${STUB_PORT}"

if [ ! -f .next/standalone/server.js ]; then
  echo "standalone build missing - run .ui-capture/build.sh first" >&2
  exit 1
fi

STUB_PORT="$STUB_PORT" node "$ROOT/.ui-capture/stub/server.mjs" &
STUB_PID=$!
cd .next/standalone
node server.js &
APP_PID=$!
trap 'kill $APP_PID $STUB_PID 2>/dev/null || true' EXIT INT TERM
wait $APP_PID
