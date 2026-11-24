#!/bin/sh
# Starts the video-call app (its own Express + socket.io server) on $PORT plus
# the stub participants that sit in the seeded room. Runs in the foreground.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PORT="${PORT:-4441}"
export SEED_ROOM="Tidewater_Weekly Sync_2813309571"
export SEED_USER="Sam Okafor"
node -r ./.ui-capture/dev-entry.js src/app.js &
APP_PID=$!
trap 'kill $APP_PID $BOT_PID 2>/dev/null' INT TERM EXIT
# wait for the server to accept connections
i=0
until node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/',r=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; do
  i=$((i+1)); [ $i -gt 100 ] && echo "app did not start" && exit 1; sleep 0.1
done
echo "app listening on http://localhost:$PORT/"
node ./.ui-capture/participants.js &
BOT_PID=$!
wait $APP_PID
