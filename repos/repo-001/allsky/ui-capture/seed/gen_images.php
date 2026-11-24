<?php
// Generates 14 nights of all-sky images the way Allsky lays them out on disk:
//   images/YYYYMMDD/image-YYYYMMDDHHMMSS.jpg   (+ thumbnails/)
//   images/YYYYMMDD/keogram/keogram-YYYYMMDD.jpg (+ keogramthumbnail/)
//   images/YYYYMMDD/startrails/startrails-YYYYMMDD.jpg (+ startrailsthumbnail/)
//   images/YYYYMMDD/meteors/meteors-YYYYMMDDHHMMSS.jpg (+ -marked, .json, meteorsthumbnails/)
//   tmp/current_images/image.jpg  (the "live" image)
// Pictures are synthetic fisheye skies (stars rotating about the pole at 38°N, the Sangre de
// Cristo ridge on the western horizon, Westcliffe/Pueblo light domes, clouds and the moon).
// Included from seed.php ($H set) or run standalone.

if (!isset($H)) {
	$H = dirname(__DIR__) . '/home/allsky';
	date_default_timezone_set('America/Denver');
}
$IMG = "$H/images";
$FONT = dirname(__DIR__, 2) . '/config_repo/overlay/system_fonts/Arial_Bold.ttf';
$S = 900;            // image size (cropped, scaled HQ frame)
$R = 430;            // fisheye radius
$C = $S / 2;
$NIGHTS = (int)(getenv('SEED_NIGHTS') ?: 14);
$NIGHT_STEP = (int)(getenv('SEED_NIGHT_STEP') ?: 600);	// seconds between saved night images
$DAY_STEP = 1800;

mt_srand(20261117);

// ---- star catalogue: positions relative to the celestial pole (polar coords) + brightness
$poleAlt = 38.13;
$poleX = $C; $poleY = $C - $R * (90 - $poleAlt) / 90;   // north is up
$stars = [];
for ($i = 0; $i < 1100; $i++) {
	$d = sqrt(mt_rand() / mt_getrandmax()) * 1.7 * $R;
	$stars[] = [$d, mt_rand(0, 62831) / 10000, pow(mt_rand() / mt_getrandmax(), 3.2)];
}
// Milky Way band: stars clustered along a great-circle-ish arc
$mw = [];
for ($i = 0; $i < 1600; $i++) {
	$t = mt_rand(0, 10000) / 10000;
	$d = 0.15 * $R + $t * 1.25 * $R;
	$a = 2.2 + 0.9 * sin($t * 3.1) + (mt_rand(-100, 100) / 100) * 0.16 * (1 - abs($t - .5));
	$mw[] = [$d, $a, pow(mt_rand() / mt_getrandmax(), 5) * 0.6];
}
// Big Dipper (approx) near the pole, to make the sky recognisable
$dipper = [[0.38,0.2],[0.42,0.38],[0.47,0.52],[0.55,0.63],[0.68,0.6],[0.73,0.75],[0.62,0.83]];

// ---- horizon profile: mountains to the west (left), gentle hills elsewhere, a few trees
$horizon = [];
for ($k = 0; $k < 720; $k++) {
	$az = $k / 2;   // 0=N at top, 90=E at right? (fisheye from below: E is on the left; keep W on left = mountains)
	$m = 0;
	if ($az > 200 && $az < 330) {          // Sangre de Cristo range
		$x = ($az - 200) / 130;
		$m = 11 * sin($x * M_PI) + 2.2 * sin($x * 23) + 1.2 * sin($x * 57 + 1) + 2;
	} else {
		$m = 2.6 + 0.9 * sin($az * 0.21) + 0.5 * sin($az * 0.77);
	}
	if (($az > 95 && $az < 104) || ($az > 141 && $az < 146)) $m += 7 * (1 - abs(sin(($az) * 0.9)));  // trees
	$horizon[$k] = max(3, $m);
}

function skyPoint($d, $a, $rot) {
	global $poleX, $poleY;
	return [$poleX + $d * cos($a + $rot), $poleY + $d * sin($a + $rot)];
}

function horizonCut($x, $y) {
	global $C, $R, $horizon;
	$dx = $x - $C; $dy = $y - $C;
	$r = sqrt($dx * $dx + $dy * $dy);
	if ($r >= $R) return true;
	$az = fmod(rad2deg(atan2($dx, -$dy)) + 360, 360);
	$alt = 90 * (1 - $r / $R);
	return $alt < $horizon[(int)($az * 2) % 720] * 0.9;
}

