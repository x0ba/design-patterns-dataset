// Generates the mock "second-helping" repository snapshot: modules, dependency links,
// pinned issues, volunteers, and a precomputed spatial layout. Deterministic (seeded).
import { writeFileSync } from 'node:fs';
import { forceSimulation, forceLink, forceManyBody, forceCollide } from 'd3-force';

// ---------- seeded rng ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261117);
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const wpick = (entries) => { // [[key, weight]]
  const tot = entries.reduce((s, e) => s + e[1], 0);
  let r = rnd() * tot;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[entries.length - 1][0];
};

const SNAPSHOT = '2026-11-16';
const REPO_START = new Date('2023-09-04T00:00:00Z');
const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

// ---------- people ----------
const people = [
  { name: 'Ruth A.',    full: 'Ruth A.',    active: true,  end: '2026-11-12', joined: '2023-09-04', role: 'Onboarding buddy' },
  { name: 'Marco D.',   full: 'Marco D.',   active: true,  end: '2026-09-02', joined: '2023-09-04', role: '' },
  { name: 'Joanna B.',  full: 'Joanna B.',  active: true,  end: '2026-11-09', joined: '2024-02-12', role: '' },
  { name: 'Tomás R.',   full: 'Tomás R.',   active: true,  end: '2026-10-21', joined: '2024-06-03', role: '' },
  { name: 'Kenji M.',   full: 'Kenji M.',   active: true,  end: '2026-11-05', joined: '2024-09-16', role: '' },
  { name: 'Wen L.',     full: 'Wen Liu',    active: true,  end: '2026-11-12', joined: '2026-11-09', role: 'You' },
  { name: 'Sam O.',     full: 'Sam O.',     active: false, end: '2024-12-05', joined: '2023-09-04', role: '' },
  { name: 'Priya N.',   full: 'Priya N.',   active: false, end: '2025-06-14', joined: '2023-09-04', role: '' },
  { name: 'Luca F.',    full: 'Luca F.',    active: false, end: '2025-11-20', joined: '2023-10-09', role: '' },
];
const personByName = Object.fromEntries(people.map((p) => [p.name, p]));

// ---------- services ----------
const services = {
  dispatch: { id: 'dispatch', name: 'Dispatch API',      lang: 'Python',     blurb: 'Pickup scheduling, routing, driver and donor records' },
  sms:      { id: 'sms',      name: 'Driver SMS worker', lang: 'Node.js',    blurb: 'Texts reminders to drivers and reads their replies' },
  donor:    { id: 'donor',    name: 'Donor web app',     lang: 'TypeScript', blurb: 'Where restaurants request and manage pickups' },
};

// ---------- packages (dir, anchor in layout space, coverage mean, owners) ----------
const SC = 0.54;
const P = (service, dir, anchor, cov, owners, files, uses, mean) => ({ service, dir, key: dir || service, anchor: [anchor[0] * SC, anchor[1] * SC], cov, owners, files, uses, mean });

