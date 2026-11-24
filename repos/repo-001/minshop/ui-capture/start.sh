#!/usr/bin/env bash
# Serves minshop (Astro SSR build) in Cloudflare's local Workers runtime
# (wrangler dev = production mode, admin gate active) on $PORT (default 4424),
# backed by the pre-seeded local D1/R2/KV state in .ui-capture/state.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-4424}"
UIC="$ROOT/.ui-capture"
mkdir -p "$UIC/logs" "$UIC/xdg"
export XDG_CONFIG_HOME="$UIC/xdg"
export WRANGLER_REGISTRY_PATH="$UIC/xdg/registry"
export WRANGLER_LOG_PATH="$UIC/logs"
export WRANGLER_SEND_METRICS=false
export WRANGLER_HIDE_BANNER=true
export X_LOCAL_OBSERVABILITY=false
export CI=1
# Build once if dist/ is missing (it is normally prebuilt).
[[ -f dist/server/wrangler.json ]] || npx astro build
# Local Stripe stand-in (API + hosted checkout page) on STRIPE_STUB_PORT.
STRIPE_STUB_PORT="${STRIPE_STUB_PORT:-4479}"
node "$UIC/stripe-stub.mjs" "$STRIPE_STUB_PORT" "http://127.0.0.1:$PORT" whsec_local_stub_fernwood &
STUB_PID=$!
trap 'kill $STUB_PID 2>/dev/null || true' EXIT INT TERM
npx wrangler dev -c dist/server/wrangler.json \
  --persist-to "$UIC/state" \
  --var "STRIPE_API_BASE:http://127.0.0.1:$STRIPE_STUB_PORT" \
  --ip 127.0.0.1 --port "$PORT" \
  --show-interactive-dev-session=false
