#!/usr/bin/env bash
# Serves Mini Map Macau (production build + LRT API + local stubs) on $PORT.
set -euo pipefail
cd "$(dirname "$0")"
export PORT="${PORT:-4461}"
exec node stub-server.mjs
