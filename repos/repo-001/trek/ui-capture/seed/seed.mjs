// Seeds a fresh TREK instance through its REST API.
// Usage: node seed.mjs http://localhost:5460
import { client } from './api.mjs';
import { USERS, TRIPS, ATLAS_COUNTRIES, BUCKET_LIST, COLLECTIONS, JOURNEYS } from './data.mjs';

const BASE = process.argv[2] || 'http://localhost:5460';
const MAIN = { email: 'maya@trek.local', username: 'maya.lindqvist', password: 'Wanderlust2026!', setupPassword: 'Setup-Only-2026!' };

const log = (...a) => console.log('[seed]', ...a);
const soft = async (label, fn) => { try { return await fn(); } catch (e) { console.warn('[seed] WARN', label, '-', e.message.slice(0, 300)); return null; } };

// Rough FX rates into each trip currency, so expenses in other currencies don't need a live FX lookup.
const EUR = { EUR: 1, DKK: 7.46, MXN: 19.6, JPY: 162, ISK: 150, GBP: 0.85, USD: 1.08 };
const fx = (from, to) => EUR[to] / EUR[from];
const COST_CAT = { Transport: 'transport', Accommodation: 'accommodation', 'Food & Drink': 'food', Activities: 'activities', Shopping: 'shopping', Other: 'other' };

const maya = client(BASE);
let me;
try {
  me = (await maya.login(MAIN.email, MAIN.password)).user;
} catch {
  me = (await maya.login(MAIN.email, MAIN.setupPassword)).user;
}
if (me.must_change_password) {
  await maya.put('/api/auth/me/password', { current_password: MAIN.setupPassword, new_password: MAIN.password });
  me = (await maya.login(MAIN.email, MAIN.password)).user;
}
await soft('rename admin', () => maya.put(`/api/admin/users/${me.id}`, { username: MAIN.username, email: MAIN.email }));
log('main user', me.id);

// ── Users ──────────────────────────────────────────────────────────────────
const existing = (await maya.get('/api/admin/users')).users || [];
const ids = { maya: me.id };
const clients = { maya };
for (const u of USERS) {
  let row = existing.find((x) => x.email === u.email);
  if (!row) row = (await maya.post('/api/admin/users', { username: u.username, email: u.email, password: u.password, role: 'user' })).user;
  ids[u.key] = row.id;
  const c = client(BASE);
  const r = await c.login(u.email, u.password);
  if (r.user?.must_change_password) await soft('pw ' + u.key, () => c.put('/api/auth/me/password', { current_password: u.password, new_password: u.password + '!' }));
  clients[u.key] = c;
}
log('users', ids);

// Preferences of an established user
await soft('settings', () => maya.put('/api/auth/me/settings', { settings: { temperature_unit: 'celsius', time_format: '24h', default_currency: 'EUR' } }));

// ── Trips ──────────────────────────────────────────────────────────────────
const tripIds = {};
const placeIdsByTrip = {};
const existingTrips = (await maya.get('/api/trips')).trips || [];
const archivedTrips = (await soft('archived list', () => maya.get('/api/trips?archived=1')))?.trips || [];
for (const t of [...existingTrips, ...archivedTrips]) if (t.title === 'x') await soft('del x', () => maya.del(`/api/trips/${t.id}`));

