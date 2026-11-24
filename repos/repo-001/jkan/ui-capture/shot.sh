#!/usr/bin/env bash
# usage: shot.sh name path [name path ...]  — serves out/ on 5458 and screenshots at 1440x900
HERE="$(cd "$(dirname "$0")" && pwd)"
CH=~/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell
python3 -m http.server 5458 -d "$HERE/out" >/dev/null 2>&1 & SRV=$!
sleep 1
while [ $# -gt 0 ]; do
  "$CH" --headless --no-sandbox --user-data-dir="$TMPDIR/chr" --window-size=1440,${H:-900} --virtual-time-budget=5000 \
    --screenshot="$TMPDIR/$1.png" "http://localhost:5458$2" >/dev/null 2>&1
  shift 2
done
kill $SRV
