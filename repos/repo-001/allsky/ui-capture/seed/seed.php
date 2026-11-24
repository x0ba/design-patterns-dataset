<?php
// Seeds the local Allsky install with the configuration of an established camera:
// an RPi HQ camera at a dark-sky site in Westcliffe, Colorado, running since spring 2026.
// Runs after setup_home.sh. Writes only into .ui-capture/home/allsky.
//   php seed.php            -> config + images + database
//   php seed.php config     -> only configuration

$UC = dirname(__DIR__);
$H = "$UC/home/allsky";
putenv("ALLSKY_HOME=$H");
date_default_timezone_set('America/Denver');
$what = $argv[1] ?? 'all';

function jread($f) { return json_decode(file_get_contents($f), true); }
function jwrite($f, $a) {
	file_put_contents($f, json_encode($a, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_PRESERVE_ZERO_FRACTION));
}

// ---------------------------------------------------------------- settings.json
// settings.json is a hard link to settings_RPi_HQ.json (created by createAllskyOptions.php).
$sf = "$H/config/settings.json";
$s = jread($sf);
$s = array_merge($s, [
	'latitude' => '38.13N',
	'longitude' => '105.47W',
	'angle' => -6,
	'location' => 'Westcliffe, Colorado — Wet Mountain Valley (IDA Dark Sky Community)',
	'owner' => 'Maren Okafor',
	'camera' => 'RPi HQ (IMX477)',
	'lens' => 'Arecont 1.55mm f/2.0 fisheye (M12)',
	'computer' => 'Raspberry Pi 5 (8 GB)',
	'equipmentinfo' => 'Pi 5 in an IP66 ABS box with a 4" acrylic dome; 12V dew heater on a DS18B20 thermostat',
	'temptype' => 'B',
	'locale' => 'en_US.UTF-8',
	'daystokeep' => 14,
	'savedaytimeimages' => true,
	'daydelay' => 60000,
	'nightdelay' => 15000,
	'nightmaxautoexposure' => 45000,
	'nightmaxautogain' => 16,
	'nightmean' => 0.17,
	'nightwbr' => 2.92,
	'nightwbb' => 1.74,
	'daywbr' => 2.92,
	'daywbb' => 1.74,
	'dayskipframes' => 3,
	'nightbin' => 1,
	'quality' => 92,
	'rotation' => 180,
	'imagecroptop' => 260,
	'imagecropbottom' => 260,
	'imagecropleft' => 788,
	'imagecropright' => 748,
	'imageremovebadhigh' => 0.92,
	'timelapsewidth' => 1920,
	'timelapseheight' => 1440,
	'timelapsebitrate' => 8000,
	'timelapsefps' => 30,
	'minitimelapsenumimages' => 60,
	'minitimelapsefrequency' => 5,
	'minitimelapsewidth' => 960,
	'minitimelapseheight' => 720,
	'keogramfontsize' => 3,
	'startrailsbrightnessthreshold' => 0.12,
	'uselocalwebsite' => true,
	'daystokeeplocalwebsite' => 30,
	'useremotewebsite' => true,
	'remotewebsiteurl' => 'https://skies.wetmountainobservers.org/allsky',
	'remotewebsiteimageurl' => 'https://skies.wetmountainobservers.org/allsky/image.jpg',
	'remotewebsiteimagedir' => 'allsky',
	'remotewebsiteprotocol' => 'sftp',
	'daystokeepremotewebsite' => 60,
	'showonmap' => true,
	'uselogin' => true,
	'liveviewmode' => 'scaled',
	'imagessortorder' => 'descending',
	'daytimeoverlay' => 'overlay-RPi_HQ-4056x3040-both.json',
	'nighttimeoverlay' => 'overlay-RPi_HQ-4056x3040-both.json',
	'debuglevel' => 1,
	'developermode' => false,
	'webuidatafiles' => '',
	'enabledatabase' => true,
	'databasetype' => 'sqlite',
	'lastchanged' => date('Y-m-d H:i:s', strtotime('-9 days 21:14:07')),
]);
// keep XX_END_XX last
$end = $s['XX_END_XX'] ?? true; unset($s['XX_END_XX']); $s['XX_END_XX'] = $end;
jwrite($sf, $s);

// ---------------------------------------------------------------- env.json (private values)
$envF = "$H/env.json";
$env = jread($envF);
$env = array_merge($env, [
	'REMOTEWEBSITE_HOST' => 'skies.wetmountainobservers.org',
	'REMOTEWEBSITE_PORT' => '22',
	'REMOTEWEBSITE_USER' => 'allskycam',
	'REMOTEWEBSITE_PASSWORD' => 'placeholder-not-a-real-password',
	'REMOTEWEBSITE_SSH_KEY_FILE' => '',
	'WEBUI_USERNAME' => 'admin',
	'WEBUI_PASSWORD' => password_hash('Westcliffe-Skies-2026', PASSWORD_DEFAULT),
]);
jwrite($envF, $env);

