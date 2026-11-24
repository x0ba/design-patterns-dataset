# Shared environment for start.sh and seed.sh (sourced)
UI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export REPO_DIR="$(cd "$UI_DIR/.." && pwd)"
export PORT="${PORT:-4422}"
export UI_DATA_DIR="${UI_DATA_DIR:-$UI_DIR/data}"
export DATABASE_URL="pglite:$UI_DATA_DIR/pglite"
export FILES_DIR="$UI_DATA_DIR/files"
export SHOPNEX_SECRET="local-ui-capture-secret-0b7c1f4e9a2d6385c4e1f0a9b8d7c6e5"
export BETTER_AUTH_SECRET="$SHOPNEX_SECRET"
export APP_URL="http://localhost:$PORT"
export BETTER_AUTH_URL="$APP_URL"
export TENANCY_MODE=single
export DEFAULT_SHOP_NAME="Northfield Supply Co."
export SHOPNEX_UPDATE_CHECK=false
export MARKETPLACE_URL="http://localhost:$PORT/__marketplace-disabled"
export SHOPNEX_MIGRATIONS_DIR="$REPO_DIR/modules/db/migrations"
export NODE_ENV=production
# Bundled Astro storefront (templates/storefront), started next to the admin by start.sh
export STOREFRONT_PORT="${STOREFRONT_PORT:-4321}"
export STOREFRONT_URL="http://localhost:$STOREFRONT_PORT"
