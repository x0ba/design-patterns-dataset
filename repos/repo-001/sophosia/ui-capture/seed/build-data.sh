#!/usr/bin/env bash
# Seed the workspace, let the app index it, and freeze the result as the snapshot start.sh restores.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAP="$(cd "$HERE/.." && pwd)"
cd "$CAP/.."
node "$HERE/seed.mjs"
PORT=5484 node "$CAP/server/server.mjs" > "${TMPDIR:-/tmp}/sophosia-index-server.log" 2>&1 &
SP=$!
trap 'kill $SP 2>/dev/null || true' EXIT
sleep 1
REAL_HOME="$HOME" HOME="${TMPDIR:-/tmp}" PORT=5484 node "$HERE/index-with-app.mjs"
kill $SP; wait $SP 2>/dev/null || true
rm -rf "$CAP/data-snapshot"
cp -a "$CAP/data" "$CAP/data-snapshot"
echo "snapshot written to $CAP/data-snapshot"
