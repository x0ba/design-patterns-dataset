#!/usr/bin/env bash
# One-time setup: install deps, build the app (pointing analytics at the local stub) and the peer bot.
set -euo pipefail
cd "$(dirname "$0")/.."
export WRANGLER_SEND_METRICS=false WRANGLER_LOG_PATH="$PWD/.ui-capture/logs" XDG_CONFIG_HOME="$PWD/.ui-capture/cache/xdg-config"
mise install
pnpm install --package-import-method=copy
VITE_INSIGHTFLARE_ORIGIN="/__stubs/insightflare" pnpm build
(cd .ui-capture/peer && pnpm install --package-import-method=copy --no-frozen-lockfile && node build.mjs)
