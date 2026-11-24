#!/usr/bin/env bash
# One-time setup: install tools/deps, (re)create + seed the database, build the app.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="$ROOT/.ui-capture/mise/data/shims:$PATH"
mise install
pnpm install --frozen-lockfile
source "$ROOT/.ui-capture/env.sh"
export HOME="$ROOT/.ui-capture/home"   # drizzle-kit writes into $HOME
mkdir -p "$HOME"

node "$ROOT/.ui-capture/stubs/server.mjs" & STUB=$!
trap 'kill $STUB 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do curl -sf -o /dev/null http://127.0.0.1:4488/health && break; sleep 0.2; done

if [ "${RESEED:-1}" = "1" ]; then
  # fresh database file through the app's own migrations + seed script
  kill $STUB; wait $STUB 2>/dev/null || true
  rm -f "$ROOT/.ui-capture/data/devterms.db"* "$ROOT/.ui-capture/data/search-index.json"
  node "$ROOT/.ui-capture/stubs/server.mjs" & STUB=$!
  for _ in $(seq 1 50); do curl -sf -o /dev/null http://127.0.0.1:4488/health && break; sleep 0.2; done
  pnpm exec drizzle-kit migrate
  node --import tsx "$ROOT/.ui-capture/seed/seed.ts"
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  pnpm build
fi