const packages = [
  // ---- dispatch (142)
  P('dispatch', 'dispatch/api', [720, 560], 60, { 'Kenji M.': 6, 'Ruth A.': 1, 'Priya N.': 3, 'Tomás R.': 1 },
    ['app.py','auth.py','middleware.py','errors.py','routes/pickups.py','routes/drivers.py','routes/donors.py','routes/shelters.py','routes/zones.py','routes/webhooks.py','routes/health.py','routes/reports.py','schemas/pickup.py','schemas/driver.py','schemas/donor.py'],
    { self: 2, 'dispatch/zones': 0.8, 'dispatch/drivers': 2, 'dispatch/donors': 2, 'dispatch/shelters': 1.5, 'dispatch/routing': 0.8, 'dispatch/reports': 1, 'dispatch/db': 2.5, 'dispatch/util': 2 }, 4.2),
  P('dispatch', 'dispatch/scheduling', [1060, 330], 46, { 'Marco D.': 8, 'Kenji M.': 3, 'Sam O.': 3, 'Priya N.': 1 },
    ['windows.py','pickup_service.py','recurrence.py','slots.py','calendar.py','holidays.py','open_slots.py','conflicts.py','reschedule.py','expiry.py','rules.py','batching.py','lead_time.py','cutoffs.py','blackout.py','timeline.py','overrides.py','reminders_due.py'],
    { self: 3, 'dispatch/zones': 1.2, 'dispatch/util': 2, 'dispatch/db': 1.5, 'dispatch/drivers': 0.4, 'dispatch/donors': 0.2 }, 3.4),
  P('dispatch', 'dispatch/zones', [1400, 170], 55, { 'Marco D.': 5, 'Sam O.': 2, 'Joanna B.': 1 },
    ['east.py','west.py','north.py','south.py','central.py','registry.py','boundaries.py','geocode.py','base.py','zone_rules.py'],
    { self: 2.5, 'dispatch/util': 2.5, 'dispatch/db': 1 }, 2.4),
  P('dispatch', 'dispatch/util', [1740, 320], 68, { 'Sam O.': 5, 'Marco D.': 2, 'Tomás R.': 2, 'Kenji M.': 2 },
    ['tz.py','dates.py','strings.py','retry.py','logging.py','ids.py','units.py','geo.py','validators.py','cache.py','config.py','clock.py','pagination.py'],
    { self: 1 }, 0.9),
  P('dispatch', 'dispatch/routing', [1060, 640], 38, { 'Tomás R.': 8, 'Marco D.': 3, 'Luca F.': 2 },
    ['assign.py','distance.py','matrix.py','optimizer.py','clustering.py','cost.py','constraints.py','eta.py','traffic.py','stops.py','polyline.py','route_plan.py'],
    { self: 3, 'dispatch/zones': 1.2, 'dispatch/util': 1.5, 'dispatch/drivers': 1.5, 'dispatch/db': 1.5, 'dispatch/scheduling': 0.8 }, 3.8),
  P('dispatch', 'dispatch/drivers', [1060, 960], 52, { 'Priya N.': 4, 'Kenji M.': 4, 'Tomás R.': 2 },
    ['profiles.py','availability.py','ratings.py','onboarding.py','background_checks.py','vehicles.py','capacity.py','matching.py','preferences.py','training.py','shifts.py','streaks.py'],
    { self: 2, 'dispatch/util': 1.5, 'dispatch/db': 2, 'dispatch/notifications': 1, 'dispatch/scheduling': 0.4 }, 3.2),
  P('dispatch', 'dispatch/notifications', [1400, 470], 57, { 'Ruth A.': 3, 'Kenji M.': 3, 'Priya N.': 2 },
    ['outbound.py','sms_gateway.py','email.py','templates.py','preferences.py','digest.py','delivery_log.py','rate_limit.py','push.py'],
    { self: 2.5, 'dispatch/util': 2, 'dispatch/db': 1.5, 'dispatch/scheduling': 0.2 }, 3),
  P('dispatch', 'dispatch/donors', [1400, 740], 49, { 'Joanna B.': 4, 'Priya N.': 3, 'Luca F.': 2 },
    ['restaurants.py','contacts.py','surplus.py','food_types.py','safety.py','onboarding.py','recurring_donors.py','pickup_requests.py','receipts.py','tax_letters.py'],
    { self: 2, 'dispatch/util': 1.5, 'dispatch/db': 2, 'dispatch/notifications': 0.8, 'dispatch/zones': 0.3 }, 3),
  P('dispatch', 'dispatch/shelters', [1400, 1010], 53, { 'Priya N.': 5, 'Luca F.': 2, 'Kenji M.': 1 },
    ['intake.py','capacity.py','needs.py','contacts.py','delivery.py','hours.py','allocation.py','receipts.py'],
    { self: 2, 'dispatch/util': 1.5, 'dispatch/db': 2, 'dispatch/notifications': 0.8, 'dispatch/zones': 0.5 }, 3),
  P('dispatch', 'dispatch/db', [1740, 700], 55, { 'Kenji M.': 5, 'Sam O.': 3, 'Tomás R.': 2 },
    ['session.py','base.py','audit.py','query_helpers.py','seeds.py','models/pickup.py','models/driver.py','models/donor.py','models/shelter.py','models/zone.py','repos/pickups.py','repos/drivers.py','repos/donors.py','repos/shelters.py','migrations/env.py'],
    { self: 3, 'dispatch/util': 1.5 }, 1.8),
  P('dispatch', 'dispatch/reports', [1740, 1000], 40, { 'Luca F.': 4, 'Joanna B.': 2, 'Tomás R.': 2 },
    ['weekly_summary.py','pounds_rescued.py','driver_hours.py','donor_leaderboard.py','export_csv.py','legacy_export.py','shelter_impact.py'],
    { self: 1, 'dispatch/db': 3, 'dispatch/util': 1.5, 'dispatch/drivers': 0.5, 'dispatch/donors': 0.5, 'dispatch/shelters': 0.5 }, 3),
  P('dispatch', 'dispatch/jobs', [720, 950], 42, { 'Marco D.': 3, 'Kenji M.': 3, 'Tomás R.': 1 },
    ['nightly_expiry.py','reminder_dispatch.py','sync_calendar.py','cleanup.py','backups.py'],
    { self: 0.5, 'dispatch/scheduling': 1.5, 'dispatch/notifications': 1.5, 'dispatch/db': 1.5, 'dispatch/reports': 1, 'dispatch/util': 1.5, 'dispatch/drivers': 0.5 }, 3.8),
  P('dispatch', 'dispatch/admin', [720, 170], 36, { 'Joanna B.': 3, 'Kenji M.': 3, 'Luca F.': 2 },
    ['dashboard.py','users.py','audit_views.py','feature_flags.py','imports.py','bulk_edit.py','settings.py','impersonation.py'],
    { self: 1, 'dispatch/db': 2, 'dispatch/drivers': 1, 'dispatch/donors': 1, 'dispatch/shelters': 0.5, 'dispatch/util': 1.5, 'dispatch/reports': 0.5, 'dispatch/zones': 0.3 }, 3.4),

  // ---- sms (38)
  P('sms', 'sms/reminders', [320, 230], 66, { 'Ruth A.': 8, 'Luca F.': 2, 'Tomás R.': 1 },
    ['compose.js','scheduler.js','templates.js','quietHours.js','batch.js','retry.js','dedupe.js','preview.js'],
    { self: 2.5, 'sms/api': 1.2, 'sms/util': 2, 'sms/queue': 1.2, 'sms/gateway': 0.8 }, 3.4),
  P('sms', 'sms/api', [520, 370], 70, { 'Ruth A.': 6, 'Luca F.': 1 },
    ['dispatchClient.js','pickups.js','drivers.js','auth.js','errors.js'], { self: 1.5, 'sms/util': 2 }, 1.5),
  P('sms', 'sms/gateway', [130, 420], 62, { 'Luca F.': 4, 'Ruth A.': 3 },
    ['carrierClient.js','send.js','status.js','rateLimit.js','sandbox.js','webhook.js'], { self: 2, 'sms/util': 2 }, 2.2),
  P('sms', 'sms/inbound', [120, 230], 61, { 'Ruth A.': 4, 'Luca F.': 3 },
    ['handler.js','parseReply.js','confirm.js','optOut.js','help.js','reassign.js'],
    { self: 2, 'sms/api': 1.5, 'sms/gateway': 0.8, 'sms/util': 1.5, 'sms/queue': 0.5 }, 3),
  P('sms', 'sms/queue', [310, 60], 58, { 'Ruth A.': 3, 'Tomás R.': 2 },
    ['worker.js','jobs.js','deadLetter.js','backoff.js','metrics.js'], { self: 2, 'sms/util': 2, 'sms/gateway': 1, 'sms/api': 0.5 }, 2.6),
  P('sms', 'sms/util', [330, 440], 74, { 'Ruth A.': 4, 'Luca F.': 2 },
    ['localTime.js','phone.js','logger.js','config.js','ids.js'], { self: 0.8 }, 0.7),
  P('sms', 'sms', [520, 140], 52, { 'Ruth A.': 3, 'Tomás R.': 1 },
    ['index.js','server.js','health.js'], { 'sms/reminders': 2, 'sms/inbound': 2, 'sms/queue': 2, 'sms/gateway': 1, 'sms/util': 1.5 }, 5),

  // ---- donor (34)
  P('donor', 'donor/pages', [140, 740], 40, { 'Joanna B.': 7, 'Priya N.': 1 },
    ['index.tsx','schedule.tsx','history.tsx','account.tsx','signin.tsx','impact.tsx','help.tsx','onboarding.tsx'],
    { 'donor/components': 3, 'donor/forms': 1.5, 'donor/state': 1.5, 'donor/lib': 1.5, 'donor/api': 1.2, self: 0.3 }, 5),
  P('donor', 'donor/components', [330, 950], 44, { 'Joanna B.': 6, 'Luca F.': 2 },
    ['PickupCard.tsx','TimePicker.tsx','WindowBadge.tsx','AddressField.tsx','FoodTypeSelect.tsx','Header.tsx','Toast.tsx','ConfirmDialog.tsx','EmptyState.tsx'],
    { self: 1.5, 'donor/lib': 1.5, 'donor/state': 0.5 }, 2),
  P('donor', 'donor/forms', [330, 740], 42, { 'Joanna B.': 4, 'Luca F.': 1 },
    ['pickupForm.ts','recurringForm.ts','accountForm.ts','validators.ts','formState.ts'],
    { self: 1.5, 'donor/lib': 1.5, 'donor/api': 1.2 }, 2.5),
  P('donor', 'donor/api', [520, 700], 52, { 'Joanna B.': 3, 'Kenji M.': 1 },
    ['client.ts','pickups.ts','donors.ts','auth.ts'], { self: 1, 'donor/lib': 1 }, 1.2),
  P('donor', 'donor/lib', [140, 950], 58, { 'Joanna B.': 3, 'Luca F.': 2 },
    ['format.ts','dates.ts','session.ts','analytics.ts','storage.ts'], { self: 0.7 }, 0.7),
  P('donor', 'donor/state', [520, 950], 48, { 'Joanna B.': 3 },
    ['store.ts','selectors.ts','persistence.ts'], { 'donor/api': 1.5, 'donor/lib': 1, self: 0.5 }, 2.2),
];

