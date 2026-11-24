#!/usr/bin/env bash
# Starts Ribbon (production build) plus local stubs on $PORT (default 4482), in the foreground.
set -euo pipefail
cd "$(dirname "$0")"
[ -f ../dist/index.html ] || { echo "dist/ missing - run .ui-capture/build.sh first" >&2; exit 1; }
[ -d store ] || node seed.mjs
exec node server.mjs
