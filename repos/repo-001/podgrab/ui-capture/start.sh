#!/usr/bin/env bash
# Starts the local stub (feeds, artwork, audio, search APIs) and Podgrab on $PORT.
set -uo pipefail
UI="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$UI")"
PORT="${PORT:-4429}"
STUB_PORT=4430   # feed/artwork URLs stored in the seeded DB point here
cd "$ROOT"
STUB_PORT=$STUB_PORT "$UI/bin/stub" &
STUB_PID=$!
export CONFIG="$UI/data/config" DATA="$UI/data/assets" CHECK_FREQUENCY=240 GIN_MODE=release PORT
export ITUNES_BASE_URL="http://localhost:$STUB_PORT/itunes"
export PODCASTINDEX_BASE_URL="http://localhost:$STUB_PORT/podcastindex/"
export GPODDER_BASE_URL="http://localhost:$STUB_PORT/gpodder"
"$UI/bin/podgrab" &
APP_PID=$!
trap 'kill $APP_PID $STUB_PID 2>/dev/null; wait; exit 0' INT TERM
trap 'kill $APP_PID $STUB_PID 2>/dev/null' EXIT
wait $APP_PID
