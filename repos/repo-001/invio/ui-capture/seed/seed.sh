#!/usr/bin/env bash
# Rebuilds .ui-capture/seed/invio.db: fresh DB -> backend boots (migrations, admin user)
# -> seed_api.mjs loads data via the REST API -> backdate.mjs fixes historical timestamps.
set -euo pipefail
CAP="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(dirname "$CAP")"
export PATH="$CAP/mise/data/shims:$PATH"
WORK="$CAP/seed/work"; rm -rf "$WORK"; mkdir -p "$WORK"
PORT=7491
export ADMIN_USER=admin ADMIN_PASS=invio-demo-2026 JWT_SECRET=seed-placeholder-secret
export DATABASE_PATH="$WORK/invio.db" RATE_LIMIT_ENABLED=false DENO_DIR="$CAP/deno-dir" DENO_NO_UPDATE_CHECK=1
( cd "$ROOT/backend" && BACKEND_PORT=$PORT exec deno run --cached-only --no-lock --config "$CAP/deno.vendor.json" \
    --allow-read --allow-write --allow-net --allow-env --allow-run src/app.ts ) > "$WORK/backend.log" 2>&1 &
BPID=$!
trap 'kill $BPID 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -sf "http://127.0.0.1:$PORT/health" >/dev/null && break; sleep 0.5; done
node "$CAP/seed/seed_api.mjs" "http://127.0.0.1:$PORT"
kill $BPID; wait $BPID 2>/dev/null || true
node "$CAP/seed/backdate.mjs" "$WORK/invio.db" "$CAP/seed/backdate.json"
cp "$WORK/invio.db" "$CAP/seed/invio.db"
# logos uploaded via settings live next to the DB
if [ -d "$WORK/logos" ]; then rm -rf "$CAP/seed/logos"; cp -R "$WORK/logos" "$CAP/seed/logos"; fi
ls "$WORK"
echo "seed DB written to $CAP/seed/invio.db"