for (const T of TRIPS) {
  if ([...existingTrips, ...archivedTrips].some((x) => x.title === T.title)) { log('skip existing', T.title); continue; }
  const body = { title: T.title, description: T.description, currency: T.currency, reminder_days: 3 };
  if (T.start) { body.start_date = T.start; body.end_date = T.end; } else body.day_count = T.dayCount;
  const trip = (await maya.post('/api/trips', body)).trip;
  const tid = trip.id; tripIds[T.key] = tid;
  for (const m of T.members || []) await soft('member', () => maya.post(`/api/trips/${tid}/members`, { identifier: USERS.find((u) => u.key === m).username }));
  const days = (await maya.get(`/api/trips/${tid}/days`)).days;

  // places
  const pids = [];
  for (const p of T.places || []) {
    const [name, category_id, lat, lng, address, notes, duration_minutes, price, website, phone] = p;
    const body = { name, category_id, lat, lng, address, notes: notes || null, duration_minutes: duration_minutes || null };
    if (price != null) { body.price = price; body.currency = T.currency; }
    if (website) body.website = website;
    if (phone) body.phone = phone;
    const pl = await soft('place ' + name, () => maya.post(`/api/trips/${tid}/places`, body));
    pids.push(pl?.place?.id ?? pl?.id);
  }
  placeIdsByTrip[T.key] = pids;

  // day plan
  for (let d = 0; d < (T.days || []).length && d < days.length; d++) {
    for (const [pi, time, note] of T.days[d]) {
      const a = await soft('assign', () => maya.post(`/api/trips/${tid}/days/${days[d].id}/assignments`, { place_id: pids[pi], notes: note || null }));
      const aid = a?.assignment?.id ?? a?.id;
      if (aid && time) await soft('time', () => maya.put(`/api/trips/${tid}/assignments/${aid}/time`, { place_time: time }));
    }
  }
  for (const [d, text, time, icon] of T.dayNotes || []) await soft('daynote', () => maya.post(`/api/trips/${tid}/days/${days[d].id}/notes`, { text, time, icon }));

  // accommodations
  for (const a of T.accommodations || []) {
    await soft('accommodation', () => maya.post(`/api/trips/${tid}/accommodations`, {
      place_id: pids[a.place], start_day_id: days[a.from].id, end_day_id: days[Math.min(a.to, days.length - 1)].id,
      check_in: a.check_in || '15:00', check_out: a.check_out || '11:00', confirmation: a.conf || null,
    }));
  }

  // reservations
  for (const r of T.reservations || []) {
    // An accommodation already creates its own hotel booking; skip the explicit duplicate.
    if (r.type === 'hotel' && (T.accommodations || []).length) continue;
    const day = days[r.day]; const endDay = r.endDay != null ? days[Math.min(r.endDay, days.length - 1)] : null;
    const date = day.date; const endDate = (endDay || day).date;
    const body = {
      title: r.title, type: r.type, status: r.status, notes: r.notes || null, confirmation_number: r.conf || null,
      day_id: day.id, end_day_id: endDay ? endDay.id : null,
      reservation_time: date && r.time ? `${date}T${r.time}` : null,
      reservation_end_time: r.end ? (endDate ? `${endDate}T${r.end}` : r.end) : null,
      place_id: r.place != null ? pids[r.place] : null,
      metadata: r.meta || {},
    };
    if (r.from && r.to) {
      body.endpoints = [r.from, r.to].map(([name, code, lat, lng, tz], i) => ({
        role: i === 0 ? 'from' : 'to', sequence: i, name, code, lat, lng, timezone: tz,
        local_time: i === 0 ? r.time : r.end || null, local_date: i === 0 ? date : endDate,
      }));
      if (r.meta) body.metadata = { ...r.meta, departure_airport: r.from[1] || undefined, arrival_airport: r.to[1] || undefined };
    }
    const res = await soft('reservation ' + r.title, () => maya.post(`/api/trips/${tid}/reservations`, body));
    if (res && r.price) {
      const rid = res.reservation?.id ?? res.id;
      await soft('res cost', () => maya.post(`/api/trips/${tid}/budget`, {
        name: r.title, category: r.type === 'flight' ? 'flights' : r.type === 'hotel' ? 'accommodation' : r.type === 'restaurant' ? 'food' : 'activities',
        total_price: r.price, currency: r.cur || T.currency, exchange_rate: fx(r.cur || T.currency, T.currency), reservation_id: rid,
        payers: [{ user_id: me.id, amount: r.price }], expense_date: null,
      }));
    }
  }

  // budget
  const memberIds = [me.id, ...(T.members || []).map((k) => ids[k])];
  for (const [name, cat, amount, cur, payer, date, note, split] of T.budget || []) {
    const body = {
      name, category: COST_CAT[cat] || 'other', total_price: amount, currency: cur, exchange_rate: fx(cur, T.currency),
      note: note || null, expense_date: date || null, member_ids: split ? split.map((k) => ids[k]) : memberIds,
    };
    if (payer) body.payers = [{ user_id: ids[payer], amount }];
    await soft('budget ' + name, () => maya.post(`/api/trips/${tid}/budget`, body));
  }

  // packing
  if (T.packing) {
    const bag = await soft('bag', () => maya.post(`/api/trips/${tid}/packing/bags`, { name: 'Big suitcase', color: '#3b82f6', weight_limit_grams: 23000 }));
    const bag2 = await soft('bag2', () => maya.post(`/api/trips/${tid}/packing/bags`, { name: 'Carry-on', color: '#10b981', weight_limit_grams: 8000 }));
    const bagIds = [bag?.bag?.id ?? bag?.id, bag2?.bag?.id ?? bag2?.id].filter(Boolean);
    let n = 0; const all = T.packing.flatMap((g) => { const [cat, items] = g.split(':'); return items.split('|').map((i) => [cat, i]); });
    for (const [category, name] of all) {
      const checked = n / all.length < (T.packingChecked ?? 0) ? 1 : 0; n++;
      await soft('pack', () => maya.post(`/api/trips/${tid}/packing`, { name, category, checked, quantity: /x(\d)/.test(name) ? Number(name.match(/x(\d)/)[1]) : 1, bag_id: bagIds.length ? bagIds[n % bagIds.length] : null }));
    }
  }

  // todos
  for (const [name, category, due_date, priority, who, done] of T.todos || []) {
    const r = await soft('todo', () => maya.post(`/api/trips/${tid}/todo`, { name, category, due_date, priority, assigned_user_id: ids[who] ?? null }));
    const id = r?.item?.id ?? r?.id;
    if (id && done) await soft('todo check', () => maya.put(`/api/trips/${tid}/todo/${id}`, { checked: true }));
  }

  // collab
  for (const [title, content, category, color, pinned] of T.notes || []) {
    const r = await soft('note', () => maya.post(`/api/trips/${tid}/collab/notes`, { title, content, category, color }));
    const nid = r?.note?.id ?? r?.id;
    if (pinned && nid) await soft('pin', () => maya.put(`/api/trips/${tid}/collab/notes/${nid}`, { pinned: true }));
  }
  for (const [question, options, votes] of T.polls || []) {
    const r = await soft('poll', () => maya.post(`/api/trips/${tid}/collab/polls`, { question, options }));
    const pid = r?.poll?.id ?? r?.id;
    if (pid) for (const [who, idx] of Object.entries(votes || {})) await soft('vote', () => clients[who].post(`/api/trips/${tid}/collab/polls/${pid}/vote`, { option_index: idx }));
  }
  for (const [title, url] of T.links || []) await soft('link', () => maya.post(`/api/trips/${tid}/collab/links`, { title, url }));
  for (const [who, text] of T.messages || []) await soft('msg', () => clients[who].post(`/api/trips/${tid}/collab/messages`, { text }));

  if (T.archived) await soft('archive', () => maya.put(`/api/trips/${tid}`, { is_archived: true }));
  log('trip', T.title, tid, `${pids.length} places`);
}