const subdirOf = (p) => p; // placeholder

// ---------- explicit overrides ----------
const O = {
  'dispatch/scheduling/windows.py':      { lines: 1140, cov: 31, by: 'Marco D.', date: '2025-03-19' },
  'dispatch/scheduling/pickup_service.py': { lines: 620, cov: 58, by: 'Kenji M.', date: '2026-01-22' },
  'dispatch/util/tz.py':                  { lines: 88,  cov: 0,  by: 'Sam O.',   date: '2024-04-22' },
  'dispatch/zones/east.py':               { lines: 214, cov: 27, by: 'Marco D.', date: '2025-03-12' },
  'dispatch/zones/registry.py':           { lines: 156, cov: 63, by: 'Marco D.', date: '2025-03-12' },
  'sms/reminders/compose.js':             { lines: 246, cov: 64, by: 'Ruth A.',  date: '2026-09-14' },
  'sms/reminders/scheduler.js':           { lines: 318, cov: 59, by: 'Ruth A.',  date: '2026-10-08' },
  'sms/api/dispatchClient.js':            { lines: 312, cov: 72, by: 'Ruth A.',  date: '2026-07-08' },
  'sms/util/localTime.js':                { lines: 74,  cov: 41, by: 'Luca F.',  date: '2025-02-27' },
  'dispatch/api/routes/pickups.py':       { lines: 760, cov: 66, by: 'Kenji M.', date: '2026-06-03' },
  'dispatch/routing/assign.py':           { lines: 2900, cov: 22, by: 'Tomás R.', date: '2026-05-27' },
  'dispatch/routing/optimizer.py':        { lines: 1620, cov: 35, by: 'Tomás R.', date: '2026-03-08' },
  'dispatch/db/models/pickup.py':         { lines: 1310, cov: 48, by: 'Kenji M.', date: '2026-08-19' },
  'dispatch/reports/legacy_export.py':    { lines: 1180, cov: 0,  by: 'Luca F.',  date: '2024-03-02' },
  'dispatch/util/ids.py':                 { lines: 46,  cov: 94, by: 'Sam O.',   date: '2024-02-11' },
  'dispatch/util/clock.py':               { lines: 20,  cov: 88, by: 'Marco D.', date: '2025-03-12' },
  'dispatch/scheduling/slots.py':         { cov: 52 },
  'dispatch/scheduling/holidays.py':      { cov: 23 },
  'dispatch/scheduling/rules.py':         { cov: 44 },
  'dispatch/admin/impersonation.py':      { cov: 0 },
  'sms/gateway/sandbox.js':               { cov: 0 },
  'donor/lib/analytics.ts':               { cov: 0 },
  'donor/pages/schedule.tsx':             { lines: 980, cov: 18, by: 'Joanna B.', date: '2026-10-02' },
  'sms/queue/worker.js':                  { lines: 520 },
  'dispatch/scheduling/recurrence.py':    { lines: 690, cov: 39, by: 'Marco D.', date: '2025-08-26' },
  'dispatch/notifications/outbound.py':   { lines: 402, cov: 61 },
};

