#!/usr/bin/env bash
# Serves Agora Cosmica (production build + local media mirror + worker stubs)
# on http://localhost:${PORT:-4488}/app in the foreground.
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-4488}"
exec node .ui-capture/server.mjs
