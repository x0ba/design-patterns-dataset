<?php
// Helpers for the Ikuyo demo-data generator. Writes straight into the Laravel
// app's own SQLite schema (backend/database/migrations).

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

const FLAG_IDEA = 2;
const FLAG_FLIGHT = 4;
const FLAG_TRAIN = 8;

function uid(): string
{
    return (string) Str::uuid();
}

/** Wall-clock time in a zone -> epoch ms. */
function ms(string $tz, string $dateTime): int
{
    return (new DateTimeImmutable($dateTime, new DateTimeZone($tz)))->getTimestamp() * 1000;
}

/** Date + N days, as Y-m-d. */
function dplus(string $date, int $days): string
{
    return (new DateTimeImmutable($date))->modify(($days >= 0 ? '+' : '') . $days . ' days')->format('Y-m-d');
}

/** A plausible "created" time: $daysBefore days before $refMs with some jitter. */
function ago(int $refMs, float $daysBefore): int
{
    return (int) ($refMs - $daysBefore * 86400000 - mt_rand(0, 6 * 3600) * 1000);
}

function mkUser(string $handle, ?string $email, ?string $password, int $createdMs, array $extra = []): string
{
    $id = uid();
    DB::table('users')->insert(array_merge([
        'id' => $id,
        'email' => $email,
        'handle' => $handle,
        'handle_key' => strtolower($handle),
        'password_hash' => $password ? password_hash($password, PASSWORD_BCRYPT) : null,
        'activated' => true,
        'email_verified' => true,
        'role' => 'user',
        'created_at_ms' => $createdMs,
        'updated_at_ms' => $createdMs,
        'last_login_at' => $createdMs,
    ], $extra));

    return $id;
}

class TripBuilder
{
    public string $id;
    public string $tz;
    public string $start; // Y-m-d first day
    public int $createdMs;
    public array $members = []; // handle => user id
    private int $cursorMs;

    public function __construct(array $t, array $members)
    {
        $this->id = uid();
        $this->tz = $t['tz'];
        $this->start = $t['start'];
        $this->createdMs = $t['created'];
        $this->cursorMs = $this->createdMs;
        $startMs = ms($this->tz, $t['start'] . ' 00:00');
        $endMs = ms($this->tz, dplus($t['end'], 1) . ' 00:00');
        DB::table('trips')->insert([
            'id' => $this->id,
            'title' => $t['title'],
            'region' => $t['region'],
            'currency' => $t['currency'],
            'origin_region' => $t['origin_region'] ?? 'SG',
            'origin_currency' => $t['origin_currency'] ?? 'SGD',
            'origin_timezone' => $t['origin_timezone'] ?? 'Asia/Singapore',
            'timezone' => $this->tz,
            'timestamp_start_ms' => $startMs,
            'timestamp_end_ms' => $endMs,
            'sharing_level' => $t['sharing'] ?? 0,
            'public_show_expenses' => $t['public_show_expenses'] ?? null,
            'public_show_tasks' => $t['public_show_tasks'] ?? null,
            'public_show_comments' => $t['public_show_comments'] ?? null,
            'viewer_show_expenses' => $t['viewer_show_expenses'] ?? null,
            'created_at_ms' => $this->createdMs,
            'updated_at_ms' => $t['updated'] ?? $this->createdMs,
            'archived_at_ms' => $t['archived'] ?? null,
        ]);
        foreach ($members as [$userId, $role]) {
            DB::table('trip_user')->insert([
                'id' => uid(), 'trip_id' => $this->id, 'user_id' => $userId, 'role' => $role,
                'created_at_ms' => $this->createdMs, 'updated_at_ms' => $this->createdMs,
            ]);
        }
    }

    /** Monotonic-ish edit timestamps after trip creation. */
    private function tick(): int
    {
        $this->cursorMs += mt_rand(20, 60 * 26) * 60000;
        return min($this->cursorMs, (int) (microtime(true) * 1000) - 3600000);
    }

    private function at(int $day, string $hm, ?string $tz = null): int
    {
        return ms($tz ?? $this->tz, dplus($this->start, $day) . ' ' . $hm);
    }

    /**
     * Activity. $when = [day, 'HH:MM', minutes] or null for an unscheduled idea.
     * $o: lat,lng,zoom, dest,dlat,dlng, flags, status, tzEnd, endDay, endHm, macro, icon, tzStart
     */
    public function act(?array $when, string $title, string $location, string $desc = '', array $o = []): string
    {
        $id = uid();
        $start = $end = null;
        $tzStart = $o['tzStart'] ?? null;
        $tzEnd = $o['tzEnd'] ?? $tzStart;
        if ($when) {
            [$d, $hm, $mins] = $when;
            $start = $this->at($d, $hm, $tzStart);
            if (isset($o['endDay'])) {
                $end = $this->at($o['endDay'], $o['endHm'], $tzEnd);
            } else {
                $end = $start + $mins * 60000;
            }
        }
        $t = $this->tick();
        DB::table('activities')->insert([
            'id' => $id,
            'trip_id' => $this->id,
            'macro_plan_id' => $o['macro'] ?? null,
            'title' => $title,
            'location' => $location,
            'location_lat' => $o['lat'] ?? null,
            'location_lng' => $o['lng'] ?? null,
            'location_zoom' => isset($o['lat']) ? ($o['zoom'] ?? 14) : null,
            'location_destination' => $o['dest'] ?? null,
            'location_destination_lat' => $o['dlat'] ?? null,
            'location_destination_lng' => $o['dlng'] ?? null,
            'location_destination_zoom' => isset($o['dlat']) ? 12 : null,
            'description' => $desc,
            'timestamp_start_ms' => $start,
            'timestamp_end_ms' => $end,
            'timezone_start' => $tzStart,
            'timezone_end' => $tzEnd,
            'flags' => ($o['flags'] ?? 0) | ($when ? 0 : FLAG_IDEA),
            'planning_status' => $o['status'] ?? null,
            'icon' => $o['icon'] ?? null,
            'created_at_ms' => $t,
            'updated_at_ms' => $t + mt_rand(0, 3) * 86400000 * (mt_rand(0, 2) === 0 ? 1 : 0),
        ]);

        return $id;
    }

