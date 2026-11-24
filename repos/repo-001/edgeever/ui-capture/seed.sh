#!/usr/bin/env bash
# Rebuilds ./.ui-capture/seeded-data from scratch through the app's own API.
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/env.sh"
SEED_PORT="${SEED_PORT:-5402}"
rm -rf "$UI_CAPTURE_DIR/seeded-data"
cd "$REPO_ROOT"
EDGE_EVER_DATA_DIR="$UI_CAPTURE_DIR/seeded-data" PORT="$SEED_PORT" bun scripts/self-hosted-server.mjs > "$UI_CAPTURE_DIR/seed-server.log" 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true; wait $SERVER_PID 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -sf "http://127.0.0.1:$SEED_PORT/api/health" >/dev/null && break; sleep 0.5; done
BASE="http://127.0.0.1:$SEED_PORT" bun "$UI_CAPTURE_DIR/seed.mjs"
