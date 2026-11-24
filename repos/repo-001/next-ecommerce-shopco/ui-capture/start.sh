#!/usr/bin/env bash
# Serves the pre-built Shopco Next.js app (production mode) on $PORT (default 4423).
# No external services are used; the cart seed is a static JSON under public/.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/.ui-capture/mise/data/shims:$PATH"
export NEXT_TELEMETRY_DISABLED=1
PORT="${PORT:-4423}"
exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p "$PORT"