    public function stay(int $inDay, int $outDay, string $name, string $address, string $phone, string $notes, float $lat, float $lng, string $inHm = '15:00', string $outHm = '11:00'): string
    {
        $id = uid();
        $t = $this->tick();
        DB::table('accommodations')->insert([
            'id' => $id, 'trip_id' => $this->id, 'name' => $name, 'address' => $address,
            'phone_number' => $phone, 'notes' => $notes,
            'check_in_ms' => $this->at($inDay, $inHm), 'check_out_ms' => $this->at($outDay, $outHm),
            'tz_check_in' => null, 'tz_check_out' => null,
            'location_lat' => $lat, 'location_lng' => $lng, 'location_zoom' => 15,
            'created_at_ms' => $t, 'updated_at_ms' => $t,
        ]);

        return $id;
    }

    /** Day-precision plan: from day $a through day $b inclusive. */
    public function macro(int $a, int $b, string $name, string $notes = ''): string
    {
        $id = uid();
        $t = $this->tick();
        DB::table('macro_plans')->insert([
            'id' => $id, 'trip_id' => $this->id, 'name' => $name, 'notes' => $notes,
            'timestamp_start_ms' => $this->at($a, '00:00'), 'timestamp_end_ms' => $this->at($b + 1, '00:00'),
            'timezone_start' => null, 'timezone_end' => null,
            'created_at_ms' => $t, 'updated_at_ms' => $t,
        ]);

        return $id;
    }

    /** $rate = units of $currency per 1 unit of origin currency (app convention); null = no conversion recorded. */
    public function expense(int $day, string $hm, string $title, float $amount, string $currency, ?float $rate, string $desc = ''): string
    {
        $id = uid();
        $t = $this->tick();
        DB::table('expenses')->insert([
            'id' => $id, 'trip_id' => $this->id, 'title' => $title, 'description' => $desc,
            'amount' => $amount, 'currency' => $currency,
            'currency_conversion_factor' => $rate,
            'amount_in_origin_currency' => $rate === null ? null : round($amount / $rate, 2),
            'incurred_at_ms' => $this->at($day, $hm), 'timezone_incurred' => null,
            'created_at_ms' => $t, 'updated_at_ms' => $t,
        ]);

        return $id;
    }

    /** $tasks: [title, status, ?description, ?dueDaysFromTripStart] */
    public function tasks(string $title, int $listStatus, array $tasks, int $index): string
    {
        $listId = uid();
        $t = $this->tick();
        DB::table('task_lists')->insert([
            'id' => $listId, 'trip_id' => $this->id, 'title' => $title, 'index' => $index,
            'status' => $listStatus, 'created_at_ms' => $t, 'updated_at_ms' => $t,
        ]);
        foreach ($tasks as $i => $task) {
            [$tt, $st] = $task;
            $desc = $task[2] ?? null;
            $due = isset($task[3]) ? $this->at($task[3], '23:59') : null;
            $tt2 = $this->tick();
            DB::table('tasks')->insert([
                'id' => uid(), 'task_list_id' => $listId, 'index' => $i, 'title' => $tt,
                'description' => $desc, 'status' => $st, 'due_at_ms' => $due,
                'completed_at_ms' => $st === 2 ? $tt2 + 86400000 : null,
                'created_at_ms' => $tt2, 'updated_at_ms' => $st === 2 ? $tt2 + 86400000 : $tt2,
            ]);
        }

        return $listId;
    }

    /**
     * Comment thread. $type: 0 trip 1 activity 2 accommodation 3 macroplan 4 expense 5 task.
     * $comments: [[userId, text, ?msOverride], ...]
     */
    public function thread(int $type, ?string $objectId, array $comments, bool $resolved = false): void
    {
        $gid = uid();
        $t = $this->tick();
        DB::table('comment_groups')->insert([
            'id' => $gid, 'trip_id' => $this->id, 'status' => $resolved ? 1 : 0,
            'created_at_ms' => $t, 'updated_at_ms' => $t,
        ]);
        DB::table('comment_group_objects')->insert([
            'id' => $gid, 'comment_group_id' => $gid, 'object_type' => $type,
            'object_id' => $type === 0 ? $this->id : $objectId,
            'created_at_ms' => $t, 'updated_at_ms' => $t,
        ]);
        foreach ($comments as $c) {
            $t += mt_rand(4, 600) * 60000;
            $at = $c[2] ?? min($t, (int) (microtime(true) * 1000) - 600000);
            DB::table('comments')->insert([
                'id' => uid(), 'comment_group_id' => $gid, 'user_id' => $c[0], 'content' => $c[1],
                'created_at_ms' => $at, 'updated_at_ms' => $at,
            ]);
        }
    }
}
