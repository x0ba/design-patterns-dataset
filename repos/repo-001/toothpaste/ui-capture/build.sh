#!/usr/bin/env bash
# Builds the static production bundle into .ui-capture/out with local fonts, the Web Bluetooth
# stub and the browser-side seeder injected (web/ source is untouched).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT/web"
[ -f public/firmware/manifest.json ] || "$HERE/fetch-firmware-offline.sh"
[ -d node_modules ] || npm ci
# `npm run build` = fetch-firmware (needs api.github.com; unreachable here) + vite build.
env -u CI npx vite build
OUT="$HERE/out"
rm -rf "$OUT"; cp -R dist "$OUT"
mkdir -p "$OUT/ui-capture"
cp "$HERE/seed/seed.js" "$HERE/seed/ble-stub.js" "$OUT/ui-capture/"
node "$HERE/seed/gen-seed.mjs" "$OUT/ui-capture/seed-data.json"
[ -d "$HERE/fonts-pkg/node_modules" ] || (cd "$HERE/fonts-pkg" && npm install --no-audit --no-fund)
node "$HERE/build-fonts.mjs" "$OUT"
node "$HERE/postprocess.mjs" "$OUT"
echo "[build] done -> $OUT"
