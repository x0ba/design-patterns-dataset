#!/usr/bin/env bash
# Starts FloCafe's backend without Electron (the repo's own dev-server.js). The Express
# API also serves the static Next.js export in frontend/out, so the UI and API share
# http://localhost:$PORT/. Data lives in .ui-capture/runtime (copied fresh from the
# seeded snapshot in .ui-capture/data on every start).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-4425}"
RUNTIME="$HERE/runtime"

if [ ! -f "$HERE/data/flo.db" ]; then
  echo "[start] no seeded snapshot, seeding first..."
  node "$HERE/seed/seed.cjs"
fi

rm -rf "$RUNTIME"
mkdir -p "$RUNTIME"
cp "$HERE/data/flo.db" "$RUNTIME/flo.db"
for f in "$HERE"/data/*; do
  case "$(basename "$f")" in flo.db|flo.db-wal|flo.db-shm|backups) ;; *) cp -R "$f" "$RUNTIME/" ;; esac
done

# Keep the seeded "today" current if started on a later day.
node "$HERE/seed/shift-dates.cjs" "$RUNTIME/flo.db" || echo "[start] date shift skipped"

export FLO_DEV_USER_DATA="$RUNTIME"
export PORT
export KDS_PORT="${KDS_PORT:-$((PORT + 1))}"
export SERVER_APP_PORT="${SERVER_APP_PORT:-$((PORT + 2))}"
export JWT_SECRET="juniper-rye-local-secret"
export FLO_WHATSAPP_SOCKET_DISABLED=1
export NEXT_TELEMETRY_DISABLED=1

exec node dev-server.js
