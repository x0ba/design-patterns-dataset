<?php
// Builds the daily timelapse (images/YYYYMMDD/allsky-YYYYMMDD.mp4 + videothumbnail/),
// and tonight's mini-timelapse (tmp/current_images/mini-timelapse.mp4), the way
// Allsky's timelapse.sh does with ffmpeg (libx264, yuv420p).
if (!isset($H)) {
	$H = dirname(__DIR__) . '/home/allsky';
	date_default_timezone_set('America/Denver');
}
$ffmpeg = trim((string)shell_exec('mise which ffmpeg 2>/dev/null')) ?: 'ffmpeg';
$days = glob("$H/images/2*", GLOB_ONLYDIR);
sort($days);
$today = array_pop($days);	// tonight: no timelapse yet

foreach ($days as $dir) {
	$day = basename($dir);
	$out = "$dir/allsky-$day.mp4";
	if (!file_exists($out)) {
		$cmd = sprintf('%s -y -loglevel error -framerate 12 -pattern_type glob -i %s -vf scale=720:720 -c:v libx264 -preset veryfast -b:v 2000k -pix_fmt yuv420p %s 2>&1',
			escapeshellarg($ffmpeg), escapeshellarg("$dir/image-*.jpg"), escapeshellarg($out));
		exec($cmd, $o, $rc);
		if ($rc !== 0) { echo "ffmpeg failed for $day: " . implode("\n", $o) . "\n"; continue; }
	}
	// video thumbnail from a frame around local midnight
	$frames = glob("$dir/image-*.jpg"); sort($frames);
	$pick = $frames[0];
	foreach ($frames as $f) { if (preg_match('/image-\d{8}(23|00)\d{4}/', basename($f))) { $pick = $f; break; } }
	@mkdir("$dir/videothumbnail", 0775, true);
	$im = imagecreatefromjpeg($pick);
	$t = imagecreatetruecolor(200, 150);
	imagecopyresampled($t, $im, 0, 0, 0, 113, 200, 150, 900, 675);
	imagejpeg($t, "$dir/videothumbnail/allsky-$day.jpg", 82);
	echo "  timelapse $day\n";
}

if ($today) {
	$frames = glob("$today/image-*.jpg"); sort($frames);
	$frames = array_slice($frames, -30);
	$list = "$H/tmp/mini-list.txt";
	file_put_contents($list, implode("", array_map(fn($f) => "file '" . $f . "'\nduration 0.2\n", $frames)));
	$cmd = sprintf('%s -y -loglevel error -f concat -safe 0 -i %s -vf scale=480:480,fps=5 -c:v libx264 -pix_fmt yuv420p %s 2>&1',
		escapeshellarg($ffmpeg), escapeshellarg($list), escapeshellarg("$H/tmp/current_images/mini-timelapse.mp4"));
	exec($cmd, $o, $rc);
	@unlink($list);
	echo $rc === 0 ? "  mini-timelapse\n" : "mini-timelapse failed\n";
}
echo "videos generated\n";
