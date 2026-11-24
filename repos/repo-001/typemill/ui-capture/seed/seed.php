<?php
/**
 * Seeds Typemill with the content of an established help center ("Ledgerline Help Center").
 * Writes into Typemill's own flat-file storage format:
 *   content/<nn-folder>/index.(md|txt|yaml), <nn-page>.md (published), .txt (draft blocks, JSON), .yaml (meta)
 *   settings/users/<username>.yaml, settings/settings.yaml
 * Run with:  frankenphp php-cli .ui-capture/seed/seed.php   (server must be stopped or restarted afterwards)
 * The admin account itself is created through the real /tm/setup form (see seed.sh).
 */
$root = realpath(__DIR__ . '/../..');
require $root . '/system/vendor/autoload.php';
use Symfony\Component\Yaml\Yaml;

mt_srand(20250214);
$C = $root . '/content';

function rrmdir($d) { if (!is_dir($d)) return; foreach (scandir($d) as $f) { if ($f === '.' || $f === '..') continue; $p = "$d/$f"; is_dir($p) ? rrmdir($p) : unlink($p); } rmdir($d); }
function pid() { return bin2hex(random_bytes(8)); }
function desc($md) {
    foreach (preg_split("/\n\s*\n/", $md) as $p) {
        $p = trim($p);
        if ($p === '' || $p[0] === '#' || $p[0] === '!' || $p[0] === '|' || $p[0] === '*' || $p[0] === '-' || $p[0] === '`' || preg_match('/^\d+\./', $p) || $p[0] === '[') continue;
        $p = preg_replace('/\[([^\]]+)\]\([^)]+\)/', '$1', $p);
        $p = str_replace(['**', '`', "\n"], ['', '', ' '], $p);
        return mb_strlen($p) > 155 ? mb_substr($p, 0, 155) : $p;
    }
    return '';
}
function blocks($md) {
    // split markdown into editor blocks the way Typemill stores drafts (keeps fenced code together)
    $out = []; $buf = ''; $infence = false;
    foreach (explode("\n", $md) as $line) {
        if (str_starts_with(trim($line), '```')) $infence = !$infence;
        if (!$infence && trim($line) === '') { if (trim($buf) !== '') $out[] = rtrim($buf); $buf = ''; continue; }
        $buf .= ($buf === '' ? '' : "\n") . $line;
    }
    if (trim($buf) !== '') $out[] = rtrim($buf);
    return $out;
}
function yaml_write($file, $data) { file_put_contents($file, Yaml::dump($data, 4, 4)); }

$users = require __DIR__ . '/users.php';
$tree  = require __DIR__ . '/pages.php';

/* ---------- users ---------- */
$udir = $root . '/settings/users';
@mkdir($udir, 0775, true);
foreach ($users as $u) {
    $file = "$udir/{$u['username']}.yaml";
    $existing = is_file($file) ? Yaml::parseFile($file) : [];
    $data = array_merge($existing, $u);
    unset($data['plainpassword']);
    if (empty($existing['password'])) $data['password'] = password_hash($u['plainpassword'], PASSWORD_DEFAULT);
    yaml_write($file, $data);
}

/* ---------- settings ---------- */
$sfile = $root . '/settings/settings.yaml';
$settings = is_file($sfile) ? Yaml::parseFile($sfile) : [];
$settings = array_merge($settings, [
    'title' => 'Ledgerline Help Center',
    'author' => 'Ledgerline Docs Team',
    'copyright' => '©',
    'year' => '2025',
    'language' => 'en',
    'langattr' => 'en',
    'editor' => 'visual',
    'mailfrom' => 'docs@ledgerline.io',
    'mailfromname' => 'Ledgerline Docs',
    'favicon' => '',
    'logo' => '',
    'theme' => 'cyanine',
]);
yaml_write($sfile, $settings);

/* ---------- media ---------- */
require __DIR__ . "/media.php";
$IMAGES = [
    "dashboard-overview.png" => ["Dashboard", "#0d9488", "dashboard", "Welcome to Ledgerline"],
    "invoice-list.png" => ["Sales > Invoices", "#2563eb", "invoices", "Create and send an invoice"],
    "recurring-profiles.png" => ["Sales > Recurring", "#7c3aed", "invoices", "Recurring invoices"],
    "bank-feed-matching.png" => ["Banking > Business Checking ...4417", "#0d9488", "bank", "Reconcile transactions"],
    "bank-rules.png" => ["Banking > Rules", "#0891b2", "bank", "Bank rules"],
    "aged-receivables.png" => ["Reports > Aged receivables", "#ea580c", "invoices", "Aged receivables"],
    "connect-bank.png" => ["Banking > Add bank account", "#0d9488", "bank", "Connect a bank account"],
    "release-4-0-dashboard.png" => ["Dashboard (new in 4.0)", "#0d9488", "dashboard", "Ledgerline 4.0: a faster, redesigned app"],
    "reports-pnl.png" => ["Reports > Profit and loss", "#16a34a", "dashboard", "Profit and loss"],
];
$IMG_BY_TITLE = [];
foreach ($IMAGES as $file => [$t, $c, $k, $page]) { ll_mockup($file, $t, $c, $k, $root); $IMG_BY_TITLE[$page] = [$file, $t]; }
@mkdir("$root/media/files", 0775, true);
$csv = "Type,Name,Email,Currency,Invoice number,Invoice date,Due date,Description,Quantity,Unit price,Tax rate,Account\n";
$csv .= "invoice,Harbor Lane Bakery,accounts@harborlanebakery.com,USD,INV-1042,2026-09-01,2026-10-01,Website maintenance (September),1,450.00,0%,4000 Sales\n";
$csv .= "invoice,Northfield Dental,billing@northfielddental.com,USD,INV-1043,2026-09-03,2026-10-03,Bookkeeping retainer,1,1200.00,0%,4000 Sales\n";
file_put_contents("$root/media/files/ledgerline-import-template.csv", $csv);

