<?php
// Usage: frankenphp php-cli gen-images.php <icons.json> <outdir>
// Draws a favicon per source (colored rounded square + initials) and a few
// thumbnails per "thumbnails" source. The stub web server serves these to selfoss.
[$_, $specFile, $out] = $argv;
$spec = json_decode(file_get_contents($specFile), true);
@mkdir("$out/icons", 0777, true);
@mkdir("$out/thumbs", 0777, true);
$font = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';

function hex($im, $hex, $alpha = 0) {
    [$r, $g, $b] = sscanf($hex, '#%02x%02x%02x');
    return imagecolorallocatealpha($im, $r, $g, $b, $alpha);
}

foreach ($spec['icons'] as $s) {
    $n = 128;
    $im = imagecreatetruecolor($n, $n);
    imagesavealpha($im, true);
    imagefill($im, 0, 0, imagecolorallocatealpha($im, 0, 0, 0, 127));
    $bg = hex($im, $s['color']);
    $r = 26;
    imagefilledrectangle($im, $r, 0, $n - $r - 1, $n - 1, $bg);
    imagefilledrectangle($im, 0, $r, $n - 1, $n - $r - 1, $bg);
    foreach ([[$r, $r], [$n - $r - 1, $r], [$r, $n - $r - 1], [$n - $r - 1, $n - $r - 1]] as [$cx, $cy]) {
        imagefilledellipse($im, $cx, $cy, $r * 2, $r * 2, $bg);
    }
    $text = $s['letter'];
    $size = strlen($text) > 1 ? 46 : 66;
    $box = imagettfbbox($size, 0, $font, $text);
    $w = $box[2] - $box[0];
    $h = $box[1] - $box[7];
    imagettftext($im, $size, 0, (int) (($n - $w) / 2 - $box[0]), (int) (($n + $h) / 2 - $box[1]), imagecolorallocate($im, 255, 255, 255), $font, $text);
    imagepng($im, "$out/icons/{$s['slug']}.png");
}

mt_srand(42);
foreach ($spec['thumbs'] as $t) {
    [$w, $h] = [800, 500];
    $im = imagecreatetruecolor($w, $h);
    $palette = $t['palette'];
    // vertical gradient
    [$r1, $g1, $b1] = sscanf($palette[0], '#%02x%02x%02x');
    [$r2, $g2, $b2] = sscanf($palette[1], '#%02x%02x%02x');
    for ($y = 0; $y < $h; $y++) {
        $k = $y / $h;
        imageline($im, 0, $y, $w, $y, imagecolorallocate($im, (int) ($r1 + ($r2 - $r1) * $k), (int) ($g1 + ($g2 - $g1) * $k), (int) ($b1 + ($b2 - $b1) * $k)));
    }
    if ($t['style'] === 'space') {
        for ($i = 0; $i < 400; $i++) {
            $c = imagecolorallocatealpha($im, 255, 255, 240, mt_rand(20, 110));
            $s = mt_rand(1, 3);
            imagefilledellipse($im, mt_rand(0, $w), mt_rand(0, $h), $s, $s, $c);
        }
        $pr = mt_rand(120, 260);
        $px = mt_rand(150, 650);
        $py = mt_rand(150, 400);
        for ($i = $pr; $i > 0; $i -= 2) {
            $k = $i / $pr;
            imagefilledellipse($im, $px - (int) ((1 - $k) * $pr * 0.3), $py - (int) ((1 - $k) * $pr * 0.3), $i * 2, $i * 2, hex($im, $palette[2 + (int) ((1 - $k) * 1.99)], (int) (30 * $k)));
        }
    } else {
        // food-ish: a table surface with a plate and a few round ingredients
        imagefilledellipse($im, $w / 2 + 10, $h / 2 + 14, 430, 430, imagecolorallocatealpha($im, 0, 0, 0, 90));
        imagefilledellipse($im, $w / 2, $h / 2, 420, 420, imagecolorallocate($im, 246, 243, 236));
        imagefilledellipse($im, $w / 2, $h / 2, 320, 320, hex($im, $palette[2]));
        for ($i = 0; $i < 14; $i++) {
            $a = mt_rand(0, 628) / 100;
            $d = mt_rand(0, 120);
            $s = mt_rand(26, 60);
            imagefilledellipse($im, (int) ($w / 2 + cos($a) * $d), (int) ($h / 2 + sin($a) * $d), $s, $s, hex($im, $palette[3 + $i % 2], mt_rand(0, 30)));
        }
        for ($i = 0; $i < 3; $i++) {
            imagefilledellipse($im, mt_rand(40, 160) + ($i % 2) * 600, mt_rand(60, 440), 70, 70, hex($im, $palette[3 + $i % 2], 20));
        }
    }
    imagejpeg($im, "$out/thumbs/{$t['name']}.jpg", 86);
}
echo 'icons: ', count($spec['icons']), ', thumbs: ', count($spec['thumbs']), "\n";
