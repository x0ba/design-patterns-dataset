#!/usr/bin/env bash
# Starts Invio (Deno/Hono backend + SvelteKit node frontend) fully offline.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CAP="$ROOT/.ui-capture"
export PATH="$CAP/mise/data/shims:$PATH"
PORT="${PORT:-4416}"
BACKEND_PORT="${BACKEND_PORT:-$((PORT + 1))}"
DATA_DIR="${INVIO_DATA_DIR:-$CAP/data}"
mkdir -p "$DATA_DIR"

# Start every run from the pre-seeded snapshot (built by seed/seed.sh via the app's API).
rm -rf "$DATA_DIR/invio.db" "$DATA_DIR/invio.db-journal" "$DATA_DIR/logos"
cp "$CAP/seed/invio.db" "$DATA_DIR/invio.db"
[ -d "$CAP/seed/logos" ] && cp -R "$CAP/seed/logos" "$DATA_DIR/logos"

export ADMIN_USER="${ADMIN_USER:-admin}"
export ADMIN_PASS="${ADMIN_PASS:-invio-demo-2026}"
export JWT_SECRET="${JWT_SECRET:-local-placeholder-jwt-secret-0f3a9c}"
export DATABASE_PATH="$DATA_DIR/invio.db"
export COOKIE_SECURE=false
export SESSION_TTL_SECONDS=43200
export RATE_LIMIT_ENABLED=false
export DENO_DIR="$CAP/deno-dir"
export DENO_NO_UPDATE_CHECK=1
# SMTP points at the local stub (stubs/smtp_stub.mjs)
export SMTP_HOST=127.0.0.1
export SMTP_PORT="${SMTP_STUB_PORT:-$((PORT + 2))}"
export SMTP_SECURE=false
export EMAIL_FROM_ADDRESS="billing@brightwater.studio"
export EMAIL_FROM_NAME="Brightwater Creative – Billing"

# PDF rendering: WeasyPrint 66.0 in a venv built from the mise-pinned Python
# (see weasyprint-requirements.txt); it loads Pango/Cairo from Homebrew.
if [ -x "$CAP/weasyprint-venv/bin/weasyprint" ]; then
  export WEASYPRINT_BIN="$CAP/weasyprint-venv/bin/weasyprint"
  export DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/lib:/usr/local/lib:/usr/lib"
fi

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

if [ -f "$CAP/stubs/smtp_stub.mjs" ]; then
  node "$CAP/stubs/smtp_stub.mjs" "$SMTP_PORT" &
  pids+=($!)
fi

( cd "$ROOT/backend" && BACKEND_PORT="$BACKEND_PORT" exec deno run --cached-only --no-lock \
    --config "$CAP/deno.vendor.json" \
    --allow-read --allow-write --allow-net --allow-env --allow-run src/app.ts ) &
pids+=($!)

for i in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1 && break
  sleep 0.5
done

cd "$ROOT/frontend"
PORT="$PORT" HOST=0.0.0.0 ORIGIN="http://localhost:$PORT" TRUSTED_ORIGINS="*" BODY_SIZE_LIMIT=10M \
  BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" COOKIE_SECURE=false \
  bun --no-install build/index.js &
pids+=($!)
wait
