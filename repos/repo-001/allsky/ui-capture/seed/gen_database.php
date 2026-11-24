<?php
// Seeds the Allsky SQLite database (config/myFiles/allsky.db) with the tables the
// Python modules write (allsky_loadimage, allsky_pistatus, allsky_starcount,
// allsky_meteor, allsky_clearsky, startrails), one row per saved image / periodic run.
// Uses the image list written by gen_images.php (tmp/seed_records.json).

if (!isset($H)) {
	$H = dirname(__DIR__) . '/home/allsky';
	date_default_timezone_set('America/Denver');
}
$db = "$H/config/myFiles/allsky.db";
@mkdir(dirname($db), 0775, true);
@unlink($db);
$pdo = new PDO("sqlite:$db", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$records = json_decode(file_get_contents("$H/tmp/seed_records.json"), true);
mt_srand(4481);

$pdo->exec('CREATE TABLE "allsky_image" ("id" INT, "timestamp" int, "AS_CAMERAIMAGE" TEXT, "AS_DATE_NAME" TEXT,
	"AS_DAY_OR_NIGHT" TEXT, "AS_AUTOEXPOSURE" INT, "AS_AUTOGAIN" INT, "AS_RESOLUTION_X" INT, "AS_RESOLUTION_Y" INT,
	"AS_EXPOSURE_US" INT, "AS_EXPOSURE_MS" REAL, "AS_EXPOSURE_S" REAL, "AS_GAIN" REAL, "AS_TEMPERATURE_C" REAL,
	"AS_MEAN" REAL, PRIMARY KEY ("id"))');
$pdo->exec('CREATE TABLE "allsky_stars" ("id" INT, "timestamp" int, "AS_STARCOUNT" INT, "AS_STARIMAGE" TEXT, PRIMARY KEY ("id"))');
$pdo->exec('CREATE TABLE "allsky_meteors" ("id" INT, "timestamp" int, "AS_METEORCOUNT" INT, "AS_METEORIMAGE" TEXT, PRIMARY KEY ("id"))');
$pdo->exec('CREATE TABLE "allsky_clearsky" ("id" INT, "timestamp" int, "AS_CLEARSKYSTATE" TEXT, "AS_CLEARSKYSTATESTARS" INT, "AS_CLEARSKYSTATEFLAG" INT, PRIMARY KEY ("id"))');
$pdo->exec('CREATE TABLE "allsky_hardware" ("id" INT, "timestamp" int, "AS_CPUTEMP" REAL, "AS_CPUTEMP_C" REAL, "AS_CPUTEMP_F" REAL,
	"AS_PIMODEL" TEXT, "AS_DISKSIZE" REAL, "AS_DISKUSAGE" REAL, "AS_DISKFREE" REAL, "AS_DISKUSEDPERCENT" REAL, "AS_DISKFREEPERCENT" REAL,
	"AS_MEMORYTOTAL" INT, "AS_MEMORYUSED" INT, "AS_MEMORYAVAILABLE" INT, "AS_MEMORYUSEDPERCENTAGE" REAL, "AS_MEMORYFREEPERCENTAGE" REAL,
	"AS_UPTIME" TEXT, PRIMARY KEY ("id"))');
$pdo->exec('CREATE TABLE "allsky_startrails" ("id" int, "date" int, "directory" varchar(255), "minimum" float, "maximum" float,
	"mean" float, "median" float, "numImagesUsed" int, "numImagesNotUsed" int, "threshold" float, "starttime" int, "endtime" int, PRIMARY KEY ("id"))');

$pdo->beginTransaction();
$img = $pdo->prepare('INSERT INTO allsky_image VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$st = $pdo->prepare('INSERT INTO allsky_stars VALUES (?,?,?,?)');
$met = $pdo->prepare('INSERT INTO allsky_meteors VALUES (?,?,?,?)');
$cs = $pdo->prepare('INSERT INTO allsky_clearsky VALUES (?,?,?,?,?)');
$byDay = [];
foreach ($records as $r) {
	$m = $r['meta']; $ts = $r['ts'];
	$us = (int)round($m['exposure'] * 1000);
	$img->execute([$ts, $ts + 2, $r['file'], $r['day'], $m['night'] ? 'night' : 'day', 1, 1, 2520, 2520,
		$us, round($us / 1000, 3), round($us / 1e6, 6), $m['gain'], $m['temp'], $m['mean']]);
	if ($m['night']) {
		$st->execute([$ts, $ts + 3, $m['stars'], $r['file']]);
		$met->execute([$ts, $ts + 4, (mt_rand(0, 100) < 3 ? 1 : 0), $r['file']]);
		$clear = $m['stars'] > 400;
		$cs->execute([$ts, $ts + 4, $clear ? 'Clear' : 'Not Clear', $m['stars'], $clear ? 1 : 0]);
	}
	$byDay[$r['day']][] = $r;
}

// Pi status every 10 minutes for the period covered by the images
$hw = $pdo->prepare('INSERT INTO allsky_hardware VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$first = $records[0]['ts'] ?? time() - 14 * 86400;
$boot = strtotime('-13 days 03:41:00');
$disk = 58.2;
for ($t = $first - ($first % 600); $t < time(); $t += 600) {
	$hour = (int)date('G', $t);
	$ambient = -4 + 9 * sin(($hour - 9) / 24 * 2 * M_PI);
	$cpu = round(44 + $ambient * 0.6 + mt_rand(-15, 15) / 10 + (($hour >= 7 && $hour <= 9) ? 6 : 0), 1);   // timelapse/keogram run each morning
	$memUsed = (int)(1650 + mt_rand(0, 320) + (($hour >= 7 && $hour <= 8) ? 1400 : 0));
	$disk += 0.0011;
	$up = $t - $boot;
	if ($up < 0) { $up = $t - strtotime('-27 days'); }
	$d = intdiv($up, 86400); $h = intdiv($up % 86400, 3600); $mi = intdiv($up % 3600, 60);
	$hw->execute([$t, $t, $cpu, $cpu, round($cpu * 1.8 + 32, 1), 'Raspberry Pi 5 Model B Rev 1.0', 117.2, round($disk, 2),
		round(117.2 - $disk, 2), round($disk / 117.2 * 100, 1), round(100 - $disk / 117.2 * 100, 1),
		8059, $memUsed, 8059 - $memUsed, round($memUsed / 8059 * 100, 1), round(100 - $memUsed / 8059 * 100, 1),
		"$d days, $h hours, $mi minutes"]);
}

// Startrails statistics per completed night
$trail = $pdo->prepare('INSERT INTO allsky_startrails VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
$id = 1;
$days = array_keys($byDay); sort($days); array_pop($days);
foreach ($days as $day) {
	$night = array_values(array_filter($byDay[$day], fn($r) => $r['meta']['night']));
	if (!$night) continue;
	$means = array_map(fn($r) => $r['meta']['mean'], $night); sort($means);
	$used = count(array_filter($means, fn($v) => $v <= 0.12 + 0.1));
	$trail->execute([$id++, strtotime($day), $day, $means[0], end($means), round(array_sum($means) / count($means), 3),
		$means[intdiv(count($means), 2)], $used, count($means) - $used, 0.12, $night[0]['ts'], end($night)['ts']]);
}
$pdo->commit();
$n = $pdo->query('SELECT COUNT(*) FROM allsky_image')->fetchColumn();
echo "database seeded ($n image rows)\n";
