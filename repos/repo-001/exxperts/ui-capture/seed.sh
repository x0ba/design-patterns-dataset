#!/usr/bin/env bash
# Rebuilds .ui-capture/home from scratch: gateway + defaults through the API,
# rooms through the app's store code, finishing touches through the API.
set -euo pipefail
CAP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CAP"
rm -rf home && mkdir -p home tmp
./with-server.sh node setup-gateway.mjs
HOME="$CAP/home" TMPDIR="$CAP/tmp" node --import tsx seed-rooms.ts
HOME="$CAP/home" TMPDIR="$CAP/tmp" node --import tsx seed-extra.ts
ARCHIVE_ROOM=q2-offsite-planning ./with-server.sh node seed-finish.mjs