// Returns: sun altitude (deg, approx), moon info
function sunAlt($ts) {
	$i = date_sun_info($ts, 38.13, -105.47);
	$noon = $i['transit'];
	$rise = $i['sunrise']; $set = $i['sunset'];
	$half = ($set - $rise) / 2;
	$x = ($ts - $noon) / $half;               // -1 at sunrise, +1 at sunset
	$max = 33;                                // mid-November noon altitude at 38N
	if (abs($x) <= 1) return $max * cos($x * M_PI / 2);
	$past = (abs($x) - 1) * $half / 3600;     // hours past sunset / before sunrise
	return -min(60, $past * 12.5);
}
function moonPhase($ts) {          // 0=new, 0.5=full
	$known = 1763064540;               // a new moon (2025-11-13 ~ 20:09 UT); approximate
	$syn = 29.530588 * 86400;
	return fmod(($ts - $known) / $syn + 10, 1.0);
}

function newCanvas() {
	global $S;
	$im = imagecreatetruecolor($S, $S);
	imagealphablending($im, true);
	imagefill($im, 0, 0, imagecolorallocate($im, 0, 0, 0));
	return $im;
}

function drawSkyGradient($im, $inner, $outer, $glowAz = null, $glowCol = null, $glowStr = 0) {
	global $C, $R;
	for ($r = $R; $r > 0; $r -= 10) {
		$t = $r / $R; $t = $t * $t;
		$col = [];
		for ($c = 0; $c < 3; $c++) $col[$c] = (int)($inner[$c] + ($outer[$c] - $inner[$c]) * $t);
		imagefilledellipse($im, $C, $C, 2 * $r, 2 * $r, imagecolorallocate($im, $col[0], $col[1], $col[2]));
	}
	if ($glowAz !== null) {
		// light dome near the horizon at azimuth glowAz
		$a = deg2rad($glowAz);
		$gx = $C + sin($a) * $R * 0.97; $gy = $C - cos($a) * $R * 0.97;
		for ($r = 220; $r > 10; $r -= 15) {
			$alpha = (int)(127 - $glowStr * (1 - $r / 260) * 0.35);
			imagefilledellipse($im, (int)$gx, (int)$gy, $r * 2, (int)($r * 1.3), imagecolorallocatealpha($im, $glowCol[0], $glowCol[1], $glowCol[2], max(0, min(127, $alpha))));
		}
	}
}

function drawHorizon($im, $col) {
	global $C, $R, $S, $horizon;
	$pts = [];
	for ($k = 0; $k < 720; $k += 2) {
		$az = deg2rad($k / 2);
		$r = $R * (1 - ($horizon[$k] / 90));
		$pts[] = (int)($C + sin($az) * $r); $pts[] = (int)($C - cos($az) * $r);
	}
	// fill everything outside the horizon line but inside the circle
	$mask = imagecreatetruecolor($S, $S);
	$key = imagecolorallocate($mask, 255, 0, 255);
	imagefill($mask, 0, 0, $key);
	imagefilledellipse($mask, $C, $C, 2 * $R + 2, 2 * $R + 2, imagecolorallocate($mask, $col[0], $col[1], $col[2]));
	imagefilledpolygon($mask, $pts, $key);
	imagecolortransparent($mask, $key);
	imagecopymerge($im, $mask, 0, 0, 0, 0, $S, $S, 100);
	imagedestroy($mask);
	// outside the fisheye circle: black
	$ring = imagecreatetruecolor($S, $S);
	$black = imagecolorallocate($ring, 0, 0, 0);
	$k2 = imagecolorallocate($ring, 255, 0, 255);
	imagefill($ring, 0, 0, $black);
	imagefilledellipse($ring, $C, $C, 2 * $R, 2 * $R, $k2);
	imagecolortransparent($ring, $k2);
	imagecopymerge($im, $ring, 0, 0, 0, 0, $S, $S, 100);
	imagedestroy($ring);
}

