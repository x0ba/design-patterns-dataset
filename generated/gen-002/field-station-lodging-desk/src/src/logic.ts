import { CABINS } from './data/seed';
import { BOAT, COURSE, USER } from './config';
import type { AppState, Bunk, Cabin, Designation, Lodging, Meal, Person, Restriction } from './types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DESIGNATION_LABEL: Record<Designation, string> = {
  women: "Women's",
  men: "Men's",
  mixed: 'Mixed',
};
export const LODGING_LABEL: Record<Lodging, string> = { women: "Women's", men: "Men's" };
export const MEAL_LABEL: Record<Meal, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' };

// ---------- dates and clock ----------

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayLabel(iso: string): string {
  const d = parseIso(iso);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function shortDate(iso: string): string {
  const d = parseIso(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function rangeText(from: string, to: string): string {
  const a = parseIso(from);
  const b = parseIso(to);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${a.getUTCDate()}–${shortDate(to)}`;
  }
  return `${shortDate(from)} – ${shortDate(to)}`;
}

export function courseDays(): string[] {
  const days: string[] = [];
  for (let d = COURSE.from; d <= COURSE.to; d = addDays(d, 1)) days.push(d);
  return days;
}

export function clockLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function untilLabel(minutes: number): string {
  if (minutes <= 0) return 'now';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

// ---------- lookups ----------

export function cabinById(id: string): Cabin {
  const cabin = CABINS.find((c) => c.id === id);
  if (!cabin) throw new Error(`Unknown cabin ${id}`);
  return cabin;
}

export function cabinOfBunk(bunk: Bunk): Cabin {
  return cabinById(bunk.cabinId);
}

export function bunkById(state: AppState, id: string): Bunk | undefined {
  return state.bunks.find((b) => b.id === id);
}

export function personInBunk(state: AppState, bunkId: string): Person | undefined {
  return state.people.find((p) => p.bunkId === bunkId);
}

export function personById(state: AppState, id: string): Person | undefined {
  return state.people.find((p) => p.id === id);
}

/** Course members who have not been released (confirmed or tentative). */
export function coursePeople(state: AppState): Person[] {
  return state.people.filter((p) => !p.isResident && p.booking !== 'released');
}

export function bunkLabel(bunkId: string): string {
  const [code, n] = bunkId.split('-');
  const cabin = CABINS.find((c) => c.id === code);
  return cabin ? `${cabin.name} ${n}` : bunkId;
}

// ---------- rules ----------

export function overlapsRestriction(stay: { from: string; to: string }, r: Restriction): boolean {
  // Stays cover nights from `from` up to (not including) `to`.
  // Restrictions cover nights `from` through `to`, inclusive.
  return stay.from <= r.to && r.from < stay.to;
}

export function restrictionFor(state: AppState, p: Person): Restriction | undefined {
  if (p.isResident || !p.bunkId) return undefined;
  const bunk = bunkById(state, p.bunkId);
  if (!bunk) return undefined;
  return cabinOfBunk(bunk).restrictions.find((r) => overlapsRestriction(p, r));
}

export function lodgingFits(lodging: Lodging, designation: Designation): boolean {
  return designation === 'mixed' || designation === lodging;
}

export interface PlacementCheck {
  ok: boolean;
  /** One short line, for lists. */
  reason: string;
  problems: string[];
  notes: string[];
}

export function checkPlacement(
  state: AppState,
  who: { id?: string; lodging: Lodging; from: string; to: string },
  bunkId: string,
): PlacementCheck {
  const problems: string[] = [];
  const notes: string[] = [];
  const bunk = bunkById(state, bunkId);
  if (!bunk) return { ok: false, reason: 'Not a bunk', problems: ['That bunk does not exist.'], notes };

  const cabin = cabinOfBunk(bunk);
  const occupant = personInBunk(state, bunkId);
  if (occupant && occupant.id !== who.id) {
    problems.push(`Already occupied by ${occupant.name}.`);
  }
  if (!lodgingFits(who.lodging, cabin.designation)) {
    problems.push(
      `${cabin.name} is a ${DESIGNATION_LABEL[cabin.designation].toLowerCase()} cabin. This person's lodging group is ${LODGING_LABEL[who.lodging].toLowerCase()}.`,
    );
  }
  for (const r of cabin.restrictions) {
    if (overlapsRestriction(who, r)) {
      problems.push(`${cabin.name} is "${r.label}" for ${rangeText(r.from, r.to)}. ${r.detail}`);
    }
  }
  if (bunk.held) {
    notes.push('Already in the BIO 377 hold, so the hold keeps its size.');
  } else {
    notes.push('Not in the hold yet. Taking this bunk adds it to the hold. The bunk being left goes back to free stock, so the hold keeps its size.');
  }

  let reason: string;
  if (occupant && occupant.id !== who.id) reason = `Occupied by ${occupant.name}`;
  else if (!lodgingFits(who.lodging, cabin.designation)) reason = `${DESIGNATION_LABEL[cabin.designation]} cabin only`;
  else if (cabin.restrictions.some((r) => overlapsRestriction(who, r))) reason = 'Restricted for these nights';
  else reason = bunk.held ? 'Available, already in the hold' : 'Available, joins the hold';
  return { ok: problems.length === 0, reason, problems, notes };
}

// ---------- hold counts ----------

export interface Summary {
  heldCount: number;
  confirmed: number;
  tentative: number;
  emptyCount: number;
  namedCount: number;
  waiverIncomplete: number;
  conflicts: Person[];
  freeCount: number;
  residentCount: number;
}

export function summary(state: AppState): Summary {
  const course = coursePeople(state);
  const held = state.bunks.filter((b) => b.held);
  const conflicts = course.filter((p) => restrictionFor(state, p));
  return {
    heldCount: held.length,
    confirmed: course.filter((p) => p.booking === 'confirmed').length,
    tentative: course.filter((p) => p.booking === 'tentative').length,
    namedCount: course.filter((p) => p.bunkId).length,
    emptyCount: held.filter((b) => !personInBunk(state, b.id)).length,
    waiverIncomplete: course.filter((p) => p.waiver === 'incomplete').length,
    conflicts,
    freeCount: state.bunks.filter((b) => !b.held && !personInBunk(state, b.id)).length,
    residentCount: state.people.filter((p) => p.isResident && p.bunkId).length,
  };
}

// ---------- covers (meal counts) ----------

function servedOn(stay: { from: string; to: string }, date: string, meal: Meal, lunchPacked: boolean, isCourse: boolean): boolean {
  if (date < stay.from || date > stay.to) return false;
  if (!isCourse) return true;
  // The course arrives by boat at 13:30 on the first day: dinner only, unless lunch is packed for the boat.
  if (date === stay.from) return meal === 'D' || (meal === 'L' && lunchPacked);
  // Check-out morning: breakfast only.
  if (date === stay.to) return meal === 'B';
  return true;
}

export interface Covers {
  residents: Person[];
  confirmed: Person[];
  tentative: Person[];
  emptySlots: number;
  /** Covers the kitchen can rely on today. */
  confirmedTotal: number;
  /** Covers that depend on the 17:00 release decision. */
  pendingTotal: number;
  /** What the kitchen sheet would show if every pending bunk is filled. */
  maxTotal: number;
}

export function covers(state: AppState, date: string, meal: Meal): Covers {
  const residents: Person[] = [];
  const confirmed: Person[] = [];
  const tentative: Person[] = [];
  for (const p of state.people) {
    if (p.booking === 'released' || !p.bunkId) continue;
    if (!servedOn(p, date, meal, state.lunchPackedForBoat, !p.isResident)) continue;
    if (p.isResident) residents.push(p);
    else if (p.booking === 'confirmed') confirmed.push(p);
    else tentative.push(p);
  }
  let emptySlots = 0;
  if (servedOn({ from: COURSE.from, to: COURSE.to }, date, meal, state.lunchPackedForBoat, true)) {
    emptySlots = state.bunks.filter((b) => b.held && !personInBunk(state, b.id)).length;
  }
  const confirmedTotal = residents.length + confirmed.length;
  const pendingTotal = tentative.length + emptySlots;
  return { residents, confirmed, tentative, emptySlots, confirmedTotal, pendingTotal, maxTotal: confirmedTotal + pendingTotal };
}

export const ARRIVAL_DAY = COURSE.from;
export const KITCHEN_DAY_LABEL = dayLabel(ARRIVAL_DAY);

export function arrivalCovers(state: AppState): Record<Meal, Covers> {
  return {
    B: covers(state, ARRIVAL_DAY, 'B'),
    L: covers(state, ARRIVAL_DAY, 'L'),
    D: covers(state, ARRIVAL_DAY, 'D'),
  };
}

// ---------- boat ----------

export function boardable(p: Person): boolean {
  return p.booking === 'confirmed' && p.waiver === 'complete';
}

export function passengers(state: AppState, trip: 1 | 2): Person[] {
  return coursePeople(state).filter((p) => p.trip === trip);
}

export function unassignedForBoat(state: AppState): Person[] {
  return coursePeople(state).filter((p) => p.trip === null);
}

export function manifestKey(state: AppState): string {
  return coursePeople(state)
    .map((p) => `${p.id}:${p.trip ?? '-'}:${p.booking}:${p.waiver}:${p.bunkId ?? '-'}`)
    .join('|');
}

// ---------- message text ----------

function dietLine(state: AppState): string {
  const notes = coursePeople(state).filter((p) => p.diet && p.booking !== 'released');
  if (notes.length === 0) return 'Dietary notes: none on the course roster.';
  return `Dietary notes on the roster: ${notes.map((p) => p.diet).join('; ')}. Names are on the roster.`;
}

export function kitchenMessage(state: AppState): string {
  const c = arrivalCovers(state);
  const d = c.D;
  const lines = [
    `BIO 377 cover count · ${KITCHEN_DAY_LABEL} · ${COURSE.code} (${COURSE.title})`,
    '',
    `Breakfast: ${c.B.confirmedTotal}`,
    `Lunch: ${c.L.confirmedTotal}${state.lunchPackedForBoat ? ' (includes course lunch packed for the boat)' : ''}`,
    `Dinner: ${d.confirmedTotal} confirmed, plus ${d.pendingTotal} pending (max ${d.maxTotal})`,
    '',
    `Dinner is ${d.residents.length} residents + ${d.confirmed.length} confirmed course members.`,
    `The ${d.pendingTotal} pending covers are ${d.tentative.length} tentative names and ${d.emptySlots} unnamed bunks. They are decided at the 17:00 release today. I will send the final figure after the release.`,
    c.B.confirmedTotal === c.B.residents.length && !state.lunchPackedForBoat
      ? 'The course is not on site until 13:30 by boat, so breakfast and lunch on this day are residents only.'
      : '',
    dietLine(state),
    '',
    `${USER.name}, ${USER.title}`,
  ];
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

export function manifestMessage(state: AppState): string {
  const lines = [
    `BIO 377 boat transfer · ${dayLabel(BOAT.date)} · ${BOAT.origin} to the station`,
    `For: ${BOAT.captain}`,
    '',
  ];
  for (const trip of [1, 2] as const) {
    const list = passengers(state, trip);
    const boardableCount = list.filter(boardable).length;
    lines.push(`Trip ${trip} · ${BOAT.times[trip]} · ${list.length} on manifest (${boardableCount} boardable, capacity ${BOAT.capacity})`);
    for (const p of list) {
      const flag = boardable(p) ? '' : p.waiver === 'incomplete' ? '  HOLD: waiver not on file' : '  HOLD: not yet confirmed';
      lines.push(`  - ${p.name}${flag}`);
    }
    lines.push('');
  }
  lines.push('Not on the manifest yet: tentative names and unnamed seats. An update follows once the release is decided.');
  return lines.join('\n');
}
