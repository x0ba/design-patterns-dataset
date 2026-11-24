#!/usr/bin/env bash
# Rebuilds .ui-capture/state from scratch: migrations -> generated SQL -> API-seeded data -> sync job state.
set -euo pipefail
cd "$(dirname "$0")"
export XDG_CONFIG_HOME="$PWD/.wrangler-config" WRANGLER_SEND_METRICS=false CI=1
W=../node_modules/.bin/wrangler
SEED_PORT="${SEED_PORT:-5433}"
rm -rf state
$W d1 migrations apply DB --local -c wrangler.capture.toml --persist-to state > /dev/null
node generate-seed.mjs > seed.sql
$W d1 execute DB --local -c wrangler.capture.toml --persist-to state --file seed.sql > /dev/null
# Start the app briefly to seed through its own API.
$W dev -c wrangler.capture.toml --persist-to state --ip 127.0.0.1 --port "$SEED_PORT" --show-interactive-dev-session=false > "${TMPDIR:-/tmp}/seed-dev.log" 2>&1 &
DEV=$!
trap 'kill $DEV 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -sf "http://127.0.0.1:$SEED_PORT/api/runtime" > /dev/null && break; sleep 1; done
node api-seed.mjs "http://127.0.0.1:$SEED_PORT"
kill $DEV; wait $DEV 2>/dev/null || true
trap - EXIT
$W d1 execute DB --local -c wrangler.capture.toml --persist-to state --file post.sql > /dev/null
echo "seed complete"
