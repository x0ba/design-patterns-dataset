#!/bin/sh
# Copies the browser libraries that index.html used to load from CDNs into
# src/assets/vendor so the app works with no internet access.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NM="$ROOT/.ui-capture/stubs/node_modules"
V="$ROOT/src/assets/vendor"
rm -rf "$V"; mkdir -p "$V/bootstrap/css" "$V/fontawesome"
cp "$NM/bootstrap/dist/css/bootstrap.min.css" "$V/bootstrap/css/"
cp -R "$NM/@fortawesome/fontawesome-free/css" "$NM/@fortawesome/fontawesome-free/webfonts" "$V/fontawesome/"
cp "$NM/webrtc-adapter/out/adapter.js" "$V/adapter.js"
cp "$NM/moment/min/moment.min.js" "$V/moment.min.js"
cp "$NM/file-saver/FileSaver.min.js" "$V/FileSaver.min.js"
cp "$NM/xss-filters/dist/xss-filters.js" "$V/xss-filters.js"
echo "vendored into $V"
