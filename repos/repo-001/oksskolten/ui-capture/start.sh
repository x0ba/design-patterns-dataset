#!/usr/bin/env bash
# Starts Oksskolten with everything it needs, in the foreground:
#   stub/stub.mjs   – gateway on $PORT (UI + local favicon/cover images),
#                     an Anthropic-compatible API on $PORT+101 and an in-memory
#                     Meilisearch-compatible API on $PORT+102
#   server/index.ts – the Oksskolten Fastify server on $PORT+100 (sign-in bypassed via AUTH_DISABLED)
# The SQLite DB is re-seeded on every start so relative dates stay fresh.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
UI="$ROOT/.ui-capture"
export PORT="${PORT:-4435}"
# internal ports derive from PORT (4435 -> app 4535, Anthropic stub 4536, Meilisearch stub 4537)
APP_PORT=$((PORT + 100))
ANTHROPIC_PORT=$((PORT + 101))
MEILI_PORT=$((PORT + 102))

rm -rf "$UI/data"
mkdir -p "$UI/data"
DATA_DIR="$UI/data" NODE_ENV=production node --import tsx "$UI/seed/seed.ts"

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

PORT="$PORT" APP_PORT="$APP_PORT" ANTHROPIC_PORT="$ANTHROPIC_PORT" MEILI_PORT="$MEILI_PORT" node "$UI/stub/stub.mjs" &
pids+=($!)

# The app's own local sign-in bypass (AUTH_DISABLED=1, which requires
# NODE_ENV=development): /api/me succeeds and the UI opens signed in, instead
# of answering 401 and showing the login form. NO_SEED=1 keeps the repo's demo
# seed from running (our seed has already populated the DB).
NODE_ENV=development \
AUTH_DISABLED=1 \
NO_SEED=1 \
DATA_DIR="$UI/data" \
PORT="$APP_PORT" \
MEILI_URL="http://127.0.0.1:$MEILI_PORT" \
ANTHROPIC_BASE_URL="http://127.0.0.1:$ANTHROPIC_PORT" \
CRON_SCHEDULE="0 0 1 1 *" \
GIT_COMMIT="7375262" GIT_TAG="v0.5.0" \
node --import tsx server/index.ts &
pids+=($!)

# bash 3.2 (macOS) has no `wait -n`: exit when any child exits
while true; do
  for p in "${pids[@]}"; do
    if ! kill -0 "$p" 2>/dev/null; then echo "process $p exited; shutting down"; exit 1; fi
  done
  sleep 2
done
