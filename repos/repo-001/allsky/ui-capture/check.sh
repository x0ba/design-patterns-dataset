#!/bin/bash
# Dev helper: start on $PORT (default 5491), log in, fetch the main pages, show sizes + PHP errors.
UC="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
P=${PORT:-5491}; B="http://127.0.0.1:$P"; CJ="$TMPDIR/cj.$$"; OUT="$TMPDIR/pages"; mkdir -p "$OUT"
PORT=$P perl -e 'alarm shift; exec @ARGV' 120 "$UC/start.sh" > "$TMPDIR/allsky-srv.$$.log" 2>&1 &
SP=$!
sleep 2
curl -s -c $CJ -b $CJ "$B/index.php?page=login" > $OUT/login.html
TOK=$(grep -oE 'name="csrf_token" value="[^"]+"' $OUT/login.html | sed 's/.*value="//;s/"//')
curl -s -c $CJ -b $CJ -o /dev/null -w "login: %{http_code} -> %{redirect_url}\n" \
	--data-urlencode "username=admin" --data-urlencode "password=Westcliffe-Skies-2026" --data-urlencode "csrf_token=$TOK" "$B/index.php?page=login"
for p in ${PAGES:-live_view list_days list_videos list_keograms list_startrails list_meteors configuration editor overlay module charts LAN_info WLAN_info wifi system auth_conf support}; do
	curl -s -c $CJ -b $CJ -o $OUT/$p.html -w "$p: %{http_code} %{size_download}B %{time_total}s\n" "$B/index.php?page=$p"
done
for u in $EXTRA; do curl -s -H "X-Requested-With: XMLHttpRequest" -c $CJ -b $CJ -o $OUT/extra.out -w "$u: %{http_code} %{size_download}B  " "$B$u"; head -c 300 $OUT/extra.out | tr -d "\n"; echo; done
kill $SP 2>/dev/null
grep -a -E "PHP (Fatal|Warning|Parse)|Uncaught|\[500\]" "$TMPDIR/allsky-srv.$$.log" | sort | uniq -c | head -30
