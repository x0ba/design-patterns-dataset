#!/usr/bin/env bash
# Starts MiroTalk P2P for offline UI capture: OpenAI stub, MiroTalk server, seeded meeting participants, front proxy on $PORT.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

export PORT_PUBLIC="${PORT:-4438}"
UPSTREAM_PORT="${UPSTREAM_PORT:-$((PORT_PUBLIC + 1))}"

# Same as `npm run prestart`
test -f app/src/config.js || cp app/src/config.template.js app/src/config.js

set -a
# shellcheck disable=SC1091
source "$HERE/app.env"
set +a
export HOST="http://localhost:${PORT_PUBLIC}"
export OPENAI_STUB_PORT="${OPENAI_STUB_PORT:-$((PORT_PUBLIC + 12))}"
export CHATGPT_BASE_PATH="http://127.0.0.1:${OPENAI_STUB_PORT}/v1/"

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT
trap 'cleanup; exit 0' INT TERM HUP ALRM

node "$HERE/openai-stub.js" & pids+=($!)
PORT="$UPSTREAM_PORT" node app/src/server.js & pids+=($!)

# wait for the server
for i in $(seq 1 60); do
  if curl -fs "http://127.0.0.1:${UPSTREAM_PORT}/stats" >/dev/null 2>&1 || curl -fs "http://127.0.0.1:${UPSTREAM_PORT}/" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

# meeting participants (socket.io + WebRTC data channels) that make the rooms look in use
SIGNALING_URL="http://127.0.0.1:${UPSTREAM_PORT}" node "$HERE/seed-rooms.js" & pids+=($!)

PORT="$PORT_PUBLIC" UPSTREAM_PORT="$UPSTREAM_PORT" node "$HERE/proxy.js" & pids+=($!)
wait "${pids[${#pids[@]}-1]}"
