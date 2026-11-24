#!/usr/bin/env bash
# Renders the main screens with the seeded profile in happy-dom (see render-check.test.jsx).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../frontend"
cp "$HERE/render-check.test.jsx" src/zz-uicapture-render.test.jsx
trap 'rm -f src/zz-uicapture-render.test.jsx' EXIT
SEED_DIR="$HERE/seed-data" npx vitest run src/zz-uicapture-render.test.jsx