function drawStars($im, $rot, $vis) {
	global $stars, $mw, $dipper, $poleX, $poleY, $R;
	if ($vis <= 0.02) return;
	foreach ($mw as [$d, $a, $b]) {
		[$x, $y] = skyPoint($d, $a, $rot);
		if (horizonCut($x, $y)) continue;
		$v = (int)(70 + 120 * $b * $vis);
		imagesetpixel($im, (int)$x, (int)$y, imagecolorallocatealpha($im, $v, $v, (int)min(255, $v + 15), (int)(127 - 90 * $vis)));
	}
	foreach ($stars as [$d, $a, $b]) {
		[$x, $y] = skyPoint($d, $a, $rot);
		if (horizonCut($x, $y)) continue;
		$v = (int)(min(255, 135 + 170 * $b) * $vis);
		$tint = ($b > 0.5) ? (mt_rand(0, 1) ? [255, 235, 210] : [215, 230, 255]) : [255, 255, 255];
		$col = imagecolorallocate($im, (int)($tint[0] * $v / 255), (int)($tint[1] * $v / 255), (int)($tint[2] * $v / 255));
		if ($b > 0.55) imagefilledellipse($im, (int)$x, (int)$y, 3, 3, $col);
		else imagesetpixel($im, (int)$x, (int)$y, $col);
	}
	foreach ($dipper as [$dd, $aa]) {
		[$x, $y] = skyPoint($dd * $R, $aa * 6.2831, $rot);
		if (horizonCut($x, $y)) continue;
		$v = (int)(250 * $vis);
		imagefilledellipse($im, (int)$x, (int)$y, 4, 4, imagecolorallocate($im, $v, $v, $v));
	}
	// Polaris
	$v = (int)(240 * $vis);
	imagefilledellipse($im, (int)$poleX + 3, (int)$poleY + 2, 4, 4, imagecolorallocate($im, $v, $v, $v));
}

function drawMoon($im, $ts, $phase, $sunAlt) {
	global $C, $R;
	$illum = (1 - cos($phase * 2 * M_PI)) / 2;
	if ($illum < 0.08) return 0;
	// moon rises ~50 min later each day; position along an arc across the southern sky
	$transit = strtotime(date('Y-m-d', $ts) . ' 00:00') + 86400 * 0.5 + $phase * 86400;
	$h = (($ts - $transit) / 3600);
	while ($h > 12) $h -= 24.84;
	while ($h < -12) $h += 24.84;
	if (abs($h) > 6.2) return 0;
	$az = deg2rad(180 + $h * 15);
	$alt = 48 * cos($h / 6.2 * M_PI / 2);
	$r = $R * (1 - $alt / 90);
	$x = $C + sin($az) * $r; $y = $C - cos($az) * $r;
	for ($g = 90; $g > 8; $g -= 6) {
		imagefilledellipse($im, (int)$x, (int)$y, $g * 2, $g * 2, imagecolorallocatealpha($im, 200, 210, 230, (int)(127 - 30 * $illum * (1 - $g / 90))));
	}
	imagefilledellipse($im, (int)$x, (int)$y, 16, 16, imagecolorallocate($im, 255, 253, 240));
	return $illum * max(0, $alt / 48);
}

function drawClouds($im, $amount, $seed, $bright) {
	global $C, $R;
	if ($amount <= 0) return;
	mt_srand($seed);
	$n = (int)(40 * $amount);
	for ($i = 0; $i < $n; $i++) {
		$x = $C + mt_rand(-$R, $R); $y = $C + mt_rand(-$R, $R);
		$w = mt_rand(60, 220); $h = (int)($w * mt_rand(35, 70) / 100);
		for ($k = 0; $k < 4; $k++) {
			$col = imagecolorallocatealpha($im, $bright[0], $bright[1], $bright[2], 110 - (int)(18 * $amount));
			imagefilledellipse($im, $x + mt_rand(-30, 30), $y + mt_rand(-20, 20), $w, $h, $col);
		}
	}
	mt_srand();
}

function overlayText($im, $lines, $col = [255, 255, 255]) {
	global $FONT;
	$y = 30;
	$c = imagecolorallocate($im, $col[0], $col[1], $col[2]);
	foreach ($lines as $l) {
		imagettftext($im, 14, 0, 14, $y, $c, $FONT, $l);
		$y += 22;
	}
}

function makeThumb($src, $dst, $w = 100, $h = 75) {
	$im = imagecreatefromjpeg($src);
	$t = imagecreatetruecolor($w, $h);
	$sw = imagesx($im); $sh = imagesy($im);
	// keep aspect; crop to fit
	$scale = max($w / $sw, $h / $sh);
	$cw = (int)($w / $scale); $ch = (int)($h / $scale);
	imagecopyresampled($t, $im, 0, 0, (int)(($sw - $cw) / 2), (int)(($sh - $ch) / 2), $w, $h, $cw, $ch);
	@mkdir(dirname($dst), 0775, true);
	imagejpeg($t, $dst, 80);
	imagedestroy($im); imagedestroy($t);
}

