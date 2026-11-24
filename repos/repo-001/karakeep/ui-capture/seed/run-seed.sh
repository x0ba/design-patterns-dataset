#!/usr/bin/env bash
# Rebuilds .ui-capture/data from scratch: migrate, start the app + stubs on a
# side port, seed through the API, then stop them.
set -euo pipefail
UI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$UI/.." && pwd)"
export PORT="${SEED_PORT:-5401}"
source "$UI/env.sh"
export NEXTAUTH_URL="http://localhost:${PORT}" HOSTNAME=127.0.0.1
export SEED_BASE_URL="http://localhost:${PORT}"
export OPENAI_STUB_PORT=5411 MEILI_STUB_PORT=5412
export OPENAI_BASE_URL="http://127.0.0.1:5411/v1" MEILI_ADDR="http://127.0.0.1:5412"

rm -rf "$DATA_DIR" && mkdir -p "$DATA_DIR"
(cd "$ROOT/packages/db" && node --import tsx migrate.ts)
(cd "$ROOT/apps/workers" && node --import tsx scripts/migrateQueue.ts)

SNAP="$UI/seed/snapshot-v0.34.1"
if [ ! -d "$SNAP" ]; then
  mkdir -p "$SNAP" && tar xzf "$ROOT/snapshots/seed-data-v0.34.1.tar.gz" -C "$SNAP"
fi
export SNAPSHOT_DIR="$SNAP"

node "$UI/stubs/server.mjs" > "$UI/seed/stub.log" 2>&1 &
STUB=$!
(cd "$ROOT/apps/web/.next/standalone/apps/web" && exec node server.js) > "$UI/seed/web.log" 2>&1 &
WEB=$!
trap 'kill $WEB $STUB 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -sf "$SEED_BASE_URL/api/health" >/dev/null && break; sleep 1; done

node "$UI/seed/seed.mjs"
# Jobs the API enqueued (crawl/tag/index) are already "done" in the seeded data.
kill $WEB 2>/dev/null || true; sleep 1
sqlite3 "$DATA_DIR/queue.db" "DELETE FROM tasks;" && echo "cleared queued jobs"
