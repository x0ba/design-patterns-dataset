// Deterministic generator for an established hevy2garmin user: ~10 months of
// Hevy workouts + routines (served by hevy-stub.mjs) and the matching sync
// ledger in Postgres (applied by seed.mjs). Dates are relative to `now`, so the
// "this week" counters are never stale whenever start.sh runs.

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uuid(rand) {
  const h = () => Math.floor(rand() * 16).toString(16);
  const s = (n) => Array.from({ length: n }, h).join("");
  return `${s(8)}-${s(4)}-4${s(3)}-${"89ab"[Math.floor(rand() * 4)]}${s(3)}-${s(12)}`;
}

const DAY = 86_400_000;
const MIN = 60_000;

// Exercise templates: [title, template_id, startKg, incrementKg, reps, sets, kind]
const EX = {
  bench: ["Bench Press (Barbell)", "79D0BB3A", 72.5, 2.5, [5, 5, 5, 4], 4],
  incDb: ["Incline Bench Press (Dumbbell)", "07B38369", 26, 2, [10, 9, 8], 3],
  ohp: ["Overhead Press (Barbell)", "7B8D84E8", 45, 2.5, [6, 6, 5], 3],
  latRaise: ["Lateral Raise (Dumbbell)", "422B08F1", 9, 1, [15, 14, 12], 3],
  pushdown: ["Triceps Rope Pushdown", "94B7239B", 22.5, 2.5, [12, 11, 10], 3],
  closeGrip: ["Close Grip Bench Press", "35B51B87", 60, 2.5, [8, 8, 7], 3],
  crossover: ["Cable Crossover", "651F844C", 12.5, 2.5, [15, 12, 12], 3],
  dip: ["Chest Dip", "4F942FEA", 0, 2.5, [12, 10, 9], 3],
  landmine: ["Landmine Press", "C1A2E3F4", 20, 2.5, [10, 10, 8], 3],
  deadlift: ["Deadlift (Barbell)", "C6272009", 130, 5, [5, 3, 3], 3],
  row: ["Bent Over Row (Barbell)", "55E6546F", 62.5, 2.5, [8, 8, 7], 3],
  pullup: ["Pull Up", "1B2B1E7C", 0, 2.5, [8, 7, 6, 6], 4],
  latPull: ["Lat Pulldown (Cable)", "6A6C31A5", 55, 2.5, [10, 10, 9], 3],
  cableRow: ["Seated Cable Row - V Grip (Cable)", "F1D60854", 60, 2.5, [12, 10, 10], 3],
  facePull: ["Face Pull", "BE640BA0", 20, 2.5, [15, 15, 15], 3],
  curl: ["Bicep Curl (Dumbbell)", "37FCC2BB", 12, 1, [12, 10, 10], 3],
  hammer: ["Hammer Curl (Dumbbell)", "7E3BC8B6", 14, 1, [12, 10, 10], 3],
  shrug: ["Shrug (Dumbbell)", "ABEC557F", 32, 2, [12, 12], 2],
  squat: ["Squat (Barbell)", "D04AC939", 100, 2.5, [5, 5, 5], 3],
  rdl: ["Romanian Deadlift (Barbell)", "2B4B7310", 90, 2.5, [8, 8, 8], 3],
  legPress: ["Leg Press (Machine)", "C7973E0E", 170, 10, [12, 10, 10], 3],
  legCurl: ["Lying Leg Curl (Machine)", "B8127AD1", 40, 2.5, [12, 10, 10], 3],
  legExt: ["Leg Extension (Machine)", "75A4F6C4", 50, 2.5, [12, 12, 10], 3],
  calf: ["Standing Calf Raise (Machine)", "06745E58", 80, 5, [15, 12, 12], 3],
  hipThrust: ["Hip Thrust (Barbell)", "D57C2EC7", 100, 5, [10, 10, 8], 3],
  bss: ["Bulgarian Split Squat", "B5D3A742", 16, 2, [10, 10, 8], 3],
  beltSquat: ["Belt Squat (Machine)", "D9E8F7A6", 80, 5, [12, 10, 10], 3],
  hlr: ["Hanging Leg Raise", "F8356514", 0, 0, [12, 10, 10], 3],
  cableCrunch: ["Cable Crunch", "23A48484", 35, 2.5, [15, 15, 12], 3],
  copenhagen: ["Copenhagen Plank", "E5F6A7B8", 0, 0, [], 2, "duration"],
  plank: ["Plank", "C6C9B8A0", 0, 0, [], 3, "duration"],
  goblet: ["Goblet Squat", "B9AD9E5C", 24, 2, [12, 12, 10], 3],
  dbPress: ["Seated Overhead Press (Dumbbell)", "6E3D6C4A", 20, 2, [10, 10, 8], 3],
  dbRow: ["Dumbbell Row", "F1E57334", 30, 2, [10, 10, 10], 3],
  rowErg: ["Rowing Machine", "0222DB42", 0, 0, [], 1, "cardio"],
  sledPush: ["Sled Push", "A7B8C9D0", 90, 10, [], 4, "distance"],
  meadows: ["Meadows Row", "B1C2D3E4", 30, 2.5, [10, 10, 8], 3],
  nordic: ["Nordic Hamstring Curl", "C3D4E5F6", 0, 0, [5, 5, 4], 3],
  tib: ["Tibialis Raise", "D4E5F6A7", 10, 1, [20, 20], 2],
  pallof: ["Pallof Press", "E6F7A8B9", 15, 2.5, [12, 12], 2],
  jm: ["JM Press", "F7A8B9C0", 40, 2.5, [10, 8, 8], 3],
  spider: ["Spider Curl", "A9B0C1D2", 10, 1, [12, 12, 10], 3],
};

