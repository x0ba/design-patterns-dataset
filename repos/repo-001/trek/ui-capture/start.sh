#!/usr/bin/env bash
# Starts TREK (NestJS API + built React client served from server/public) behind a small
# session proxy on $PORT, plus the local stand-in for outside services.
# Data: SQLite at .ui-capture/data/travel.db, seeded by .ui-capture/seed/*.mjs.
set -euo pipefail
export TREK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_PORT="${PORT:-4453}"
export PORT="$PUBLIC_PORT"
# env.sh derives APP_URL / ALLOWED_ORIGINS from the public port the browser uses.
. "$TREK_ROOT/.ui-capture/env.sh"

# Internal ports: whatever loopback ports are free right now (no fixed numbers to clash with).
read -r APP_PORT STUB_PORT < <(node -e '
  const net = require("node:net");
  const grab = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => ok(s)); });
  Promise.all([grab(), grab()]).then((ss) => { console.log(ss.map((s) => s.address().port).join(" ")); ss.forEach((s) => s.close()); });
')
export STUB_PORT
echo "[start] public :$PUBLIC_PORT  TREK 127.0.0.1:$APP_PORT  stub 127.0.0.1:$STUB_PORT"

PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

# Open-Meteo stand-in (the server's calls are routed to it by fetch-redirect.cjs)
node "$TREK_ROOT/.ui-capture/stub-server.mjs" &
PIDS+=($!)

# TREK itself, loopback only, on the internal port
( cd "$TREK_ROOT/server" && HOST=127.0.0.1 PORT=$APP_PORT exec node --require tsconfig-paths/register \
    --require "$TREK_ROOT/.ui-capture/fetch-redirect.cjs" dist/index.js ) &
SERVER_PID=$!
PIDS+=($SERVER_PID)

# Public port: hands the seeded user's remembered session to a fresh browser
PUBLIC_PORT=$PUBLIC_PORT APP_PORT=$APP_PORT node "$TREK_ROOT/.ui-capture/session-proxy.mjs" &
PIDS+=($!)

wait "$SERVER_PID"
