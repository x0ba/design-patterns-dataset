/*
 * Givehours: December planner for Theo Lindqvist.
 * Plain browser JavaScript, no dependencies. State is kept in localStorage,
 * so the app opens on the Nov 17 snapshot until something is changed.
 */
(function () {
  'use strict';

  const D = GH_DATA;
  const STORE_KEY = 'givehours.plan.december-2026.v1';
  const BUF = D.bufferMinutes;
  const MONTH_START = '2026-12-01';
  const MONTH_DAYS = 31;
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const ROLE_SHORT = { 'Adoption-event helper': 'Adoption event' };
  const PLACE_SHORT = { 'Main Warehouse': 'Main', 'Eastside Pantry': 'Eastside', 'Main Cattery': 'Cattery' };
  const DEFAULT_FILTERS = { org: 'all', place: 'all', role: 'all', holiday: false, fits: false, hideClashes: false };

  // ---------- helpers ----------
  const pad = n => (n < 10 ? '0' : '') + n;
  const esc = s => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const toMin = t => { const p = t.split(':').map(Number); return p[0] * 60 + p[1]; };
  const fromMin = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const clock = t => {
    const m = toMin(t);
    const h = Math.floor(m / 60);
    return { t: ((h % 12) || 12) + ':' + pad(m % 60), ap: h < 12 ? 'am' : 'pm' };
  };
  const fmtSpan = (s, e) => {
    const a = clock(s), b = clock(e);
    return a.ap === b.ap ? `${a.t}–${b.t} ${b.ap}` : `${a.t} ${a.ap}–${b.t} ${b.ap}`;
  };
  const shortClock = t => { const c = clock(t); return c.t.replace(':00', '') + c.ap[0]; };
  const shortSpan = (s, e) => `${shortClock(s)}–${shortClock(e)}`;
  const dt = iso => { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (iso, n) => { const d = dt(iso); d.setDate(d.getDate() + n); return isoOf(d); };
  const dow = iso => dt(iso).getDay();
  const dayNum = iso => Number(iso.slice(8, 10));
  const dayLabel = iso => `${DOW[dow(iso)]}, ${MON[dt(iso).getMonth()]} ${dayNum(iso)}`;
  const shortDay = iso => `${MON[dt(iso).getMonth()]} ${dayNum(iso)}`;
  const hours = (s, e) => (toMin(e) - toMin(s)) / 60;
  const num = x => String(Math.round(x * 10) / 10);
  const fmtH = x => `${num(x)} h`;
  // Two time spans clash if they overlap once each is padded by `buf` minutes.
  const overlaps = (aS, aE, bS, bE, buf) => toMin(aS) < toMin(bE) + buf && toMin(bS) < toMin(aE) + buf;

  // ---------- reference data ----------
  function shiftFrom(id, org, r) {
    const [date, start, end, place, role, capacity, open] = r;
    return { id, org, date, start, end, place, role, capacity, baseOpen: open, holiday: org === 'food' && date >= D.holidayFrom };
  }
  const SHIFTS = [
    ...D.food.map((r, i) => shiftFrom('fb-' + pad(i + 1), 'food', r)),
    ...D.shelter.map((r, i) => shiftFrom('sh-' + pad(i + 1), 'shelter', r))
  ];
  const SHIFT_BY_ID = Object.fromEntries(SHIFTS.map(s => [s.id, s]));
  const TUTORING_BASE = D.tutoring.map((r, i) => ({ id: 'tu-' + pad(i + 1), date: r[0], start: r[1], end: r[2] }));
  const PLACES = [...new Set(SHIFTS.map(s => s.place))].sort();
  const ROLES = [...new Set(SHIFTS.map(s => s.role))].sort();

  // ---------- state ----------
  function freshState() {
    return {
      cap: D.defaultCap,
      mine: D.initialHolds.slice(),
      open: {}, // spots-left overrides once Theo books or releases something
      tutoring: TUTORING_BASE.map(t => ({
        id: t.id, date: t.date, start: t.start, end: t.end,
        moved: false, origDate: t.date, origStart: t.start
      }))
    };
  }
  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.mine) && Array.isArray(s.tutoring) && typeof s.cap === 'number') return s;
      }
    } catch (e) { /* unreadable storage: fall back to the snapshot */ }
    return freshState();
  }
  function saveState() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or disabled */ }
  }
  let state = loadState();
  const ui = { tab: 'calendar', filters: { ...DEFAULT_FILTERS }, drawerId: null, toast: '' };

  // ---------- item lookups ----------
  const isMine = id => state.mine.includes(id);
  const getTutoring = id => state.tutoring.find(t => t.id === id);
  function getItem(id) {
    if (id.indexOf('tu-') === 0) {
      const t = getTutoring(id);
      if (!t) return null;
      return {
        id, org: 'tutoring', date: t.date, start: t.start, end: t.end, place: 'ReadUp session',
        role: 'Tutoring with Grace Okonjo', capacity: 1, baseOpen: 0,
        moved: t.moved, origDate: t.origDate, origStart: t.origStart
      };
    }
    return SHIFT_BY_ID[id] || null;
  }
  function openSpots(s) {
    return Object.prototype.hasOwnProperty.call(state.open, s.id) ? state.open[s.id] : s.baseOpen;
  }
  function itemsOn(iso) {
    const tutor = state.tutoring.filter(t => t.date === iso).map(t => getItem(t.id));
    const shifts = SHIFTS.filter(s => s.date === iso);
    return [...tutor, ...shifts].sort((a, b) => toMin(a.start) - toMin(b.start));
  }
  const shiftTitle = s => `${shortDay(s.date)} · ${D.orgs[s.org].short} ${s.role.toLowerCase()}, ${fmtSpan(s.start, s.end)}`;
  const sessionTitle = t => `${shortDay(t.date)} · Tutoring with Grace Okonjo, ${fmtSpan(t.start, t.end)}`;
  const itemTitle = item => (item.org === 'tutoring' ? sessionTitle(item) : shiftTitle(item));

  // ---------- commitments and clashes ----------
  // Returns [{ type, text }]. Types: block (all-day), climb, tutoring, shift.
  function conflictsFor(item) {
    const out = [];
    D.blocks.forEach(b => {
      if (item.date >= b.from && item.date <= b.to) {
        out.push({ type: 'block', text: `${b.label} (${dayLabel(b.from)}–${dayNum(b.to)})` });
      }
    });
    if (dow(item.date) === D.climbing.weekday &&
        overlaps(item.start, item.end, D.climbing.start, D.climbing.end, 0)) {
      out.push({ type: 'climb', text: `Climbing night (${fmtSpan(D.climbing.start, D.climbing.end)})` });
    }
    const gap = other => (other.place === item.place ? 0 : BUF);
    state.tutoring.forEach(t => {
      if (t.id === item.id || t.date !== item.date) return;
      const other = { place: 'ReadUp session', start: t.start, end: t.end };
      if (overlaps(item.start, item.end, t.start, t.end, gap(other))) {
        out.push({ type: 'tutoring', text: `Tutoring with Grace Okonjo, ${fmtSpan(t.start, t.end)}` });
      }
    });
    state.mine.forEach(id => {
      const s = SHIFT_BY_ID[id];
      if (id === item.id || !s || s.date !== item.date) return;
      if (overlaps(item.start, item.end, s.start, s.end, gap(s))) {
        out.push({ type: 'shift', text: `${D.orgs[s.org].short} ${s.role.toLowerCase()}, ${fmtSpan(s.start, s.end)}` });
      }
    });
    return out;
  }

  // Why Theo cannot book a shift right now, or null if he can.
  function claimProblem(s) {
    if (isMine(s.id)) return 'booked';
    if (openSpots(s) <= 0) return 'full';
    if (conflictsFor(s).length) return 'clash';
    return null;
  }

  function planned() {
    let food = 0, shelter = 0, tutoring = 0;
    state.mine.forEach(id => {
      const s = SHIFT_BY_ID[id];
      if (!s) return;
      if (s.org === 'food') food += hours(s.start, s.end);
      else shelter += hours(s.start, s.end);
    });
    state.tutoring.forEach(t => { tutoring += hours(t.start, t.end); });
    return { food, shelter, tutoring, total: food + shelter + tutoring };
  }
  const remaining = () => state.cap - planned().total;

  // Status badge for a shift (order matters: booked beats everything).
  function shiftStatus(s) {
    if (isMine(s.id)) return { key: 'mine' };
    if (openSpots(s) <= 0) return { key: 'full' };
    const c = conflictsFor(s);
    if (c.length) return { key: 'clash', reasons: c };
    if (planned().total + hours(s.start, s.end) > state.cap) return { key: 'over' };
    return { key: 'open' };
  }

  // ---------- mutations ----------
  function doClaim(id) {
    const s = SHIFT_BY_ID[id];
    if (!s || claimProblem(s)) return false;
    state.open[id] = openSpots(s) - 1;
    state.mine.push(id);
    return true;
  }
  function doRelease(id) {
    const s = SHIFT_BY_ID[id];
    if (!s || !isMine(id)) return false;
    state.mine = state.mine.filter(x => x !== id);
    state.open[id] = Math.min(s.capacity, openSpots(s) + 1);
    return true;
  }
  function moveTutoring(id, date, start) {
    const t = getTutoring(id);
    if (!t) return false;
    const end = fromMin(toMin(start) + 60);
    const probe = { ...getItem(id), date, start, end };
    if (conflictsFor(probe).length) return false;
    t.date = date; t.start = start; t.end = end;
    t.moved = !(t.origDate === date && t.origStart === start);
    return true;
  }

  function commit(message) {
    saveState();
    ui.toast = message;
    render();
  }
  function fail(message) {
    ui.toast = message;
    render();
  }

  // ---------- attention and suggestions ----------
  function attention() {
    const items = [];
    state.mine.forEach(id => {
      const s = SHIFT_BY_ID[id];
      if (!s) return;
      // Tutoring overlaps are reported once, on the tutoring session.
      const reasons = conflictsFor(s).filter(c => c.type !== 'tutoring');
      if (reasons.length) items.push({ kind: 'shift', id, reasons, date: s.date, start: s.start });
    });
    state.tutoring.forEach(t => {
      const reasons = conflictsFor(getItem(t.id));
      if (reasons.length) items.push({ kind: 'tutoring', id: t.id, reasons, date: t.date, start: t.start });
    });
    return items.sort((a, b) => (a.date === b.date ? toMin(a.start) - toMin(b.start) : (a.date < b.date ? -1 : 1)));
  }

  // Candidate new times for a tutoring session, each checked for clashes.
  function moveOptions(id) {
    const base = getItem(id);
    const d = dow(base.date);
    const slots = [];
    if (d === 2 || d === 4) {
      ['19:00', '19:30', '20:00', '20:30'].forEach(st => slots.push({ date: base.date, start: st }));
      const sat = addDays(base.date, 6 - d);
      ['09:00', '10:00'].forEach(st => slots.push({ date: sat, start: st }));
    } else if (d === 6) {
      ['09:00', '10:00', '11:00'].forEach(st => slots.push({ date: base.date, start: st }));
      const thu = addDays(base.date, -2);
      ['19:00', '20:00'].forEach(st => slots.push({ date: thu, start: st }));
    }
    const t = getTutoring(id);
    if (t.moved) slots.push({ date: t.origDate, start: t.origStart });
    const seen = new Set();
    return slots
      .filter(c => !(c.date === base.date && c.start === base.start))
      .filter(c => { const k = c.date + c.start; if (seen.has(k)) return false; seen.add(k); return true; })
      .map(c => {
        const end = fromMin(toMin(c.start) + 60);
        const reasons = conflictsFor({ ...base, date: c.date, start: c.start, end });
        return {
          date: c.date, start: c.start, end, reasons, ok: reasons.length === 0,
          label: `${dayLabel(c.date)}, ${fmtSpan(c.start, end)}`
        };
      });
  }
  function suggestedMove(id) {
    const base = getItem(id);
    const opts = moveOptions(id).filter(o => o.ok);
    return opts.find(o => o.date === base.date) || opts[0] || null;
  }

  // Best combination of up to three open shifts that fits the remaining hours,
  // after releasing any held shift that clashes with a blocked day. Prefers
  // more hours used, then holiday-week food bank slots, then slots with the
  // fewest spots left (the ones most likely to fill).
  function recommendations() {
    const p = planned();
    const releasable = state.mine
      .map(id => SHIFT_BY_ID[id])
      .filter(s => s && conflictsFor(s).some(c => c.type === 'block'));
    const freed = releasable.reduce((a, s) => a + hours(s.start, s.end), 0);
    const shelterDates = releasable.filter(s => s.org === 'shelter').map(s => s.date).sort();
    const needShelter = shelterDates.length > 0;
    const shelterFrom = needShelter ? shelterDates[0] : null;
    const rem = state.cap - (p.total - freed);

    const pool = SHIFTS.filter(s =>
      !isMine(s.id) && openSpots(s) > 0 && hours(s.start, s.end) <= rem && conflictsFor(s).length === 0
    );

    let best = null;
    const better = (a, b) => {
      if (a.total !== b.total) return a.total > b.total;
      if (a.hol !== b.hol) return a.hol > b.hol;
      return a.urgency < b.urgency;
    };
    const consider = combo => {
      const total = combo.reduce((a, s) => a + hours(s.start, s.end), 0);
      if (total > rem + 1e-9) return;
      if (new Set(combo.map(s => s.date)).size !== combo.length) return;
      if (needShelter && !combo.some(s => s.org === 'shelter' && s.date >= shelterFrom)) return;
      const score = {
        total,
        hol: combo.filter(s => s.holiday).length,
        urgency: combo.reduce((a, s) => a + openSpots(s), 0)
      };
      if (!best || better(score, best.score)) best = { combo, score };
    };
    const n = pool.length;
    for (let i = 0; i < n; i++) {
      consider([pool[i]]);
      for (let j = i + 1; j < n; j++) {
        consider([pool[i], pool[j]]);
        for (let k = j + 1; k < n; k++) consider([pool[i], pool[j], pool[k]]);
      }
    }
    const picks = best ? best.combo.slice().sort((a, b) => (a.date === b.date ? toMin(a.start) - toMin(b.start) : (a.date < b.date ? -1 : 1))) : [];
    return { picks, total: best ? best.score.total : 0, releasable, freed, remaining: rem, needShelter };
  }

  function applyPlan() {
    const r = recommendations();
    if (!r.picks.length) return fail('Nothing else fits under your ceiling right now.');
    const released = r.releasable.map(s => shiftTitle(s));
    r.releasable.forEach(s => doRelease(s.id));
    let booked = 0;
    r.picks.forEach(s => { if (doClaim(s.id)) booked++; });
    const swap = released.length ? `Released ${released.join('; ')}. ` : '';
    commit(`${swap}Booked ${booked} shift${booked === 1 ? '' : 's'}: ${fmtH(r.total)}.`);
  }

  // ---------- filtering ----------
  function filteredShifts() {
    const f = ui.filters;
    const rem = remaining();
    return SHIFTS.filter(s => {
      if (f.org !== 'all' && f.org !== s.org) return false;
      if (f.place !== 'all' && f.place !== s.place) return false;
      if (f.role !== 'all' && f.role !== s.role) return false;
      if (f.holiday && !s.holiday) return false;
      if (f.fits) {
        const ok = !isMine(s.id) && openSpots(s) > 0 && hours(s.start, s.end) <= rem && conflictsFor(s).length === 0;
        if (!ok) return false;
      }
      if (f.hideClashes && !isMine(s.id) && conflictsFor(s).length) return false;
      return true;
    }).sort((a, b) => (a.date === b.date ? toMin(a.start) - toMin(b.start) : (a.date < b.date ? -1 : 1)));
  }

  // ---------- rendering: shared pieces ----------
  function opt(value, label, current) {
    return `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;
  }

  function renderChip(item) {
    const isTutor = item.org === 'tutoring';
    const mine = isTutor || isMine(item.id);
    const clash = conflictsFor(item).length > 0;
    const full = !mine && openSpots(item) <= 0;
    const cls = ['chip', `chip--${item.org}`, mine ? 'is-mine' : '', clash ? 'is-clash' : '', full ? 'is-full' : ''].filter(Boolean).join(' ');
    let label;
    if (isTutor) {
      label = `${shortSpan(item.start, item.end)} Tutoring${item.moved ? ' (moved)' : ''}`;
    } else {
      const place = PLACE_SHORT[item.place] || item.place;
      label = `${mine ? '✓ ' : ''}${shortSpan(item.start, item.end)} ${ROLE_SHORT[item.role] || item.role}${item.org === 'food' ? ' · ' + place : ''}`;
    }
    const tip = `${itemTitle(item)}${full ? ' (full)' : ''}${clash ? ' (clashes with a commitment)' : ''}`;
    return `<button class="${cls}" data-action="open" data-id="${item.id}" title="${esc(tip)}">${esc(label)}</button>`;
  }

  function renderAttention(a) {
    const item = getItem(a.id);
    const why = a.reasons.map(r => r.text).join(' · ');
    if (a.kind === 'shift') {
      const s = item;
      return `
        <div class="att">
          <div class="att-title">${esc(shiftTitle(s))}</div>
          <div class="att-why">Clashes with ${esc(why)}</div>
          <div class="att-actions">
            <button class="btn btn-small btn-danger" data-action="release" data-id="${s.id}">Release shift</button>
            <button class="btn btn-small" data-action="find-replacement" data-id="${s.id}">Find a replacement</button>
          </div>
        </div>`;
    }
    const sug = suggestedMove(a.id);
    return `
      <div class="att">
        <div class="att-title">${esc(sessionTitle(item))}</div>
        <div class="att-why">Clashes with ${esc(why)}</div>
        <div class="att-actions">
          ${sug ? `<button class="btn btn-small btn-primary" data-action="move" data-id="${a.id}" data-date="${sug.date}" data-start="${sug.start}">Move to ${esc(dayLabel(sug.date))}, ${esc(fmtSpan(sug.start, sug.end))}</button>` : ''}
          <button class="btn btn-small" data-action="open" data-id="${a.id}">Other times</button>
        </div>
        ${sug ? '<div class="att-note">Confirm the change with Grace Okonjo first.</div>' : ''}
      </div>`;
  }

  // ---------- rendering: sidebar ----------
  function renderSidebar() {
    const p = planned();
    const cap = state.cap;
    const scale = Math.max(cap, p.total);
    const pct = v => ((v / scale) * 100).toFixed(2) + '%';
    const over = Math.max(0, p.total - cap);
    const free = Math.max(0, cap - p.total);
    const att = attention();
    const rec = recommendations();

    const room = rec.remaining >= 0
      ? `${fmtH(rec.remaining)} left under your ceiling`
      : `${fmtH(-rec.remaining)} over your ceiling`;
    const releaseNote = rec.releasable.length
      ? `Assumes you release ${rec.releasable.map(shiftTitle).map(esc).join(' and ')}. That frees ${fmtH(rec.freed)}, leaving ${room} for new shifts.`
      : `${room}.`;

    const picks = rec.picks.map(s => `
      <li>
        <div><strong>${esc(dayLabel(s.date))}</strong>, ${esc(fmtSpan(s.start, s.end))}</div>
        <div class="small muted">${esc(D.orgs[s.org].short)} ${esc(s.role.toLowerCase())} · ${esc(s.place)} · ${fmtH(hours(s.start, s.end))}${s.holiday ? ' · <span class="hol-text">holiday week</span>' : ''} · ${openSpots(s)} spot${openSpots(s) === 1 ? '' : 's'} left</div>
      </li>`).join('');

    return `
      <section class="card">
        <div class="card-head"><h2>December hours</h2><span class="muted small">ceiling ${num(cap)} h</span></div>
        <div class="hours-big"><strong>${num(p.total)}</strong> of ${num(cap)} h planned</div>
        <div class="bar" role="img" aria-label="${num(p.total)} of ${num(cap)} hours planned">
          <span class="seg-tutor" style="width:${pct(p.tutoring)}"></span>
          <span class="seg-shelter" style="width:${pct(p.shelter)}"></span>
          <span class="seg-food" style="width:${pct(p.food)}"></span>
        </div>
        <ul class="legend">
          <li><i class="sw seg-tutor"></i><span>Grace Okonjo tutoring</span><b>${fmtH(p.tutoring)}</b></li>
          <li><i class="sw seg-shelter"></i><span>Whisker Haven</span><b>${fmtH(p.shelter)}</b></li>
          <li><i class="sw seg-food"></i><span>Cascade Harvest</span><b>${fmtH(p.food)}</b></li>
          <li><i class="sw"></i><span>${over ? 'Over your ceiling' : 'Room left'}</span><b class="${over ? 'text-red' : ''}">${fmtH(over || free)}</b></li>
        </ul>
        <p class="small muted">Tutoring counts in full: it is a standing commitment.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Needs attention</h2><span class="count-pill">${att.length}</span></div>
        ${att.length ? att.map(renderAttention).join('') : '<p class="muted">Nothing you hold clashes with a commitment.</p>'}
      </section>

      <section class="card">
        <div class="card-head"><h2>Best fit for the rest of December</h2></div>
        <p class="small muted">${releaseNote}</p>
        ${rec.picks.length
          ? `<ol class="picks">${picks}</ol>
             <button class="btn btn-primary wide" data-action="apply-plan">${rec.releasable.length ? `Swap out ${esc(shortDay(rec.releasable[0].date))} and book these` : 'Book these'}</button>`
          : '<p class="muted">No open shift fits the remaining hours without a clash.</p>'}
      </section>

      <section class="card quiet">
        <label class="setting">Monthly ceiling
          <span><input type="number" min="1" max="60" step="0.5" value="${num(cap)}" data-filter="cap" aria-label="Monthly hour ceiling"> h</span>
        </label>
        <p class="small muted">Travel buffer: ${BUF} min between commitments at different places. Climbing is assumed to run ${esc(fmtSpan(D.climbing.start, D.climbing.end))} on Wednesdays.</p>
        <button class="btn-link" data-action="reset">Reset to the Nov 17 snapshot</button>
      </section>`;
  }

  // ---------- rendering: calendar ----------
  function dayCell(iso) {
    const blk = D.blocks.find(b => iso >= b.from && iso <= b.to);
    const wd = dow(iso);
    const chips = itemsOn(iso).map(renderChip).join('');
    return `
      <div class="day${blk ? ' day--blocked' : ''}">
        <div class="day-head">
          <span class="day-num">${dayNum(iso)}</span>
          ${blk ? `<span class="block-tag">${esc(blk.label)}</span>` : ''}
        </div>
        ${iso >= D.holidayFrom ? '<span class="hol-tag">Holiday week</span>' : ''}
        <div class="chips">${chips}</div>
        ${wd === D.climbing.weekday ? `<div class="climb-note">Climbing, ${esc(fmtSpan(D.climbing.start, D.climbing.end))} (assumed)</div>` : ''}
      </div>`;
  }

  function renderCalendar() {
    const lead = (dow(MONTH_START) + 6) % 7;
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="day day--pad"></div>');
    for (let d = 1; d <= MONTH_DAYS; d++) cells.push(dayCell(`2026-12-${pad(d)}`));
    while (cells.length % 7) cells.push('<div class="day day--pad"></div>');
    return `
      <div class="cal-legend">
        <span><i class="sw chip--food"></i>Cascade Harvest</span>
        <span><i class="sw chip--shelter"></i>Whisker Haven</span>
        <span><i class="sw chip--tutoring"></i>Tutoring</span>
        <span><i class="sw is-mine-sw"></i>Booked</span>
        <span><i class="sw is-clash-sw"></i>Clashes</span>
        <span><i class="sw block-sw"></i>Blocked by your commitments</span>
      </div>
      <div class="cal-head">${WEEK.map(w => `<div>${w}</div>`).join('')}</div>
      <div class="cal">${cells.join('')}</div>`;
  }

  // ---------- rendering: browse ----------
  function statusBadge(s) {
    const st = shiftStatus(s);
    switch (st.key) {
      case 'mine': return '<span class="badge badge-mine">Booked</span>';
      case 'full': return '<span class="badge badge-full">Full</span>';
      case 'clash': return `<span class="badge badge-conflict">Clashes</span><div class="small clash-text" title="${esc(st.reasons.map(r => r.text).join('; '))}">${esc(st.reasons[0].text)}</div>`;
      case 'over': return '<span class="badge badge-over">Over ceiling</span>';
      default: return '<span class="badge badge-open">Open</span>';
    }
  }

  function renderBrowseRow(s) {
    const mine = isMine(s.id);
    const problem = claimProblem(s);
    const overCeiling = !mine && !problem && shiftStatus(s).key === 'over';
    const action = mine
      ? `<button class="btn btn-small btn-danger" data-action="release" data-id="${s.id}">Release</button>`
      : `<button class="btn btn-small btn-primary" data-action="claim" data-id="${s.id}"${problem ? ' disabled' : ''}>${overCeiling ? 'Claim anyway' : 'Claim'}</button>`;
    return `
      <tr class="${mine ? 'row-mine' : ''}" data-action="open" data-id="${s.id}">
        <td><strong>${esc(dayLabel(s.date))}</strong><div class="small muted">${esc(fmtSpan(s.start, s.end))}</div></td>
        <td><span class="org-dot org-${s.org}"></span>${esc(D.orgs[s.org].short)}${s.holiday ? ' <span class="badge badge-hol">Holiday</span>' : ''}</td>
        <td>${esc(s.place)}</td>
        <td>${esc(s.role)}</td>
        <td>${fmtH(hours(s.start, s.end))}</td>
        <td>${openSpots(s) > 0 ? `${openSpots(s)} of ${s.capacity} left` : '<span class="muted">None left</span>'}</td>
        <td>${statusBadge(s)}</td>
        <td class="actions">${action}</td>
      </tr>`;
  }

  function renderBrowse() {
    const f = ui.filters;
    const rows = filteredShifts();
    const rem = remaining();
    return `
      <div class="filters">
        <select data-filter="org" aria-label="Organization">
          ${opt('all', 'All organizations', f.org)}${opt('food', 'Cascade Harvest Food Bank', f.org)}${opt('shelter', 'Whisker Haven', f.org)}
        </select>
        <select data-filter="place" aria-label="Location">
          ${opt('all', 'All locations', f.place)}${PLACES.map(p => opt(p, p, f.place)).join('')}
        </select>
        <select data-filter="role" aria-label="Role">
          ${opt('all', 'All roles', f.role)}${ROLES.map(r => opt(r, r, f.role)).join('')}
        </select>
        <label class="check"><input type="checkbox" data-filter="holiday"${f.holiday ? ' checked' : ''}> Holiday week</label>
        <label class="check"><input type="checkbox" data-filter="fits"${f.fits ? ' checked' : ''}> Fits my ${fmtH(Math.max(0, rem))} left</label>
        <label class="check"><input type="checkbox" data-filter="hideClashes"${f.hideClashes ? ' checked' : ''}> Hide clashes</label>
        <span class="muted small count">${rows.length} of ${SHIFTS.length} shifts</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>When</th><th>Organization</th><th>Location</th><th>Role</th><th>Length</th><th>Spots</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>${rows.length ? rows.map(renderBrowseRow).join('') : '<tr><td colspan="8" class="empty">No shifts match these filters.</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  // ---------- rendering: hours and commitments ----------
  function renderHours() {
    const p = planned();
    const bar = (label, val, max, cls) => `
      <li><span>${label}</span><div class="mini-bar"><i class="${cls}" style="width:${((val / max) * 100).toFixed(1)}%"></i></div><b>${fmtH(val)}</b></li>`;
    const h = D.history;
    const novMax = Math.max(h.novFood, h.novShelter, h.novTutoring);
    const decMax = Math.max(p.food, p.shelter, p.tutoring, 1);
    const tutorRows = state.tutoring.map(t => {
      const cl = conflictsFor(getItem(t.id));
      const status = t.moved
        ? `<span class="badge badge-over">Moved from ${esc(shortDay(t.origDate))}</span>`
        : cl.length ? '<span class="badge badge-conflict">Clashes</span>' : '<span class="badge badge-open">On schedule</span>';
      return `<tr><td>${esc(dayLabel(t.date))}</td><td>${esc(fmtSpan(t.start, t.end))}</td><td>${status}</td></tr>`;
    }).join('');
    return `
      <div class="grid-3">
        <section class="card">
          <h2>November 2026 (actual)</h2>
          <div class="big-num">${num(h.novTotal)} h</div>
          <ul class="minibars">
            ${bar('Cascade Harvest', h.novFood, novMax, 'seg-food')}
            ${bar('Whisker Haven', h.novShelter, novMax, 'seg-shelter')}
            ${bar('Tutoring', h.novTutoring, novMax, 'seg-tutor')}
          </ul>
        </section>
        <section class="card">
          <h2>Year to date</h2>
          <div class="big-num">${h.ytd} h</div>
          <p class="muted small">Hours logged across all three commitments.</p>
        </section>
        <section class="card">
          <h2>December plan</h2>
          <div class="big-num">${num(p.total)} of ${num(state.cap)} h</div>
          <ul class="minibars">
            ${bar('Cascade Harvest', p.food, decMax, 'seg-food')}
            ${bar('Whisker Haven', p.shelter, decMax, 'seg-shelter')}
            ${bar('Tutoring', p.tutoring, decMax, 'seg-tutor')}
          </ul>
        </section>
      </div>
      <div class="grid-2">
        <section class="card">
          <h2>Standing commitments</h2>
          <ul class="plain">
            <li><strong>Spokane work trip</strong><div class="small muted">Wed–Fri, Dec 2–4 · all day</div></li>
            <li><strong>Family weekends</strong><div class="small muted">Sat–Sun, Dec 12–13 · Fri–Sun, Dec 25–27</div></li>
            <li><strong>Climbing night</strong><div class="small muted">Wednesdays · ${esc(fmtSpan(D.climbing.start, D.climbing.end))} (assumed; time not in notes)</div></li>
            <li><strong>Tutoring with Grace Okonjo</strong><div class="small muted">Tue &amp; Thu, 7–8 pm · her availability: Tue &amp; Thu after 7 pm, Sat mornings</div></li>
            <li><strong>Monthly ceiling</strong><div class="small muted">${num(state.cap)} h, including tutoring</div></li>
          </ul>
        </section>
        <section class="card">
          <h2>Tutoring sessions, December</h2>
          <table class="compact">
            <thead><tr><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>${tutorRows}</tbody>
          </table>
        </section>
      </div>`;
  }

  // ---------- rendering: drawer ----------
  function drawerShift(s) {
    const mine = isMine(s.id);
    const problem = claimProblem(s);
    const clashes = conflictsFor(s);
    const h = hours(s.start, s.end);
    const p = planned();
    const after = mine ? p.total - h : p.total + h;
    const verb = mine ? 'Releasing' : 'Booking';
    const hoursLine = after <= state.cap
      ? `${verb} leaves you at ${num(after)} of ${num(state.cap)} h.`
      : `${verb} leaves you at ${num(after)} h, ${num(after - state.cap)} h over your ${num(state.cap)} h ceiling.`;
    const problemText = { booked: 'You already hold this shift.', full: 'This shift is full.', clash: 'It clashes with a commitment (see above).' };
    let button;
    if (mine) {
      button = `<button class="btn btn-danger" data-action="release" data-id="${s.id}">Release this shift</button>`;
    } else if (problem) {
      button = `<button class="btn btn-primary" disabled>Can't book</button><p class="note">${esc(problemText[problem])}</p>`;
    } else {
      button = `<button class="btn btn-primary" data-action="claim" data-id="${s.id}">${after > state.cap ? 'Book anyway (over ceiling)' : 'Book this shift'}</button>`;
    }
    return `
      <h2 class="drawer-title">${esc(dayLabel(s.date))}, ${esc(fmtSpan(s.start, s.end))}</h2>
      <p class="drawer-sub">${esc(s.role)} · ${esc(s.place)}</p>
      <div class="badges">
        ${mine ? '<span class="badge badge-mine">Booked by you</span>' : ''}
        ${s.holiday ? '<span class="badge badge-hol">Holiday week</span>' : ''}
        ${openSpots(s) > 0 ? `<span class="badge badge-open">${openSpots(s)} of ${s.capacity} left</span>` : '<span class="badge badge-full">Full</span>'}
      </div>
      ${s.holiday ? '<p class="note">Holiday-week warehouse slots usually fill within two days.</p>' : ''}
      <h3>Your commitments</h3>
      ${clashes.length
        ? `<ul class="clash">${clashes.map(c => `<li>${esc(c.text)}</li>`).join('')}</ul>`
        : '<p class="ok">No clashes with anything on your calendar.</p>'}
      <h3>Your hours</h3>
      <p>${esc(hoursLine)} This shift is ${fmtH(h)}.</p>
      <div class="drawer-actions">${button}</div>`;
  }

  function drawerTutoring(t) {
    const cl = conflictsFor(getItem(t.id));
    const opts = moveOptions(t.id);
    const badge = t.moved
      ? `<span class="badge badge-over">Moved from ${esc(shortDay(t.origDate))}, ${esc(fmtTime(t.origStart))}</span>`
      : '<span class="badge badge-mine">Standing session</span>';
    return `
      <h2 class="drawer-title">${esc(dayLabel(t.date))}, ${esc(fmtSpan(t.start, t.end))}</h2>
      <p class="drawer-sub">Tutoring with Grace Okonjo · ReadUp Adult Learning · 1 h</p>
      <div class="badges">${badge}${cl.length ? '<span class="badge badge-conflict">Clashes</span>' : ''}</div>
      <h3>Clashes</h3>
      ${cl.length
        ? `<ul class="clash">${cl.map(c => `<li>${esc(c.text)}</li>`).join('')}</ul>`
        : '<p class="ok">Nothing clashes with this session.</p>'}
      <h3>Reschedule</h3>
      <p class="note">Grace is free Tue and Thu after 7 pm and Saturday mornings. Confirm any change with her.</p>
      <ul class="options">
        ${opts.map(o => `
          <li>
            <div>
              <strong>${esc(o.label)}</strong>
              ${o.ok ? '' : `<div class="small clash-text">${esc(o.reasons[0].text)}</div>`}
            </div>
            <button class="btn btn-small${o.ok ? ' btn-primary' : ''}" data-action="move" data-id="${t.id}" data-date="${o.date}" data-start="${o.start}"${o.ok ? '' : ' disabled'}>${o.ok ? 'Move here' : 'Clashes'}</button>
          </li>`).join('')}
      </ul>`;
  }

  function renderDrawer() {
    const item = getItem(ui.drawerId);
    if (!item) return '';
    const body = item.org === 'tutoring' ? drawerTutoring(item) : drawerShift(item);
    return `
      <div class="scrim" data-action="close"></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(itemTitle(item))}">
        <div class="drawer-top">
          <span class="eyebrow">${esc(D.orgs[item.org].name)}</span>
          <button class="icon-btn" data-action="close" aria-label="Close">×</button>
        </div>
        ${body}
      </aside>`;
  }

  // ---------- page shell ----------
  function renderTabs() {
    const tabs = [['calendar', 'Calendar'], ['browse', `Browse shifts (${SHIFTS.length})`], ['hours', 'Hours & commitments']];
    return `<nav class="tabs" role="tablist">${tabs.map(([k, l]) =>
      `<button class="tab${ui.tab === k ? ' is-active' : ''}" role="tab" aria-selected="${ui.tab === k}" data-action="tab" data-tab="${k}">${esc(l)}</button>`
    ).join('')}</nav>`;
  }

  function renderTab() {
    if (ui.tab === 'browse') return renderBrowse();
    if (ui.tab === 'hours') return renderHours();
    return renderCalendar();
  }

  function render() {
    const app = document.getElementById('app');
    const prev = {
      side: app.querySelector('.side') ? app.querySelector('.side').scrollTop : 0,
      main: app.querySelector('.main') ? app.querySelector('.main').scrollTop : 0
    };
    const navHeading = ui.tab === 'calendar' ? 'Calendar' : ui.tab === 'browse' ? 'Browse shifts' : 'Hours & commitments';
    app.innerHTML = `
      <header class="topbar">
        <div class="brand"><span class="brand-mark" aria-hidden="true"></span>Givehours</div>
        <div class="topbar-title">${esc(D.monthLabel)} plan · ${esc(navHeading)}</div>
        <div class="topbar-right">
          <span class="today">${esc(D.todayLabel)}</span>
          <span class="avatar" aria-hidden="true">${esc(D.person.initials)}</span>
          <span class="person">${esc(D.person.name)}</span>
        </div>
      </header>
      <div class="layout">
        <aside class="side">${renderSidebar()}</aside>
        <main class="main">
          <div class="banner">
            <div><strong>December sign-ups opened today at 12:00 pm</strong> for Cascade Harvest Food Bank and Whisker Haven. Holiday-week warehouse slots (Dec 21–31) usually fill within two days.</div>
            <button class="btn" data-action="holiday-view">Show holiday-week slots</button>
          </div>
          ${renderTabs()}
          ${renderTab()}
        </main>
      </div>
      ${ui.drawerId ? renderDrawer() : ''}
      ${ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : ''}`;

    const side = app.querySelector('.side');
    const main = app.querySelector('.main');
    if (side) side.scrollTop = prev.side;
    if (main) main.scrollTop = prev.main;
  }

  // ---------- events ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const id = el.dataset.id;
    const action = el.dataset.action;
    ui.toast = '';

    switch (action) {
      case 'tab':
        ui.tab = el.dataset.tab;
        ui.drawerId = null;
        break;
      case 'open':
        ui.drawerId = id;
        break;
      case 'close':
        ui.drawerId = null;
        break;
      case 'claim': {
        const s = SHIFT_BY_ID[id];
        if (doClaim(id)) return commit(`Booked ${shiftTitle(s)} (${fmtH(hours(s.start, s.end))}).`);
        return fail(`Couldn't book this: ${claimProblem(s) === 'clash' ? 'it clashes with a commitment' : 'it is full'}.`);
      }
      case 'release': {
        const s = SHIFT_BY_ID[id];
        if (doRelease(id)) {
          ui.drawerId = null;
          return commit(`Released ${shiftTitle(s)}. ${fmtH(hours(s.start, s.end))} back in your budget.`);
        }
        break;
      }
      case 'move': {
        const t = getItem(id);
        if (moveTutoring(id, el.dataset.date, el.dataset.start)) {
          const nt = getItem(id);
          ui.drawerId = null;
          return commit(`Moved tutoring to ${dayLabel(nt.date)}, ${fmtSpan(nt.start, nt.end)}. Confirm with Grace.`);
        }
        return fail(`That time clashes with something on your calendar (${dayLabel(t.date)}).`);
      }
      case 'find-replacement':
        ui.tab = 'browse';
        ui.drawerId = null;
        ui.filters = { ...DEFAULT_FILTERS, org: 'shelter', fits: true };
        ui.toast = 'Showing Whisker Haven shifts that fit your remaining hours. The clashing shift stays booked until you release it.';
        break;
      case 'holiday-view':
        ui.tab = 'browse';
        ui.filters = { ...DEFAULT_FILTERS, holiday: true };
        break;
      case 'apply-plan':
        return applyPlan();
      case 'reset':
        if (!window.confirm('Reset December to the Nov 17 snapshot? Your changes will be lost.')) return;
        state = freshState();
        ui.drawerId = null;
        return commit('Reset to the Nov 17 snapshot.');
      default:
        return;
    }
    render();
  });

  document.addEventListener('change', e => {
    const el = e.target;
    const key = el.dataset && el.dataset.filter;
    if (!key) return;
    ui.toast = '';
    if (key === 'cap') {
      const v = Number(el.value);
      if (!Number.isFinite(v) || v < 1 || v > 60) return fail('Enter a ceiling between 1 and 60 hours.');
      state.cap = v;
      return commit(`Monthly ceiling set to ${num(v)} h.`);
    }
    ui.filters[key] = el.type === 'checkbox' ? el.checked : el.value;
    render();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && ui.drawerId) {
      ui.drawerId = null;
      render();
    }
  });

  render();
})();