/* ---------- content ---------- */
foreach (scandir($C) as $f) { if ($f === '.' || $f === '..') continue; is_dir("$C/$f") ? rrmdir("$C/$f") : unlink("$C/$f"); }

function writeItem($dir, $base, $item, $isFolder = false) {
    global $IMG_BY_TITLE;
    $md = trim($item['body']) . "\n";
    if (isset($IMG_BY_TITLE[$item['title']])) {
        [$img, $alt] = $IMG_BY_TITLE[$item['title']];
        $parts = preg_split("/\n\n/", $md, 3);
        if (count($parts) === 3) $md = $parts[0] . "\n\n" . $parts[1] . "\n\n![$alt](media/live/$img)\n\n" . $parts[2];
        if (str_starts_with($item['title'], 'Ledgerline 4')) $item['hero'] = $item['hero'] ?? "media/live/$img";
        if (isset($item['draft'])) $item['draft'] = $md;
    }
    $status = $item['status'] ?? 'published';
    $meta = [
        'pageid' => pid(),
        'navtitle' => $item['nav'] ?? $item['title'],
        'title' => $item['title'],
        'description' => $item['desc'] ?? desc($item['body']),
        'heroimage' => $item['hero'] ?? '',
        'owner' => $item['owner'] ?? 'dkowalski',
        'author' => $item['author'] ?? '',
        'modified' => $item['modified'],
        'created' => $item['created'],
        'time' => $item['time'] ?? sprintf('%02d-%02d-%02d', mt_rand(8, 18), mt_rand(0, 59), mt_rand(0, 59)),
        'hide' => $item['hide'] ?? false,
        'noindex' => $item['noindex'] ?? false,
    ];
    if (isset($item['manualdate'])) $meta['manualdate'] = $item['manualdate'];
    if (isset($item['allowedrole'])) { $meta['allowedrole'] = $item['allowedrole']; $meta['alloweduser'] = ''; }
    if (isset($item['reference'])) { $meta['reference'] = $item['reference']; $meta['referencetype'] = $item['referencetype']; }
    if ($isFolder) $meta['contains'] = $item['contains'] ?? 'pages';
    $out = ['meta' => $meta];
    if (isset($item['extra'])) $out = array_merge($out, $item['extra']);
    yaml_write("$dir/$base.yaml", $out);

    if ($status === 'published' || $status === 'modified') file_put_contents("$dir/$base.md", $md);
    if ($status === 'modified' || $status === 'draft') {
        $draft = $item['draft'] ?? $md;
        file_put_contents("$dir/$base.txt", json_encode(blocks($draft), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
    $t = strtotime($item['modified'] . ' 12:00');
    foreach (['md', 'txt', 'yaml'] as $e) if (is_file("$dir/$base.$e")) touch("$dir/$base.$e", $t);
}

function writeTree($dir, $children) {
    $i = 0;
    foreach ($children as $slug => $item) {
        $prefix = ($item['contains_parent'] ?? '') === 'posts' ? '' : sprintf('%02d-', $i);
        $i++;
        if (isset($item['children'])) {
            $sub = "$dir/" . sprintf('%02d-', $i - 1) . $slug;
            mkdir($sub, 0775, true);
            writeItem($sub, 'index', $item, true);
            if (($item['contains'] ?? 'pages') === 'posts') {
                foreach ($item['children'] as $pslug => $post) {
                    $base = date('YmdHi', strtotime($post['created'] . ' ' . str_replace('-', ':', $post['time'] ?? '09-30-00'))) . '-' . $pslug;
                    writeItem($sub, $base, $post);
                }
            } else {
                writeTree($sub, $item['children']);
            }
        } else {
            writeItem($dir, sprintf('%02d-', $i - 1) . $slug, $item);
        }
    }
}

$home = $tree['__home']; unset($tree['__home']);
writeItem($C, 'index', $home);
writeTree($C, $tree);

/* ---------- caches: let Typemill rebuild navigation / sitemap ---------- */
foreach (['data/navigation', 'cache'] as $d) {
    $p = "$root/$d";
    if (!is_dir($p)) continue;
    foreach (glob("$p/*") as $f) if (is_file($f) && basename($f) !== 'cyanine-custom.css') unlink($f);
}

$count = 0; $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($C, FilesystemIterator::SKIP_DOTS));
foreach ($it as $f) if ($f->getExtension() === 'yaml') $count++;
echo "Seeded $count content items and " . count($users) . " users.\n";
