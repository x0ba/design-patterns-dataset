<?php
// Seeds Ikuyo with an established user's data. Run:
//   frankenphp php-cli .ui-capture/seed/seed.php
// Wipes app tables first, so it is safe to re-run.

$root = dirname(__DIR__, 2);
require $root . '/backend/vendor/autoload.php';
$app = require $root . '/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

require __DIR__ . '/lib.php';
mt_srand(20261116);

DB::statement('PRAGMA foreign_keys = OFF');
foreach (['comments', 'comment_group_objects', 'comment_groups', 'tasks', 'task_lists', 'expenses', 'activities', 'macro_plans', 'accommodations', 'trip_user', 'trips', 'sync_events', 'sessions', 'admin_audit_events', 'users', 'cache', 'cache_locks'] as $tbl) {
    DB::table($tbl)->delete();
}
DB::statement('PRAGMA foreign_keys = ON');

$now = (int) (microtime(true) * 1000);
$d = fn (string $date) => ms('Asia/Singapore', $date . ' 10:00');

// ---- Users -------------------------------------------------------------
$priya = mkUser('priya_raman', 'priya.raman@example.com', 'ikuyo-demo-2026', $d('2025-06-03'), [
    'preferred_region' => 'SG', 'preferred_currency' => 'SGD', 'preferred_timezone' => 'Asia/Singapore',
    'last_login_at' => $now - 3600000,
]);
$marcus = mkUser('marcus_tan', 'marcus.tan@example.com', 'ikuyo-demo-2026', $d('2025-06-04'));
$jiayi = mkUser('jiayi.lim', 'jiayi.lim@example.com', 'ikuyo-demo-2026', $d('2025-07-19'));
$dev = mkUser('dev_kapoor', 'dev.kapoor@example.com', 'ikuyo-demo-2026', $d('2025-11-02'));
$sofia = mkUser('sofia_marques', 'sofia.marques@example.com', 'ikuyo-demo-2026', $d('2026-02-11'));
$hana = mkUser('hana_yoshida', 'hana.yoshida@example.com', 'ikuyo-demo-2026', $d('2025-09-21'));
$aaron = mkUser('aaron_ng', 'aaron.ng@example.com', 'ikuyo-demo-2026', $d('2026-01-08'));
$wei = mkUser('wanderful_crane', null, null, $d('2026-04-02'), ['email_verified' => false]);
$leo = mkUser('leo_hartmann', 'leo.hartmann@example.com', 'ikuyo-demo-2026', $d('2025-08-30'));
$nadia = mkUser('nadia_azman', 'nadia.azman@example.com', 'ikuyo-demo-2026', $d('2025-10-12'));
$tom = mkUser('tom_okafor', 'tom.okafor@example.com', 'ikuyo-demo-2026', $d('2026-03-01'));

$OWNER = 0; $EDITOR = 1; $VIEWER = 2;

require __DIR__ . '/trips_japan.php';
require __DIR__ . '/trips_more.php';

$counts = [];
foreach (['users', 'trips', 'activities', 'accommodations', 'macro_plans', 'expenses', 'task_lists', 'tasks', 'comment_groups', 'comments'] as $tbl) {
    $counts[] = $tbl . '=' . DB::table($tbl)->count();
}
echo 'Seeded: ' . implode(' ', $counts) . "\n";
