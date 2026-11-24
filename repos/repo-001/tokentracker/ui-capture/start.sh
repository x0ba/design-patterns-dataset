#!/usr/bin/env bash
# Starts the TokenTracker local dashboard (the CLI's own `serve` command, which
# serves dashboard/dist + the local API) against a seeded, sandboxed HOME.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
PORT="${PORT:-4407}"
FAKE_HOME="$HERE/home"

# (Re)seed: data is regenerated relative to "now" so the dashboard's
# today / last-7-days views always have recent activity.
node "$HERE/seed/seed-all.cjs" "$FAKE_HOME"

export HOME="$FAKE_HOME"
export TOKENTRACKER_NO_TELEMETRY=1      # no heartbeat, no PostHog in the dashboard
export DO_NOT_TRACK=1
export PORT
# Launched from the user's main repo (affects only the context-health audit).
cd "$FAKE_HOME/code/ledger-api"
# Offline: no outbound proxy. (A proxy env makes the CLI relaunch itself.)
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy NO_PROXY no_proxy || true
# Provider stubs (Keychain + provider usage APIs) are preloaded into node.
export NODE_OPTIONS="--require $HERE/stubs/provider-stub.cjs ${NODE_OPTIONS:-}"
exec node "$REPO/bin/tracker.js" serve --no-sync --no-open --port "$PORT"
