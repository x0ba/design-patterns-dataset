#!/usr/bin/env bash
# Starts Feishin (web build) + the local OpenSubsonic stub server on $PORT (default 4427).
# Prereqs (already done): ./build.sh produced ./web, node seed.mjs produced ./data/library.json.
set -euo pipefail
cd "$(dirname "$0")"
[ -f data/library.json ] || node seed.mjs
export PORT="${PORT:-4427}"
exec node server.mjs