export const ROUTINES = [
  { key: "pushA", title: "Push A — Heavy Chest", folder: "PPL (Fall 2026)", ex: ["bench", "incDb", "ohp", "crossover", "pushdown", "latRaise"], notes: "Top set bench, then back-off sets at 90%." },
  { key: "pullA", title: "Pull A — Deadlift & Rows", folder: "PPL (Fall 2026)", ex: ["deadlift", "row", "meadows", "latPull", "facePull", "hammer"], notes: "" },
  { key: "legsA", title: "Legs A — Squat Focus", folder: "PPL (Fall 2026)", ex: ["squat", "legPress", "nordic", "legCurl", "calf", "tib", "hlr"], notes: "Belt on for the top two squat sets." },
  { key: "pushB", title: "Push B — Incline & Shoulders", folder: "PPL (Fall 2026)", ex: ["ohp", "incDb", "dip", "landmine", "latRaise", "jm"], notes: "" },
  { key: "pullB", title: "Pull B — Width & Arms", folder: "PPL (Fall 2026)", ex: ["pullup", "cableRow", "dbRow", "facePull", "spider", "shrug"], notes: "" },
  { key: "legsB", title: "Legs B — Hinge & Glutes", folder: "PPL (Fall 2026)", ex: ["rdl", "hipThrust", "bss", "beltSquat", "legExt", "copenhagen"], notes: "Hip thrust: pause 1s at the top." },
  { key: "hotel", title: "Hotel Gym — Dumbbells Only", folder: "Travel", ex: ["goblet", "dbPress", "dbRow", "bss", "curl", "plank"], notes: "For trips. Most hotel racks stop at 25 kg." },
  { key: "deload", title: "Deload Full Body", folder: null, ex: ["squat", "bench", "row", "facePull", "plank"], notes: "Every 6th week. 60% of working weight, no grinders." },
  { key: "cond", title: "Saturday Conditioning", folder: null, ex: ["rowErg", "sledPush", "pallof", "cableCrunch", "copenhagen"], notes: "" },
];

const ROTATION = ["pushA", "pullA", "legsA", "pushB", "pullB", "legsB"];

const WORKOUT_NOTES = [
  "", "", "", "", "", "",
  "Felt strong today, bench moved fast.",
  "Short on time — cut the accessories.",
  "Left shoulder a bit cranky on OHP, kept it light.",
  "Gym was packed, swapped leg press for hack squat… then it was taken too.",
  "PR! 🎉",
  "Slept 5h. Everything felt heavy.",
  "Back to it after the trip. Took it easy on the deadlifts and focused on bracing; lower back was fine by the last set.",
  "Rest timer kept going off late, so sets ran long",
];

