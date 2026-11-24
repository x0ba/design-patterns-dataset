#!/usr/bin/env bash
# Starts Floe locally: the Upstash REST stub, the signaling server (server/),
# and the Next.js standalone client on $PORT (default 4479). Foreground.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PORT="${PORT:-4479}"
SIGNAL_PORT="${SIGNAL_PORT:-$((PORT + 1))}"
UPSTASH_PORT="${UPSTASH_PORT:-$((PORT + 2))}"
UI_ORIGIN="http://localhost:$PORT"

# Seed the stats store on first run (or if it was deleted).
[ -f "$HERE/data/upstash.json" ] || node "$HERE/seed.js"

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

UPSTASH_STUB_PORT="$UPSTASH_PORT" UPSTASH_STUB_TOKEN=local-upstash-token \
  node "$HERE/stubs/upstash-stub.js" &
pids+=($!)

# Signaling server. Env is given explicitly (server/.env is not used).
# CLIENT_URL lets the UI origin through CORS and the WebSocket origin check.
# No TURN credentials: the server hands out its built-in STUN list, and peers on
# this machine connect over host candidates.
(cd "$ROOT/server" && \
  PORT="$SIGNAL_PORT" NODE_ENV=production TRUSTED_PROXY_COUNT=0 \
  CLIENT_URL="$UI_ORIGIN" \
  POLICY_FILE="$HERE/policy.json" \
  UPSTASH_REDIS_REST_URL="http://127.0.0.1:$UPSTASH_PORT" \
  UPSTASH_REDIS_REST_TOKEN=local-upstash-token \
  MAX_CONNECTIONS_PER_IP=600 MAX_SOCKETS_PER_IP=600 MAX_CODE_REQUESTS_PER_IP=600 MAX_TURN_REQUESTS_PER_IP=600 \
  exec node server.js) &
pids+=($!)

# Client: SOCKET_URL is read at request time by /api/config.
cd "$ROOT/client/.next/standalone"
PORT="$PORT" HOSTNAME=0.0.0.0 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
  SOCKET_URL="http://localhost:$SIGNAL_PORT" \
  NEXT_PUBLIC_SITE_URL="$UI_ORIGIN" \
  node server.js
