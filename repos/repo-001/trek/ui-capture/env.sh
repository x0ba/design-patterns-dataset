# Shared environment for the TREK server (sourced by start.sh and seed scripts)
export NODE_ENV=production
export COOKIE_SECURE=false
export FORCE_HTTPS=false
export TRUST_PROXY=0
export TZ=UTC
export LOG_LEVEL=info
export APP_URL="http://localhost:${PORT}"
export ALLOWED_ORIGINS="http://localhost:${PORT},http://127.0.0.1:${PORT}"
export ADMIN_EMAIL=maya@trek.local
export ADMIN_PASSWORD='Setup-Only-2026!'  # first-run only; seed.mjs changes it to Wanderlust2026!
export ENCRYPTION_KEY=4f1c2a9e7b3d5f60817a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f70
export TREK_SERVICES=off
export TREK_PLACES_ENABLED=false
export TREK_PLUGINS_ENABLED=false
export TREK_DB_PRE_MIGRATE_SNAPSHOT=false
# The seeded database lives with the setup record
export TREK_DB_FILE="${TREK_ROOT:-$(pwd)/..}/.ui-capture/data/travel.db"
