#!/usr/bin/env bash
# Rebuilds the static UI-capture output in ./.ui-capture/out
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
cp .ui-capture/env.production.local .env.production.local
(cd excalidraw-app && OSS_FONTS_CDN=/ VITE_APP_GIT_SHA=c0a0ca348faa ../node_modules/.bin/vite build)
rm -rf .ui-capture/out
cp -R excalidraw-app/build .ui-capture/out
# point the browser-side analytics script at a local no-op stub
mkdir -p .ui-capture/out/stubs
cp .ui-capture/stubs/simpleanalytics-noop.js .ui-capture/out/stubs/
sed -i '' 's|https://scripts.simpleanalyticscdn.com/latest.js|/stubs/simpleanalytics-noop.js|' .ui-capture/out/index.html
# seed scene, loaded by the app's own `#url=` import
mkdir -p .ui-capture/out/seed
node .ui-capture/seed/generate-scene.mjs .ui-capture/out/seed/ledgerline-platform-planning.excalidraw
# the font CDN also serves the Assistant UI font; mirror it locally
mkdir -p .ui-capture/out/fonts/Assistant
cp packages/excalidraw/fonts/Assistant/*.woff2 .ui-capture/out/fonts/Assistant/
