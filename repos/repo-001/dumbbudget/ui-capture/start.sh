#!/usr/bin/env bash
# Starts DumbBudget (Express server, JSON-file storage in ./data) on $PORT (default 4418).
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-4418}"
export BASE_URL="http://localhost:${PORT}"
export DUMBBUDGET_PIN="${DUMBBUDGET_PIN:-2468}"
export CURRENCY="${CURRENCY:-USD}"
export SITE_TITLE="${SITE_TITLE:-DumbBudget}"
export NODE_ENV=production
export DUMB_SECRET="${DUMB_SECRET:-local-placeholder-secret}"
# Restore seeded data if missing
if [ ! -s data/transactions.json ] && [ -s .ui-capture/seed-data/transactions.json ]; then
  mkdir -p data && cp .ui-capture/seed-data/transactions.json data/transactions.json
fi
exec node server.js
