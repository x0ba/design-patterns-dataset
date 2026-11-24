#!/usr/bin/env bash
# Starts Image Cockpit in production mode on $PORT: serve.mjs supervises the app's local
# handoff API (with the local Codex CLI stub) and serves the built UI + supervisor endpoints.
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-4473}"
export IMAGE_COCKPIT_API_PORT="${IMAGE_COCKPIT_API_PORT:-4481}"
export IMAGE_COCKPIT_HANDOFF_DIR="${IMAGE_COCKPIT_HANDOFF_DIR:-$PWD/.ui-capture/data/codex-handoff}"
export IMAGE_COCKPIT_CODEX_AUTORUN=1
export IMAGE_COCKPIT_CODEX_COMMAND="$PWD/.ui-capture/stubs/codex-cli/codex"
export IMAGE_COCKPIT_ALLOW_MOCK_RUNNER=0

exec node .ui-capture/serve.mjs
