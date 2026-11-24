#!/usr/bin/env bash
# Starts the Sophosia web UI on http://localhost:${PORT:-4484}/ (foreground).
# Restores the pre-seeded, pre-indexed workspace snapshot so every start is
# the same "established user" state, then runs the local Tauri-bridge server
# (serves dist/spa, emulates the Tauri IPC, real SQLite, local stubs).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
cd "$REPO"   # so mise shims resolve the pinned node
export PORT="${PORT:-4484}"
[ -f "$REPO/dist/spa/index.html" ] || { echo "dist/spa missing: run 'npx quasar build'" >&2; exit 1; }
[ -d "$HERE/data-snapshot" ] || { echo "data snapshot missing: run .ui-capture/seed/build-data.sh" >&2; exit 1; }
rm -rf "$HERE/data"
cp -a "$HERE/data-snapshot" "$HERE/data"
exec node "$HERE/server/server.mjs"
