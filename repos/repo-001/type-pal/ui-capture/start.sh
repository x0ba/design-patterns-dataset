#!/usr/bin/env bash
# Serves the production build of the Type PAL visual editor (auto-loads projects/pal)
# via Vite's preview server, which also maps /projects/* to the repo's project folders.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-4467}"
# Workspace save record from a completed author save (see seed-save-state.mjs).
node "$ROOT/.ui-capture/seed-save-state.mjs"
cd "$ROOT/packages/editor"
if [ ! -f dist/index.html ]; then
  VITE_PROJECT_ID=pal pnpm exec vite build
fi
exec pnpm exec vite preview --port "$PORT" --strictPort
