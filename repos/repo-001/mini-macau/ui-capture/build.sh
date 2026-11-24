#!/usr/bin/env bash
# Builds everything start.sh needs. Needs network only for `npm ci` (registry).
set -euo pipefail
cd "$(dirname "$0")/.."
mise install
npm ci --no-audit --no-fund
(cd .ui-capture/stub-deps && npm install --no-audit --no-fund)
npm run build
rm -rf .ui-capture/out && cp -R dist .ui-capture/out
node .ui-capture/rewrite-urls.mjs
node .ui-capture/build-basemap.mjs
node .ui-capture/gen-lrt-trips.mjs
npx vite build --config .ui-capture/vite.lrt.config.mjs
