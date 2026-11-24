// Placement rules. Pure functions only: no DOM, no React, so the same logic
// can be used by the UI and by the data generator script.

import { SITES } from '../data/sites.js';
import { NEIGHBORHOODS, COURSES, SLOTS, SLOT_ORDER } from '../data/network.js';

export const DEFAULT_LIMIT = 45; // minutes of transit a non-driving student will accept
export const LIMIT_MIN = 30;
export const LIMIT_MAX = 60;

export const SITE_BY_ID = Object.fromEntries(SITES.map((s) => [s.id, s]));
export const NEIGHBORHOOD_BY_ID = Object.fromEntries(NEIGHBORHOODS.map((n) => [n.id, n]));

export const MODES = ['Bus', 'Light rail', 'Bus + light rail', 'Drives'];

// A student "needs weekday evenings" when evenings are the only weekday
// option they can attend.
export function needsWeekdayEvening(student) {
  const a = student.availability;
  return a.includes('WD-EVE') && !a.includes('WD-AM') && !a.includes('WD-PM');
}

export function distanceKm(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function sharedLines(neighborhood, site) {
  return neighborhood.lines.filter((line) => site.routes.includes(line));
}

// Rail-only students can only use sites that the Blue Line serves directly
// from their neighborhood.
export function railReachable(neighborhood, site) {
  return neighborhood.lines.includes('Blue Line') && site.routes.includes('Blue Line');
}

// Estimated door-to-door minutes from a student's home neighborhood centroid
// to the site. This is a model, not a routing result: straight-line distance
// times a detour factor and a per-km speed, plus stop access and a transfer
// penalty when no line is shared. Labelled as an estimate everywhere in the UI.
export function estimateMinutes(student, site) {
  const nb = NEIGHBORHOOD_BY_ID[student.neighborhood];
  const d = distanceKm(nb, site);
  if (student.mode === 'Drives') {
    return Math.round(d * 1.3 * 1.8 + 3);
  }
  const shared = sharedLines(nb, site);
  const rail = shared.includes('Blue Line');
  const access = rail ? 6 : 9;
  const transfer = shared.length > 0 ? 0 : 12;
  const ride = rail ? d * 1.2 * 2.1 : d * 1.25 * 3.0;
  return Math.round(access + ride + transfer);
}

// Full assessment of one student against one site, given the seats that are
// currently open there and the commute limit in force.
export function assess(student, site, { openSeats, limit = DEFAULT_LIMIT }) {
  const nb = NEIGHBORHOOD_BY_ID[student.neighborhood];
  const minutes = estimateMinutes(student, site);
  const slotMatch = site.slots.filter((s) => student.availability.includes(s));
  const reasons = [];

  if (openSeats <= 0) reasons.push('Full');
  if (slotMatch.length === 0) reasons.push('No shared time slot');
  if (student.mode === 'Light rail' && !railReachable(nb, site)) {
    reasons.push('Not reachable by light rail alone');
  }
  const withinLimit = student.mode === 'Drives' || minutes <= limit;
  if (!withinLimit) reasons.push(`Over ${limit} min`);

  return {
    site,
    minutes,
    openSeats,
    slotMatch,
    reasons,
    withinLimit,
    fitsCourse: COURSES[student.course]?.fit.includes(site.type) ?? false,
    // Recommended = open seat, shared slot, reachable, inside the limit.
    recommended: reasons.length === 0,
  };
}

// Current seat counts from the assignment map (studentId -> siteId | null).
export function seatCounts(assignments) {
  const counts = {};
  for (const siteId of Object.values(assignments)) {
    if (siteId) counts[siteId] = (counts[siteId] || 0) + 1;
  }
  return counts;
}

export function openSeatsFor(site, counts) {
  return site.capacity - (counts[site.id] || 0);
}

// Merge baseline placements with the coordinator's changes this session.
// overrides: studentId -> siteId | null (null = taken off their site).
export function resolveAssignments(students, overrides) {
  const out = {};
  for (const s of students) {
    out[s.id] = Object.prototype.hasOwnProperty.call(overrides, s.id) ? overrides[s.id] : s.siteId;
  }
  return out;
}

export function describeAvailability(availability) {
  return availability.map((code) => SLOTS[code]).join(', ');
}

export function slotShort(code) {
  return { 'WD-AM': 'Wkday AM', 'WD-PM': 'Wkday PM', 'WD-EVE': 'Wkday eve', SAT: 'Sat' }[code] ?? code;
}

export function sortSlots(list) {
  return [...list].sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
}

export function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function placementsToCsv(rows) {
  const header = [
    'student_id', 'student_name', 'course', 'course_title', 'home_neighborhood', 'transit_mode',
    'availability', 'status', 'site', 'site_type', 'site_address', 'est_commute_min', 'within_limit', 'nearest_stop',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    const site = r.siteId ? SITE_BY_ID[r.siteId] : null;
    const nb = NEIGHBORHOOD_BY_ID[r.neighborhood];
    const minutes = site && nb ? estimateMinutes(r, site) : '';
    const within = !site ? '' : r.mode === 'Drives' ? 'n/a (drives)' : minutes <= DEFAULT_LIMIT ? 'yes' : 'no';
    lines.push([
      r.id,
      r.name,
      r.course,
      COURSES[r.course]?.title ?? '',
      r.neighborhood,
      r.mode,
      r.availability.map((c) => SLOTS[c]).join('; '),
      site ? 'Placed' : 'Unplaced',
      site ? site.name : '',
      site ? site.type : '',
      site ? site.address : '',
      minutes,
      within,
      site ? site.stop : '',
    ].map(csvEscape).join(','));
  }
  return lines.join('\n') + '\n';
}