// ---------- build modules ----------
const modules = [];
const byPath = new Map();
let pkgIndex = 0;
const pkgMeta = [];
for (const pk of packages) {
  const svc = pk.service;
  const prefix = pk.dir === 'sms' ? 'sms/' : pk.dir + '/';
  const members = [];
  for (const f of pk.files) {
    const path = prefix + f;
    const o = O[path] || {};
    // author
    const by = o.by || wpick(Object.entries(pk.owners));
    const person = personByName[by];
    // date
    let date = o.date;
    if (!date) {
      const end = new Date(person.end + 'T00:00:00Z');
      const start = new Date(Math.max(REPO_START.getTime(), new Date(person.joined + 'T00:00:00Z').getTime()));
      const span = Math.max(30, (end - start) / DAY);
      const back = Math.pow(rnd(), person.active ? 2.8 : 1.15) * span * 0.97;
      date = iso(new Date(end.getTime() - Math.floor(back) * DAY));
    }
    // size
    let lines = o.lines;
    if (!lines) {
      const sizeScale = svc === 'dispatch' ? 190 : svc === 'sms' ? 130 : 120;
      lines = Math.round(Math.min(1050, Math.max(24, sizeScale * Math.exp(gauss() * 0.75))));
    }
    // coverage
    let cov = o.cov;
    if (cov === undefined) {
      const big = lines > 600 ? -10 : 0;
      cov = Math.round(Math.min(93, Math.max(0, pk.cov + big + gauss() * 17)));
    }
    const m = { id: modules.length, path, name: path.split('/').pop(), service: svc, pkg: pk.key, lines, cov, mod: date, by };
    modules.push(m); byPath.set(path, m); members.push(m);
  }
  pkgMeta.push({ key: pk.key, service: svc, label: pk.dir, count: members.length, anchor: pk.anchor });
  pkgIndex++;
}
if (modules.length !== 214) throw new Error('module count ' + modules.length);
for (const [sv, n] of [['dispatch', 142], ['sms', 38], ['donor', 34]]) {
  const c = modules.filter((m) => m.service === sv).length;
  if (c !== n) throw new Error(`${sv} has ${c}`);
}
const P_ = (p) => { const m = byPath.get(p); if (!m) throw new Error('unknown module ' + p); return m.id; };

