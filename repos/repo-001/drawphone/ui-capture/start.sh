#!/bin/sh
# Starts Drawphone (with local stubs + archive seed) in the foreground on $PORT (default 4468).
cd "$(dirname "$0")/.." || exit 1
export PORT="${PORT:-4468}"
export NODE_ENV=production
# placeholder secrets (the real services are stubbed, see .ui-capture/server.mjs)
export SHUTTERSTOCK_API_TOKEN="local-stub:local-stub"
export ACCESS_KEY_ID="local-stub"
export SECRET_ACCESS_KEY="local-stub"
export ADMIN_PASSWORD="local-admin"
exec node --experimental-json-modules .ui-capture/server.mjs
