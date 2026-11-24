#!/usr/bin/env bash
# Reproduce the static build. Node is pinned in ../mise.toml.
set -euo pipefail
cd "$(dirname "$0")/.."
mise install
npm ci
# vite.config.js sets base "/flight-path/" for GitHub Pages; override to "/" since the build is served from root.
npx vite build --base=/ --outDir .ui-capture/out --emptyOutDir
