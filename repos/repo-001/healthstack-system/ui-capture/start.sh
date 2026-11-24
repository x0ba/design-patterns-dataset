#!/usr/bin/env bash
# Starts HealthStack (Django dev server) plus the local SSLCommerz stub, in the foreground.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PORT="${PORT:-4452}"
STUB_PORT="${SSLCZ_STUB_PORT:-4453}"
export SSLCZ_STUB_PORT="$STUB_PORT"
export SSLCZ_STUB_URL="http://127.0.0.1:$STUB_PORT"
export SSLCZ_STUB_PUBLIC="http://localhost:$STUB_PORT"
export NO_PROXY="localhost,127.0.0.1" no_proxy="localhost,127.0.0.1"
export PYTHONPATH="$HERE:$ROOT"
export DJANGO_SETTINGS_MODULE=ui_settings
export PYTHONUNBUFFERED=1
PY="$HERE/venv/bin/python"

"$HERE/reset_and_seed.sh"
cd "$ROOT"
"$PY" "$HERE/sslcommerz_stub.py" &
STUB_PID=$!
trap 'kill $STUB_PID 2>/dev/null || true' EXIT INT TERM

exec_rc=0
"$PY" manage.py runserver "0.0.0.0:$PORT" --noreload || exec_rc=$?
exit $exec_rc