// ---------- edges ----------
const edgeMap = new Map(); // "s>t" -> edge
const addEdge = (s, t, w, k = 'import', protectedEdge = false) => {
  if (s === t) return false;
  const key = s + '>' + t;
  if (edgeMap.has(key)) return false;
  edgeMap.set(key, { s, t, w, k, p: protectedEdge });
  return true;
};
const wgen = () => Math.min(9, 1 + Math.floor(-Math.log(1 - rnd()) * 1.4));

// explicit (protected) edges
const X = (from, tos, k = 'import') => {
  for (const t of tos) {
    const [path, w] = Array.isArray(t) ? t : [t, wgen()];
    addEdge(P_(from), P_(path), w, k, true);
  }
};
const HTTP = 'http';
X('sms/reminders/compose.js', [['sms/reminders/templates.js', 4], ['sms/util/localTime.js', 5], ['sms/api/dispatchClient.js', 3], ['sms/util/phone.js', 1]]);
X('sms/reminders/scheduler.js', [['sms/reminders/compose.js', 3], ['sms/reminders/quietHours.js', 2], ['sms/queue/jobs.js', 4], ['sms/reminders/dedupe.js', 2]]);
X('sms/api/dispatchClient.js', [['sms/api/errors.js', 3], ['sms/util/config.js', 2], ['sms/util/logger.js', 2]]);
X('sms/api/dispatchClient.js', [['dispatch/api/routes/pickups.py', 6], ['dispatch/api/routes/drivers.py', 3], ['dispatch/api/routes/zones.py', 2], ['dispatch/api/auth.py', 1]], HTTP);
X('sms/api/pickups.js', [['sms/api/dispatchClient.js', 4]]);
X('sms/api/drivers.js', [['sms/api/dispatchClient.js', 3]]);
X('sms/inbound/reassign.js', [['sms/api/drivers.js', 2], ['sms/api/pickups.js', 2]]);
X('sms/inbound/confirm.js', [['sms/api/pickups.js', 3]]);
X('donor/api/client.ts', [['dispatch/api/routes/pickups.py', 5], ['dispatch/api/routes/donors.py', 4], ['dispatch/api/routes/zones.py', 2], ['dispatch/api/auth.py', 2], ['dispatch/api/routes/shelters.py', 1]], HTTP);
X('donor/api/pickups.ts', [['donor/api/client.ts', 4]]);
X('donor/api/donors.ts', [['donor/api/client.ts', 3]]);
X('donor/api/auth.ts', [['donor/api/client.ts', 2]]);
X('dispatch/notifications/sms_gateway.py', [['sms/server.js', 3]], HTTP);

X('dispatch/api/routes/pickups.py', [['dispatch/scheduling/pickup_service.py', 6], ['dispatch/api/schemas/pickup.py', 4], ['dispatch/api/auth.py', 2], ['dispatch/db/repos/pickups.py', 3], ['dispatch/api/errors.py', 2], ['dispatch/util/validators.py', 2]]);
X('dispatch/api/routes/drivers.py', [['dispatch/drivers/profiles.py', 4], ['dispatch/api/schemas/driver.py', 3], ['dispatch/api/auth.py', 1]]);
X('dispatch/api/routes/zones.py', [['dispatch/zones/registry.py', 4], ['dispatch/api/auth.py', 1]]);
X('dispatch/api/routes/donors.py', [['dispatch/donors/pickup_requests.py', 3], ['dispatch/donors/restaurants.py', 4], ['dispatch/api/schemas/donor.py', 3]]);