// ---------------------------------------------------------------- status & version info
jwrite("$H/config/status.json", ['status' => 'Running', 'timestamp' => date('Y-m-d H:i:s', strtotime('today 06:58:12'))]);
$ver = trim(file($UC . '/../version')[0]);
jwrite("$H/config/newestversion.json", ['version' => $ver, 'versionNote' => '', 'timestamp' => date('Y-m-d H:i:s')]);
file_put_contents("$H/config/piversion.txt", "Raspberry Pi 5 Model B Rev 1.0\n");
file_put_contents("$H/config/connected_cameras.txt", "camera\tRPi\t0\timx477\t0\tHQ\n");

// ---------------------------------------------------------------- local Website config
$wc = jread("$UC/../config_repo/configuration.json.repo");
if (is_array($wc)) {
	$repl = [
		'XX_ALLSKY_VERSION_XX' => $ver,
		'XX_LATITUDE_XX' => '38.13N',
		'XX_LONGITUDE_XX' => '105.47W',
	];
	$str = json_encode($wc, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
	$str = strtr($str, $repl);
	$wc = json_decode($str, true);
	if (isset($wc['config'])) {
		$wc['config']['title'] = 'Westcliffe Allsky';
		$wc['config']['location'] = 'Westcliffe, Colorado';
		$wc['config']['owner'] = 'Maren Okafor';
		$wc['config']['camera'] = 'RPi HQ (IMX477)';
		$wc['config']['lens'] = 'Arecont 1.55mm f/2.0 fisheye';
		$wc['config']['computer'] = 'Raspberry Pi 5 (8 GB)';
		$wc['config']['AllskyVersion'] = $ver;
		$wc['config']['latitude'] = '38.13N';
		$wc['config']['longitude'] = '105.47W';
		$wc['config']['equipmentinfo'] = $s['equipmentinfo'];
		$wc['config']['auroraMap'] = 'north';
	}
	$str = str_replace('XX_NEED_TO_UPDATE_XX', '', json_encode($wc, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
	$wc = json_decode($str, true);
	@unlink("$H/html/allsky/configuration.json");
	jwrite("$H/html/allsky/configuration.json", $wc);
	jwrite("$H/config/remote_configuration.json", $wc);
}

// ---------------------------------------------------------------- System Messages
$TAB = "\t";
$msgs = [
	['id' => 'AM_RM_UPLOAD', 'cmd' => '', 'type' => 'warning', 'date' => strtotime('-2 days 03:12:44'), 'count' => 3,
	 'msg' => 'Unable to upload startrails-' . date('Ymd', strtotime('-3 days')) . '.jpg to the Remote Website: connection timed out after 60 seconds (skies.wetmountainobservers.org:22).'],
	['id' => 'AM_NOTE', 'cmd' => '', 'type' => 'info', 'date' => strtotime('-1 day 07:05:10'), 'count' => 1,
	 'msg' => 'Dew heater module reported the dome 1.8&deg;C above dew point; heater duty cycle raised to 60%.'],
];
$lines = [];
foreach ($msgs as $m) {
	$lines[] = implode($TAB, [$m['id'], $m['cmd'], $m['type'], date('Y-m-d H:i:s', $m['date']), $m['count'], $m['msg'], '']);
}
file_put_contents("$H/config/messages.txt", implode("\n", $lines) . "\n");

// ---------------------------------------------------------------- earlier support logs
// (generated when the owner asked for help on GitHub over the summer)
@mkdir("$H/html/support", 0775, true);
$supports = [
	['support-allsky-discussion-4917-20260614211502.zip', "Allsky support log\nVersion: v2025.06.01_02\nCamera: RPi HQ\nIssue: images too green at night after switching to the Pi 5\n"],
	['support-allsky-issue-5122-20260903093011.zip', "Allsky support log\nVersion: v2026.10.01_01 (beta)\nCamera: RPi HQ\nIssue: startrails not uploaded to remote website after upgrade\n"],
	['support-allsky-type-none-20261029184447.zip', "Allsky support log\nVersion: v2026.10.01_01\nCamera: RPi HQ\n"],
];
foreach ($supports as [$name, $text]) {
	$z = new ZipArchive();
	if ($z->open("$H/html/support/$name", ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
		$z->addFromString('support.txt', $text);
		$z->close();
		preg_match('/(\d{14})/', $name, $m);
		touch("$H/html/support/$name", strtotime($m[1]));
	}
}

echo "config seeded\n";

if ($what === 'config') exit(0);

require __DIR__ . '/gen_images.php';
require __DIR__ . '/gen_database.php';
require __DIR__ . '/gen_videos.php';
require __DIR__ . '/gen_logs.php';
require __DIR__ . '/gen_backups.php';

touch("$H/.seeded");
echo "seed complete\n";
