#!/usr/bin/env bash
# Starts ZestSend and everything it needs, in the foreground:
#  - the built Worker + Room Durable Object in local workerd (`vite preview`) on an internal port,
#  - the front server on $PORT (4442): local stubs under /__stubs/ (analytics, Cloudflare TURN API)
#    plus a real local STUN/TURN server, and a proxy for everything else to the app,
#  - the scripted remote participant that joins room $ROOM.
# Only $PORT is fixed; internal ports are picked free at start. If any part exits, the script exits.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-4442}"
ROOM="${ZEST_ROOM:-2468}"
APP_PORT="$(node "$ROOT/.ui-capture/free-port.mjs" tcp)"
TURN_PORT="$(node "$ROOT/.ui-capture/free-port.mjs" udp)"
export WRANGLER_SEND_METRICS=false WRANGLER_LOG_PATH="$ROOT/.ui-capture/logs" XDG_CONFIG_HOME="$ROOT/.ui-capture/cache/xdg-config"
export CI=1 NO_UPDATE_NOTIFIER=1
# Placeholder Cloudflare Realtime TURN key; the Worker's TURN API calls go to the local stub.
export TURN_ID="${TURN_ID:-4f1c2b7e9a0d4c6e8b3a5f7d9e1c2a4b}"
export TURN_TOKEN="${TURN_TOKEN:-local-placeholder-turn-api-token}"
cat > "$ROOT/dist/zestsend/.dev.vars" <<VARS
TURN_ID=$TURN_ID
TURN_TOKEN=$TURN_TOKEN
TURN_API_ORIGIN=http://127.0.0.1:$PORT/__stubs/turn
VARS

# Room seats are ephemeral; start every run with an empty Durable Object state.
rm -rf "$ROOT/.wrangler/state"

pids=()
cleanup() { trap - EXIT INT TERM; for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

"$ROOT/node_modules/.bin/vite" preview --host 127.0.0.1 --port "$APP_PORT" --strictPort &
pids+=($!)

PORT="$PORT" APP_PORT="$APP_PORT" TURN_PORT="$TURN_PORT" node "$ROOT/.ui-capture/stub-server.mjs" &
pids+=($!)

ready=0
for _ in $(seq 1 120); do
  for pid in "${pids[@]}"; do kill -0 "$pid" 2>/dev/null || { echo "[start] a component exited during startup" >&2; exit 1; }; done
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/en" \
    && curl -sf -o /dev/null "http://127.0.0.1:$PORT/__stubs/insightflare/script.js" \
    && curl -sf -o /dev/null -X POST -H 'Content-Type: application/json' -d '{"ttl":3600}' "http://127.0.0.1:$PORT/api/turn/credentials"; then
    ready=1; break
  fi
  perl -e 'select(undef,undef,undef,0.5)'
done
perl -e 'select(undef,undef,undef,0.5)'
for pid in "${pids[@]}"; do kill -0 "$pid" 2>/dev/null || { echo "[start] a component exited during startup" >&2; exit 1; }; done
if [ "$ready" != 1 ]; then echo "[start] app did not become ready (page, stubs, TURN credentials)" >&2; exit 1; fi
echo "[start] ZestSend on http://localhost:$PORT/en/room/$ROOM"

ZEST_ORIGIN="http://127.0.0.1:$PORT" ZEST_ROOM="$ROOM" node "$ROOT/.ui-capture/peer/dist/bot.mjs" &
pids+=($!)

while :; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then echo "[start] process $pid exited; stopping" >&2; exit 1; fi
  done
  perl -e 'select(undef,undef,undef,1)'
done
