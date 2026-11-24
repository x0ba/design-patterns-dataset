#!/usr/bin/env bash
# Starts ShopNex: the admin + API + hosted checkout (production build) on $PORT (default 4422), and the bundled
# Astro storefront (templates/storefront) on $STOREFRONT_PORT (default 4321), using the seeded embedded PGlite
# database in .ui-capture/data. Foreground; Ctrl+C stops both.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
if [ ! -d "$UI_DATA_DIR/pglite" ]; then
  echo "No seeded database found, seeding first…"
  bash "$UI_DIR/seed.sh"
fi

# Storefront (reads products, theme and settings from the admin's Storefront API)
(
  cd "$REPO_DIR/templates/storefront"
  PORT="$STOREFRONT_PORT" HOST=localhost SHOPNEX_URL="$APP_URL" COMMERCE_PROVIDER=shopnex \
    exec node dist/server/entry.mjs
) &
STOREFRONT_PID=$!
trap 'kill $STOREFRONT_PID 2>/dev/null || true' EXIT INT TERM

cd "$REPO_DIR/apps/admin-ui"
node server.mjs
