#!/bin/sh
# Reproducible install/build (needs registry + GitHub network). Run from anywhere.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UC="$ROOT/.ui-capture"
cd "$ROOT"
mise install
# 1. JS deps exactly as pinned in the package-lock.json files (curl-based, see install-from-lock.js)
node "$UC/install-from-lock.js" frontend
node "$UC/install-from-lock.js" backend "fsevents,sqlite3,bcrypt"
# 2. Native modules: sqlite3 5.1.6 (official darwin-arm64 N-API prebuilt) instead of 4.2.0 (no arm64 prebuilt);
#    bcrypt -> bcryptjs (already a backend dependency, identical API) instead of native bcrypt 3.0.8.
N="$UC/native/node_modules"
if [ ! -f "$N/sqlite3/lib/binding/napi-v6-darwin-unknown-arm64/node_sqlite3.node" ]; then
  mkdir -p "$N/sqlite3/lib/binding"
  [ -f "$UC/native/sqlite3-5.1.6.tgz" ] || curl -sSfL -o "$UC/native/sqlite3-5.1.6.tgz" https://registry.npmjs.org/sqlite3/-/sqlite3-5.1.6.tgz
  [ -f "$UC/native/napi-v6-darwin-unknown-arm64.tar.gz" ] || curl -sSfL -o "$UC/native/napi-v6-darwin-unknown-arm64.tar.gz" https://github.com/TryGhost/node-sqlite3/releases/download/v5.1.6/napi-v6-darwin-unknown-arm64.tar.gz
  tar -xzf "$UC/native/sqlite3-5.1.6.tgz" -C "$N/sqlite3" --strip-components=1
  tar -xzf "$UC/native/napi-v6-darwin-unknown-arm64.tar.gz" -C "$N/sqlite3/lib/binding"
fi
rm -rf backend/node_modules/sqlite3 backend/node_modules/bcrypt
ln -sfn "$N/sqlite3" backend/node_modules/sqlite3
mkdir -p backend/node_modules/bcrypt
echo '{"name":"bcrypt","version":"3.0.8-bcryptjs","main":"index.js"}' > backend/node_modules/bcrypt/package.json
echo 'module.exports = require("bcryptjs"); // pure-JS bcrypt, same API' > backend/node_modules/bcrypt/index.js
# 3. backend env (placeholders) + production build of the Vue frontend (backend serves frontend/dist)
[ -f backend/.env ] || cp "$UC/backend.env" backend/.env
(cd frontend && node_modules/.bin/vue-cli-service build)
