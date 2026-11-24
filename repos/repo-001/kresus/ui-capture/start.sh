#!/bin/bash
# Starts Kresus (production build, SQLite DB, woob + sendmail stubs) on $PORT (default 4417).
set -e
UI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$UI/.."
source "$UI/env.sh"
export PORT="${PORT:-4417}"
if [ ! -f "$KRESUS_DB_SQLITE_PATH" ]; then
    echo "No database found, seeding first..."
    "$UI/reseed.sh"
fi
exec node bin/kresus.js
