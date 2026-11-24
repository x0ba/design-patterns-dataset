#!/usr/bin/env bash
# Starts ALL SET (Cloudflare Worker + built Svelte UI) locally in workerd via wrangler dev,
# plus the local exchange-rate stub. Local D1 (SQLite) state in .ui-capture/state is pre-seeded (seed.sh).
set -uo pipefail
ulimit -n 10240 2>/dev/null || true
cd "$(dirname "$0")"
PORT="${PORT:-4420}"
export XDG_CONFIG_HOME="$PWD/.wrangler-config"
export WRANGLER_SEND_METRICS=false
export CI=1
node stub-server.mjs 4421 &
STUB=$!
../node_modules/.bin/wrangler dev \
  -c wrangler.capture.toml \
  --persist-to state \
  --ip 127.0.0.1 \
  --port "$PORT" \
  --show-interactive-dev-session=false &
DEV=$!
cleanup() { kill "$DEV" "$STUB" 2>/dev/null || true; wait "$DEV" 2>/dev/null; }
trap cleanup EXIT INT TERM
wait "$DEV"
