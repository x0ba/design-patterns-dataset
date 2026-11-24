#!/usr/bin/env bash
# Builds the production Next.js app with the local stubs wired in.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
cd "$UI_CAPTURE_DIR/../packages/otelbin"
npm run build
