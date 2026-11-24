#!/bin/bash
# Dev helper: start Dolt (MySQL-compatible) on 3406, run the given command, then stop Dolt.
HERE="$(cd "$(dirname "$0")" && pwd)"
export DOLT_ROOT_PATH="$HERE/dolt-home"
cd "$HERE/db"
dolt sql-server --config "$HERE/dolt-config.yaml" >> "$HERE/dolt.log" 2>&1 &
DPID=$!
trap 'kill $DPID 2>/dev/null; wait $DPID 2>/dev/null' EXIT
for i in $(seq 1 60); do (echo > /dev/tcp/127.0.0.1/3406) 2>/dev/null && break; sleep 0.5; done
cd "$HERE"
bash -c "$*"