X('dispatch/scheduling/pickup_service.py', [['dispatch/scheduling/windows.py', 8], ['dispatch/scheduling/slots.py', 4], ['dispatch/scheduling/rules.py', 3], ['dispatch/db/repos/pickups.py', 5], ['dispatch/notifications/outbound.py', 2], ['dispatch/scheduling/conflicts.py', 2], ['dispatch/db/session.py', 2]]);
X('dispatch/scheduling/windows.py', [['dispatch/util/tz.py', 9], ['dispatch/util/dates.py', 6], ['dispatch/zones/registry.py', 4], ['dispatch/zones/east.py', 3], ['dispatch/scheduling/rules.py', 3], ['dispatch/scheduling/holidays.py', 2], ['dispatch/scheduling/lead_time.py', 2], ['dispatch/scheduling/cutoffs.py', 2], ['dispatch/util/clock.py', 2], ['dispatch/util/logging.py', 1]]);
// callers of windows.py
X('dispatch/scheduling/slots.py', [['dispatch/scheduling/windows.py', 5]]);
X('dispatch/scheduling/reschedule.py', [['dispatch/scheduling/windows.py', 4], ['dispatch/scheduling/pickup_service.py', 2]]);
X('dispatch/scheduling/recurrence.py', [['dispatch/scheduling/windows.py', 3]]);
X('dispatch/scheduling/open_slots.py', [['dispatch/scheduling/windows.py', 3]]);
X('dispatch/notifications/outbound.py', [['dispatch/scheduling/windows.py', 2]]);
X('dispatch/routing/assign.py', [['dispatch/scheduling/windows.py', 6]]);
X('dispatch/jobs/reminder_dispatch.py', [['dispatch/scheduling/windows.py', 3], ['dispatch/notifications/outbound.py', 4], ['dispatch/notifications/sms_gateway.py', 3]]);
X('dispatch/donors/pickup_requests.py', [['dispatch/scheduling/pickup_service.py', 3]]);
// zones depend on tz
for (const z of ['east', 'west', 'north', 'south', 'central'])
  X(`dispatch/zones/${z}.py`, [['dispatch/util/tz.py', z === 'east' ? 4 : 2], ['dispatch/zones/base.py', 3], ['dispatch/zones/zone_rules.py', 2]]);
X('dispatch/zones/registry.py', [['dispatch/zones/east.py', 2], ['dispatch/zones/west.py', 2], ['dispatch/zones/north.py', 2], ['dispatch/zones/south.py', 2], ['dispatch/zones/central.py', 2], ['dispatch/zones/boundaries.py', 3]]);
X('dispatch/util/dates.py', [['dispatch/util/tz.py', 5]]);
X('dispatch/scheduling/calendar.py', [['dispatch/util/tz.py', 3], ['dispatch/scheduling/holidays.py', 2]]);
X('dispatch/scheduling/holidays.py', [['dispatch/util/tz.py', 2]]);
X('dispatch/jobs/sync_calendar.py', [['dispatch/util/tz.py', 2], ['dispatch/scheduling/calendar.py', 3]]);
X('dispatch/reports/driver_hours.py', [['dispatch/util/tz.py', 2]]);
X('dispatch/notifications/digest.py', [['dispatch/util/tz.py', 2]]);
X('dispatch/drivers/shifts.py', [['dispatch/util/tz.py', 3]]);
X('dispatch/routing/eta.py', [['dispatch/util/tz.py', 1]]);
X('sms/util/localTime.js', []);

// random fill
const pkgByKey = Object.fromEntries(packages.map((p) => [p.key, p]));
const membersOf = {};
for (const m of modules) (membersOf[m.pkg] ||= []).push(m);
const HUB = {
  'dispatch/util/dates.py': 6, 'dispatch/util/logging.py': 7, 'dispatch/util/config.py': 6, 'dispatch/db/session.py': 6, 'dispatch/db/base.py': 4,
  'dispatch/util/clock.py': 3, 'dispatch/util/ids.py': 3, 'dispatch/util/validators.py': 3, 'dispatch/api/errors.py': 3, 'dispatch/api/auth.py': 3,
  'dispatch/db/models/pickup.py': 3, 'dispatch/db/models/driver.py': 3, 'dispatch/db/models/donor.py': 3, 'dispatch/db/models/shelter.py': 2, 'dispatch/db/models/zone.py': 2,
  'dispatch/util/tz.py': 1.2, 'dispatch/zones/base.py': 2, 'dispatch/scheduling/rules.py': 2,
  'sms/util/logger.js': 6, 'sms/util/config.js': 5, 'sms/util/localTime.js': 3, 'sms/util/phone.js': 3, 'sms/gateway/send.js': 3, 'sms/queue/jobs.js': 3, 'sms/api/errors.js': 2,
  'donor/lib/format.ts': 4, 'donor/lib/dates.ts': 4, 'donor/state/store.ts': 4, 'donor/api/client.ts': 4, 'donor/lib/session.ts': 3, 'donor/components/Toast.tsx': 2,
};
// modules that only receive explicitly-declared edges (keeps the pickup path legible)
const NO_RANDOM_IN = new Set(['dispatch/scheduling/windows.py', 'dispatch/scheduling/pickup_service.py', 'dispatch/routing/assign.py', 'dispatch/notifications/outbound.py', 'sms/api/dispatchClient.js', 'sms/reminders/compose.js']);
const hubW = (m) => (NO_RANDOM_IN.has(m.path) ? 0 : (HUB[m.path] ?? 1));

