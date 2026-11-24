#!/usr/bin/env bash
# Rebuild the static mock-mode bundle into .ui-capture/out
set -euo pipefail
cd "$(dirname "$0")/.."
node .ui-capture/seed/generate.mjs
VITE_UI_CAPTURE_SEED=true VITE_SESSION_API_KEY=local-placeholder-session-key npm run build:mock
rm -rf .ui-capture/out
cp -R build .ui-capture/out
