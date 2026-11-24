#!/usr/bin/env bash
# Bundles tools/validate.ts against the source in the $TMPDIR build copy and runs it vs a running server.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${TMPDIR:-/tmp}/feishin-build"
ESBUILD="$(ls -d "$WORK"/node_modules/.pnpm/esbuild@0.25*/node_modules/esbuild | head -1)"
cd "$WORK"
node -e "
require('$ESBUILD').build({entryPoints:['$HERE/validate.ts'],bundle:true,platform:'node',format:'esm',outfile:'$WORK/validate.mjs',
 nodePaths:['$WORK/node_modules'],logLevel:'error',
 plugins:[{name:'alias',setup(b){b.onResolve({filter:/^\\/@\\//},async(a)=>{const r=await b.resolve('./src/'+a.path.slice(3),{resolveDir:'$WORK',kind:a.kind});return r;});}}]})"
node "$WORK/validate.mjs" "${1:-http://localhost:5427}"
