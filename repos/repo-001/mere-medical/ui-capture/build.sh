#!/usr/bin/env bash
# Reproduces .ui-capture/out: production build of the web PWA in its built-in demo mode
# (in-memory RxDB, loads /assets/demo.json through the app's JSON import), then swaps in
# the extended demo dump produced by seed/generate-demo.mjs.
set -euo pipefail
cd "$(dirname "$0")/.."
mise install
[ -d node_modules ] || PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund
IS_DEMO=enabled NX_DAEMON=false NX_NO_CLOUD=true npx nx build web --configuration=production --skip-nx-cache
rm -rf .ui-capture/out
cp -R dist/apps/web .ui-capture/out
node .ui-capture/seed/generate-demo.mjs . .ui-capture/out/assets/demo.json
