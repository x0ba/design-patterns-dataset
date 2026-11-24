#!/usr/bin/env bash
# usage: tools/check.sh <path> <out.png> [waitMs] [evalJs]  -- starts a throwaway server, screenshots, stops it
cd "$(dirname "$0")/.."
P=$((6000 + RANDOM % 2000))
PORT=$P STUB_VERBOSE=1 STUB_TTL=90 node server.mjs > "$PWD/shots/srv.log" 2>&1 &
sleep 0.8
node tools/shot.mjs "http://localhost:$P$1" "$2" "${3:-8000}" "${4:-}"
echo "--- stub 404s (non-tile)"; grep -v "Norder" shots/srv.log | sort | uniq -c | sort -rn | head -20
