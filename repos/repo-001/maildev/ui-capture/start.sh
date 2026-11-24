#!/usr/bin/env bash
# Starts MailDev (built CLI) + a local relay SMTP stub, then seeds it with
# ~4 months of realistic mail over SMTP. Foreground; Ctrl+C stops everything.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PORT="${PORT:-4405}"
SMTP_PORT="${SMTP_PORT:-1025}"
RELAY_PORT="${RELAY_PORT:-4426}"
MAIL_DIR="$HERE/maildir"

export TZ="${TZ:-America/Los_Angeles}"

# Fresh mail directory each start, so the seed (and its read/unread mix) is
# reproducible.
rm -rf "$MAIL_DIR"
mkdir -p "$MAIL_DIR"

pids=()
cleanup() {
  trap - EXIT INT TERM
  for p in ${pids[@]+"${pids[@]}"}; do kill "$p" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Stub for the outgoing relay SMTP server (used by the UI's "Relay" action)
RELAY_PORT="$RELAY_PORT" node "$HERE/relay-stub.mjs" &
pids+=($!)

# Seed in the background once the API is healthy
SMTP_PORT="$SMTP_PORT" WEB_URL="http://127.0.0.1:$PORT" node "$HERE/seed.mjs" &
pids+=($!)

cd "$ROOT"
node packages/cli/dist/bin/maildev.js \
  --web "$PORT" --web-ip 127.0.0.1 \
  --smtp "$SMTP_PORT" --ip 127.0.0.1 \
  --mail-directory "$MAIL_DIR" \
  --outgoing-host 127.0.0.1 --outgoing-port "$RELAY_PORT" \
  --mcp &
MAILDEV_PID=$!
pids+=($MAILDEV_PID)

# Exit (and clean up) as soon as MailDev itself stops
wait "$MAILDEV_PID"
