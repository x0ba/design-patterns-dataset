#!/bin/sh
# Starts Leon's real server (HTTP API + web app) for the seeded "just-me" profile,
# with a local OpenRouter-compatible LLM stub loaded into the same Node process.
# The 2.0 web app is served at http://localhost:$PORT/web-app/
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CAP="$ROOT/.ui-capture"
PORT="${PORT:-4412}"
export LLM_STUB_PORT="${LLM_STUB_PORT:-4471}"
cd "$ROOT"

# ps shim: the sandbox forbids the setuid /bin/ps Leon uses for stale-process cleanup.
export PATH="$CAP/bin:$PATH"
export LEON_HOME="$CAP/leon-home"
export LEON_PROFILE="just-me"
# Development mode runs the TypeScript sources directly (as `pnpm dev:server`
# does) instead of requiring a compiled server/dist; it also skips the online
# update check.
export LEON_NODE_ENV="development"
# Leon reports its version from the npm script environment.
export npm_package_version="$(node -p "require('./package.json').version")"

PROFILE_DIR="$LEON_HOME/profiles/$LEON_PROFILE"
# Leon reads its listening port and provider endpoints from the profile config.
perl -0pi -e "s/(server:\n  host: [^\n]*\n  port: )\\d+/\${1}$PORT/; s#base_url: http://127.0.0.1:\\d+/api/v1#base_url: http://127.0.0.1:$LLM_STUB_PORT/api/v1#" "$PROFILE_DIR/config.yml"

# Re-seed the conversation archive on every start so relative dates (Today,
# Yesterday, last week...) stay anchored to the current day.
node "$CAP/seed.mjs"

exec node --import tsx --import "$CAP/llm-stub.mjs" server/src/index.ts
