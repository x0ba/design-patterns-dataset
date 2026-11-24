#!/usr/bin/env bash
# Runs start.sh on a test port for N seconds, executing a command meanwhile.
cd "$(dirname "$0")/../.."
SECS=${SECS:-60}
PORT=${TPORT:-5474} IMAGE_COCKPIT_API_PORT=$(( ${TPORT:-5474} + 10 )) .ui-capture/start.sh > "$TMPDIR/srv.log" 2>&1 &
PID=$!
sleep 5
"$@"
kill $PID 2>/dev/null; pkill -P $PID 2>/dev/null; sleep 1
