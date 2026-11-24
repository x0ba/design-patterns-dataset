#!/usr/bin/env bash
# Rebuild everything start.sh serves. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."
node .ui-capture/gen-content.mjs
node .ui-capture/gen-seed.mjs
[ -f .ui-capture/media/audio/narration.wav ] || node .ui-capture/gen-media.mjs
cd client
node scripts/extract-public-data.mjs
VITE_MEDIA_BASE_URL=/media VITE_COMMUNITY_API_URL=/community VITE_FREE_TIER_API_URL= \
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA pnpm exec vite build