// ── Atlas ──────────────────────────────────────────────────────────────────
for (const cc of ATLAS_COUNTRIES) await soft('atlas ' + cc, () => maya.post(`/api/addons/atlas/country/${cc}/mark`, {}));
const bl = (await soft('bucket list', () => maya.get('/api/addons/atlas/bucket-list')))?.items || [];
if (!bl.length) for (const [name, lat, lng, country_code, notes, target_date] of BUCKET_LIST) await soft('bucket', () => maya.post('/api/addons/atlas/bucket-list', { name, lat, lng, country_code, notes, target_date }));
log('atlas done');

// ── Collections ────────────────────────────────────────────────────────────
const existingCols = (await soft('cols', () => maya.get('/api/addons/collections')))?.collections || [];
for (const C of COLLECTIONS) {
  if (existingCols.some((c) => c.name === C.name)) continue;
  const r = await soft('collection', () => maya.post('/api/addons/collections', { name: C.name, description: C.description, color: C.color, icon: C.icon }));
  const cid = r?.collection?.id ?? r?.id;
  if (!cid) continue;
  for (const [name, lat, lng, address, category_id, status] of C.places) await soft('col place', () => maya.post('/api/addons/collections/places', { collection_id: cid, name, lat, lng, address, category_id, status }));
}
log('collections done');

// ── Journeys ───────────────────────────────────────────────────────────────
const existingJ = (await soft('journeys', () => maya.get('/api/journeys')))?.journeys || [];
for (const J of JOURNEYS) {
  if (existingJ.some((j) => j.title === J.title)) continue;
  const body = { title: J.title, subtitle: J.subtitle };
  if (tripIds[J.trip]) body.trip_ids = [tripIds[J.trip]];
  const r = await soft('journey', () => maya.post('/api/journeys', body));
  const jid = r?.journey?.id ?? r?.id;
  if (!jid) continue;
  for (const [entry_date, entry_time, title, story, location_name, location_lat, location_lng, mood, weather] of J.entries) {
    await soft('entry', () => maya.post(`/api/journeys/${jid}/entries`, { type: 'entry', entry_date, entry_time, title, story, location_name, location_lat, location_lng, mood, weather }));
  }
}
log('journeys done');

// ── Vacay ──────────────────────────────────────────────────────────────────
await soft('vacay plan', () => maya.get('/api/addons/vacay/plan'));
await soft('vacay year 2026', () => maya.post('/api/addons/vacay/years', { year: 2026 }));
await soft('vacay year 2027', () => maya.post('/api/addons/vacay/years', { year: 2027 }));
await soft('vacay stats', () => maya.put('/api/addons/vacay/stats/2026', { vacation_days: 30 }));
const vacDays = [];
const addRange = (a, b) => { for (let d = new Date(a + 'T12:00:00Z'); d <= new Date(b + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) { const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6) vacDays.push(d.toISOString().slice(0, 10)); } };
addRange('2026-04-09', '2026-04-15'); addRange('2026-10-02', '2026-10-14'); addRange('2026-11-16', '2026-11-18'); addRange('2026-12-28', '2026-12-31');
vacDays.push('2026-02-13', '2026-06-05', '2026-07-24', '2026-08-14');
const existingEntries = (await soft('vacay entries', () => maya.get('/api/addons/vacay/entries/2026')))?.entries || [];
if (!existingEntries.length) for (const date of vacDays) await soft('vacay toggle', () => maya.post('/api/addons/vacay/entries/toggle', { date }));
log('vacay done');
log('DONE', tripIds);
