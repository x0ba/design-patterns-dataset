#!/usr/bin/env bash
# Serves the app on http://localhost:$PORT (default 4486). front.js runs the stub API in-process,
# starts `next start` on a free internal port, and routes /api/v1 + /ghost to the stub, the rest to Next.
# Only $PORT needs to be free.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PORT="${PORT:-4486}"
export NEXT_TELEMETRY_DISABLED=1
[ -f .ui-capture/stub/db.json ] || node .ui-capture/stub/seed.js
exec node .ui-capture/front.js
