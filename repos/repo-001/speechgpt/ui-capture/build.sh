#!/usr/bin/env bash
# Builds SpeechGPT for UI capture: production build -> .ui-capture/out,
# seed data -> out/seed-data.json, and wires seed-loader.js in front of the app bundle.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT"

bun install
bun run build

rm -rf "$HERE/out"
cp -R "$ROOT/dist" "$HERE/out"
cp "$HERE/seed-loader.js" "$HERE/out/seed-loader.js"
node "$HERE/seed/gen.mjs" "$HERE/out/seed-data.json"

# Replace the module entry script with: entry path + seed loader (which boots the entry after seeding)
node -e '
const fs = require("fs");
const f = process.argv[1];
let html = fs.readFileSync(f, "utf8");
const m = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
if (!m) throw new Error("entry script not found");
html = html.replace(m[0], "");
html = html.replace("</body>", `  <script>window.__APP_ENTRY__ = ${JSON.stringify(m[1])};</script>\n    <script src="/seed-loader.js"></script>\n  </body>`);
fs.writeFileSync(f, html);
' "$HERE/out/index.html"
echo "built -> $HERE/out"
