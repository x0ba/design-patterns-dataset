#!/usr/bin/env bash
# Starts the local service stubs (Upstash Redis REST + collector validation API)
# and the production OTelBin Next.js server in the foreground on $PORT (default 4409).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
PORT="${PORT:-4409}"

# Fresh copy of the seeded Redis data on every start.
mkdir -p "$UI_CAPTURE_DIR/data"
cp "$UI_CAPTURE_DIR/seed/redis.seed.json" "$UI_CAPTURE_DIR/data/redis.json"

node "$UI_CAPTURE_DIR/stubs/stub-server.js" &
STUB_PID=$!
trap 'kill $STUB_PID 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 50); do
  curl -sf "http://localhost:$STUB_PORT/validation/supported-distributions" >/dev/null && break
  sleep 0.1
done

cd "$UI_CAPTURE_DIR/../packages/otelbin"
./node_modules/.bin/next start -p "$PORT" &
NEXT_PID=$!
trap 'kill $NEXT_PID $STUB_PID 2>/dev/null || true' EXIT INT TERM
wait $NEXT_PID
