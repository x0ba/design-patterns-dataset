#!/usr/bin/env bash
# Starts catai (server + React UI "catai-react") on $PORT (default 4414), fully offline.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
export PORT="${PORT:-4414}"
export CATAI_DIR="$HERE/catai-data"
export CATAI_PORT="$PORT"
export CATAI_OPEN_IN_BROWSER=false
export CATAI_ADMIN_USE=true
# offline: point the model index at the bundled catalog instead of raw.githubusercontent.com
export CATAI_MODEL_INDEX="$ROOT/models.json"
# swap the native LLM runtime (node-llama-cpp) for the local stub
export NODE_OPTIONS="--import=$HERE/stub/register.mjs"

cd "$ROOT/server"
node "$HERE/seed-server.mjs"
exec node ./dist/cli/cli.js serve --ui catai-react
