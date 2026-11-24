#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(dirname "$HERE")"
PORT="${PORT:-4489}"
export HOME="$HERE/home"
export NODE_OPTIONS="--import $HERE/home-shim.mjs ${NODE_OPTIONS:-}"
export OTEL_SDK_DISABLED=true
export OK_NO_UPDATE_CHECK=1
export NO_UPDATE_NOTIFIER=1
mkdir -p "$HOME"
cd "$HERE/workspace/tidewater-eng"
exec node "$REPO/packages/cli/dist/cli.mjs" start --port "$PORT" --no-open-browser --idle-shutdown off
