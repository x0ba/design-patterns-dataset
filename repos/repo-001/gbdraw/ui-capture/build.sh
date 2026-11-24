#!/usr/bin/env bash
# Rebuild the static bundle in .ui-capture/out from gbdraw/web (+ browser wheel),
# then add the session autoload script and the seeded session.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
cd "$REPO"
if ! ls gbdraw/web/gbdraw-*.whl >/dev/null 2>&1; then
  PATH="$HERE/venv/bin:$PATH" python tools/prepare_browser_wheel.py
fi
mkdir -p "$HERE/out"
rsync -a --delete --exclude '__init__.py' --exclude 'CLAUDE.md' --exclude '__pycache__' \
  --exclude 'cloudflare-worker.js' gbdraw/web/ "$HERE/out/"
cp "$HERE/tools/ui-capture-autoload.js" "$HERE/out/ui-capture-autoload.js"
mkdir -p "$HERE/out/ui-capture-data"
cp "$HERE"/data/*.gbdraw-session.json.gz "$HERE/out/ui-capture-data/" 2>/dev/null || true
python3 - "$HERE/out/index.html" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
tag = '    <script src="./ui-capture-autoload.js" defer></script>\n'
if 'ui-capture-autoload.js' not in s:
    s = s.replace('    <!-- GOOGLE_ANALYTICS_SCRIPT -->\n', '    <!-- GOOGLE_ANALYTICS_SCRIPT -->\n' + tag, 1)
    assert 'ui-capture-autoload.js' in s
open(p, 'w', encoding='utf-8').write(s)
PY
echo "built $HERE/out"
