#!/usr/bin/env bash
# Reproduces the setup: install deps (yarn 3.3.0 from .yarn/releases), seed data, production build.
# Requires `mise install` first (node 24.11.1 + yarn shim from mise.toml) and a .env.local (see app.json notes).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# In the capture sandbox yarn 3 needed: node .ui-capture/tools/proxy-relay.js 18999 & and
# YARN_HTTP_PROXY/YARN_HTTPS_PROXY=http://127.0.0.1:18999 (yarn drops proxy credentials).
yarn install
(cd .ui-capture/tools && npm install)          # @fontsource-variable fonts for the offline Google Fonts mock
node .ui-capture/stub/seed.js
NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$ROOT/.ui-capture/tools/google-fonts-mock.js" \
  NODE_OPTIONS=--max-old-space-size=6144 npx next build
