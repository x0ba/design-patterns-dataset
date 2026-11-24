#!/bin/bash
# Recreates the SQLite DB from scratch: boots Kresus on a side port, imports the
# generated data through POST /api/all/import, then stops it.
set -e
UI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$UI/.."
source "$UI/env.sh"
rm -f "$KRESUS_DB_SQLITE_PATH"
mkdir -p "$KRESUS_DIR"
SEED_PORT=5499
PORT=$SEED_PORT node bin/kresus.js > "$UI/data/seed-server.log" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for i in $(seq 1 120); do
    curl -s -o /dev/null "http://127.0.0.1:$SEED_PORT/api/all" && break
    sleep 0.5
done
node "$UI/seed.js" "http://127.0.0.1:$SEED_PORT"
kill $PID; wait $PID 2>/dev/null || true
