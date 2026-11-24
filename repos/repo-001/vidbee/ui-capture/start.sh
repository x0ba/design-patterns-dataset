#!/usr/bin/env bash
# Start VidBee self-hosted API (SQLite) + production web server, with local stubs.
set -euo pipefail
CAP="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$CAP/.." && pwd)"
PORT="${PORT:-4426}"
API_PORT="${API_PORT:-$((PORT + 10000))}"

export VIDBEE_DOWNLOAD_DIR="$CAP/data/downloads"
export VIDBEE_DATA_DIR="$CAP/data/vidbee"
export VIDBEE_API_HOST=127.0.0.1
export VIDBEE_API_PORT="$API_PORT"
export VIDBEE_MAX_CONCURRENT=3
# Stubbed binaries: yt-dlp (metadata + simulated downloads) and ffmpeg (version probe).
export YTDLP_PATH="$CAP/stubs/bin/yt-dlp"
export FFMPEG_PATH="$CAP/stubs/bin"
export PATH="$CAP/stubs/bin:$PATH"

# Fresh seed on every start so dates stay relative to "now".
node "$CAP/seed.mjs"

# Network stub (feeds, thumbnails, GitHub release check) preloaded into the API only.
NODE_OPTIONS="--import=$CAP/stubs/network-stub.mjs" node "$ROOT/apps/api/dist/index.js" &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$API_PORT/health" >/dev/null 2>&1 && break
  sleep 0.5
done

export VIDBEE_API_URL_INTERNAL="http://127.0.0.1:$API_PORT"
export VIDBEE_WEB_HOST=0.0.0.0
export VIDBEE_WEB_PORT="$PORT"
cd "$ROOT/apps/web"
exec node server.mjs
