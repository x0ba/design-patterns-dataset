#!/usr/bin/env bash
# Builds the static site into .ui-capture/out (run from anywhere).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CAP="$ROOT/.ui-capture"
cd "$ROOT"

LOCAL_HTTP_BUILD=1 npm run build

rm -rf "$CAP/out"
cp -R .vercel/output/static "$CAP/out"
cd "$CAP/out"

# Clean URLs: Vercel serves /blog from blog.html. A plain static server
# looks for blog/index.html instead, so add those copies.
find . -name '*.html' ! -name 'index.html' ! -name 'example-*.html' | while read -r f; do
  d="${f%.html}"
  mkdir -p "$d"
  cp "$f" "$d/index.html"
done

# Stub for Plausible analytics (Vercel rewrites /data/js/script.js to
# plausible.io). Local no-op so nothing leaves the machine.
mkdir -p data/js
cp "$CAP/stubs/plausible-script.js" data/js/script.js

echo "Built $CAP/out"

# Realistic secret files produced with the app's own CLI.
node "$CAP/seed-secrets.mjs" 2>&1 | grep -v -i "warning\|--import\|trace-\|DEP0180" || true
