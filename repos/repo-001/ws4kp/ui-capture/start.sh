#!/usr/bin/env bash
# Starts WeatherStar 4000+ locally on $PORT (default 4476), in the foreground.
# server.js stands in for the app's ASP.NET host: it serves the static site from the repo root
# and answers the app's /cors/?u=<url> proxy endpoint from local stubs of the NWS/NOAA/etc. services.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PORT="${PORT:-4476}"
exec node "$HERE/stub/server.js"
