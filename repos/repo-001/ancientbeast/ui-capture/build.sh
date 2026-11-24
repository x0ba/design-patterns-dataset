#!/usr/bin/env bash
# Builds the static production bundle into .ui-capture/out.
# - Optional seeded match: if .ui-capture/seed/match.ab exists, it is passed to the
#   build as DEBUG_GAME_LOG (the game's own "load a game log on start" mechanism).
# - External calls are redirected to local files inside out/:
#     icono CDN stylesheet  -> ./vendor/icono.min.css
#     Open Collective feed  -> ./stub/opencollective/members-all.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CAP="$ROOT/.ui-capture"
OUT="$CAP/out"
cd "$ROOT"

if [ -f "$CAP/seed/match.ab" ]; then
	export DEBUG_MODE=true
	export DEBUG_GAME_LOG="$(cat "$CAP/seed/match.ab")"
	echo "Building with seeded match log ($(wc -c <"$CAP/seed/match.ab") bytes)"
fi

bun run build

rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a --exclude '*.map' deploy/ "$OUT/"

# Vendored stylesheet instead of the CDN copy.
mkdir -p "$OUT/vendor"
cp "$CAP/vendor/icono.min.css" "$OUT/vendor/"
sed -i '' 's#https://icono-49d6.kxcdn.com/icono.min.css#./vendor/icono.min.css#' "$OUT/index.html"

# Open Collective members feed -> local stub file.
node "$CAP/gen-opencollective.mjs" "$OUT"
grep -l 'opencollective.com/ancientbeast/members/all.json' "$OUT"/*.js | while read -r f; do
	sed -i '' 's#https://opencollective.com/ancientbeast/members/all.json#./stub/opencollective/members-all.json#g' "$f"
done

# Fast-forward the seeded replay (see replay-fastforward.js).
if [ -f "$CAP/seed/match.ab" ]; then
	cp "$CAP/replay-fastforward.js" "$OUT/"
	perl -0pi -e 's#</body>#  <script src="./replay-fastforward.js"></script>\n  </body>#' "$OUT/index.html"
fi

echo "Static build ready in $OUT"
