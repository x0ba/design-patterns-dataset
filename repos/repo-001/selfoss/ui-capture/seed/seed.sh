#!/usr/bin/env bash
# Rebuilds the seeded database from scratch and snapshots it into .ui-capture/seed/
# (start.sh restores that snapshot on every start). Needs nothing outside localhost.
set -euo pipefail
SEED="$(cd "$(dirname "$0")" && pwd)"
HERE="$(dirname "$SEED")"
ROOT="$(dirname "$HERE")"
SPORT=5437; PPORT=8901
WORK="$HERE/cache/seed-work"
rm -rf "$WORK"; mkdir -p "$WORK"

# Images (favicons + thumbnails) for the stub sites.
node -e '
import("'"$SEED"'/sources.mjs").then(({sources}) => {
  const icons = sources.map(s => ({slug: s.slug, color: s.color, letter: s.letter}));
  const thumbs = [];
  for (let i = 0; i < 6; i++) {
    thumbs.push({name: `orbital-${i}`, style: "space", palette: [["#020814","#0a1a3a","#1b2a4e"][i%3], ["#101c3d","#2b1846","#04121f"][i%3], ["#d98b4a","#c9d6e8","#e0b070"][i%3], ["#7a3b1d","#5b7da8","#8a5a2b"][i%3]]});
    thumbs.push({name: `harborkitchen-${i}`, style: "food", palette: [["#6b4a2f","#3e4a3d","#8a6a4f"][i%3], ["#4a3220","#2a3229","#5e4532"][i%3], ["#e8a33d","#c8553d","#f2d17a"][i%3], ["#7da34a","#f4e3c1","#a8432a"][i%3], ["#c0392b","#556b2f","#e67e22"][i%3]]});
  }
  require("fs").writeFileSync("'"$WORK"'/images.json", JSON.stringify({icons, thumbs}));
});'
frankenphp php-cli "$SEED/gen-images.php" "$WORK/images.json" "$WORK/img"

# Fresh database + data dirs.
rm -f "$ROOT"/data/sqlite/selfoss.db* "$ROOT"/data/favicons/*.png "$ROOT"/data/favicons/*.jpg "$ROOT"/data/thumbnails/*.png "$ROOT"/data/thumbnails/*.jpg "$ROOT"/data/cache/*.spc

export TMPDIR="$HERE/cache/tmp"; mkdir -p "$TMPDIR/sessions" "$HERE/cache/php-conf.d"
sed "s|@TMP@|$TMPDIR|g" "$HERE/php/selfoss.ini.in" > "$HERE/cache/php-conf.d/selfoss.ini"
export PHP_INI_SCAN_DIR="$HERE/cache/php-conf.d"

node "$SEED/stub-web.mjs" $PPORT "$WORK/img" > "$WORK/stub.log" 2>&1 & STUB=$!
PORT=$SPORT SELFOSS_KEEP_DB=1 "$HERE/start.sh" > "$WORK/server.log" 2>&1 & SRV=$!
trap 'kill $STUB $SRV 2>/dev/null || true' EXIT
for i in $(seq 1 50); do curl -sf "http://localhost:$SPORT/api/about" > /dev/null && break; sleep 0.2; done

node "$SEED/seed.mjs" "http://localhost:$SPORT" "http://127.0.0.1:$PPORT"

# Snapshot for start.sh.
sqlite_db="$ROOT/data/sqlite/selfoss.db"
frankenphp php-cli -r '$p=new PDO("sqlite:'"$sqlite_db"'"); $p->exec("PRAGMA wal_checkpoint(TRUNCATE)"); $p->exec("VACUUM");'
rm -rf "$SEED/favicons" "$SEED/thumbnails"; mkdir -p "$SEED/favicons" "$SEED/thumbnails"
cp "$sqlite_db" "$SEED/selfoss.db"
cp "$ROOT"/data/favicons/*.png "$SEED/favicons/" 2>/dev/null || true
cp "$ROOT"/data/thumbnails/* "$SEED/thumbnails/" 2>/dev/null || true
echo "snapshot: $(ls "$SEED/favicons" | wc -l) favicons, $(ls "$SEED/thumbnails" | wc -l) thumbnails"
