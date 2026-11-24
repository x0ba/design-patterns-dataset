#!/usr/bin/env bash
# Reproduce the capture: install pinned tools, build the static site, copy it to
# .ui-capture/out, and regenerate the sample .docx corpus.
set -euo pipefail
cd "$(dirname "$0")/.."
mise install
npm ci
# astro.config.mjs uses fontProviders.npm() instead of fontProviders.fontsource()
# (same Fontsource fonts, fetched from cdn.jsdelivr.net at build time instead of
# api.fontsource.org, which is unreachable here). Apply if not already applied.
sed -i '' 's/fontProviders.fontsource()/fontProviders.npm()/g' astro.config.mjs 2>/dev/null \
  || sed -i 's/fontProviders.fontsource()/fontProviders.npm()/g' astro.config.mjs
npm run build
rm -rf .ui-capture/out && cp -R dist .ui-capture/out
node .ui-capture/gen-samples.mjs
