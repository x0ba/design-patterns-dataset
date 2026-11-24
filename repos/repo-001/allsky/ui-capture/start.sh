#!/bin/bash
# Starts the Allsky WebUI locally at http://localhost:${PORT:-4481}/
# (On a Pi it runs under lighttpd + php-fpm; here PHP's built-in server + router.php
#  reproduce the same document root and URL aliases.)
set -e
UC="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO="$( dirname "${UC}" )"
PORT="${PORT:-4481}"
H="${UC}/home/allsky"

cd "${REPO}"
# Resolve the mise-pinned php binary once (its shim would reset PATH and hide the stubs).
PHP="$( mise which php 2>/dev/null || command -v php )"
export PATH="$( dirname "${PHP}" ):${PATH}"
# Pi system commands (sudo, sunwait, vcgencmd, systemctl, free, ...) are local stubs.
export PATH="${UC}/stubs/bin:${PATH}"
export ALLSKY_HOME="${H}"
export ALLSKY_SESSIONS="${UC}/home/sessions"
export LANG="${LANG:-en_US.UTF-8}"
mkdir -p "${ALLSKY_SESSIONS}"

# (Re)create and seed the install tree if it is missing or was never fully seeded
# (normally it is already built; seeding from scratch takes a few minutes).
if [[ ! -f "${H}/.seeded" ]]; then
	bash "${UC}/setup_home.sh" --reset
	"${PHP}" -n -c "${UC}/php.ini" "${UC}/seed/seed.php"
fi

# Render the "live" camera image for the current time (as the capture program would).
SEED_ONLY_CURRENT=1 "${PHP}" -n -c "${UC}/php.ini" "${UC}/seed/gen_images.php" || true

# Keep the "newest version" check fresh so the WebUI doesn't try to reach GitHub.
touch "${H}/config/newestversion.json" 2>/dev/null || true
# Allsky's status is "Running" since this morning's restart.
"${PHP}" -n -c "${UC}/php.ini" -r '
	$f = $argv[1]; $s = json_decode(@file_get_contents($f), true) ?: [];
	$s["status"] = "Running"; $t = strtotime("today 06:58:12"); if ($t > time()) $t -= 86400;
	$s["timestamp"] = date("Y-m-d H:i:s", $t);
	file_put_contents($f, json_encode($s, JSON_PRETTY_PRINT));
' "${H}/config/status.json"

echo "Allsky WebUI: http://localhost:${PORT}/"
exec "${PHP}" -n -c "${UC}/php.ini" -S "0.0.0.0:${PORT}" -t "${H}/html" "${UC}/router.php"
