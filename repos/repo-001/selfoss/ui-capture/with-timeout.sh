#!/usr/bin/env bash
# usage: with-timeout.sh SECONDS cmd...   (no coreutils `timeout` on macOS)
secs=$1; shift
exec perl -e 'alarm shift; exec @ARGV or die "exec: $!"' "$secs" "$@"
