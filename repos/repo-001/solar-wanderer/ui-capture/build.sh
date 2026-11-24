#!/usr/bin/env bash
# Reproduces .ui-capture/out (static production build).
# Built from a copy of the sources in .ui-capture/build so it has its own node_modules
# (the repo's package-lock.json registry URLs were switched from registry.npmmirror.com to registry.npmjs.org).
set -euo pipefail
cd "$(dirname "$0")/.."
B=.ui-capture/build
mkdir -p "$B"
cp package.json package-lock.json "$B/"
(cd "$B" && PUPPETEER_SKIP_DOWNLOAD=1 npm ci --ignore-scripts)
rm -rf "$B/src" "$B/en" "$B/public"
cp -R src en index.html vite.config.js "$B/"
ln -s ../../public "$B/public"
(cd "$B" && npx vite build --outDir ../out --emptyOutDir)
