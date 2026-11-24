#!/usr/bin/env bash
# Starts the fake Mastodon instance ("Rosebud Social") which also serves the
# Phanpy production build from .ui-capture/out on the same origin.
set -euo pipefail
cd "$(dirname "$0")/server"
export PORT="${PORT:-4440}"
exec node server.mjs
