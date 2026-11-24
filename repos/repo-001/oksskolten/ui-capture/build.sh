#!/usr/bin/env bash
# One-time build: install deps, build the SPA into ./dist (served by the Fastify server).
# The UI loads favicons straight from https://www.google.com/s2/favicons; the built
# bundle is pointed at the local stub (/__stub/favicons, served by stub/stub.mjs) instead.
set -euo pipefail
cd "$(dirname "$0")/.."
mise install
npm ci
npx vite build
grep -l 'https://www.google.com/s2/favicons' dist/assets/*.js | while read -r f; do
  sed -i '' 's#https://www.google.com/s2/favicons#/__stub/favicons#g' "$f"
done
echo "build ok"