// Render one sky frame. Returns [image resource, meta]
function renderFrame($ts, $weather) {
	global $C, $R;
	$alt = sunAlt($ts);
	$phase = moonPhase($ts);
	$im = newCanvas();
	$isNight = $alt < -6;
	$rot = 2 * M_PI * (($ts % 86164) / 86164.0);
	if ($alt > 0) {
		$b = min(1, $alt / 30);
		$inner = [(int)(40 + 50 * $b), (int)(95 + 60 * $b), (int)(170 + 50 * $b)];
		$outer = [(int)(150 + 40 * $b), (int)(185 + 30 * $b), 225];
		drawSkyGradient($im, $inner, $outer, 180 + ($ts - date_sun_info($ts, 38.13, -105.47)['transit']) / 240, [255, 250, 220], 90);
		drawClouds($im, $weather['clouds'], $weather['seed'] + $ts % 7919, [245, 245, 248]);
		$ground = [28, 33, 26];
	} else if ($alt > -12) {
		$t = ($alt + 12) / 12;   // 1 at horizon, 0 at -12
		$inner = [(int)(8 + 30 * $t), (int)(14 + 45 * $t), (int)(32 + 80 * $t)];
		$outer = [(int)(30 + 160 * $t), (int)(30 + 90 * $t), (int)(55 + 60 * $t)];
		drawSkyGradient($im, $inner, $outer, (int)date("G", $ts) >= 12 ? 245 : 110, [255, 150, 70], 120 * $t);
		drawStars($im, $rot, max(0, 1 - $t * 1.4) * (1 - $weather['clouds']));
		drawClouds($im, $weather['clouds'], $weather['seed'] + $ts % 7919, [(int)(60 + 120 * $t), (int)(55 + 90 * $t), (int)(70 + 70 * $t)]);
		$ground = [6, 7, 8];
	} else {
		drawSkyGradient($im, [4, 6, 14], [18, 20, 30], 72, [150, 120, 80], 60);
		$moonLight = drawMoon($im, $ts, $phase, $alt);
		$vis = (1 - $weather['clouds'] * 0.9) * (1 - 0.55 * $moonLight);
		drawStars($im, $rot, $vis);
		drawClouds($im, $weather['clouds'], $weather['seed'] + $ts % 7919, [(int)(55 + 60 * $moonLight), (int)(52 + 60 * $moonLight), (int)(58 + 60 * $moonLight)]);
		$ground = [3, 3, 4];
	}
	drawHorizon($im, $ground);

	// Exposure/gain like Allsky's auto-exposure would choose
	if ($alt > 0) {
		$exp = round(0.08 + (1 - min(1, $alt / 30)) * 2.4 + $weather['clouds'] * 0.6, 3);   // ms
		$gain = 1.00;
	} else if ($alt > -12) {
		$exp = round(min(45000, 5 * pow(10, (-$alt) / 3.3)), 3);
		$gain = round(min(16, 1 + max(0, -$alt - 4) * 1.7), 2);
	} else {
		$moon = (1 - cos(moonPhase($ts) * 2 * M_PI)) / 2;
		$exp = round(45000 - 26000 * $moon * 0.8 - 8000 * $weather['clouds'], 3);
		$gain = round(16 - 6 * $moon, 2);
	}
	$temp = round($weather['temp'] + ($alt > 0 ? 9 + $alt / 6 : 0) + 4.5 + mt_rand(-6, 6) / 10, 1);
	$mean = $alt > 0 ? round(0.48 + mt_rand(-40, 40) / 1000, 3) : round(0.16 + $weather['clouds'] * 0.06 + mt_rand(-15, 15) / 1000, 3);
	$stars = $alt < -12 ? (int)max(0, (1 - $weather['clouds']) * 1450 * (1 - 0.5 * ((1 - cos(moonPhase($ts) * 2 * M_PI)) / 2)) + mt_rand(-60, 60)) : 0;

	$expStr = $exp >= 1000 ? sprintf('%.3f sec', $exp / 1000) : sprintf('%.3f ms', $exp);
	overlayText($im, [
		date('d M Y  H:i:s', $ts),
		"Exposure: $expStr" . ($alt > 0 ? '' : ' (auto)'),
		sprintf('Gain: %.2f', $gain),
		sprintf('Sensor: %.1f°C   Mean: %.3f', $temp, $mean),
		$alt < -12 ? "Stars: $stars" : 'Westcliffe, CO',
	]);
	return [$im, ['exposure' => $exp, 'gain' => $gain, 'temp' => $temp, 'mean' => $mean, 'stars' => $stars,
		'sunalt' => round($alt, 2), 'night' => $isNight, 'moon' => round((1 - cos(moonPhase($ts) * 2 * M_PI)) / 2 * 100, 1)]];
}

