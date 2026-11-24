# Dev check: run start.sh on a test port, probe it, stop it.
HERE="$(cd "$(dirname "$0")" && pwd)"
PORT=5519 "$HERE/start.sh" > "$HERE/start-test.log" 2>&1 &
SPID=$!
for i in $(seq 1 120); do curl -s localhost:5519/ >/dev/null 2>&1 && break; sleep 0.5; done
curl -s localhost:5519/ | grep -o "<title>.*</title>"
curl -s localhost:5519/budgets | grep -o "<title>.*</title>"
curl -s localhost:5519/api/ ; echo
S=$(curl -s -XPOST localhost:5519/api/auth/ -H "Content-Type: application/json" -d '{"username":"marta","password":"myfin-demo-2026"}')
echo "$S" | cut -c1-200; echo
K=$(echo "$S" | node -pe 'JSON.parse(require("fs").readFileSync(0)).sessionkey')
for p in "$@"; do echo "== $p"; curl -s "localhost:5519/api$p" -H "sessionkey: $K" -H "authusername: marta" | cut -c1-${CUT:-600}; echo; done
kill $SPID; wait $SPID 2>/dev/null