function roundTo(x, step) { return Math.round(x / step) * step; }

function buildSets(rand, ex, weekIdx, deload) {
  const [, , start, inc, reps, nSets, kind] = ex;
  if (kind === "duration") {
    return Array.from({ length: nSets }, (_, i) => ({ index: i, type: "normal", weight_kg: null, reps: null, distance_meters: null, duration_seconds: 45 + 15 * Math.floor(rand() * 3), rpe: null, custom_metric: null }));
  }
  if (kind === "cardio") {
    return [{ index: 0, type: "normal", weight_kg: null, reps: null, distance_meters: 2000 + 500 * Math.floor(rand() * 3), duration_seconds: 480 + Math.floor(rand() * 120), rpe: null, custom_metric: null }];
  }
  if (kind === "distance") {
    const kg = roundTo(start + inc * Math.floor(weekIdx / 6), 5);
    return Array.from({ length: nSets }, (_, i) => ({ index: i, type: "normal", weight_kg: kg, reps: null, distance_meters: 20, duration_seconds: null, rpe: null, custom_metric: null }));
  }
  // slow progression with small noise; deloads at 60%
  const step = inc >= 5 ? 2.5 : inc >= 2 ? (inc === 2 ? 2 : 2.5) : 1;
  let w = start + inc * Math.floor(weekIdx / 3) + (rand() < 0.15 ? -inc : 0);
  if (deload) w *= 0.6;
  w = Math.max(0, roundTo(w, step));
  const sets = [];
  if (w >= 60 && rand() < 0.8) {
    sets.push({ index: 0, type: "warmup", weight_kg: roundTo(w * 0.5, 2.5), reps: 8, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null });
  }
  for (let i = 0; i < nSets; i++) {
    let r = reps[Math.min(i, reps.length - 1)] - (rand() < 0.2 ? 1 : 0);
    if (deload) r = reps[0];
    const last = i === nSets - 1 && !deload && rand() < 0.12;
    sets.push({
      index: sets.length,
      type: last ? "failure" : "normal",
      weight_kg: w,
      reps: Math.max(1, last ? r + 1 : r),
      distance_meters: null,
      duration_seconds: null,
      rpe: rand() < 0.35 ? [7, 7.5, 8, 8.5, 9][Math.floor(rand() * 5)] : null,
      custom_metric: null,
    });
  }
  return sets;
}

