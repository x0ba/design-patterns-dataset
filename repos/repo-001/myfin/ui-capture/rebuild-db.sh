#!/bin/bash
# Rebuilds the MyFin database from scratch and seeds it through the app's own API.
#   1. fresh Dolt repo in ./db/myfin + MySQL user myfin/myfinpassword
#   2. `prisma migrate deploy` (the API's own migrations)
#   3. starts the full stack (start.sh) on a test port, regenerates seed-backup.json and runs seed.mjs
# Usage: ./rebuild-db.sh   (needs no network; everything is already installed)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
export DOLT_ROOT_PATH="$HERE/dolt-home"
TEST_PORT=5619
DB_PORT=$((TEST_PORT + 2))

rm -rf "$HERE/db"
mkdir -p "$HERE/db/myfin"
(cd "$HERE/db/myfin" && dolt init >/dev/null)

sed "s/port: 3406/port: $DB_PORT/" "$HERE/dolt-config.yaml" > "$HERE/dolt-config.rebuild.yaml"
cd "$HERE/db"
dolt sql-server --config "$HERE/dolt-config.rebuild.yaml" > "$HERE/dolt-rebuild.log" 2>&1 &
DPID=$!
for i in $(seq 1 120); do (echo > /dev/tcp/127.0.0.1/$DB_PORT) 2>/dev/null && break; sleep 0.5; done
dolt --host 127.0.0.1 --port $DB_PORT --no-tls -u root -p "" sql -q \
  "CREATE USER IF NOT EXISTS 'myfin'@'%' IDENTIFIED BY 'myfinpassword'; GRANT ALL ON *.* TO 'myfin'@'%';"
(cd "$HERE/api-src" && DATABASE_URL="mysql://myfin:myfinpassword@127.0.0.1:$DB_PORT/myfin" npx prisma migrate deploy)
kill $DPID; wait $DPID 2>/dev/null || true

PORT=$TEST_PORT "$HERE/start.sh" > "$HERE/rebuild-stack.log" 2>&1 &
SPID=$!
for i in $(seq 1 240); do curl -s "http://127.0.0.1:$((TEST_PORT + 1))/" >/dev/null 2>&1 && break; sleep 0.5; done
node "$HERE/gen-seed.mjs"
node "$HERE/seed.mjs" "http://127.0.0.1:$((TEST_PORT + 1))"
kill $SPID; wait $SPID 2>/dev/null || true
echo "Database rebuilt and seeded."
