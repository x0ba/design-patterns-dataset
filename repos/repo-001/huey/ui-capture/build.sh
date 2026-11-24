#!/usr/bin/env bash
# Builds the static Huey site into .ui-capture/out with all CDN dependencies vendored locally.
# Huey has no build step: src/ is the app. We copy it and rewrite the two CDN URLs
# (DuckDB-WASM ESM + Tabler Icons webfont) to locally served copies, then add the seed script.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OUT="$HERE/out"
V="$HERE/vendor"

if [ ! -d "$V/node_modules/@duckdb/duckdb-wasm" ]; then
  (cd "$V" && npm install --no-audit --no-fund)
fi
(cd "$V" && npx esbuild node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser.mjs --bundle --format=esm \
  --platform=browser --minify --outfile=bundled/duckdb-browser.mjs --log-level=warning)

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$ROOT/src/." "$OUT/"

mkdir -p "$OUT/vendor/duckdb" "$OUT/vendor/tabler"
D="$V/node_modules/@duckdb/duckdb-wasm/dist"
cp "$V/bundled/duckdb-browser.mjs" "$OUT/vendor/duckdb/"
cp "$D/duckdb-base.wasm" "$D/duckdb-browser-base.worker.js" "$OUT/vendor/duckdb/"
mkdir -p "$OUT/vendor/duckdb/release-icons"
cp "$V/duckdb-release-icons/"*.svg "$OUT/vendor/duckdb/release-icons/"
cp "$V/node_modules/@tabler/icons-webfont/dist/fonts/tabler-icons.woff2" "$OUT/vendor/tabler/"

# Internationalization loads i18n/<navigator.languages[0]>.js first (en-US in an English Chrome).
# The repo has no en-US/en-GB file, and Huey only listens for the script's 'load' event, so a
# 404 there stops language initialisation. The repo's label template is the English->English
# label file in the same format, so ship it under the English region names.
for lang in en-US en-GB; do
  cp "$OUT/Internationalization/huey.i18n.labels.template.js" "$OUT/Internationalization/i18n/$lang.js"
done

# seed data + seed loader
mkdir -p "$OUT/seed"
node "$HERE/seed/generate-data.mjs" "$OUT/seed/data"
node "$HERE/seed/generate-duckdb.mjs" "$OUT/seed/data"
cp "$HERE/seed/huey-seed.js" "$HERE/seed/reports.json" "$HERE/seed/documents.json" "$OUT/seed/"

node "$HERE/patch-index.mjs" "$OUT/index.html"
echo "built $OUT"