// ------------------------------------------------------------- only refresh the live image?
// (start.sh does this so Live View shows the sky "now" whenever the WebUI is started)
if (!empty($ONLY_CURRENT) || getenv('SEED_ONLY_CURRENT')) {
	$t = time();
	[$im, $meta] = renderFrame($t, ['clouds' => 0.05, 'seed' => crc32(date('Ymd')), 'temp' => -5]);
	@mkdir("$H/tmp/current_images", 0775, true);
	imagejpeg($im, "$H/tmp/current_images/image.jpg", 85);
	return;
}

// ------------------------------------------------------------- weather per night
$now = time();
$weatherByNight = [];
$cloudPattern = [0.0, 0.05, 0.8, 0.35, 0.0, 0.0, 0.1, 0.95, 0.6, 0.0, 0.05, 0.25, 0.0, 0.15, 0.0, 0.3];
$records = [];   // for the database
$thisNight = date('Ymd', (int)date('G') < 12 ? strtotime('yesterday') : $now);

for ($n = $NIGHTS - 1; $n >= 0; $n--) {
	$dayTs = strtotime("$thisNight -$n days");
	$day = date('Ymd', $dayTs);
	$w = ['clouds' => $cloudPattern[$n % count($cloudPattern)], 'seed' => crc32($day), 'temp' => -6 + 5 * sin($n * 0.9) - $n * 0.15];
	$dir = "$IMG/$day";
	@mkdir("$dir/thumbnails", 0775, true);
	$sun = date_sun_info($dayTs + 43200, 38.13, -105.47);
	$times = [];
	// daytime images (saved), from shortly after sunrise to sunset
	for ($t = $sun['sunrise'] + 900; $t < $sun['sunset'] - 600; $t += $DAY_STEP) $times[] = $t;
	// night: from civil dusk to next morning's civil dawn
	$nextSun = date_sun_info($dayTs + 86400 + 43200, 38.13, -105.47);
	for ($t = $sun['civil_twilight_end'] - 1500; $t < $nextSun['civil_twilight_begin'] + 600; $t += $NIGHT_STEP) $times[] = $t;
	$times = array_values(array_filter($times, fn($t) => $t <= $now - 60));
	if (count($times) === 0) continue;

	$keoCols = [];
	$nightFrames = 0;
	$lastFile = null;
	foreach ($times as $i => $t) {
		$t += mt_rand(0, 40);
		[$im, $meta] = renderFrame($t, $w);
		$name = 'image-' . date('YmdHis', $t) . '.jpg';
		imagejpeg($im, "$dir/$name", 85);
		// keogram column = centre column of the frame
		$col = imagecreatetruecolor(1, 900);
		imagecopy($col, $im, 0, 0, 450, 0, 1, 900);
		$keoCols[] = $col;
		imagedestroy($im);
		makeThumb("$dir/$name", "$dir/thumbnails/$name");
		$records[] = ['ts' => $t, 'day' => $day, 'file' => $name, 'meta' => $meta];
		if ($meta['night']) $nightFrames++;
		$lastFile = "$dir/$name";
	}

	$complete = ($n > 0);   // tonight's products aren't made until the morning
	if ($complete && count($keoCols) > 4) {
		// ---- keogram
		$wid = count($keoCols) * 6;
		$keo = imagecreatetruecolor($wid, 900);
		foreach ($keoCols as $i => $c) imagecopyresized($keo, $c, $i * 6, 0, 0, 0, 6, 900, 1, 900);
		$white = imagecolorallocate($keo, 255, 255, 255);
		for ($i = 0; $i < count($times); $i += 6) {
			imagettftext($keo, 11, 0, $i * 6 + 2, 890, $white, $FONT, date('H', $times[$i]));
		}
		@mkdir("$dir/keogram", 0775, true);
		imagejpeg($keo, "$dir/keogram/keogram-$day.jpg", 88);
		imagedestroy($keo);
		makeThumb("$dir/keogram/keogram-$day.jpg", "$dir/keogramthumbnail/keogram-$day.jpg", 100, 75);

		// ---- startrails (arcs about the pole for the clear part of the night)
		$st = newCanvas();
		drawSkyGradient($st, [6, 8, 18], [20, 22, 34], 72, [150, 120, 80], 70);
		$span = 2 * M_PI * (($nextSun['civil_twilight_begin'] - $sun['civil_twilight_end']) / 86164) * (1 - $w['clouds']);
		$rot0 = 2 * M_PI * (($sun['civil_twilight_end'] % 86164) / 86164.0);
		foreach ($stars as [$d, $a, $b]) {
			if ($b < 0.3) continue;
			$v = (int)min(255, 70 + 170 * $b);
			$tint = $b > 0.5 ? [255, 225, 190] : [200, 220, 255];
			$col = imagecolorallocatealpha($st, (int)($tint[0] * $v / 255), (int)($tint[1] * $v / 255), (int)($tint[2] * $v / 255), 45);
			$startDeg = rad2deg($a + $rot0); $endDeg = $startDeg + rad2deg($span);
			imagesetthickness($st, $b > 0.5 ? 2 : 1);
			imagearc($st, (int)$poleX, (int)$poleY, (int)(2 * $d), (int)(2 * $d), (int)$startDeg, (int)$endDeg, $col);
		}
		drawHorizon($st, [3, 3, 4]);
		@mkdir("$dir/startrails", 0775, true);
		imagejpeg($st, "$dir/startrails/startrails-$day.jpg", 88);
		imagedestroy($st);
		makeThumb("$dir/startrails/startrails-$day.jpg", "$dir/startrailsthumbnail/startrails-$day.jpg", 100, 75);
	}
	foreach ($keoCols as $c) imagedestroy($c);

	// ---- meteors on a few clear nights (Leonids peak ~Nov 17)
	if ($w['clouds'] < 0.3 && in_array($n % 5, [0, 1, 3])) {
		@mkdir("$dir/meteors", 0775, true);
		$count = 1 + ($n % 3) + ($n <= 2 ? 2 : 0);
		mt_srand(crc32("m$day"));
		$nightStart = $sun['civil_twilight_end'] + 3600;
		for ($m = 0; $m < $count; $m++) {
			$t = $nightStart + mt_rand(0, 9 * 3600);
			if ($t > $now - 120) continue;
			[$im, $meta] = renderFrame($t, $w);
			$x1 = mt_rand(250, 650); $y1 = mt_rand(220, 600);
			$ang = mt_rand(0, 628) / 100; $len = mt_rand(60, 210);
			$x2 = (int)($x1 + cos($ang) * $len); $y2 = (int)($y1 + sin($ang) * $len);
			imagesetthickness($im, 2);
			imageline($im, $x1, $y1, $x2, $y2, imagecolorallocate($im, 225, 255, 230));
			imagesetthickness($im, 1);
			$base = 'meteors-' . date('YmdHis', $t);
			imagejpeg($im, "$dir/meteors/$base.jpg", 88);
			imagerectangle($im, min($x1, $x2) - 12, min($y1, $y2) - 12, max($x1, $x2) + 12, max($y1, $y2) + 12, imagecolorallocate($im, 255, 60, 60));
			imagejpeg($im, "$dir/meteors/$base-marked.jpg", 88);
			imagedestroy($im);
			makeThumb("$dir/meteors/$base.jpg", "$dir/meteorsthumbnails/$base.jpg", 200, 150);
			makeThumb("$dir/meteors/$base-marked.jpg", "$dir/meteorsthumbnails/$base-marked.jpg", 200, 150);
			file_put_contents("$dir/meteors/$base.json", json_encode([[
				'length' => (int)round(hypot($x2 - $x1, $y2 - $y1) * 2.8), 'angle' => round(rad2deg($ang), 1),
				'peak' => mt_rand(168, 251), 'p1' => [$x1 * 2.8 | 0, $y1 * 2.8 | 0], 'p2' => [$x2 * 2.8 | 0, $y2 * 2.8 | 0],
			]], JSON_PRETTY_PRINT));
		}
		mt_srand();
	}

	echo "  $day: " . count($times) . " images" . ($complete ? ", keogram, startrails" : " (tonight, in progress)") . "\n";

	if ($n === 0 && $lastFile) {
		@mkdir("$H/tmp/current_images", 0775, true);
		copy($lastFile, "$H/tmp/current_images/image.jpg");
	}
}

// Images for the database seeding step
$GLOBALS['SEED_RECORDS'] = $records;
file_put_contents("$H/tmp/seed_records.json", json_encode($records));
echo "images generated\n";
