#!/usr/bin/env bash
# Starts exxperts (bundled production server + built web UI) on $PORT with
# its state in .ui-capture/home, plus the local OpenAI-compatible stub.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CAP="$ROOT/.ui-capture"
PORT="${PORT:-4415}"
export HOME="$CAP/home"
export TMPDIR="$CAP/tmp"
mkdir -p "$TMPDIR"
export EXXPERTS_AUTH_TOKEN="uicapture-local-token"
export EXXPERTS_SERVER_BUNDLE=1
export NODE_ENV=production
export STUB_PORT="${STUB_PORT:-4416}"
export STUB_DUMP="${STUB_DUMP:-}"
cd "$ROOT"
if [ -f "$CAP/llm-stub.mjs" ]; then
  node "$CAP/llm-stub.mjs" &
  STUB_PID=$!
  trap 'kill $STUB_PID 2>/dev/null || true' EXIT
fi
exec node bin/exxperts-web.cjs --no-open --port "$PORT"
