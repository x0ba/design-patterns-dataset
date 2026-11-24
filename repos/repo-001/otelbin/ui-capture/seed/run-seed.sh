#!/usr/bin/env bash
# Starts the app on a scratch port, seeds short links through /s/new, and saves
# the resulting Redis contents as seed/redis.seed.json (loaded by start.sh).
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo '{}' > "$DIR/seed/redis.seed.json"
PORT=5409 STUB_PORT=5411 "$DIR/start.sh" > "${TMPDIR:-/tmp}/seed-start.log" 2>&1 &
P=$!
for _ in $(seq 1 100); do curl -sf http://localhost:5409/validation/supported-distributions >/dev/null && break; sleep 0.2; done
node "$DIR/seed/seed.js" http://localhost:5409
sleep 0.5
cp "$DIR/data/redis.json" "$DIR/seed/redis.seed.json"
kill $P
wait $P 2>/dev/null || true
echo "seeded $(grep -c '"sl_' "$DIR/seed/redis.seed.json") short links"
