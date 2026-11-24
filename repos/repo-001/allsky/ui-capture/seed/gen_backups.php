<?php
// A few configuration backups (System page > Backups), as the WebUI makes them:
// <dirname(ALLSKY_HOME)>/allskybackups/allsky-config-backup-YYYYMMDD-HHMMSS.tar.gz
if (!isset($H)) {
	$H = dirname(__DIR__) . '/home/allsky';
	date_default_timezone_set('America/Denver');
}
$dir = dirname($H) . '/allskybackups';
@mkdir($dir, 0775, true);
foreach (glob("$dir/*.tar.gz") as $old) unlink($old);
foreach (['2026-06-14 20:51:09', '2026-09-03 09:12:44', '2026-10-30 18:02:31', date('Y-m-d H:i:s', strtotime('-9 days 21:20:15'))] as $when) {
	$ts = strtotime($when);
	$f = "$dir/allsky-config-backup-" . date('Ymd-His', $ts) . '.tar.gz';
	exec('tar -czf ' . escapeshellarg($f) . ' -C ' . escapeshellarg($H) .
		' config/settings.json config/cc.json config/modules config/overlay/config env.json 2>&1', $o, $rc);
	if ($rc === 0) touch($f, $ts);
}
echo "backups generated\n";
