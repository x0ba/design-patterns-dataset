#!/usr/bin/env bash
# Starts altero (FastAPI + built Vue interface at /app/) behind a small local
# auto sign-in proxy, serving the UI at http://localhost:$PORT/ (default 4404).
# Everything is pre-installed, built and seeded; SQLite DB and attachment files
# live in .ui-capture/data. No outbound network is used (SMTP disabled -> log).
#
#   browser -> :$PORT autologin_proxy.py (signs in as hlindqvist via /web/auth/login
#              when the browser has no session) -> :$ALTERO_INTERNAL_PORT altero
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
export PATH="$HERE/mise/data/shims:$PATH"
export PORT="${PORT:-4404}"
INTERNAL="${ALTERO_INTERNAL_PORT:-$((PORT + 10000))}"
export ALTERO_CONFIG="$HERE/config.py"
export ALTERO_HOST="127.0.0.1"
cd "$ROOT"
# Idempotent: brings the schema to head if anything changed.
"$ROOT/.venv/bin/alembic" upgrade head >/dev/null 2>&1 || true

PROXY_PID=""
ALTERO_PID=""
cleanup() {
  trap - EXIT INT TERM
  [ -n "$PROXY_PID" ] && kill "$PROXY_PID" 2>/dev/null || true
  [ -n "$ALTERO_PID" ] && kill "$ALTERO_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ALTERO_PORT="$INTERNAL" "$ROOT/.venv/bin/altero" serve &
ALTERO_PID=$!
for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$INTERNAL/health" >/dev/null 2>&1 && break
  kill -0 $ALTERO_PID 2>/dev/null || { echo "altero exited during startup" >&2; exit 1; }
  sleep 0.5
done

"$ROOT/.venv/bin/python" "$HERE/autologin_proxy.py" "$PORT" "$INTERNAL" \
  hlindqvist 'Lindqvist-Coast-2026' &
PROXY_PID=$!

# Stay in the foreground until either process exits (or we are signalled);
# the trap then stops the other one. Polling keeps this portable to bash 3.2.
while kill -0 "$PROXY_PID" 2>/dev/null && kill -0 "$ALTERO_PID" 2>/dev/null; do
  sleep 1
done
