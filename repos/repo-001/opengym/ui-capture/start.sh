#!/usr/bin/env bash
# Starts openGym locally: the api (api/server.js, JSON files under a local DATA_DIR) and the web
# front (serve.mjs: frontend/dist + exercise media + /api proxy) on $PORT (default 4448).
# Each start restores the seeded profile from seed-data/ into data/, so the UI opens on the same
# established-user state every time.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
export PORT="${PORT:-4448}"
API_PORT="${API_PORT:-3448}"

rm -rf "$HERE/data"
cp -R "$HERE/seed-data" "$HERE/data"

cd "$REPO/api"
env PORT="$API_PORT" DATA_DIR="$HERE/data" \
  RP_ID=localhost RP_NAME=openGym ORIGIN="http://localhost:$PORT" \
  PASSWORD_LOGIN=1 ALLOW_GUEST=1 NODE_ENV=production \
  VAPID_SUBJECT="mailto:admin@localhost" \
  node server.js &
API_PID=$!
cleanup() { kill $API_PID ${WEB_PID:-} 2>/dev/null || true; }
trap cleanup EXIT
trap 'exit 0' INT TERM HUP ALRM

for i in $(seq 1 50); do
  node -e "fetch('http://127.0.0.1:$API_PORT/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" && break
  sleep 0.2
done

API_PORT="$API_PORT" PORT="$PORT" node "$HERE/serve.mjs" &
WEB_PID=$!
wait $WEB_PID
