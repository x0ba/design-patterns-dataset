#!/usr/bin/env bash
# Rebuilds .ui-capture/data from scratch: starts the stub + app on a side port,
# drives the app's API with ./bin/seed, then stops both.
set -euo pipefail
UI="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$UI")"
STUB_PORT=4430
SEED_PORT=5432
rm -rf "$UI/data"
mkdir -p "$UI/data/config" "$UI/data/assets"
cd "$ROOT"
STUB_PORT=$STUB_PORT "$UI/bin/stub" > "$UI/data/stub-seed.log" 2>&1 &
STUB_PID=$!
CONFIG="$UI/data/config" DATA="$UI/data/assets" CHECK_FREQUENCY=600 GIN_MODE=release PORT=$SEED_PORT \
  ITUNES_BASE_URL="http://localhost:$STUB_PORT/itunes" PODCASTINDEX_BASE_URL="http://localhost:$STUB_PORT/podcastindex/" \
  GPODDER_BASE_URL="http://localhost:$STUB_PORT/gpodder" \
  "$UI/bin/podgrab" > "$UI/data/app-seed.log" 2>&1 &
APP_PID=$!
trap 'kill $APP_PID $STUB_PID 2>/dev/null || true' EXIT
for i in $(seq 1 50); do curl -sf "http://localhost:$SEED_PORT/" >/dev/null && break; sleep 0.2; done
"$UI/bin/seed" "http://localhost:$SEED_PORT" "http://localhost:$STUB_PORT" "$UI/data/config/podgrab.db"
kill $APP_PID; wait $APP_PID 2>/dev/null || true
