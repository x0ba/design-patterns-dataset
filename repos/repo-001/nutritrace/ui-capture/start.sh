#!/bin/sh
# Starts NutriTrace (Express + SQLite + built Svelte PWA) in the foreground.
# Everything is pre-installed, pre-built and pre-seeded; no network needed.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

export PORT="${PORT:-4449}"
export NODE_ENV=production
export DB_PATH="$HERE/data/db/nutritrace.db"
export UPLOADS_PATH="$HERE/data/uploads"
export BACKUPS_PATH="$HERE/data/backups"
# Placeholder secrets (local only)
export JWT_SECRET="local-ui-capture-jwt-secret-0123456789abcdefghijklmnopqrstuvwxyz"
export TOKEN_ENC_KEY="local-ui-capture-token-enc-key-0123456789abcdef"
# Plain-HTTP localhost: drop the Secure cookie flag
export INSECURE_COOKIES=1
# No outbound calls: no GitHub release checks, no proxies
export UPDATE_CHECK=off
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy NO_PROXY no_proxy 2>/dev/null || true
export LOG_LEVEL=info
export TRACEAPPS_APP_VERSION=1.4.0
# Trace (AI assistant): server-side proxy to a local OpenAI-compatible stub
export AI_STUB_PORT="${AI_STUB_PORT:-4450}"
export AI_ENABLED=true
export AI_PROVIDER=oai-compat
export AI_BASE_URL="http://127.0.0.1:$AI_STUB_PORT"
export AI_MODEL=llama3.1:8b-instruct
export AI_API_KEY=sk-local-placeholder

# The seed is relative to "today". Re-seed (≈6 s, fully offline) if the DB is
# missing or was seeded on another day, so the diary always opens on a
# partly-logged current day with months of history behind it.
TODAY="$(node -e "process.stdout.write(new Date().toLocaleDateString('sv-SE'))")"
if [ ! -f "$DB_PATH" ] || [ "$(cat "$HERE/data/seeded-on.txt" 2>/dev/null)" != "$TODAY" ]; then
  echo "[start.sh] seeding database for $TODAY..."
  SEED_PORT=$((PORT + 17)) node "$HERE/seed.mjs"
fi

# Local stub for the AI provider (OpenAI-compatible) used by the Trace assistant
node "$HERE/stubs/ai-stub.mjs" &
STUB_PID=$!
trap 'kill $STUB_PID 2>/dev/null || true' EXIT INT TERM

cd "$ROOT/server"
node index.js &
APP_PID=$!
trap 'kill $STUB_PID $APP_PID 2>/dev/null || true' EXIT INT TERM
wait $APP_PID
