#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(dirname "$HERE")"
W="$HERE/workspace/tidewater-eng"
export HOME="$HERE/home"
export NODE_OPTIONS="--import $HERE/home-shim.mjs"
mkdir -p "$HOME"
rm -rf "$HERE/workspace"
mkdir -p "$W"
cd "$W"
git init -q -b main
git config user.name "Maya Okafor"
git config user.email "maya@tidewater.io"
GIT_AUTHOR_DATE="2026-01-06T10:12:00-06:00" GIT_COMMITTER_DATE="2026-01-06T10:12:00-06:00" true
node "$REPO/packages/cli/dist/cli.mjs" init --no-mcp --no-skills --shared >/dev/null 2>&1
node "$REPO/packages/cli/dist/cli.mjs" seed --pack software-lifecycle --yes >/dev/null 2>&1
export GIT_AUTHOR_DATE="2026-01-06T10:12:00-06:00" GIT_COMMITTER_DATE="2026-01-06T10:12:00-06:00"
git add -A && git commit -q -m "Set up OpenKnowledge with the software-lifecycle pack"
unset GIT_AUTHOR_DATE GIT_COMMITTER_DATE
node "$HERE/seed/generate.mjs" "$W"
node "$HERE/seed/commit-history.mjs" "$W" "$HERE/workspace/seed-manifest.json"
echo "seeded $(find . -name '*.md' -not -path './.git/*' -not -path '*/.ok/*' -not -path './.claude/*' | wc -l) docs, $(git rev-list --count HEAD) commits"
