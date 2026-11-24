#!/usr/bin/env bash
# Starts the SubMiner stats dashboard (the app's browser UI) plus a local AnkiConnect stub.
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-4447}"
export ANKI_STUB_PORT="${ANKI_STUB_PORT:-18765}"
export BUN_TMPDIR="${BUN_TMPDIR:-$PWD/.ui-capture/cache/tmp}"
mkdir -p "$BUN_TMPDIR"
# Reset the live DB to the seeded snapshot so every run starts from the same state.
rm -f .ui-capture/data/immersion.sqlite .ui-capture/data/immersion.sqlite-wal .ui-capture/data/immersion.sqlite-shm
cp .ui-capture/data/immersion.seed.sqlite .ui-capture/data/immersion.sqlite

bun .ui-capture/anki-stub.ts &
STUB_PID=$!
bun .ui-capture/server.ts &
SRV_PID=$!
cleanup() { kill "$SRV_PID" "$STUB_PID" 2>/dev/null || true; }
trap cleanup INT TERM EXIT
wait "$SRV_PID"
