#!/bin/sh
# Rebuilds the Fusion binary used by start.sh (needs network for first-time dependency fetches).
set -eu
UC=$(cd "$(dirname "$0")" && pwd)
ROOT=$(dirname "$UC")
cd "$ROOT"
mise install
# Favicons are normally loaded by the browser from google.com; point them at the local stub (favicon-stub.mjs).
export VITE_FAVICON_SERVICE_URL="http://localhost:4435/s2/favicons"
./scripts.sh build-frontend
. "$UC/gobuild/env.sh"
cd backend
# Alternate modfile: GitHub mirrors for golang.org/x etc. and a modernc.org/sqlite shim (see gobuild/).
CGO_ENABLED=1 go build -modfile="$UC/gobuild/go.mod" -tags sqlite_fts5 -trimpath -o "$UC/bin/fusion" ./cmd/fusion
echo "built $UC/bin/fusion"
