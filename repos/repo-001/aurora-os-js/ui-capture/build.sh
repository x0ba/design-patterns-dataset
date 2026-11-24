#!/usr/bin/env bash
# Rebuilds the static site into .ui-capture/out and regenerates the seed.
set -euo pipefail
cd "$(dirname "$0")/.."
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
[ -d node_modules ] || npm ci --no-audit --no-fund
npm run build
rm -rf .ui-capture/out && mkdir -p .ui-capture/out && cp -R dist/. .ui-capture/out/
# user-owned media referenced by the seeded filesystem
mkdir -p .ui-capture/out/media && cp "src/assets/sounds/Lo-Fi Girl.opus" .ui-capture/out/media/
cp .ui-capture/seed/loader.js .ui-capture/out/aurora-seed-loader.js
cp .ui-capture/seed/autopilot.js .ui-capture/out/aurora-autopilot.js
mkdir -p .ui-capture/out/stubs/caravane && cp public/icon.ico .ui-capture/out/stubs/caravane/favicon.ico
# load seed before the app module runs
node -e "const f='.ui-capture/out/index.html';const fs=require('fs');let h=fs.readFileSync(f,'utf8');if(!h.includes('aurora-seed-loader'))h=h.replace('<head>','<head>\n    <script src=\"/aurora-seed-loader.js\"></script>\n    <script src=\"/aurora-autopilot.js\"></script>');fs.writeFileSync(f,h)"
npx vitest run --config .ui-capture/seed/vitest.seed.config.ts generate
node .ui-capture/seed/finalize.mjs
