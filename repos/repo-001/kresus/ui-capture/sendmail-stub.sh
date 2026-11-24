#!/bin/sh
# Local stand-in for sendmail: Kresus' email reports/alerts are appended to a
# local mbox file instead of being delivered.
DIR="$(cd "$(dirname "$0")" && pwd)"
{ echo "From kresus $(date)"; cat; echo; } >> "$DIR/data/outbox.mbox"
exit 0
