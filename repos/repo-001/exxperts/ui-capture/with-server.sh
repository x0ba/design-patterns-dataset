#!/usr/bin/env bash
# Dev helper: start the app (start.sh) on a test port, run a command against
# it, then stop everything. Usage: with-server.sh <cmd...>
set -uo pipefail
CAP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PORT="${TEST_PORT:-5415}"
setsid "$CAP/start.sh" > "$CAP/tmp/server.log" 2>&1 &
PID=$!
for i in $(seq 1 60); do curl -sf "localhost:$PORT/healthz" >/dev/null && break; sleep 1; done
export APP_URL="http://localhost:$PORT" AUTH_TOKEN="uicapture-local-token"
"$@"; RC=$?
kill -- -$PID 2>/dev/null; sleep 1; kill -9 -- -$PID 2>/dev/null
exit $RC
