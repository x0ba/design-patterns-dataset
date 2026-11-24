<?php
// Router for "php -S": reproduces the url aliases from config_repo/lighttpd.conf.repo
// so the WebUI behaves as it does under lighttpd on the Pi.
$H = getenv('ALLSKY_HOME');
$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

$aliases = [
	'/current/'          => "$H/tmp/current_images/",
	'/images/'           => "$H/images/",
	'/website/'          => "$H/html/allsky/",
	'/weblogs/'          => "$H/config/logs/weblogs/",
	'/documentation'     => "$H/html/docs",
	'/overlayTemplates'  => "$H/config/overlay/myTemplates",
	'/overlay'           => "$H/config/overlay",
];

if (str_starts_with($uri, '/overlay/config/')) {
	http_response_code(403);
	echo "403 Forbidden";
	return true;
}

foreach ($aliases as $prefix => $target) {
	if (strncmp($uri, $prefix, strlen($prefix)) !== 0) continue;
	$path = $target . substr($uri, strlen($prefix));
	if (str_contains($path, '..')) { http_response_code(403); return true; }
	if (is_dir($path)) {
		foreach (['index.php', 'index.html'] as $idx) {
			if (is_file(rtrim($path, '/') . "/$idx")) { $path = rtrim($path, '/') . "/$idx"; break; }
		}
	}
	if (!is_file($path)) {
		http_response_code(404);
		echo "404 Not Found";
		return true;
	}
	if (str_ends_with($path, '.php')) {
		chdir(dirname($path));
		$_SERVER['SCRIPT_FILENAME'] = $path;
		require $path;
		return true;
	}
	$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
	$types = [
		'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif',
		'webp' => 'image/webp', 'svg' => 'image/svg+xml', 'mp4' => 'video/mp4', 'webm' => 'video/webm',
		'json' => 'application/json', 'txt' => 'text/plain; charset=utf-8', 'html' => 'text/html; charset=utf-8',
		'css' => 'text/css', 'js' => 'application/javascript', 'ttf' => 'font/ttf', 'otf' => 'font/otf',
		'woff' => 'font/woff', 'woff2' => 'font/woff2', 'log' => 'text/plain; charset=utf-8',
	];
	header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
	header('Content-Length: ' . filesize($path));
	if ($prefix === '/current/' || $ext === 'json') {
		header('Cache-Control: no-cache, proxy-revalidate');
	}
	readfile($path);
	return true;
}

// Everything else: let the built-in server handle it from the document root.
return false;
