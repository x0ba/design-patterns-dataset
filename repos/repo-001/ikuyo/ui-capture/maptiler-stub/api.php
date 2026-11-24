<?php
// Local stand-in for api.maptiler.com REST endpoints used by the app.
// /geocoding/{query}.json -> MapTiler-style FeatureCollection, searched over
// country bboxes plus every place already saved in the Ikuyo database.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
if (! preg_match('#/geocoding/(.+)\.json$#', $path, $m)) {
    if (str_contains($path, '/metrics')) { http_response_code(204); exit; }
    http_response_code(404);
    echo json_encode(['message' => 'Not found in local MapTiler stub']);
    exit;
}
$q = trim(urldecode($m[1]));
$limit = (int) ($_GET['limit'] ?? 5) ?: 5;
$types = isset($_GET['types']) ? explode(',', $_GET['types']) : [];
$norm = fn ($s) => mb_strtolower(trim($s));
$nq = $norm($q);
$features = [];

foreach (json_decode(file_get_contents(__DIR__ . '/countries-gazetteer.json'), true) as $c) {
    $n = $norm($c['name']);
    if ($n === $nq || ($nq !== '' && (str_contains($n, $nq) || str_contains($nq, $n)))) {
        $features[] = ['score' => $n === $nq ? 1.0 : 0.8, 'text' => $c['name'], 'place_name' => $c['name'], 'type' => 'country', 'center' => $c['center'], 'bbox' => $c['bbox']];
    }
}
if (! $types || ! in_array('country', $types, true) || count($types) > 1) {
    $db = new PDO('sqlite:' . dirname(__DIR__, 2) . '/backend/database/database.sqlite');
    $rows = $db->query("SELECT location AS name, location_lat AS lat, location_lng AS lng FROM activities WHERE location_lat IS NOT NULL
        UNION SELECT location_destination, location_destination_lat, location_destination_lng FROM activities WHERE location_destination_lat IS NOT NULL
        UNION SELECT name || ', ' || COALESCE(address, ''), location_lat, location_lng FROM accommodations WHERE location_lat IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC);
    $seen = [];
    foreach ($rows as $r) {
        $n = $norm($r['name']);
        if ($nq === '' || isset($seen[$n])) continue;
        $words = array_filter(preg_split('/[\s,]+/u', $nq));
        $hits = count(array_filter($words, fn ($w) => str_contains($n, $w)));
        if ($hits === 0) continue;
        $seen[$n] = true;
        $lng = (float) $r['lng']; $lat = (float) $r['lat'];
        $features[] = ['score' => 0.5 + 0.4 * $hits / max(1, count($words)), 'text' => explode(',', $r['name'])[0], 'place_name' => $r['name'], 'type' => 'poi', 'center' => [$lng, $lat], 'bbox' => [$lng - 0.005, $lat - 0.004, $lng + 0.005, $lat + 0.004]];
    }
}
usort($features, fn ($a, $b) => $b['score'] <=> $a['score']);
$out = [];
foreach (array_slice($features, 0, $limit) as $i => $f) {
    $out[] = [
        'type' => 'Feature', 'id' => $f['type'] . '.' . substr(md5($f['place_name']), 0, 8),
        'text' => $f['text'], 'place_name' => $f['place_name'], 'place_type' => [$f['type']], 'place_type_name' => [$f['type']],
        'relevance' => round($f['score'], 3), 'center' => $f['center'], 'bbox' => $f['bbox'],
        'geometry' => ['type' => 'Point', 'coordinates' => $f['center']], 'properties' => ['ref' => 'local-stub'],
    ];
}
echo json_encode(['type' => 'FeatureCollection', 'features' => $out, 'query' => [$q], 'attribution' => '<a href="https://www.maptiler.com/copyright/">&copy; MapTiler</a> (local stub)']);
