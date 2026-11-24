#!/usr/bin/env bash
# One-time setup (needs network to the package registry). Run from anywhere.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mise install                      # node 16.20.2 + yarn 1.22.22 from mise.toml
# --no-default-rc: don't read ~/.npmrc (not readable in the sandbox)
# --ignore-scripts: skip electron binary download / husky git hooks (not needed for the browser UI)
# In the capture sandbox yarn also needed: --proxy "$HTTP_PROXY" --https-proxy "$HTTPS_PROXY",
# a YARN_CACHE_FOLDER under $TMPDIR with .gitmodules/.vscode entries stripped (writes of those
# names are blocked), and app-builder-bin-1.11.4.tgz fed via YARN_YARN_OFFLINE_MIRROR (large download kept aborting).
ELECTRON_SKIP_BINARY_DOWNLOAD=1 HUSKY_SKIP_INSTALL=1 yarn install --no-default-rc --frozen-lockfile --ignore-scripts
node_modules/.bin/gulp html       # repo's build task: browser/views/*.pug -> browser/*.html
node .ui-capture/seed/generate.js # seed data + saved session (start.sh re-runs this)