function randomOutEdges(m, count) {
  const pk = pkgByKey[m.pkg];
  const uses = Object.entries(pk.uses).map(([k, w]) => [k === 'self' ? m.pkg : k, w]);
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const tp = wpick(uses);
      const cand = membersOf[tp].filter((c) => c.id !== m.id && hubW(c) > 0);
      if (!cand.length) continue;
      const tm = wpick(cand.map((c) => [c, hubW(c)]));
      if (tp === m.pkg && edgeMap.has(tm.id + '>' + m.id)) continue; // avoid trivial 2-cycles
      if (m.path === 'dispatch/util/tz.py') break;
      if (addEdge(m.id, tm.id, wgen(), tm.service === m.service ? 'import' : 'http')) break;
    }
  }
}
// leaf-ish modules are mostly consumed, rarely consuming
for (const m of modules) {
  if (m.path === 'dispatch/util/tz.py') continue;
  const pk = pkgByKey[m.pkg];
  const have = [...edgeMap.values()].filter((e) => e.s === m.id).length;
  let d = Math.round(pk.mean + (rnd() - 0.5) * 3 + gauss() * 0.4);
  d = Math.max(pk.mean < 1.5 ? 0 : 1, d);
  randomOutEdges(m, Math.max(0, d - have));
}

// trim / pad to 612
const TARGET = 612;
let edges = [...edgeMap.values()];
if (edges.length > TARGET) {
  const removable = edges.filter((e) => !e.p);
  while (edgeMap.size > TARGET) {
    const i = Math.floor(rnd() * removable.length);
    const e = removable.splice(i, 1)[0];
    edgeMap.delete(e.s + '>' + e.t);
  }
} else {
  let guard = 0;
  while (edgeMap.size < TARGET && guard++ < 5000) randomOutEdges(pick(modules), 1);
}
edges = [...edgeMap.values()];
if (edges.length !== TARGET) throw new Error('edge count ' + edges.length);

// ---------- verification of story-critical structure ----------
const out = modules.map(() => []);
const inn = modules.map(() => []);
for (const e of edges) { out[e.s].push(e.t); inn[e.t].push(e.s); }
function countShortest(a, b) {
  const dist = new Map([[a, 0]]); const ways = new Map([[a, 1]]); const q = [a];
  while (q.length) { const u = q.shift(); for (const v of out[u]) { if (!dist.has(v)) { dist.set(v, dist.get(u) + 1); ways.set(v, 0); q.push(v); } if (dist.get(v) === dist.get(u) + 1) ways.set(v, ways.get(v) + ways.get(u)); } }
  return { d: dist.get(b), ways: ways.get(b) };
}
const compose = P_('sms/reminders/compose.js'), windows = P_('dispatch/scheduling/windows.py'), tz = P_('dispatch/util/tz.py');
const sp = countShortest(compose, windows);
console.log('compose→windows shortest hops:', sp.d, 'ways:', sp.ways);
if (sp.d !== 4 || sp.ways !== 1) throw new Error('trail not unique/4 hops');
const reach = (start, depth = 99) => { const seen = new Map([[start, 0]]); const q = [start]; while (q.length) { const u = q.shift(); if (seen.get(u) >= depth) continue; for (const v of inn[u]) if (!seen.has(v)) { seen.set(v, seen.get(u) + 1); q.push(v); } } return seen; };
for (const [label, id] of [['windows', windows], ['tz', tz]]) {
  const r = reach(id); const bySvc = {};
  for (const [k] of r) if (k !== id) bySvc[modules[k].service] = (bySvc[modules[k].service] || 0) + 1;
  console.log(label, 'depth3:', [...reach(id, 3)].length - 1, 'callers:', inn[id].length, 'depth1:', [...reach(id, 1)].length - 1, 'depth2:', [...reach(id, 2)].length - 1, 'all:', r.size - 1, bySvc);
}
console.log('tz.py callers:', inn[tz].map((i) => modules[i].path).join(', '));
console.log('windows callers:', inn[windows].map((i) => modules[i].path).join(', '));

// ---------- layout ----------
const rad = (m) => 3.2 + 0.28 * Math.sqrt(m.lines);
const anchorOf = Object.fromEntries(pkgMeta.map((p) => [p.key, p.anchor]));
const nodes = modules.map((m) => {
  const a = anchorOf[m.pkg];
  return { id: m.id, x: a[0] + (rnd() - 0.5) * 90, y: a[1] + (rnd() - 0.5) * 90, r: rad(m), pkg: m.pkg };
});
const links = edges.map((e) => ({ source: e.s, target: e.t, w: e.w, cross: modules[e.s].service !== modules[e.t].service }));
function anchorForce(k) {
  let ns;
  const f = (alpha) => { for (const n of ns) { const a = anchorOf[n.pkg]; n.vx += (a[0] - n.x) * k * alpha; n.vy += (a[1] - n.y) * k * alpha; } };
  f.initialize = (x) => { ns = x; };
  return f;
}
const sim = forceSimulation(nodes)
  .force('link', forceLink(links).id((d) => d.id).distance((l) => (l.cross ? 80 : 26 + 26 / Math.sqrt(l.w))).strength((l) => (l.cross ? 0.01 : 0.05 + 0.02 * Math.min(l.w, 6))))
  .force('charge', forceManyBody().strength(-30).distanceMax(120))
  .force('collide', forceCollide((d) => d.r + 2.6).iterations(2))
  .force('anchor', anchorForce(0.9))
  .stop();
