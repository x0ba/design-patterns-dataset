#!/usr/bin/env bash
# Rebuild the production bundle and assemble the standalone runtime (mirrors the repo's Dockerfile / CI).
set -euo pipefail
cd "$(dirname "$0")/.."
export NEXT_TELEMETRY_DISABLED=1
pnpm install --frozen-lockfile
pnpm build
rm -rf .next/standalone/.next/static .next/standalone/public
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public
