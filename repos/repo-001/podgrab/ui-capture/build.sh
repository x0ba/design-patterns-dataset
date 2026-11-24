#!/usr/bin/env bash
# Rebuild everything from source (run from anywhere; uses mise-pinned Go).
set -euo pipefail
UI="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$UI")"
cd "$ROOT"
mise install
# Local file:// GOPROXY for modules on hosts the sandbox can't reach (built from GitHub mirrors).
[ -d "$UI/goproxy/gorm.io" ] || (cd "$UI/tools/mkproxy" && GOPROXY=direct go run . "$UI/goproxy" "$ROOT/go.sum")
go build -o "$UI/bin/podgrab" .
(cd "$UI/stub" && go build -o "$UI/bin/stub" .)
(cd "$UI/seed" && go build -o "$UI/bin/seed" .)
echo "built; run $UI/seed.sh to (re)create data, $UI/start.sh to serve"
