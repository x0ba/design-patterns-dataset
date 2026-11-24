#!/usr/bin/env bash
# Builds the static site into .ui-capture/out
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
"$HERE/fetch-gems.sh" >/dev/null
# Browser-side CDN assets, vendored from npm (exact versions the templates reference).
mkdir -p "$HERE/cdn"
for pkg in bootstrap@5.3.8 font-awesome@4.5.0 netlify-cms@2.10.192; do
  d="$HERE/cdn/${pkg/@/-}"
  [ -d "$d" ] && continue
  (cd "$HERE/cdn" && npm pack "$pkg" >/dev/null && mkdir -p "$d" && tar xzf "${pkg/@/-}.tgz" -C "$d" --strip-components=1)
done
# Stage a copy of the repo so seeding never touches the checkout itself.
SRC="$HERE/site-src"
rsync -a --delete --exclude .git --exclude .ui-capture --exclude node_modules --exclude _site "$ROOT/" "$SRC/"
cp "$HERE/_config.ui-capture.yml" "$SRC/"
ruby "$HERE/seed/generate.rb" "$SRC"
cd "$SRC"
rm -rf "$HERE/out"
JEKYLL_ENV=production PAGES_REPO_NWO=timwis/jkan \
  ruby "$HERE/jekyll.rb" build --config _config.yml,_config.ui-capture.yml -d "$HERE/out"
# Serve the CDN assets (bootstrap, font-awesome; vendored from npm, byte-identical) locally.
mkdir -p "$HERE/out/_cdn"
rm -rf "$HERE/out/_cdn/"*
cp -R "$HERE/cdn/bootstrap-5.3.8/dist" "$HERE/out/_cdn/bootstrap"
mkdir -p "$HERE/out/_cdn/font-awesome"
cp -R "$HERE/cdn/font-awesome-4.5.0/css" "$HERE/cdn/font-awesome-4.5.0/fonts" "$HERE/out/_cdn/font-awesome/"
mkdir -p "$HERE/out/_cdn/netlify-cms"
cp "$HERE/cdn/netlify-cms-2.10.192/dist/netlify-cms.js" "$HERE/out/_cdn/netlify-cms/"
find "$HERE/out" -name '*.html' -print0 | xargs -0 sed -i '' \
  -e 's#https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/#/_cdn/bootstrap/#g' \
  -e 's#https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/#/_cdn/font-awesome/#g' \
  -e 's#https://unpkg.com/netlify-cms@^2.0.0/dist/netlify-cms.js#/_cdn/netlify-cms/netlify-cms.js#g'
echo "built $(find "$HERE/out" -name index.html | wc -l | tr -d ' ') pages"
