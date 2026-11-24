import { ACTIONS, LAST_TERM } from './data.js';
import { money, pct, pricingText, dateRangeText, cancelText, depositOpt, levelLabel, topicLabel } from './lib.js';

const join = (a) => (a.length ? a.join(', ') : 'none');

function byId(list) {
  return new Map(list.map((x) => [x.id, x]));
}

function fieldDiff(before, after, fields) {
  const out = [];
  for (const [label, fn] of fields) {
    const b = fn(before);
    const a = fn(after);
    if (b !== a) out.push({ field: label, before: b, after: a });
  }
  return out;
}

const roomFields = [
  ['Type', (r) => r.type],
  ['Floor', (r) => String(r.floor)],
  ['Bed', (r) => r.bed],
  ['Max occupancy', (r) => String(r.maxOcc)],
  ['Base rate', (r) => money(r.rate)],
  ['Accessible', (r) => (r.accessible ? 'Yes' : 'No')],
];
const featureDiff = (b, a) => {
  const added = a.features.filter((f) => !b.features.includes(f));
  const removed = b.features.filter((f) => !a.features.includes(f));
  return added.length || removed.length ? [{ field: 'Features', added, removed }] : [];
};

const rateFields = [
  ['Status', (r) => ({ active: 'Active', draft: 'Draft', retired: 'Retired' })[r.status]],
  ['Price', (r) => pricingText(r.pricing)],
  ['Dates', (r) => dateRangeText(r)],
  ['Minimum stay', (r) => `${r.minStay} ${r.minStay === 1 ? 'night' : 'nights'}`],
  ['Cancellation', (r) => cancelText(r)],
  ['Late-cancel penalty', (r) => (r.penalty === 'full-stay' ? 'Entire stay' : 'First night')],
  ['Deposit', (r) => depositOpt(r.deposit).short],
];

/** Compare the working draft with last term's saved settings. */
export function diffAgainstLastTerm(cur, last = LAST_TERM) {
  const items = [];

  // Rooms
  const lastRooms = byId(last.rooms);
  const curRooms = byId(cur.rooms);
  for (const r of cur.rooms) {
    const b = lastRooms.get(r.id);
    if (!b) items.push({ section: 'Rooms', title: `Room ${r.number}`, kind: 'added', summary: `${r.type}, ${money(r.rate)}` });
    else {
      const ch = [...fieldDiff(b, r, roomFields), ...featureDiff(b, r)];
      if (b.number !== r.number) ch.unshift({ field: 'Number', before: b.number, after: r.number });
      if (ch.length) items.push({ section: 'Rooms', title: `Room ${r.number}`, kind: 'changed', changes: ch });
    }
  }
  for (const b of last.rooms) {
    if (!curRooms.has(b.id)) items.push({ section: 'Rooms', title: `Room ${b.number}`, kind: 'removed', summary: `${b.type}, ${money(b.rate)}` });
  }

  // Rates
  const lastRates = byId(last.rates);
  for (const r of cur.rates) {
    const b = lastRates.get(r.id);
    if (!b) {
      items.push({ section: 'Rate plans', title: r.name, kind: 'added', summary: `${r.status === 'draft' ? 'Draft · ' : ''}${pricingText(r.pricing)}, ${dateRangeText(r)}` });
    } else {
      const ch = fieldDiff(b, r, rateFields);
      if (ch.length) items.push({ section: 'Rate plans', title: r.name, kind: 'changed', changes: ch });
    }
  }
  for (const b of last.rates) {
    if (!cur.rates.some((r) => r.id === b.id)) items.push({ section: 'Rate plans', title: b.name, kind: 'removed', summary: pricingText(b.pricing) });
  }

  // Scenarios
  const lastSc = byId(last.scenarios);
  for (const s of cur.scenarios) {
    const b = lastSc.get(s.id);
    if (!b) continue;
    const ch = [];
    if (b.week !== s.week) ch.push({ field: 'Unlocks', before: `Week ${b.week}`, after: `Week ${s.week}` });
    if (b.ratePlan !== s.ratePlan) ch.push({ field: 'Rate plan', before: b.ratePlan || 'none', after: s.ratePlan || 'none' });
    if (ch.length) items.push({ section: 'Practice scenarios', title: s.title, note: topicLabel(s.topic), kind: 'changed', changes: ch });
  }

  // Roles
  for (const role of cur.roles) {
    const b = last.roles.find((r) => r.id === role.id);
    if (!b) continue;
    for (const a of ACTIONS) {
      if (b.perms[a.id] !== role.perms[a.id]) {
        items.push({
          section: 'Student roles',
          title: `${role.name}: ${a.label}`,
          kind: 'changed',
          changes: [{ field: 'Permission', before: levelLabel(b.perms[a.id]), after: levelLabel(role.perms[a.id]) }],
        });
      }
    }
  }

  // Tax
  const taxCh = [];
  if (cur.tax.lodgingPct !== last.tax.lodgingPct) taxCh.push({ field: 'Lodging tax', before: pct(last.tax.lodgingPct), after: pct(cur.tax.lodgingPct) });
  if (cur.tax.feePerNight !== last.tax.feePerNight) taxCh.push({ field: 'City occupancy fee', before: `${money(last.tax.feePerNight, { cents: true })} / night`, after: `${money(cur.tax.feePerNight, { cents: true })} / night` });
  if (taxCh.length) items.push({ section: 'Taxes & fees', title: 'Tax settings', kind: 'changed', changes: taxCh });

  return items;
}

export const SECTION_ORDER = ['Rooms', 'Rate plans', 'Practice scenarios', 'Student roles', 'Taxes & fees'];
