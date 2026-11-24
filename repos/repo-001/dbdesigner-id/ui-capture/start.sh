#!/bin/sh
# Starts the dbdesigner.id backend (Express + SQLite), which also serves the built Vue UI.
# Everything is pre-installed/pre-built/pre-seeded (see setup.sh, seed.js). No network needed.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
[ -f .env ] || cp "$ROOT/.ui-capture/backend.env" .env
# restore the seeded databases if they're missing (seed.js keeps pristine copies)
for db in compute_engine utility; do
  [ -f "storage/database/$db.db" ] || cp "$ROOT/.ui-capture/seeded-db/$db.db" "storage/database/$db.db"
done
export PORT="${PORT:-4410}"
export APP_URL="http://localhost:$PORT"
exec node app.js
