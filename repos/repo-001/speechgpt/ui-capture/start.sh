#!/usr/bin/env bash
# Serves the built SpeechGPT UI plus the local OpenAI / analytics stubs on $PORT (default 4443).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export PORT="${PORT:-4443}"
exec bun "$HERE/server.ts"
