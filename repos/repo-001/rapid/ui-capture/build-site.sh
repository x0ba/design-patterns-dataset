#!/usr/bin/env bash
# Builds the production Rapid bundle and assembles the site served by stub-server.mjs into .ui-capture/site
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SITE="$HERE/site"
cd "$ROOT"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  npm run all
fi

rm -rf "$SITE"
mkdir -p "$SITE"
cp -R dist "$SITE/dist"
rm -f "$SITE/dist/rapid.js.map" "$SITE/dist/esbuild.json"

# Third-party data/modules normally fetched from cdn.jsdelivr.net -> local copies (AssetSystem 'local' origin)
M="$SITE/dist/data/modules"
mkdir -p "$M/mapillary-js" "$M/maplibre-gl" "$M/name-suggestion-index/presets" "$M/osm-community-index" "$M/pannellum" "$M/id-tagging-schema" "$M/wmf-sitematrix"
NM="$ROOT/node_modules"
cp "$NM/mapillary-js/dist/mapillary.js" "$NM/mapillary-js/dist/mapillary.css" "$M/mapillary-js/"
cp "$NM/maplibre-gl/dist/maplibre-gl.js" "$NM/maplibre-gl/dist/maplibre-gl.css" "$M/maplibre-gl/"
for f in nsi dissolved featureCollection genericWords replacements trees; do cp "$NM/name-suggestion-index/dist/$f.min.json" "$M/name-suggestion-index/"; done
cp "$NM/name-suggestion-index/dist/presets/nsi-id-presets.min.json" "$M/name-suggestion-index/presets/"
for f in defaults featureCollection resources; do cp "$NM/osm-community-index/dist/$f.min.json" "$M/osm-community-index/"; done
cp "$NM/pannellum/build/pannellum.js" "$NM/pannellum/build/pannellum.css" "$M/pannellum/"
for f in deprecated discarded preset_categories preset_defaults fields presets; do cp "$NM/@openstreetmap/id-tagging-schema/dist/$f.min.json" "$M/id-tagging-schema/"; done
cp "$NM/wmf-sitematrix/data/wikipedia.min.json" "$M/wmf-sitematrix/"

cp "$HERE/seed-prefs.js" "$HERE/offline-shim.js" "$SITE/"

# index.html: the repo's index.html, adjusted for an offline local deployment:
#  - production bundle (rapid.min.js), assets from local copies instead of the CDN
#  - OSM API connection pointed at the local stub server (same origin), pre-authorized via context.preauth
#  - browser-update.org script replaced by a local stand-in
node - "$ROOT/index.html" "$SITE/index.html" <<'EOF'
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
let html = fs.readFileSync(src, 'utf8');
const rep = (a, b) => { if (!html.includes(a)) throw new Error('pattern not found: ' + a); html = html.replace(a, b); };
rep("<script src='https://browser-update.org/update.js'></script>", "<script src='/stub/browser-update.js'></script>\n    <script src='/offline-shim.js'></script>\n    <script src='/seed-prefs.js'></script>");
rep("newScript.src = 'dist/rapid.js';", "newScript.src = 'dist/rapid.min.js';");
rep("// context.assetOrigin = 'local';   // test no CDN", "context.assetOrigin = 'local';   // offline: all assets from dist/data/modules");
html = html.replace(/context\.apiConnections = \[[\s\S]*?\];/, `context.apiConnections = [
            {
              url: window.location.origin,
              apiUrl: window.location.origin,
              client_id: 'local-stub-client-id',
              client_secret: 'local-stub-client-secret'
            }
          ];
          // Signed in to the local OSM API stub with a placeholder OAuth2 token
          context.preauth = Object.assign({ access_token: 'local-stub-oauth2-token' }, context.apiConnections[0]);`);
fs.writeFileSync(dst, html);
EOF
echo "site assembled in $SITE"
