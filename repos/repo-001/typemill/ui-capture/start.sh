#!/usr/bin/env bash
# Starts Typemill (PHP 8.5 via the static FrankenPHP binary pinned in mise.toml) in the foreground,
# plus a local stub for typemill.net / AI provider calls on STUB_PORT.
# Data (content/, settings/, media/) is already seeded; re-seed with .ui-capture/seed/seed.sh
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-4491}"
STUB_PORT="${STUB_PORT:-4492}"

frankenphp php-server --root "$ROOT/.ui-capture/stubs" --listen "127.0.0.1:$STUB_PORT" >"$ROOT/.ui-capture/stub.log" 2>&1 &
STUB_PID=$!

# Models/ApiCalls.php routes external service calls (typemill.net, OpenAI, Anthropic) here when this is set
export TYPEMILL_SERVICE_STUB_URL="http://127.0.0.1:$STUB_PORT"

frankenphp php-server --root "$ROOT" --listen "0.0.0.0:$PORT" &
APP_PID=$!
trap 'kill $APP_PID $STUB_PID 2>/dev/null; wait' EXIT INT TERM
echo "Typemill running at http://localhost:$PORT/ (editor: /tm/content/visual)"
wait $APP_PID