for (let i = 0; i < 600; i++) sim.tick();
let minx = Infinity, miny = Infinity;
for (const n of nodes) { minx = Math.min(minx, n.x - n.r); miny = Math.min(miny, n.y - n.r); }
modules.forEach((m, i) => { m.x = Math.round((nodes[i].x - minx + 120) * 10) / 10; m.y = Math.round((nodes[i].y - miny + 120) * 10) / 10; });
pkgMeta.forEach((p) => { p.anchor = [Math.round(p.anchor[0] - minx + 120), Math.round(p.anchor[1] - miny + 120)]; });

// ---------- issues ----------
const issues = [
  { n: 212, title: 'DST pickup offset east zone', opened: '2026-11-03', path: 'dispatch/zones/east.py', labels: ['bug', 'east zone'], note: 'Drivers in the east zone are being given pickup windows an hour off since the clocks changed.' },
  { n: 209, title: 'Reminder text sends twice when a driver swaps pickups', opened: '2026-10-27', path: 'sms/reminders/scheduler.js', labels: ['bug'] },
  { n: 204, title: 'Pickup form accepts dates in the past', opened: '2026-10-09', path: 'donor/forms/pickupForm.ts', labels: ['bug', 'good first issue'] },
  { n: 198, title: 'Add unit tests for the timezone helpers', opened: '2026-09-22', path: 'dispatch/util/tz.py', labels: ['tests'] },
  { n: 191, title: 'Route assignment times out above 40 stops', opened: '2026-08-30', path: 'dispatch/routing/assign.py', labels: ['performance'] },
  { n: 187, title: 'Move the SMS worker to Node 24 LTS', opened: '2026-08-11', path: 'sms/index.js', labels: ['maintenance'] },
  { n: 176, title: 'Recurring pickups skip the week after a holiday', opened: '2026-07-02', path: 'dispatch/scheduling/recurrence.py', labels: ['bug'] },
  { n: 163, title: 'Shelter intake adds pounds and kilograms together', opened: '2026-05-19', path: 'dispatch/shelters/intake.py', labels: ['bug'] },
  { n: 151, title: 'Background-check emails land in spam', opened: '2026-03-06', path: 'dispatch/notifications/email.py', labels: ['deliverability'] },
].map((i) => ({ ...i, module: P_(i.path) }));

// ---------- write ----------
const data = {
  repo: { name: 'second-helping', org: 'Second Helping', snapshot: SNAPSHOT, today: '2026-11-17', hosting: 'A single donated VPS', activeVolunteers: people.filter((p) => p.active).length },
  services: Object.values(services),
  packages: pkgMeta,
  people,
  modules: modules.map((m) => ({ i: m.id, p: m.path, s: m.service, k: m.pkg, l: m.lines, c: m.cov, d: m.mod, b: m.by, x: m.x, y: m.y })),
  edges: edges.map((e) => [e.s, e.t, e.w, e.k === 'http' ? 1 : 0]),
  issues,
};
writeFileSync(new URL('../src/data/codebase.json', import.meta.url), JSON.stringify(data));
// stats
const per = (sv) => modules.filter((m) => m.service === sv);
for (const sv of Object.keys(services)) { const ms = per(sv); console.log(sv, ms.length, 'lines', ms.reduce((s, m) => s + m.lines, 0), 'avgcov', Math.round(ms.reduce((s, m) => s + m.cov, 0) / ms.length)); }
console.log('modules', modules.length, 'edges', edges.length, 'http edges', edges.filter((e) => e.k === 'http').length);
console.log('lines min/max', Math.min(...modules.map((m) => m.lines)), Math.max(...modules.map((m) => m.lines)), 'cov min/max', Math.min(...modules.map((m) => m.cov)), Math.max(...modules.map((m) => m.cov)));
console.log('zero cov:', modules.filter((m) => m.cov === 0).map((m) => m.path).join(', '));
for (const p of people) console.log(p.name, modules.filter((m) => m.by === p.name).length, 'latest', modules.filter((m) => m.by === p.name).map((m) => m.mod).sort().pop());
console.log('max date', modules.map((m) => m.mod).sort().pop());
