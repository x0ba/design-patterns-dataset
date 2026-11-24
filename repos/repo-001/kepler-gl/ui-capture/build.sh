#!/usr/bin/env bash
# Build the kepler.gl demo app as a static site into .ui-capture/out, with
# local stand-ins for every outside resource, and seed the boot map.
# Prereqs (done once, see app.json notes): mise install; yarn install in repo
# root and examples/demo-app; yarn bootstrap:prepare.
set -euo pipefail
CAP="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$CAP/.." && pwd)"
OUT="$CAP/out"

# Placeholder credentials (the build inlines process.env.* for these).
export MapboxAccessToken="pk.placeholder-offline-token"
export MapboxExportToken="pk.placeholder-offline-token"
export DropboxClientId="placeholder-dropbox-client-id"
export CartoClientId="placeholder-carto-client-id"
export FoursquareClientId="placeholder-foursquare-client-id"
export FoursquareDomain="localhost"
export FoursquareAPIURL="http://localhost:4459/fsq-api"
export FoursquareUserMapsURL="http://localhost:4459/fsq-maps"
export GoogleDriveClientId="placeholder.apps.googleusercontent.com"

if [[ "${SKIP_BUNDLE:-0}" != "1" ]]; then
  (cd "$ROOT/examples/demo-app" && yarn build)
fi

rm -rf "$OUT"
mkdir -p "$OUT/vendor" "$OUT/maps" "$OUT/samples"
cp -R "$ROOT/examples/demo-app/dist/." "$OUT/"
rm -f "$OUT/meta.json"
cp "$ROOT/examples/demo-app/node_modules/maplibre-gl/dist/maplibre-gl.css" "$OUT/vendor/maplibre-gl.css"
cp "$ROOT/node_modules/mapbox-gl/dist/mapbox-gl.css" "$OUT/vendor/mapbox-gl.css"
cp "$CAP/raw/custom-icons.json" "$OUT/vendor/custom-icons.json"

# index.html: swap CDN stylesheets for the vendored copies (same packages).
# The Uber "superfine" webfont CSS is CDN-only; drop it so the theme's
# font-family fallback stack is used instead of a failing request.
sed -e 's#<link rel="stylesheet" href="//d1a3f4spazzrp4.cloudfront.net/kepler.gl/uber-fonts/4.0.0/superfine.css">##' \
    -e 's#//api.tiles.mapbox.com/mapbox-gl-js/v1.1.1/mapbox-gl.css#/vendor/mapbox-gl.css#' \
    -e 's#https://unpkg.com/maplibre-gl@^3/dist/maplibre-gl.css#/vendor/maplibre-gl.css#' \
    "$ROOT/examples/demo-app/index.html" > "$OUT/index.html"

python3 "$CAP/build-basemap.py" "$OUT"
python3 "$CAP/build-samples.py" "$OUT"
python3 "$CAP/seed-map.py" "$OUT"
python3 "$CAP/write-config.py" "$OUT"
echo "built $OUT"
