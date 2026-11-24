#!/bin/sh
# Reproducible build of the static capture in ./.ui-capture/out
# (tools come from mise.toml; deps from yarn.lock via the offline mirror in ./.ui-capture/vendor).
set -e
cd "$(dirname "$0")/.."
ROOT=$PWD
export HOME="$ROOT/.ui-capture/home"   # yarn 1 must not read the sandboxed ~/.npmrc
mkdir -p "$HOME"
# yarn 1 walks parent dirs for .npmrc; run it through a symlink outside $HOME
ln -sfn "$ROOT" "${TMPDIR:-/tmp}/rath-link"
if [ ! -d node_modules ]; then
  yarn --cwd "${TMPDIR:-/tmp}/rath-link" install --frozen-lockfile --ignore-engines --offline
fi
export PATH="$ROOT/node_modules/.bin:$PATH"
# same steps as `yarn build` (utils -> scenegraph -> renderer -> client)
(cd packages/utils && tsc)
(cd packages/vega-scenegraph && rollup -c)
(cd packages/vega-renderer && rm -rf dist && rollup -c)
(cd packages/rath-client && PATH="$PWD/node_modules/.bin:$PATH" vite build)
# assemble
rm -rf .ui-capture/out
cp -R packages/rath-client/build .ui-capture/out
node .ui-capture/seed/gen-seed.mjs
mkdir -p .ui-capture/out/__seed
cp -R .ui-capture/seed/boot.js .ui-capture/seed/rath-seed.json .ui-capture/seed/geo .ui-capture/out/__seed/
# no-op stand-in for Vercel Web Analytics' /_vercel/insights/script.js (requested by inject() in main.tsx)
cp -R .ui-capture/stubs/_vercel .ui-capture/out/_vercel
# route the app entry through the seed/stub boot loader
node -e '
const fs=require("fs");const f=".ui-capture/out/index.html";let h=fs.readFileSync(f,"utf8");
h=h.replace(/<script type="module" crossorigin src="(\.\/assets\/index-[^"]+\.js)"><\/script>/,(m,src)=>`<link rel="modulepreload" crossorigin href="${src}">\n    <script type="module" src="./__seed/boot.js" data-app="${src}"></script>`);
if(!h.includes("__seed/boot.js")) throw new Error("entry script not found");fs.writeFileSync(f,h);'
echo "built .ui-capture/out"
