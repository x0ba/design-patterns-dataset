#!/usr/bin/env bash
# One-time install + build (needs registry/GitHub network). start.sh then runs fully offline.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$HERE")"; cd "$ROOT"
mise install                                   # node 24.22.3, frankenphp 1.13.5 (PHP 8.5), composer 2.11.2
# PHP deps: api.github.com zipballs are blocked here, so use a copy of composer.lock whose
# dist URLs point at codeload.github.com (same archives). The repo's composer.lock is untouched.
node "$HERE/composer-offline.mjs"
COMPOSER="$HERE/composer-offline.json" COMPOSER_HOME="$HERE/cache/composer-home" COMPOSER_CACHE_DIR="$HERE/cache/composer" \
  frankenphp php-cli "$(mise where github:composer/composer)/composer.phar" install --no-interaction --no-dev --prefer-dist
# Client: same as `npm run build`, but Parcel uses its FS cache (LMDB can't lock in the sandbox).
(cd client && npm ci --include=dev)
node "$HERE/build-client.cjs"
# Seed database snapshot (restored by start.sh on every start).
"$HERE/seed/seed.sh"
