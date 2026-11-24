#!/usr/bin/env bash
# Full, reproducible seed: (1) create the admin through Typemill's own /tm/setup form, (2) write content/users/settings/media.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
if [ ! -f settings/users/dkowalski.yaml ]; then
  frankenphp php-server --root "$ROOT" --listen 127.0.0.1:5499 >/dev/null 2>&1 &
  PID=$!; sleep 3
  J=$(mktemp); B=http://127.0.0.1:5499
  curl -s -c "$J" -b "$J" $B/tm/setup >/dev/null
  curl -s -c "$J" -b "$J" -e $B/tm/setup -o /dev/null -w "setup: %{http_code} -> %{redirect_url}\n" \
    -d "username=dkowalski&email=dana.kowalski@ledgerline.io&password=Ledgerline-2026&personal-honey-mail=" $B/tm/setup
  kill $PID; rm -f "$J"
fi
frankenphp php-cli .ui-capture/seed/seed.php
