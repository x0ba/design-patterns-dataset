#!/usr/bin/env bash
# Builds the Feishin web bundle. The sandbox forbids creating `.idea` dirs inside the repo
# (iconv-lite ships one), so install+build run in a scratch copy under $TMPDIR and the
# resulting out/web is copied back to .ui-capture/web.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${TMPDIR:-/tmp}/feishin-build"
mkdir -p "$WORK"
rsync -a --delete --exclude node_modules --exclude .git --exclude .ui-capture --exclude out "$REPO/" "$WORK/"
cd "$WORK"
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build:web
rm -rf "$REPO/.ui-capture/web"
cp -R "$WORK/out/web" "$REPO/.ui-capture/web"
echo "built -> $REPO/.ui-capture/web"
