#!/usr/bin/env bash
# Wipes data/transactions.json, starts the server on ${SEED_PORT:-5419}, seeds via the API, snapshots the result.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f data/transactions.json .ui-capture/seed-data/transactions.json
PORT=${SEED_PORT:-5419} .ui-capture/start.sh > "${TMPDIR:-/tmp}/dumbbudget-seed.log" 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
for i in $(seq 1 50); do curl -s -o /dev/null http://localhost:${SEED_PORT:-5419}/login && break; sleep 0.2; done
node .ui-capture/seed.mjs http://localhost:${SEED_PORT:-5419} 2468
mkdir -p .ui-capture/seed-data && cp data/transactions.json .ui-capture/seed-data/transactions.json
