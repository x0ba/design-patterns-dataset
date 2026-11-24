#!/usr/bin/env bash
# Bundle the seed generator (uses Blockout's own engine) and run it.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
"$ROOT/node_modules/.bin/esbuild" "$HERE/seed.ts" --bundle --platform=node --format=esm \
  --outfile="$HERE/dist/seed.mjs" --log-level=warning
node "$HERE/dist/seed.mjs" "$ROOT/.ui-capture/data"
