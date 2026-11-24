#!/bin/sh
# Starts Fusion (single binary, embedded UI, SQLite) on $PORT plus the local favicon stub.
# The database is re-created and re-seeded on every start so timestamps are relative to "now".
set -eu
UC=$(cd "$(dirname "$0")" && pwd)
cd "$UC"
PORT=${PORT:-4434}
DATA="$UC/data"
DB="$DATA/fusion.db"
mkdir -p "$DATA"
rm -f "$DB" "$DB-wal" "$DB-shm"

# Fusion's documented no-auth mode: empty password + FUSION_ALLOW_EMPTY_PASSWORD (and no OIDC)
# disables API auth, so the UI opens straight into the reader without a login wall.
export FUSION_PASSWORD=""
export PASSWORD=""                     # legacy fallback var; keep it empty too
export FUSION_ALLOW_EMPTY_PASSWORD=true
unset FUSION_OIDC_ISSUER
export FUSION_DB_PATH="$DB"
export FUSION_LOG_FORMAT=text
export FUSION_LOG_LEVEL=WARN

# 1) Boot once so Fusion applies its own schema migrations (they run before it binds), then stop it.
FUSION_PORT=${MIGRATE_PORT:-5499} ./bin/fusion &
mig=$!
i=0
until node "$UC/seed/schema-ready.mjs" "$DB" "$UC/../backend/internal/store/migrations"; do
  i=$((i+1)); [ $i -gt 100 ] && { echo "fusion migrations did not complete" >&2; kill $mig 2>/dev/null; exit 1; }
  perl -e 'select(undef,undef,undef,0.1)'
done
kill $mig 2>/dev/null || true; wait $mig 2>/dev/null || true

# 2) Seed realistic data directly through the schema.
node "$UC/seed/seed.mjs" "$DB"

# 3) Favicon stub (stands in for google.com/s2/favicons) + the app itself.
node "$UC/favicon-stub.mjs" &
stub=$!
FUSION_PORT=$PORT ./bin/fusion &
app=$!
trap 'kill $app $stub 2>/dev/null || true' INT TERM EXIT
wait $app
