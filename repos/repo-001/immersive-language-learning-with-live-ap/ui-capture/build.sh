#!/bin/bash
# Builds the production front end (dist/) and rewrites the few external
# browser URLs in the built output so they hit local stubs served by run.py.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build

# Self-hosted fonts (copies of the Google Fonts the app requests)
mkdir -p .ui-capture/stub_static/fonts
for f in libre-baskerville-latin-400-normal libre-baskerville-latin-700-normal libre-baskerville-latin-400-italic; do
  cp .ui-capture/fonts/node_modules/@fontsource/libre-baskerville/files/$f.woff2 .ui-capture/stub_static/fonts/
done
for f in nunito-latin-400-normal nunito-latin-600-normal nunito-latin-700-normal; do
  cp .ui-capture/fonts/node_modules/@fontsource/nunito/files/$f.woff2 .ui-capture/stub_static/fonts/
done

python - "$ROOT/dist" <<'PY'
import sys, pathlib, re
dist = pathlib.Path(sys.argv[1])
idx = dist / "index.html"
html = idx.read_text()
html = html.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
html = html.replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', '')
html = re.sub(r'href="https://fonts\.googleapis\.com/css2\?[^"]*"', 'href="/__stub/fonts/fonts.css"', html)
html = html.replace('https://www.google.com/recaptcha/enterprise.js', '/__stub/recaptcha/enterprise.js')
if 'seed-prefs.js' not in html:
    html = html.replace('</head>', '  <script src="/__stub/seed-prefs.js"></script>\n</head>')
idx.write_text(html)
for js in (dist / "assets").glob("*.js"):
    s = js.read_text()
    s2 = s.replace("https://www.gstatic.com/images/branding/product/1x/google_cloud_48dp.png", "/__stub/img/google_cloud_48dp.svg")
    s2 = s2.replace("https://buttons.github.io/buttons.js", "/__stub/github-buttons.js")
    if s2 != s:
        js.write_text(s2)
print("post-processed", idx)
PY
