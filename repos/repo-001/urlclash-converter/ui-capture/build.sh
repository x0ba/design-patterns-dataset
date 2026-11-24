#!/usr/bin/env bash
# Reproducible static build for UI capture. Run from anywhere.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CAP="$ROOT/.ui-capture"
OUT="$CAP/out"
cd "$ROOT"
mise install
bun install --frozen-lockfile
# Pyodide (PyYAML engine) is served locally instead of from cdn.jsdelivr.net
VITE_PYODIDE_INDEX_URL=/pyodide/ bun run build
rm -rf "$OUT" && cp -R dist "$OUT"
mkdir -p "$OUT/pyodide"
cp node_modules/pyodide/{pyodide.js,pyodide.mjs,pyodide.asm.js,pyodide.asm.wasm,python_stdlib.zip,pyodide-lock.json} "$OUT/pyodide/"
cp "$CAP"/pyodide-wheels/*.whl "$OUT/pyodide/"
# seed data + subscription stand-ins
node "$CAP/seed/generate.mjs" "$OUT"
bun "$CAP/seed/make-links.ts" "$OUT"
cp "$CAP/seed/seed-loader.js" "$OUT/seed/seed-loader.js"
sed -i '' 's|</body>|  <script src="/seed/seed-loader.js"></script>\n  </body>|' "$OUT/index.html"
echo "built -> $OUT"
