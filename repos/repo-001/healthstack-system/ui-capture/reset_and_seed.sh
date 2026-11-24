#!/usr/bin/env bash
# Rebuild the working DB from the repo's bundled db.sqlite3 and seed it (dates relative to today).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
mkdir -p "$HERE/data"
cp "$ROOT/db.sqlite3" "$HERE/data/db.sqlite3.tmp"
cd "$ROOT"
PYTHONPATH="$HERE:$ROOT" DJANGO_SETTINGS_MODULE=ui_settings UI_DB_PATH="$HERE/data/db.sqlite3.tmp" \
  "$HERE/venv/bin/python" manage.py migrate --noinput >/dev/null
PYTHONPATH="$HERE:$ROOT" DJANGO_SETTINGS_MODULE=ui_settings UI_DB_PATH="$HERE/data/db.sqlite3.tmp" \
  "$HERE/venv/bin/python" "$HERE/seed.py"
mv "$HERE/data/db.sqlite3.tmp" "$HERE/data/db.sqlite3"
