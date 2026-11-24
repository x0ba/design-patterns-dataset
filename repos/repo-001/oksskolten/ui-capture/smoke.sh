#!/usr/bin/env bash
# Smoke test against a running start.sh: BASE=http://localhost:5435 .ui-capture/smoke.sh
BASE="${BASE:-http://localhost:4435}"
for i in $(seq 1 30); do curl -sf "$BASE/api/health" >/dev/null && break; perl -e 'select(undef,undef,undef,1)'; done
curl -s "$BASE/api/health"; echo
T=$(curl -s -X POST "$BASE/api/login" -H 'content-type: application/json' -d '{"email":"maya.lindqvist@fastmail.com","password":"fjellstue-2026"}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).token))')
A="Authorization: Bearer $T"
echo "feeds: $(curl -s "$BASE/api/feeds" -H "$A" | head -c 300)"
echo "search: $(curl -s "$BASE/api/articles/search?q=${Q:-kubernetes}" -H "$A" | head -c 300)"
echo "convs: $(curl -s "$BASE/api/chat/conversations" -H "$A" | head -c 200)"
echo "index: $(curl -s "$BASE/" | head -c 80)"
echo "favicon: $(curl -s "$BASE/__stub/favicons?domain=go.dev" | head -c 60)"
