#!/bin/sh
u="$1"; f=$(echo "$u" | sed "s#https://registry.npmjs.org/##; s#/-/#__#; s#/#_#g")
[ -s "$f" ] || curl -sSf --retry 8 --retry-all-errors --retry-delay 1 -o "$f" "$u" || echo "FAIL $u"