export function generate(now = Date.now()) {
  const rand = mulberry32(20260116);
  const routineIds = Object.fromEntries(ROUTINES.map((r) => [r.key, uuid(rand)]));
  const folderIds = { "PPL (Fall 2026)": 1184207, Travel: 1184211 };

  // Day plan, oldest first, ~300 days back.
  const START = 300;
  const workouts = [];
  let rot = 0;
  for (let d = START; d >= 0; d--) {
    const dayStart = Math.floor((now - d * DAY) / DAY) * DAY; // UTC midnight
    const dow = new Date(dayStart).getUTCDay(); // 0 Sun
    const weekIdx = Math.floor((START - d) / 7);
    // Trips / sick time: gaps in training (realistic messiness)
    const trip = (d <= 204 && d >= 196) || (d <= 92 && d >= 88);
    const sick = d <= 141 && d >= 135;
    const holiday = d <= 330 - 0 && d >= 326; // outside range, harmless
    if (sick || holiday) continue;
    let key = null;
    if (trip) {
      if (dow === 2 || dow === 4) key = "hotel";
    } else if ([1, 2, 4, 5].includes(dow) || (dow === 3 && rand() < 0.35)) {
      if (rand() < 0.1) continue; // skipped a session
      key = weekIdx % 6 === 5 && dow === 1 ? "deload" : ROTATION[rot++ % ROTATION.length];
    } else if (dow === 6 && rand() < 0.4) {
      key = "cond";
    }
    if (d === 0) key = "pushB"; // a workout finished this morning
    if (!key) continue;
    const routine = ROUTINES.find((r) => r.key === key);
    // Pacific time evenings mostly (UTC 01:00-03:30 next day) or a weekend morning
    const morning = dow === 6 || dow === 0 || rand() < 0.2;
    let startMs = dayStart + (morning ? 15.5 + rand() * 2 : 24.5 + rand() * 2.5) * 3_600_000;
    if (d === 0) startMs = now - 4.2 * 3_600_000;
    if (d === 1) startMs = Math.min(startMs, now - 22 * 3_600_000);
    const deload = key === "deload";
    let exKeys = routine.ex.slice();
    if (rand() < 0.15) exKeys = exKeys.slice(0, exKeys.length - 1); // ran out of time
    const exercises = exKeys.map((k, i) => {
      const ex = EX[k];
      return {
        index: i,
        title: ex[0],
        notes: rand() < 0.06 ? ["Elbows tucked", "Slow eccentric", "Straps on last set", "Seat on 4"][Math.floor(rand() * 4)] : "",
        exercise_template_id: ex[1],
        superset_id: null,
        sets: buildSets(rand, ex, weekIdx, deload),
      };
    });
    const nSets = exercises.reduce((a, e) => a + e.sets.length, 0);
    const durMin = Math.round(nSets * (2.6 + rand() * 0.8) + 6);
    const endMs = startMs + durMin * MIN;
    const titleVariant =
      key === "hotel" ? ["Hotel Gym — Lisbon", "Hotel Gym — Lisbon", "Hotel gym (Denver)", "Hotel Gym — Dumbbells Only"][Math.floor(rand() * 4)] :
      rand() < 0.06 ? ["Morning Lift", "Lunch break pump", "Quick session"][Math.floor(rand() * 3)] : routine.title;
    const id = uuid(rand);
    workouts.push({
      id,
      title: titleVariant,
      routine_id: routineIds[key],
      description: WORKOUT_NOTES[Math.floor(rand() * WORKOUT_NOTES.length)],
      start_time: new Date(startMs).toISOString(),
      end_time: new Date(endMs).toISOString(),
      updated_at: new Date(endMs + 2 * MIN).toISOString(),
      created_at: new Date(endMs + 1 * MIN).toISOString(),
      exercises,
      _key: key,
      _d: d,
      _sets: nSets,
      _durMin: durMin,
    });
  }
  // Hevy returns newest first
  workouts.sort((a, b) => b.start_time.localeCompare(a.start_time));

  const routines = ROUTINES.map((r, i) => ({
    id: routineIds[r.key],
    title: r.title,
    folder_id: r.folder ? folderIds[r.folder] : null,
    updated_at: new Date(now - (40 + i * 23) * DAY).toISOString(),
    created_at: new Date(now - (290 - i * 9) * DAY).toISOString(),
    notes: r.notes,
    exercises: r.ex.map((k, j) => {
      const ex = EX[k];
      return {
        index: j,
        title: ex[0],
        rest_seconds: ex[2] >= 60 ? 180 : 90,
        notes: "",
        exercise_template_id: ex[1],
        superset_id: null,
        sets: buildSets(rand, ex, 36, false).map((s) => ({ ...s, rep_range: s.reps ? { start: Math.max(1, s.reps - 2), end: s.reps + 2 } : null })),
      };
    }),
  }));

  // ── Ledger state ──────────────────────────────────────────────────────────
  const INSTALL_DAY = 128; // started using hevy2garmin ~4 months ago, backfilled history then
  const installMs = Math.floor((now - INSTALL_DAY * DAY) / DAY) * DAY + 19.3 * 3_600_000;
  const synced = [];
  const pending = [];
  const hr = [];
  const syncLog = [];
  const events = [];

  const newest = workouts[0];
  const secondNewest = workouts[1];
  const skipTitles = new Set();
  let backfillN = 0;
  const backfillOrder = workouts.filter((w) => w._d > INSTALL_DAY).reverse(); // oldest first
  const backfillIdx = new Map(backfillOrder.map((w, i) => [w.id, i]));
  let gid = 19_604_211_337;

  workouts.slice().reverse().forEach((w, i) => {
    gid += 2_100_000 + Math.floor(rand() * 9_000_000) + (w._d > 0 ? 0 : 0);
    if (w.id === newest.id) return; // still inside the grace period → sync candidate
    const endMs = Date.parse(w.end_time);
    let syncedAt;
    let trigger;
    if (w._d > INSTALL_DAY) {
      syncedAt = installMs + backfillIdx.get(w.id) * (9 + Math.floor(rand() * 5)) * 1000;
      trigger = "manual";
      backfillN++;
    } else {
      // GitHub Actions cron every 2h after the 120 min grace period
      const ready = endMs + 120 * MIN;
      syncedAt = Math.ceil(ready / (2 * 3_600_000)) * 2 * 3_600_000 + (3 + Math.floor(rand() * 4)) * MIN + Math.floor(rand() * 50) * 1000;
      trigger = rand() < 0.3 ? "manual" : "cron";
      if (trigger === "manual") syncedAt = endMs + (8 + Math.floor(rand() * 50)) * MIN + Math.floor(rand() * 59) * 1000;
      if (syncedAt > now) syncedAt = now - 30 * MIN;
    }
    if (w.id === secondNewest.id) {
      pending.push({
        hevy_id: w.id,
        phase: "needs_review",
        next_step: null,
        upload_id: null,
        garmin_activity_id: null,
        watch_activity_id: "21187733410",
        pre_upload_ids: ["21187733410", "21187790026"],
        payload: { title: w.title, start_time: w.start_time, end_time: w.end_time },
        resolution_source: null,
        attempt_count: 2,
        last_error: "Two Garmin activities overlap this workout (Strength 6:41–7:52 PM and Walk 7:48–8:10 PM). Pick the one to merge into, or upload as a new activity.",
        created_at: new Date(endMs + 125 * MIN).toISOString(),
        updated_at: new Date(endMs + 245 * MIN).toISOString(),
      });
      return;
    }
    let status = "success";
    if (w._key === "cond" && rand() < 0.5) status = "skipped";
    if (w.title.startsWith("Hotel gym (Denver)")) status = "manual";
    if (w._d <= INSTALL_DAY && w._d > INSTALL_DAY - 20 && rand() < 0.3) status = "manual";
    if (w._d <= INSTALL_DAY && rand() < 0.025) status = "manual"; // logged by hand in Garmin before syncing
    const watch = rand() < 0.68; // watch recorded a strength activity → merge
    const method = status === "success" ? (watch ? "merge" : "upload") : null;
    const avgHr = 104 + Math.floor(rand() * 34) + (w._key.startsWith("legs") ? 9 : 0) + (w._key === "cond" ? 16 : 0);
    const kcal = Math.round((w._durMin * (avgHr - 58) * 0.105) + rand() * 30);
    const row = {
      hevy_id: w.id,
      garmin_activity_id: status === "skipped" ? null : String(gid),
      title: w.title,
      synced_at: new Date(syncedAt).toISOString(),
      calories: status === "success" ? kcal : null,
      avg_hr: status === "success" && (watch || rand() < 0.5) ? avgHr : null,
      status,
      hevy_updated_at: w.updated_at,
      sync_method: method ?? "upload",
      resolution_reason: status === "manual" ? "user_marked" : status === "skipped" ? "user_skipped" : null,
      resolved_at: status !== "success" ? new Date(syncedAt).toISOString() : null,
      resolution_source: status !== "success" ? "dashboard" : null,
      resynced_at: null,
    };
    synced.push(row);
    if (row.avg_hr && w._d < 120) {
      // per-minute HR: warmup ramp, set peaks, rest troughs, cool-down
      const samples = [];
      let v = 82 + rand() * 8;
      for (let m = 0; m < w._durMin; m++) {
        const phase = (m % 4) / 4;
        const target = m < 5 ? 90 + m * 6 : m > w._durMin - 4 ? 95 - (m - w._durMin + 4) * 6 : avgHr + (phase < 0.4 ? 16 : -10);
        v += (target - v) * 0.55 + (rand() - 0.5) * 6;
        samples.push(Math.round(v));
      }
      hr.push({ hevy_id: w.id, data: { samples, interval_s: 60 }, cached_at: row.synced_at });
    }
    if (w._d <= INSTALL_DAY) {
      syncLog.push({ time: row.synced_at, synced: status === "success" ? 1 : 0, skipped: status === "skipped" ? 1 : 0, failed: 0, trigger });
    }
  });

  // backfill batch run(s) on install day
  syncLog.push({ time: new Date(installMs + 14 * MIN).toISOString(), synced: 0, skipped: 0, failed: 3, trigger: "manual" });
  syncLog.push({ time: new Date(installMs + backfillN * 11 * 1000 + 40 * MIN).toISOString(), synced: backfillN - 3, skipped: 2, failed: 1, trigger: "manual" });
  // a few failed/rate-limited cron runs over time
  for (const d of [97, 61, 33, 12, 2]) {
    syncLog.push({ time: new Date(now - d * DAY - 5.1 * 3_600_000).toISOString(), synced: 0, skipped: 0, failed: 1, trigger: "cron" });
  }
  // webhook-triggered runs recently
  for (const d of [9, 6, 3]) {
    syncLog.push({ time: new Date(now - d * DAY - 2.4 * 3_600_000).toISOString(), synced: 0, skipped: 1, failed: 0, trigger: "webhook" });
  }
  syncLog.sort((a, b) => a.time.localeCompare(b.time));

  // resynced rows (a corrected weight was pushed to Garmin)
  synced
    .filter((r) => r.status === "success")
    .slice(-60)
    .filter((_, i) => i % 17 === 4)
    .forEach((r) => { r.resynced_at = new Date(Date.parse(r.synced_at) + 3 * DAY + 2 * 3_600_000).toISOString(); });

  // Two synced workouts edited in Hevy afterwards → "Edited in Hevy" badge
  const editable = synced.filter((r) => r.status === "success" && r.garmin_activity_id && !r.resynced_at).slice(-12);
  for (const r of [editable[editable.length - 3], editable[editable.length - 7]]) {
    const w = workouts.find((x) => x.id === r.hevy_id);
    w.updated_at = new Date(Date.parse(r.synced_at) + 26 * 3_600_000).toISOString();
    w.description = (w.description ? w.description + " " : "") + "(fixed the RDL weight, logged 90 instead of 95)";
  }
  for (const w of workouts) {
    if (Date.parse(w.updated_at) > now - 130 * DAY) events.push({ type: "updated", workout: w });
  }
  events.sort((a, b) => b.workout.updated_at.localeCompare(a.workout.updated_at));

  // Routine sync to Garmin
  const syncedRoutines = [];
  const schedules = [];
  ["pushA", "pullA", "legsA", "pushB", "pullB", "legsB", "hotel"].forEach((k, i) => {
    const r = routines.find((x) => x.id === routineIds[k]);
    syncedRoutines.push({
      hevy_routine_id: r.id,
      garmin_workout_id: String(1_342_780_115 + i * 3911 + i * i * 17),
      title: r.title,
      hevy_updated_at: r.updated_at,
      scheduled_date: null,
      content_hash: (Math.floor(rand() * 2 ** 32)).toString(16).padStart(8, "0") + (Math.floor(rand() * 2 ** 32)).toString(16).padStart(8, "0"),
      synced_at: new Date(now - (60 - i * 6) * DAY + i * 41 * MIN).toISOString(),
      status: "success",
    });
  });
  const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
  const weekPlan = [["pushA", 1], ["pullA", 2], ["legsA", 4], ["pushB", 5], ["pullB", 8], ["legsB", 9]];
  weekPlan.forEach(([k, off], i) => {
    schedules.push({ hevy_routine_id: routineIds[k], schedule_id: String(918_204_551 + i * 77), scheduled_date: ymd(now + off * DAY) });
  });
  schedules.push({ hevy_routine_id: routineIds.pushA, schedule_id: String(918_210_002), scheduled_date: ymd(now + 8 * DAY) });

  return { now, workouts, routines, events, synced, pending, hr, syncLog, syncedRoutines, schedules, installMs, routineIds };
}

/** Strip private fields for the Hevy API shape. */
export function publicWorkout(w) {
  const { _key, _d, _sets, _durMin, ...rest } = w;
  return rest;
}
