#!/usr/bin/env bash
# Starts EdgeEver (self-hosted Bun server: Hono API + production web build, SQLite + local
# file storage) plus the local stub server (LLM + plugin registry), in the foreground.
# UI at http://localhost:${PORT:-4401}/  — sign in as maya / Fieldnotes-2026.
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/env.sh"
export PORT="${PORT:-4401}"
# Run from a fresh copy of the seeded data so every start looks the same.
RUN_DIR="$UI_CAPTURE_DIR/run-data"
rm -rf "$RUN_DIR"
cp -R "$UI_CAPTURE_DIR/seeded-data" "$RUN_DIR"
export EDGE_EVER_DATA_DIR="$RUN_DIR"
export EDGE_EVER_HOST=0.0.0.0

STUB_PORT="${STUB_PORT:-4499}" bun "$UI_CAPTURE_DIR/stub-server.mjs" &
STUB_PID=$!
cd "$REPO_ROOT"
bun scripts/self-hosted-server.mjs &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" "$STUB_PID" 2>/dev/null || true; }
trap cleanup INT TERM EXIT
wait "$SERVER_PID"
