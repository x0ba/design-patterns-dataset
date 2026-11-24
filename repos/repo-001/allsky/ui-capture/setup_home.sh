#!/bin/bash
# Builds a local "installed Allsky" tree in .ui-capture/home/allsky, the way
# install.sh would on a Pi, but pointing at this checkout's code.
#   - code dirs (scripts, config_repo, ...) are symlinks into the repo
#   - html/ and html/allsky/ are real dirs whose entries are symlinks into the repo,
#     so files the WebUI writes (website config, support logs...) stay out of the repo
#   - config/, images/, tmp/ are real, local dirs holding the seeded data
# Usage: setup_home.sh [--reset]
set -e
UC="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO="$( dirname "${UC}" )"
H="${UC}/home/allsky"

if [[ ${1} == "--reset" ]]; then
	rm -rf "${H}"
fi
mkdir -p "${H}"
cd "${H}"

for f in scripts config_repo variables.sh version version.json notificationImages server src assets; do
	ln -sfn "../../../${f}" "${f}"
done

# html: per-entry links
mkdir -p html html/allsky
for f in "${REPO}"/html/*; do
	b="$( basename "${f}" )"
	[[ ${b} == "allsky" ]] && continue
	ln -sfn "../../../../html/${b}" "html/${b}"
done
for f in "${REPO}"/html/allsky/*; do
	b="$( basename "${f}" )"
	[[ -e "html/allsky/${b}" && ! -L "html/allsky/${b}" ]] && continue
	ln -sfn "../../../../../html/allsky/${b}" "html/allsky/${b}"
done

mkdir -p html/support config/logs/weblogs config/myFiles/modules config/modules tmp/current_images tmp/extra tmp/aborts images darks logs

# variables.json, created like install.sh's create_variables_json(), with
# overrides for things that differ on a Mac (no /etc/os-release, no www-data user, no /var/log).
ME="$( stat -f %Su "${REPO}/html/index.php" )"
env -i /bin/bash -c "export ALLSKY_HOME='${H}'; \
	source '${H}/variables.sh' --force 2>/dev/null; \
	source '${H}/scripts/installUpgradeFunctions.sh' 2>/dev/null; env" \
	| grep -E '^ALLSKY_|^EXIT_' | sort > "${H}/tmp/vars.env"
php -n -r '
	$out = [];
	foreach (file($argv[1], FILE_IGNORE_NEW_LINES) as $l) {
		$p = strpos($l, "="); if ($p === false) continue;
		$k = substr($l, 0, $p); $v = substr($l, $p+1);
		if ($v === "true") $v = true; else if ($v === "false") $v = false;
		$out[$k] = $v;
	}
	$h = $argv[2];
	$out["ALLSKY_PI_OS"] = "bookworm";
	$out["ALLSKY_OWNER"] = $argv[3];
	$out["ALLSKY_GROUP"] = "staff";
	$out["ALLSKY_WEBSERVER_OWNER"] = $argv[3];
	$out["ALLSKY_WEBSERVER_GROUP"] = "staff";
	$out["ALLSKY_LOG"] = "$h/logs/allsky.log";
	$out["ALLSKY_PERIODIC_LOG"] = "$h/logs/allskyperiodic.log";
	$out["ALLSKY_MODULE_LOCATION"] = "$h/opt-allsky";
	$out["HOME"] = dirname(dirname($h));
	ksort($out);
	file_put_contents("$h/variables.json", json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
' "${H}/tmp/vars.env" "${H}" "${ME}"
rm -f "${H}/tmp/vars.env"
mkdir -p "${H}/opt-allsky/modules"

# Static files install.sh copies from config_repo.
for i in allskyvariables.json backup.json onewire.json devicemanager.json \
	suggested_modules.json monitorable_logs.json helpers.json helpers.md \
	editor_files.json editor_files.md RPi_camera_info.txt; do
	cp "${REPO}/config_repo/${i}.repo" "config/${i}"
done
rm -rf config/schema; cp -R "${REPO}/config_repo/schema" config/
[[ -f config/env.json ]] || cp "${REPO}/config_repo/env.json.repo" env.json
if [[ ! -d config/overlay/config ]]; then
	cp -R "${REPO}/config_repo/overlay" config/
	cp -R "${REPO}/config_repo/modules/." config/modules/
	mkdir -p config/overlay/myTemplates
fi

# Camera capabilities -> options.json + settings.json, using the repo's own generator
# (install.sh does this after running "capture_RPi -cc_file").
if [[ ! -f config/settings.json ]]; then
	cp "${UC}/seed/cc_RPi_HQ.json" config/cc.json
	ALLSKY_HOME="${H}" php -n -c "${UC}/php.ini" -d include_path=".:${H}/html/includes" \
		"${REPO}/scripts/createAllskyOptions.php" \
		--cc-file "${H}/config/cc.json" --options-file "${H}/config/options.json" \
		--settings-file "${H}/config/settings.json"
fi

echo "Home created at ${H}"
