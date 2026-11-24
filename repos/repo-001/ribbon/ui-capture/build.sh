#!/usr/bin/env bash
# Builds the production bundle with the permalink API pointed at the local stub, then seeds the store.
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
VITE_RIBBON_API_STORE=/v0/store/ npm run build
# Point the Google Fonts stylesheet at the local font stub served by server.mjs
sed -i.bak "s#https://fonts.googleapis.com/css?family=Lato:300,900#/_fonts/css#" dist/index.html && rm dist/index.html.bak
(cd .ui-capture/fontstub && npm ci)
node .ui-capture/seed.mjs
