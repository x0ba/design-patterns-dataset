#!/usr/bin/env bash
# Starts Karakeep (production Next.js standalone server) plus the local
# OpenAI/Meilisearch stubs, in the foreground. Serves http://localhost:$PORT/.
set -euo pipefail
UI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$UI/.." && pwd)"
export PORT="${PORT:-4400}"
source "$UI/env.sh"
export NEXTAUTH_URL="http://localhost:${PORT}"
export HOSTNAME=0.0.0.0

if [ ! -f "$DATA_DIR/db.db" ]; then
  echo "No seeded database at $DATA_DIR; run .ui-capture/seed/run-seed.sh first" >&2
  exit 1
fi

# Pick free localhost ports for the stubs (preferring 4411/4412).
free_port() {
  node -e '
    const net = require("net");
    const tryPort = (p) => { const s = net.createServer(); s.once("error", () => tryPort(p + 1));
      s.listen(p, "127.0.0.1", () => { s.close(() => console.log(p)); }); };
    tryPort(Number(process.argv[1]));' "$1"
}
export OPENAI_STUB_PORT="$(free_port 4411)"
export MEILI_STUB_PORT="$(free_port $((OPENAI_STUB_PORT + 1)))"
export OPENAI_BASE_URL="http://127.0.0.1:${OPENAI_STUB_PORT}/v1"
export MEILI_ADDR="http://127.0.0.1:${MEILI_STUB_PORT}"

# Apply any pending migrations (no-ops on the seeded data).
(cd "$ROOT/packages/db" && node --import tsx migrate.ts)
(cd "$ROOT/apps/workers" && node --import tsx scripts/migrateQueue.ts)

PIDS=()
cleanup() { [ ${#PIDS[@]} -gt 0 ] && kill ${PIDS[@]} 2>/dev/null; true; }
trap cleanup EXIT
trap 'cleanup; exit 0' INT TERM

node "$UI/stubs/server.mjs" &
PIDS+=($!)
(cd "$ROOT/apps/web/.next/standalone/apps/web" && exec node server.js) &
WEB=$!
PIDS+=($WEB)
wait "$WEB"
