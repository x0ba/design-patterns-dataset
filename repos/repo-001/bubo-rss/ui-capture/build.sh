#!/usr/bin/env bash
# Reproducible static build of Bubo Reader with local feed fixtures (no network needed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UI="$ROOT/.ui-capture"
cd "$ROOT"
mise install >/dev/null
npm ci --no-audit --no-fund --offline >/dev/null 2>&1 || npm ci --no-audit --no-fund
npm run build            # tsc -> dist/

# Staging copy of the app so the repo's own config/ and public/ stay untouched.
STAGE="$UI/stage"
rm -rf "$STAGE"; mkdir -p "$STAGE/config" "$STAGE/public"
cp -R dist "$STAGE/dist"
cp package.json "$STAGE/"
ln -s "$ROOT/node_modules" "$STAGE/node_modules"
cp config/template.html "$STAGE/config/"
cp public/style.css "$STAGE/public/"

# Fixtures + feeds.json (the app's own config format)
node "$UI/seed/generate.mjs" "$UI/fixtures" "$STAGE/config/feeds.json"

# Run the real Bubo build; node-fetch is swapped for the fixture stub via a loader hook.
cd "$STAGE"
TZ=America/Los_Angeles LANG=en_US.UTF-8 node --no-warnings --experimental-loader "$UI/stub/loader.mjs" dist/index.js

rm -rf "$UI/out"; cp -R "$STAGE/public" "$UI/out"
echo "Static site written to $UI/out"
