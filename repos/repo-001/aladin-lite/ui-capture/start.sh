#!/usr/bin/env bash
# Starts the Aladin Lite UI (published build + local HiPS) and the offline stubs for
# CDS services, all from one Node process. Serves http://localhost:${PORT:-4483}/
set -euo pipefail
cd "$(dirname "$0")"
export PORT="${PORT:-4483}"
exec node server.mjs
