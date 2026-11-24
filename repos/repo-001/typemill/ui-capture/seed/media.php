<?php
// Generates screenshot-style illustrations with GD into Typemill's media folders (original / live 820px / thumbs 250x150)
function ll_mockup($file, $title, $accent, $kind, $root) {
    $W = 1640; $H = 980;
    $im = imagecreatetruecolor($W, $H);
    $hex = fn($h) => imagecolorallocate($im, hexdec(substr($h,1,2)), hexdec(substr($h,3,2)), hexdec(substr($h,5,2)));
    $bg = $hex('#f6f7f9'); $white = $hex('#ffffff'); $line = $hex('#e2e5ea'); $text = $hex('#2b3340'); $muted = $hex('#9aa3af'); $acc = $hex($accent); $side = $hex('#1f2a37');
    $green = $hex('#16a34a'); $red = $hex('#dc2626'); $amber = $hex('#d97706');
    imagefill($im, 0, 0, $bg);
    imagefilledrectangle($im, 0, 0, 240, $H, $side);
    imagefilledrectangle($im, 30, 34, 70, 74, $acc);
    for ($i = 0; $i < 8; $i++) imagefilledrectangle($im, 30, 130 + $i * 56, 30 + 120 + ($i * 37) % 60, 142 + $i * 56, $i == 2 ? $acc : $hex('#475569'));
    imagefilledrectangle($im, 240, 0, $W, 90, $white); imageline($im, 240, 90, $W, 90, $line);
    imagestring($im, 5, 280, 36, $title, $text);
    imagefilledrectangle($im, $W - 220, 26, $W - 40, 64, $acc); imagestring($im, 4, $W - 196, 37, 'New invoice', $white);
    mt_srand(crc32($file));
    if ($kind === 'dashboard') {
        foreach ([0,1,2,3] as $c) { $x = 280 + $c * 330; imagefilledrectangle($im, $x, 130, $x + 300, 260, $white); imagerectangle($im, $x, 130, $x + 300, 260, $line);
            imagestring($im, 3, $x + 20, 150, ['Cash in (30d)','Cash out (30d)','Overdue','Bank balance'][$c], $muted);
            imagestring($im, 5, $x + 20, 190, ['$48,210.00','$31,975.40','$6,420.00','$112,804.17'][$c], $c == 2 ? $red : $text); }
        imagefilledrectangle($im, 280, 300, 1600, 900, $white); imagerectangle($im, 280, 300, 1600, 900, $line);
        for ($m = 0; $m < 12; $m++) { $h1 = mt_rand(120, 480); $h2 = mt_rand(80, 400); $x = 340 + $m * 104;
            imagefilledrectangle($im, $x, 860 - $h1, $x + 36, 860, $acc); imagefilledrectangle($im, $x + 42, 860 - $h2, $x + 78, 860, $hex('#cbd5e1'));
            imagestring($im, 3, $x + 20, 870, ['Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'][$m], $muted); }
    } else {
        imagefilledrectangle($im, 280, 130, 1600, 920, $white); imagerectangle($im, 280, 130, 1600, 920, $line);
        $cols = $kind === 'bank' ? ['Date','Description','Amount','Match'] : ['Number','Customer','Due','Amount','Status'];
        foreach ($cols as $i => $c) imagestring($im, 4, 310 + $i * 260, 155, $c, $muted);
        imageline($im, 280, 190, 1600, 190, $line);
        $cust = ['Juniper & Oak Studio','Harbor Lane Bakery','Northfield Dental','Kestrel Logistics','Blue Fern Yoga','Marlow & Finch LLP','Cobalt Bikes','Ortega Landscaping','Pinecrest HOA','Sunday Supply Co.','Atlas Physio','Riverbend Books'];
        $desc = ['STRIPE PAYOUT','ADOBE *CREATIVE CLD','AMZN Mktp US','TRANSFER FROM SAVINGS','GUSTO PAYROLL','WEWORK MEMBERSHIP','SHELL OIL 5741','HARBOR LANE BAKERY','GOOGLE *WORKSPACE','UPS 1Z884','DELTA AIR 0062','COMCAST BUSINESS'];
        for ($r = 0; $r < 12; $r++) { $y = 215 + $r * 56;
            if ($kind === 'bank') { $vals = [sprintf('Oct %02d', 28 - $r * 2), $desc[$r], sprintf('%s$%s', $r % 3 ? '-' : '', number_format(mt_rand(1200, 480000) / 100, 2)), ''];
                $st = ['Suggested','Rule','Reconciled','Find & match'][$r % 4]; $stc = [$amber, $acc, $green, $muted][$r % 4]; }
            else { $vals = [sprintf('INV-2026-%04d', 318 - $r), $cust[$r], sprintf('Nov %02d', 30 - $r * 2), '$' . number_format(mt_rand(15000, 940000) / 100, 2), ''];
                $st = ['Paid','Sent','Overdue','Viewed','Partially paid','Draft'][$r % 6]; $stc = [$green, $acc, $red, $amber, $amber, $muted][$r % 6]; }
            foreach ($vals as $i => $v) imagestring($im, 4, 310 + $i * 260, $y, $v, $text);
            $sx = 310 + (count($vals) - 1) * 260; imagefilledrectangle($im, $sx, $y - 6, $sx + 150, $y + 22, $stc); imagestring($im, 3, $sx + 12, $y, $st, $white);
            imageline($im, 280, $y + 38, 1600, $y + 38, $line); }
    }
    @mkdir("$root/media/original", 0775, true); @mkdir("$root/media/live", 0775, true); @mkdir("$root/media/thumbs", 0775, true);
    imagepng($im, "$root/media/original/$file");
    $live = imagescale($im, 820, 490, IMG_BICUBIC); imagepng($live, "$root/media/live/$file");
    $th = imagecreatetruecolor(250, 150); imagecopyresampled($th, $im, 0, 0, 0, 0, 250, 150, $W, (int)($W * 150 / 250)); imagepng($th, "$root/media/thumbs/$file");
}
