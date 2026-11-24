#!/usr/bin/env bash
# Starts hevy2garmin's Next.js dashboard (production build in web/.next) with:
#   - an in-memory PGlite Postgres, seeded on boot (pg/pg-server.mjs)
#   - a local Hevy API stub (hevy-stub.mjs)
# and serves the UI on http://localhost:${PORT:-4451}/
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-4451}"
PG_PORT="${PG_PORT:-54329}"
HEVY_STUB_PORT="${HEVY_STUB_PORT:-54330}"
export PG_PORT HEVY_STUB_PORT

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

wait_port() {
  for _ in $(seq 1 150); do
    node -e "require('net').connect($1,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" && return 0
    sleep 0.2
  done
  echo "port $1 did not open" >&2; exit 1
}

node "$HERE/pg/pg-server.mjs" & pids+=($!)
node "$HERE/hevy-stub.mjs" & pids+=($!)
wait_port "$PG_PORT"
wait_port "$HEVY_STUB_PORT"

cd "$ROOT/web"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export DATABASE_URL="postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres?sslmode=disable&max=1"
export H2G_PASSWORD="liftheavy2026"
export HEVY2GARMIN_SECRET="local-ui-capture-session-secret-0123456789abcdef"
export CRON_SECRET="local-ui-capture-cron-secret-0123456789abcdef"
export HEVY_API_KEY_URL="http://127.0.0.1:${HEVY_STUB_PORT}/v1"
export GITHUB_REPO="mkowalski-lifts/hevy2garmin"
export H2G_UPDATE_CHECK=off
export DEMO_MODE=false
node node_modules/next/dist/bin/next start --port "$PORT" --hostname 0.0.0.0 & pids+=($!)
wait "${pids[@]: -1}"
