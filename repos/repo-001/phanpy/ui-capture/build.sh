#!/usr/bin/env bash
# Reproducible build of the Phanpy front end for the local capture setup.
set -euo pipefail
cd "$(dirname "$0")/.."
mise install
npm ci --no-audit --no-fund
# Translations go to the local stub (Translang-compatible endpoint on the same server)
PHANPY_TRANSLANG_INSTANCES="localhost:4440" PHANPY_CLIENT_NAME=Phanpy npx vite build
rm -rf .ui-capture/out && cp -R dist .ui-capture/out
