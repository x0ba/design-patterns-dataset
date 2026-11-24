<?php
// Writes Allsky's log files (normally /var/log/allsky.log etc. via rsyslog) into
// home/allsky/logs, and points config/monitorable_logs.json at them.
if (!isset($H)) {
	$H = dirname(__DIR__) . '/home/allsky';
	date_default_timezone_set('America/Denver');
}
@mkdir("$H/logs", 0775, true);
mt_srand(77);
$host = 'allsky-westcliffe';
$recs = json_decode(@file_get_contents("$H/tmp/seed_records.json"), true) ?: [];

function line($ts, $prog, $pid, $msg) {
	global $host;
	return date('Y-m-d\TH:i:s', $ts) . sprintf('.%06d', mt_rand(0, 999999)) . date('P', $ts) . " $host $prog" . "[$pid]: $msg\n";
}

$cut = strtotime('yesterday 12:00');
$cur = ''; $prev = '';
$pid = 4127;
$lastNight = null;
foreach ($recs as $r) {
	$t = $r['ts']; $m = $r['meta'];
	$out = '';
	if ($lastNight !== null && $lastNight !== $m['night']) {
		$out .= line($t - 30, 'allsky', $pid, $m['night'] ? '==========' : '==========');
		$out .= line($t - 30, 'allsky', $pid, $m['night'] ? "=== Starting nighttime capture ===" : "=== Starting daytime capture ===");
		$out .= line($t - 30, 'allsky', $pid, '==========');
		if (!$m['night']) {
			$out .= line($t - 29, 'allsky', $pid, 'Processing end of night data');
			$out .= line($t - 20, 'allsky', $pid, "endOfNight.sh: ===== Generating Keogram for {$r['day']}");
			$out .= line($t - 12, 'allsky', $pid, "endOfNight.sh: ===== Generating Startrails for {$r['day']}");
			$out .= line($t - 5, 'allsky', $pid, "endOfNight.sh: ===== Generating Timelapse for {$r['day']}");
		}
	}
	$lastNight = $m['night'];
	$exp = $m['exposure'] >= 1000 ? sprintf('%.3f sec', $m['exposure'] / 1000) : sprintf('%.3f ms', $m['exposure']);
	$out .= line($t, 'allsky', $pid, sprintf(' > Running: rpicam-still --output /home/pi/allsky/tmp/image.jpg --shutter %d --gain %.2f --awbgains 2.92,1.74 --immediate --nopreview --timeout 1 --rotation 180', (int)($m['exposure'] * 1000), $m['gain']));
	$out .= line($t + 1, 'allsky', $pid, sprintf("  > Saving %s image '%s', mean %.3f, exposure %s, gain %.2f", $m['night'] ? 'NIGHT' : 'DAY', $r['file'], $m['mean'], $exp, $m['gain']));
	$out .= line($t + 2, 'allsky', $pid, "saveImage.sh: Running postprocessing_" . ($m['night'] ? 'night' : 'day') . " flow (7 modules) in " . (mt_rand(380, 1450) / 1000) . "s");
	if (mt_rand(0, 40) === 0) {
		$out .= line($t + 3, 'allsky', $pid, "upload.sh: WARNING: Upload of image.jpg to skies.wetmountainobservers.org took 41 seconds");
	}
	if ($m['night'] && mt_rand(0, 70) === 0) {
		$out .= line($t + 2, 'allsky', $pid, "removeBadImages.sh: Removed bad image '" . $r['file'] . "': mean " . ($m['mean'] + 0.8) . " above high threshold 0.92 (headlights?)");
	}
	if ($t >= $cut) $cur .= $out; else if ($t >= $cut - 86400) $prev .= $out;
}
file_put_contents("$H/logs/allsky.log", $cur);
file_put_contents("$H/logs/allsky.log.1", $prev);

$per = '';
for ($t = strtotime('-1 day', time()) - (time() % 300); $t < time(); $t += 300) {
	$per .= line($t, 'allskperiodic', 4131, "periodic: Running postprocessing_periodic flow");
	$per .= line($t + 1, 'allskperiodic', 4131, sprintf("allsky_pistatus: CPU temp %.1fC, memory used %d%%, disk used 49.8%%", 41 + mt_rand(0, 90) / 10, 21 + mt_rand(0, 6)));
	if (($t / 300) % 12 === 0) $per .= line($t + 2, 'allskperiodic', 4131, "allsky_dewheater: Temperature 1.4C, dew point -3.9C, heater OFF");
}
file_put_contents("$H/logs/allskyperiodic.log", $per);

file_put_contents("$H/logs/lighttpd-error.log",
	date('Y-m-d H:i:s', strtotime('-13 days 03:42:10')) . ": (server.c.1939) server started (lighttpd/1.4.69)\n" .
	date('Y-m-d H:i:s', strtotime('-6 days 19:02:51')) . ": (mod_fastcgi.c.487) FastCGI-stderr:PHP message: PHP Warning:  Undefined array key \"remotewebsiteurl\" in /home/pi/allsky/html/includes/allskySettings.php on line 412\n" .
	date('Y-m-d H:i:s', strtotime('-9 days 21:14:09')) . ": (gw_backend.c.252) establishing connection failed: socket: unix:/run/php/php8.2-fpm.sock: Resource temporarily unavailable\n");

$ml = json_decode(file_get_contents("$H/config/monitorable_logs.json"), true);
foreach ($ml['logs'] as &$l) {
	$map = ['lighttpd' => "$H/logs/lighttpd-error.log", 'allsky' => "$H/logs/allsky.log",
		'allsky1' => "$H/logs/allsky.log.1", 'allskyperiodic' => "$H/logs/allskyperiodic.log"];
	if (isset($map[$l['id']])) $l['location'] = $map[$l['id']];
}
$mlJson = json_encode($ml, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
file_put_contents("$H/config/monitorable_logs.json", $mlJson);
file_put_contents("$H/config/myFiles/monitorable_logs.json", $mlJson);
echo "logs generated\n";
