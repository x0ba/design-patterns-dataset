#!/usr/bin/env bash
# Builds the LRCGET front end as a static site with the Tauri backend stub injected.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT"
npx vite build --outDir "$HERE/out" --emptyOutDir
node "$HERE/gen-seed.mjs" > "$HERE/out/seed-data.js"
cp "$HERE/tauri-backend-stub.js" "$HERE/out/tauri-backend-stub.js"
# load seed + stub before the app bundle (classic scripts run before type=module)
python3 - "$HERE/out/index.html" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
tag = '<script src="/seed-data.js"></script>\n    <script src="/tauri-backend-stub.js"></script>\n'
if 'tauri-backend-stub.js' not in s:
    s = s.replace('<script type="module"', tag + '    <script type="module"', 1)
open(p, 'w').write(s)
PY
echo "built $HERE/out"
