#!/usr/bin/env bash
# Rebuild the seeded database from scratch: migrate, bootstrap accounts, seed via the Web API.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$HERE")"
export ALTERO_CONFIG="$HERE/config.py"
cd "$ROOT"
rm -rf "$HERE/data"; mkdir -p "$HERE/data"
.venv/bin/alembic upgrade head >/dev/null 2>&1
.venv/bin/python "$HERE/bootstrap.py"
SEED_PORT="${SEED_PORT:-5404}"
ALTERO_PORT=$SEED_PORT .venv/bin/altero serve > "$HERE/data/seed-server.log" 2>&1 &
PID=$!; trap 'kill $PID 2>/dev/null' EXIT
for i in $(seq 1 30); do curl -sf "http://127.0.0.1:$SEED_PORT/health" >/dev/null && break; sleep 0.5; done
.venv/bin/python "$HERE/seed.py" "http://127.0.0.1:$SEED_PORT"
.venv/bin/python "$HERE/extras.py"
