#!/usr/bin/env bash
# Installs backend PHP deps from backend/composer.lock. api.github.com is not
# reachable from the sandbox, so dist URLs are temporarily rewritten to
# codeload.github.com (same zip contents), then the lockfile is restored.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
export COMPOSER_HOME="$ROOT/.ui-capture/cache/composer-home"
export COMPOSER_CACHE_DIR="$ROOT/.ui-capture/cache/composer"
cp composer.lock "$ROOT/.ui-capture/cache/composer.lock.orig"
trap 'cp "$ROOT/.ui-capture/cache/composer.lock.orig" composer.lock' EXIT
sed -E -i '' 's#https://api\.github\.com/repos/([^/]+)/([^/]+)/zipball/([0-9a-f]+)#https://codeload.github.com/\1/\2/legacy.zip/\3#g' composer.lock
frankenphp php-cli "$ROOT/.ui-capture/bin/composer.phar" install --no-interaction --prefer-dist --no-scripts
frankenphp php-cli "$ROOT/.ui-capture/bin/composer.phar" dump-autoload --optimize --no-scripts
frankenphp php-cli artisan package:discover --ansi
