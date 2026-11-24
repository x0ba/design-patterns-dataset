#!/bin/bash
# Start jetlog (FastAPI + built React UI from ./dist) on $PORT, plus the local adsbdb stub on 4457.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$HERE")"
cd "$REPO"
PORT="${PORT:-4456}"
PY="$HERE/venv/bin/python"

# seed on first run (normally already seeded)
if [ ! -f "$HERE/data/jetlog.db" ]; then
  "$HERE/seed.sh"
fi

export DATA_PATH="$HERE/data" \
       SECRET_KEY="local-placeholder-secret-key-not-for-production" \
       TOKEN_DURATION=30 \
       ENABLE_EXTERNAL_APIS=true \
       ADSBDB_URL="http://localhost:4457"

if curl -s -m 2 -o /dev/null "http://localhost:4457/v0/callsign/UAL1520"; then
  echo "adsbdb stub already listening on 4457, reusing it"
else
  ADSBDB_PORT=4457 "$PY" "$HERE/adsbdb_stub.py" &
  STUB=$!
  trap 'kill $STUB 2>/dev/null || true' EXIT INT TERM
fi

# Header auth (jetlog's AUTH_HEADER feature): local_auth_proxy.py plays the auth proxy and
# signs requests without a token in as dana, so "/" opens straight into the signed-in UI.
export AUTH_HEADER="Remote-User" LOCAL_AUTH_USER="dana"
"$PY" -m uvicorn local_auth_proxy:app --app-dir "$HERE" --host 0.0.0.0 --port "$PORT"
