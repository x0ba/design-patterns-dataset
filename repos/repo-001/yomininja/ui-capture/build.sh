#!/usr/bin/env bash
# Reproducible build of the renderer + compiled domain modules used by seed.js.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" && mise install
cd "$ROOT/yomininja-e"
# Native Electron deps are not needed for the browser UI; skip install scripts.
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --ignore-scripts --force --no-audit --no-fund
npm run grpc-types
# grpc/lens_proto/*.proto is not in the repo, so `npm run grpc-lens-types` cannot run;
# install a types-only shim so the renderer type check passes.
mkdir -p grpc/rpc/lens && cp "$ROOT/.ui-capture/lens_pb.shim.d.ts" grpc/rpc/lens/lens_pb.d.ts
NEXT_TELEMETRY_DISABLED=1 npx next build renderer
npx tsc -p electron-src || true   # emits main/ despite unrelated native-module type errors
node "$ROOT/.ui-capture/seed.js"
