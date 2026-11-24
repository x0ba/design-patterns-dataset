#!/usr/bin/env bash
# Server-render every React panel (rail/library/inspector/timeline/deliver) for
# every scene, shot, mode and entity selection of each seeded project —
# catches data-shape crashes without a browser/WebGL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
OUT="${TMPDIR:-/tmp}/blockout-panels-check.mjs"
node_modules/.bin/esbuild .ui-capture/verify/panels-check.tsx --bundle --platform=node --format=esm --outfile="$OUT" \
  --alias:@engine=./src/engine --alias:@renderer=./src/renderer --loader:.png=dataurl \
  --define:__BLOCKOUT_APP_ID__='"x"' --define:__BLOCKOUT_WINDOWS_CONFIG_NAMESPACE__='"x"' --define:__BLOCKOUT_MAINTAINER_CREDIT__='""' \
  --jsx=automatic --log-level=error --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
cp "$OUT" .ui-capture/verify/.check.mjs
for p in .ui-capture/data/projects/*.blockout; do echo "$p: $(node .ui-capture/verify/.check.mjs "$PWD/$p" | tail -1)"; done
rm .ui-capture/verify/.check.mjs
