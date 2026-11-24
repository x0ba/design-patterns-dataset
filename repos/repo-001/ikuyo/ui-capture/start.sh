#!/usr/bin/env bash
# Starts Ikuyo (production SPA build + Laravel API on SQLite) on $PORT via FrankenPHP.
set -euo pipefail
export IKUYO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PORT="${PORT:-4457}"
cd "$IKUYO_ROOT"
mkdir -p "$IKUYO_ROOT/.ui-capture/cache/tmp"
export TMPDIR="$IKUYO_ROOT/.ui-capture/cache/tmp"
export XDG_DATA_HOME="$IKUYO_ROOT/.ui-capture/cache/xdg/data"
export XDG_CONFIG_HOME="$IKUYO_ROOT/.ui-capture/cache/xdg/config"
export APP_URL="http://localhost:$PORT"
# Fresh, deterministic demo data on every start (~2s)
frankenphp php-cli "$IKUYO_ROOT/.ui-capture/seed/seed.php"
exec frankenphp run --config "$IKUYO_ROOT/.ui-capture/Caddyfile" --adapter caddyfile
