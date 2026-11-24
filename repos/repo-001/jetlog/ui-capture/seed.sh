#!/bin/bash
# Rebuild the seeded database in .ui-capture/data/jetlog.db from scratch.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$HERE")"
cd "$REPO"
PY="$HERE/venv/bin/python"
SEED_PORT="${SEED_PORT:-5456}"

"$PY" "$HERE/gen_data.py"
rm -rf "$HERE/data" && mkdir -p "$HERE/data"

export DATA_PATH="$HERE/data" SECRET_KEY="local-placeholder-secret-key-not-for-production" \
       TOKEN_DURATION=7 ENABLE_EXTERNAL_APIS=true ADSBDB_URL="http://localhost:4457"
"$PY" -m uvicorn main:app --app-dir server --host 127.0.0.1 --port "$SEED_PORT" --log-level warning &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
for i in $(seq 1 50); do
  curl -sf "http://127.0.0.1:$SEED_PORT/config" >/dev/null && break
  sleep 0.2
done
"$PY" "$HERE/seed.py" "http://127.0.0.1:$SEED_PORT"
