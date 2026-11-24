#!/usr/bin/env bash
# Installs client/ dependencies from its frozen lockfile.
# The sandbox forbids writing any .vscode/settings.json inside the repo, and
# hash-wasm ships one, so a plain `pnpm install` in client/ fails. Install in a
# scratch dir instead and copy node_modules over, leaving that one file out.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="${TMPDIR:-/tmp}/floe-client-install"
rm -rf "$SCRATCH" && mkdir -p "$SCRATCH"
cp "$ROOT/client/package.json" "$ROOT/client/pnpm-lock.yaml" "$ROOT/client/pnpm-workspace.yaml" "$SCRATCH/"
PNPM="$(cd "$ROOT" && mise which pnpm)"; NODE_BIN="$(cd "$ROOT" && dirname "$(mise which node)")"
(cd "$SCRATCH" && PATH="$NODE_BIN:$PATH" "$PNPM" install --frozen-lockfile)
rm -rf "$ROOT/client/node_modules"
rsync -a --exclude '.vscode/settings.json' "$SCRATCH/node_modules/" "$ROOT/client/node_modules/"
