#!/usr/bin/env bash
# Rebuilds the local store from scratch in .ui-capture/state:
#   1. apply the repo's D1 migrations
#   2. run the app's first-run setup wizard over HTTP (store name, TZ, admin password)
#   3. upload product images through the admin media API (if .ui-capture/images exists)
#   4. load the generated catalog/orders/pages/settings (gen-seed.mjs) into D1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
UIC="$ROOT/.ui-capture"
SEED_PORT="${SEED_PORT:-5493}"
export XDG_CONFIG_HOME="$UIC/xdg" WRANGLER_REGISTRY_PATH="$UIC/xdg/registry" WRANGLER_LOG_PATH="$UIC/logs"
export WRANGLER_SEND_METRICS=false X_LOCAL_OBSERVABILITY=false CI=1
mkdir -p "$UIC/logs" "$UIC/xdg"

rm -rf "$UIC/state" "$UIC/media-map.json"
npx wrangler d1 migrations apply DB --local --persist-to "$UIC/state" >/dev/null
echo "migrated"

npx wrangler dev -c dist/server/wrangler.json --persist-to "$UIC/state" --ip 127.0.0.1 \
  --port "$SEED_PORT" --show-interactive-dev-session=false >"$UIC/logs/seed-server.log" 2>&1 &
WPID=$!
trap 'kill $WPID 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -s -o /dev/null "http://127.0.0.1:$SEED_PORT/" && break; sleep 1; done
JAR="$UIC/logs/cookies.txt"
code=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -X POST "http://127.0.0.1:$SEED_PORT/admin/setup" \
  -H "Origin: http://127.0.0.1:$SEED_PORT" \
  --data-urlencode 'store_name=Fernwood Supply Co.' \
  --data-urlencode 'time_zone=America/Los_Angeles' \
  --data-urlencode 'admin_password=fernwood-admin-2026')
echo "setup wizard: HTTP $code"

# Admin -> Settings -> Payments, through the app's own form: store the (stub)
# Stripe keys in the encrypted vault, then switch off the Demo and Lightning rails.
post_settings() { curl -s -o /dev/null -w "settings $1: HTTP %{http_code}\n" -b "$JAR" -X POST \
  "http://127.0.0.1:$SEED_PORT/admin/settings" -H "Origin: http://127.0.0.1:$SEED_PORT" "${@:2}"; }
post_settings save_stripe --data-urlencode _action=save_stripe \
  --data-urlencode 'secret:stripe_secret_key=sk_test_51LocalStubFernwood0000000000000000000000000000000' \
  --data-urlencode 'secret:stripe_webhook_secret=whsec_local_stub_fernwood'
post_settings disable_demo --data-urlencode _action=toggle_payment --data-urlencode method=demo --data-urlencode disabled=1
post_settings disable_lightning --data-urlencode _action=toggle_payment --data-urlencode method=lightning --data-urlencode disabled=1

if [[ -d "$UIC/images" ]]; then
  node "$UIC/upload-media.mjs" "http://127.0.0.1:$SEED_PORT" "$JAR" "$UIC/images" > "$UIC/media-map.json"
fi
kill $WPID; wait $WPID 2>/dev/null || true
trap - EXIT

node "$UIC/gen-seed.mjs" > "$UIC/seed-data.sql"
npx wrangler d1 execute DB --local --persist-to "$UIC/state" --file "$UIC/seed-data.sql" >/dev/null
echo "seeded"
