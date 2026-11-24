#!/bin/bash
# Starts MyFin: Dolt (MySQL-compatible, file-based DB in ./db) -> real MyFin API (./api-src) -> web build + /api proxy on $PORT.
HERE="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-4419}"
API_PORT="${API_PORT:-$((PORT + 1))}"
DB_PORT="${DB_PORT:-$((PORT + 2))}"
export DOLT_ROOT_PATH="$HERE/dolt-home"

PIDS=()
cleanup() { trap - EXIT INT TERM; for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done; wait 2>/dev/null; exit 0; }
trap cleanup EXIT INT TERM

# 1) Database (Dolt speaks the MySQL protocol; data lives in .ui-capture/db/myfin)
sed "s/port: 3406/port: $DB_PORT/" "$HERE/dolt-config.yaml" > "$HERE/dolt-config.run.yaml"
cd "$HERE/db"
dolt sql-server --config "$HERE/dolt-config.run.yaml" > "$HERE/dolt.log" 2>&1 &
PIDS+=($!)
for i in $(seq 1 120); do (echo > /dev/tcp/127.0.0.1/$DB_PORT) 2>/dev/null && break; sleep 0.5; done

# 2) MyFin API (unmodified apart from an env-overridable rate limit)
cd "$HERE/api-src"
DATABASE_URL="mysql://myfin:myfinpassword@127.0.0.1:$DB_PORT/myfin" PORT="$API_PORT" RATE_LIMIT_PER_MINUTE=5000 \
  node --import tsx src/server.ts > "$HERE/api.log" 2>&1 &
PIDS+=($!)
for i in $(seq 1 120); do curl -s "http://127.0.0.1:$API_PORT/" >/dev/null 2>&1 && break; sleep 0.5; done

# 3) Web UI (production build in ./out) + /api reverse proxy
cd "$HERE"
PORT="$PORT" API_PORT="$API_PORT" node "$HERE/serve.mjs" &
PIDS+=($!)
wait
