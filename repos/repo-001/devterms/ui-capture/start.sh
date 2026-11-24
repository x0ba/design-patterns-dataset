#!/usr/bin/env bash
# Starts DevTerms (Next.js production server) plus all local service stubs.
# UI: http://localhost:${PORT:-4475}/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="$ROOT/.ui-capture/mise/data/shims:$PATH"
source "$ROOT/.ui-capture/env.sh"
export PORT="${PORT:-4475}"

PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

# 1. Local stand-ins for Turso, Meilisearch, Upstash, GitHub OAuth, avatars, Plausible
node "$ROOT/.ui-capture/stubs/server.mjs" &
PIDS+=($!)
for _ in $(seq 1 50); do
  curl -sf -o /dev/null http://127.0.0.1:4488/health && curl -sf -o /dev/null http://127.0.0.1:4487/health && break
  sleep 0.2
done

# 2. Database: migrate + seed only if it does not exist yet (it ships pre-seeded)
if [ ! -s "$ROOT/.ui-capture/data/devterms.db" ] || ! curl -sf -X POST http://127.0.0.1:4488/v2/pipeline \
     -d '{"requests":[{"type":"execute","stmt":{"sql":"select count(*) from definitions"}}]}' | grep -q '"type":"ok"'; then
  echo "[start] seeding database"
  HOME="$ROOT/.ui-capture/home" pnpm exec drizzle-kit migrate
  node --import tsx "$ROOT/.ui-capture/seed/seed.ts"
fi

# 3. Drop Next's data cache so pages reflect the current database
rm -rf "$ROOT/.next/cache/fetch-cache"

# 4. The app itself (server-side GitHub API calls are redirected to the stub by a preload)
NODE_OPTIONS="--require $ROOT/.ui-capture/stubs/fetch-redirect.cjs" \
  node "$ROOT/node_modules/next/dist/bin/next" start -p "$PORT" -H 0.0.0.0 &
APP=$!
PIDS+=($APP)

# 5. Build the search index through the app's own cron endpoint once it is up
(
  for _ in $(seq 1 120); do
    if curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/v1/health"; then
      curl -sf -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:$PORT/api/cron/meilisearch" >/dev/null \
        && echo "[start] search index refreshed"
      break
    fi
    sleep 0.5
  done
) &

wait "$APP"
