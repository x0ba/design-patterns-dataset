#!/usr/bin/env bash
# Rebuild the static capture: seed data -> production front-end build with local IPC mock.
set -euo pipefail
cd "$(dirname "$0")/.."
mise install
pnpm install --frozen-lockfile --filter @apiark/desktop...
node .ui-capture/seed/generate.mjs
cd apps/desktop
pnpm exec vite build --config ../../.ui-capture/vite.capture.config.mts
