#!/usr/bin/env bash
# Builds the Blockbench web app and assembles the static site in .ui-capture/out
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UIC="$ROOT/.ui-capture"
cd "$ROOT"

if [ ! -d node_modules ]; then
  ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --ignore-scripts
fi
npm run build-web

OUT="$UIC/out"
rm -rf "$OUT"
mkdir -p "$OUT/dist"
cp index.html favicon.png icon.png icon_full.png icon_maskable.png manifest.webmanifest "$OUT/"
cp dist/bundle.js "$OUT/dist/"
cp -R css assets font lib content "$OUT/"

# Seed data + offline stubs (see app.json)
node "$UIC/seed/generate.mjs" "$OUT/seed"
cp "$UIC/seed/seed_loader.js" "$OUT/seed/"
mkdir -p "$OUT/stub"
cp -R "$UIC/stub/." "$OUT/stub/"
# Inject the seed loader before the app bundle
node -e '
const fs=require("fs");const f=process.argv[1];let h=fs.readFileSync(f,"utf8");
h=h.replace("<script type=\"module\" src=\"dist/bundle.js\"></script>","<script src=\"seed/seed_loader.js\"></script>\n\t<script type=\"module\" src=\"dist/bundle.js\"></script>");
fs.writeFileSync(f,h);' "$OUT/index.html"
echo "Built $OUT"
