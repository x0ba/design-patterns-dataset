#!/usr/bin/env bash
# Starts selfoss (PHP via FrankenPHP) on $PORT (default 4433), in the foreground.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export PORT="${PORT:-4433}"
export SELFOSS_ROOT="$ROOT"
export XDG_CONFIG_HOME="$HERE/cache/xdg-config" XDG_DATA_HOME="$HERE/cache/xdg-data"
mkdir -p "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$ROOT/data/sqlite" "$ROOT/data/logs" "$ROOT/data/cache"

# Restore the seeded database + favicons/thumbnails snapshot so every start looks the same.
if [ -f "$HERE/seed/selfoss.db" ] && [ "${SELFOSS_KEEP_DB:-0}" != 1 ]; then
	cp "$HERE/seed/selfoss.db" "$ROOT/data/sqlite/selfoss.db"
	rm -f "$ROOT/data/sqlite/selfoss.db-wal" "$ROOT/data/sqlite/selfoss.db-shm"
	cp -f "$HERE"/seed/favicons/* "$ROOT/data/favicons/" 2>/dev/null || true
	cp -f "$HERE"/seed/thumbnails/* "$ROOT/data/thumbnails/" 2>/dev/null || true
fi

# PHP ini overrides: keep temp/lock/session files inside the repo (/tmp isn't writable here).
export TMPDIR="$HERE/cache/tmp"
mkdir -p "$TMPDIR/sessions" "$HERE/cache/php-conf.d"
sed "s|@TMP@|$TMPDIR|g" "$HERE/php/selfoss.ini.in" > "$HERE/cache/php-conf.d/selfoss.ini"
export PHP_INI_SCAN_DIR="$HERE/cache/php-conf.d"

cd "$ROOT"
exec frankenphp run --config "$HERE/Caddyfile" --adapter caddyfile
