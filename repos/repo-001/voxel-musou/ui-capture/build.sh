#!/usr/bin/env bash
# Builds the static site into ./.ui-capture/out: the repo has no build step, so this copies the files the game
# serves (index.html, src/, vendor/) and adds the seeded-save script ahead of the game's module entry.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .ui-capture/out
mkdir -p .ui-capture/out
cp index.html .ui-capture/out/
cp -R src vendor .ui-capture/out/
find .ui-capture/out -name '*.check.mjs' -delete
node .ui-capture/gen-save.mjs
# load the seed before the game's own module (classic script runs first)
node -e '
const fs = require("fs"), f = ".ui-capture/out/index.html";
const h = fs.readFileSync(f, "utf8"), tag = "<script type=\"module\" src=\"./src/main.js\"></script>";
if (!h.includes(tag)) throw new Error("module entry not found");
fs.writeFileSync(f, h.replace(tag, "<script src=\"./seed-save.js\"></script>\n" + tag));
'
echo "built .ui-capture/out"
