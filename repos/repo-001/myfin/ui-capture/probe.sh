# Dev check: log in through the proxy and hit the main read endpoints
B=${B:-http://localhost:5419/api}
S=$(curl -s -XPOST $B/auth/ -H "Content-Type: application/json" -d '{"username":"marta","password":"myfin-demo-2026"}')
K=$(echo "$S" | node -pe 'JSON.parse(require("fs").readFileSync(0)).sessionkey')
for p in "$@"; do code=$(curl -s -o $TMPDIR/probe.out -w "%{http_code}" "$B$p" -H "sessionkey: $K" -H "authusername: marta"); echo "== $code $p ($(wc -c < $TMPDIR/probe.out)b)"; head -c ${CUT:-300} $TMPDIR/probe.out; echo; done
