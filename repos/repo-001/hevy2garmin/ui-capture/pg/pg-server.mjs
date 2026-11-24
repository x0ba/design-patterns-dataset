// Embedded Postgres for the hevy2garmin web app: in-memory PGlite, schema from
// web/lib/schema.ts (the app's own bootstrap statements), seeded with an
// established user's data, served over the Postgres wire protocol.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { generate } from "../data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PG_PORT || 54329);

const schemaSrc = readFileSync(path.join(here, "../../web/lib/schema.ts"), "utf8");
const block = schemaSrc.slice(schemaSrc.indexOf("SCHEMA_STATEMENTS"), schemaSrc.indexOf("];", schemaSrc.indexOf("SCHEMA_STATEMENTS")));
const statements = [...block.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

const db = await PGlite.create();
for (const s of statements) await db.exec(s);

const D = generate();
const q = (text, params) => db.query(text, params);

for (const r of D.synced) {
  await q(
    `INSERT INTO synced_workouts (hevy_id, garmin_activity_id, title, synced_at, calories, avg_hr, status,
       hevy_updated_at, sync_method, resolution_reason, resolved_at, resolution_source, resynced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [r.hevy_id, r.garmin_activity_id, r.title, r.synced_at, r.calories, r.avg_hr, r.status,
      r.hevy_updated_at, r.sync_method, r.resolution_reason, r.resolved_at, r.resolution_source, r.resynced_at],
  );
}
for (const p of D.pending) {
  await q(
    `INSERT INTO pending_uploads (hevy_id, phase, next_step, upload_id, garmin_activity_id, watch_activity_id,
       pre_upload_ids, payload, resolution_source, attempt_count, last_error, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [p.hevy_id, p.phase, p.next_step, p.upload_id, p.garmin_activity_id, p.watch_activity_id,
      JSON.stringify(p.pre_upload_ids), JSON.stringify(p.payload), p.resolution_source, p.attempt_count, p.last_error, p.created_at, p.updated_at],
  );
}
for (const l of D.syncLog) {
  await q(`INSERT INTO sync_log (time, synced, skipped, failed, trigger) VALUES ($1,$2,$3,$4,$5)`, [l.time, l.synced, l.skipped, l.failed, l.trigger]);
}
for (const h of D.hr) {
  await q(`INSERT INTO hr_cache (hevy_id, data, cached_at) VALUES ($1,$2,$3)`, [h.hevy_id, JSON.stringify(h.data), h.cached_at]);
}
for (const r of D.syncedRoutines) {
  await q(
    `INSERT INTO synced_routines (hevy_routine_id, garmin_workout_id, title, hevy_updated_at, scheduled_date, content_hash, synced_at, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [r.hevy_routine_id, r.garmin_workout_id, r.title, r.hevy_updated_at, r.scheduled_date, r.content_hash, r.synced_at, r.status],
  );
}
for (const s of D.schedules) {
  await q(`INSERT INTO routine_schedules (hevy_routine_id, schedule_id, scheduled_date) VALUES ($1,$2,$3)`, [s.hevy_routine_id, s.schedule_id, s.scheduled_date]);
}

// Custom exercise mappings the user added over time (Garmin FIT category, subcategory)
const mappings = [
  ["Close Grip Bench Press", 0, 4],
  ["Cable Crossover", 9, 3],
  ["Landmine Press", 24, 9],
  ["Dumbbell Row", 23, 15],
  ["Incline Smith Machine Press", 0, 12],
  ["Cable Lateral Raise", 14, 6],
  ["Hack Squat (Machine)", 28, 15],
  ["Spider Curl", 7, 19],
];
for (const [n, c, s] of mappings) await q(`INSERT INTO custom_mappings (hevy_name, category, subcategory) VALUES ($1,$2,$3)`, [n, c, s]);

const day = 86_400_000;
const iso = (ms) => new Date(ms).toISOString();
const cache = {
  user_profile: { weight_kg: 81.6, birth_year: 1991, sex: "male", vo2max: 47, timezone: "America/Los_Angeles" },
  timing: { working_set_seconds: 40, warmup_set_seconds: 25, rest_between_sets_seconds: 90, rest_between_exercises_seconds: 150 },
  hr_fusion: { enabled: true },
  merge_settings: { merge_mode: true, description_enabled: true, merge_overlap_pct: 70, merge_max_drift_min: 20 },
  auto_sync: { enabled: true, interval_minutes: 120 },
  hevy_total: { count: D.workouts.length },
};
for (const [k, v] of Object.entries(cache)) {
  await q(`INSERT INTO app_cache (key, value, updated_at) VALUES ($1,$2,$3)`, [k, JSON.stringify(v), iso(D.now - (k === "user_profile" ? 34 : 120) * day)]);
}

// Credentials: Hevy API key, Garmin DI OAuth tokens (placeholder values), GitHub PAT for auto-sync
const creds = [
  ["hevy", "api_key", { api_key: "hv_7f3c2a91-local-placeholder" }, D.installMs, null, "active"],
  ["garmin_tokens", "oauth", { garmin_tokens: { di_token: "placeholder.di.token", di_refresh_token: "placeholder.refresh", di_client_id: "GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2" } }, D.now - 41 * day, D.now + 49 * day, "active"],
  ["github", "pat", { pat: "ghp_placeholderLocalOnly000000000000000", repo: "mkowalski-lifts/hevy2garmin" }, D.installMs + 3 * day, null, "active"],
];
for (const [p, a, c, at, exp, st] of creds) {
  await q(`INSERT INTO platform_credentials (platform, auth_type, credentials, connected_at, expires_at, status) VALUES ($1,$2,$3,$4,$5,$6)`,
    [p, a, JSON.stringify(c), iso(at), exp ? iso(exp) : null, st]);
}

const n = (await q(`SELECT count(*)::int AS n FROM synced_workouts`)).rows[0].n;
console.log(`[pg] seeded: ${n} synced_workouts, ${D.pending.length} pending, ${D.syncLog.length} sync_log, ${D.hr.length} hr_cache, ${D.workouts.length} Hevy workouts`);

const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log(`[pg] listening on 127.0.0.1:${port}`);
const stop = async () => { await server.stop().catch(() => {}); await db.close().catch(() => {}); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
