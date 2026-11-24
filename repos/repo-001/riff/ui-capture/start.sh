#!/usr/bin/env bash
# Starts the Riff UI (renderer + real local API server + offline stubs) on $PORT (default 4431).
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-4431}"
# Rebuild seeded storage each start so the UI always opens in the seeded state
node .ui-capture/seed.js >/dev/null
exec node .ui-capture/server.js
