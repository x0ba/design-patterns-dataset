#!/usr/bin/env bash
# Starts the local AI stub and the QMReader server (foreground) on $PORT (default 4436).
# The database is re-seeded on every start (~1s) so the feed timeline stays relative to "now".
set -euo pipefail
UI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$UI_DIR/.." && pwd)"
source "$UI_DIR/env.sh"
export PORT="${PORT:-4436}"
export HOST=127.0.0.1
cd "$REPO"
NODE_OPTIONS="--no-warnings" node "$UI_DIR/seed/seed.cjs"
node "$UI_DIR/stubs/ai-stub.cjs" &
STUB_PID=$!
trap 'kill $STUB_PID 2>/dev/null || true' EXIT INT TERM
node server.js
