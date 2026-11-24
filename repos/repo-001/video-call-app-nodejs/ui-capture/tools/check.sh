#!/bin/sh
# usage: check.sh <path> <out.png> <fakecam 0|1> <openchat 0|1>  — runs start.sh on 5441, screenshots, stops it
cd "$(dirname "$0")/../.."
PORT=5441 ./.ui-capture/start.sh > /tmp/claude/pw/app.log 2>&1 &
SP=$!
sleep 2.5
TMPDIR=/tmp/claude/pw node .ui-capture/tools/shot.js "http://localhost:5441$1" "$2" "$3" "$4"
kill $SP; sleep 0.5; pkill -P $SP 2>/dev/null
cat /tmp/claude/pw/app.log
