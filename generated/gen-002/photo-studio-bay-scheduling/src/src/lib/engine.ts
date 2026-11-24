import { BAYS, BOOKINGS, LENA_ID, ARLO_ID, UNITS } from '../data/mock';
import type { Bay, BayId, Booking, BookingStatus, KitUnit } from '../types';
import {
  DAY_END,
  DAY_START,
  MIN_EXTENSION,
  NOW,
  TURNAROUND,
  chargeCents,
  fmtMoney,
  fmtRange,
  fmtTime,
} from './time';

// ---------------------------------------------------------------------------
// Basic lookups
// ---------------------------------------------------------------------------

export const bayById = (id: BayId): Bay => BAYS.find((b) => b.id === id)!;
export const unitById = (units: KitUnit[], id: string) => units.find((u) => u.id === id);

export function statusOf(b: Booking, now = NOW): BookingStatus {
  if (b.offered) return 'offered';
  if (b.end <= now) return 'done';
  if (b.start <= now && now < b.end) return 'in-session';
  return 'upcoming';
}

// Bookings in one bay, ordered by start time.
export function bayBookings(bookings: Booking[], bayId: BayId): Booking[] {
  return bookings.filter((b) => b.bayId === bayId).sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type IssueCode = 'hours' | 'bay-overlap' | 'surface' | 'kit-overlap' | 'kit-out';

export interface Issue {
  code: IssueCode;
  bayId?: BayId;
  bookingIds: string[];
  message: string;
}

export interface Relocation {
  unitId: string;
  from: BayId;
  to: BayId;
  bookingId: string;
  byTime: number;
}

// Softbox kits that a future booking needs in a different bay from where they are stored.
export function relocationsFor(bookings: Booking[], units: KitUnit[], now = NOW): Relocation[] {
  const out: Relocation[] = [];
  for (const b of bookings) {
    if (b.start <= now) continue; // already in use; no move needed for the rest of the day
    for (const uid of b.kit) {
      const u = unitById(units, uid);
      if (u?.homeBay && u.homeBay !== b.bayId) {
        out.push({ unitId: uid, from: u.homeBay, to: b.bayId, bookingId: b.id, byTime: b.start });
      }
    }
  }
  return out;
}

// Full-day validation. An empty result means the day is bookable as it stands.
export function validate(bookings: Booking[], units: KitUnit[], now = NOW): Issue[] {
  const issues: Issue[] = [];

  // Studio hours
  for (const b of bookings) {
    if (b.end <= b.start || b.start < DAY_START || b.end > DAY_END) {
      issues.push({
        code: 'hours',
        bookingIds: [b.id],
        message: `${b.client} (${fmtRange(b.start, b.end)}) is outside studio hours.`,
      });
    }
  }

  // Bay turnaround: every booking needs TURNAROUND minutes of clean-down before the next starts.
  for (const bay of BAYS) {
    const list = bayBookings(bookings, bay.id);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (b.start >= a.end + TURNAROUND) continue;
        const clearAt = a.end + TURNAROUND;
        const msg =
          b.start < a.end
            ? `${b.client} starts ${fmtTime(b.start)} in ${bay.name}, before ${a.client} ends at ${fmtTime(a.end)}. ${bay.name} would not clear until ${fmtTime(clearAt)}.`
            : `${b.client} starts ${fmtTime(b.start)}, only ${b.start - a.end} min after ${a.client} ends. A ${TURNAROUND}-min clean-down needs ${fmtTime(clearAt)}.`;
        issues.push({ code: 'bay-overlap', bayId: bay.id, bookingIds: [a.id, b.id], message: msg });
      }
    }
  }

  // Surface: a shoot that needs a white cyc can only sit in a white-cyc bay
  for (const b of bookings) {
    const bay = bayById(b.bayId);
    if (b.needsCyc && !bay.cyc) {
      issues.push({
        code: 'surface',
        bayId: b.bayId,
        bookingIds: [b.id],
        message: `${b.client} needs a white cyc; ${bay.name} is a ${bay.surface.toLowerCase()}.`,
      });
    }
  }

  // Kit: one reservation per unit at a time
  for (const uid of units.map((u) => u.id)) {
    const users = bookings.filter((b) => b.kit.includes(uid)).sort((a, b) => a.start - b.start);
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const a = users[i];
        const b = users[j];
        if (b.start < a.end) {
          issues.push({
            code: 'kit-overlap',
            bookingIds: [a.id, b.id],
            message: `${unitById(units, uid)?.label} is booked to ${a.client} until ${fmtTime(a.end)} and to ${b.client} from ${fmtTime(b.start)}.`,
          });
        }
      }
    }
  }

  // Kit relocations: the unit must not be in use by someone else between now and when it's needed
  for (const r of relocationsFor(bookings, units, now)) {
    const booking = bookings.find((b) => b.id === r.bookingId)!;
    const unit = unitById(units, r.unitId)!;
    const blocking = bookings.find(
      (o) => o.id !== booking.id && o.kit.includes(r.unitId) && o.end > now && o.start < booking.end,
    );
    if (blocking) {
      issues.push({
        code: 'kit-out',
        bayId: r.to,
        bookingIds: [booking.id, blocking.id],
        message: `${unit.label} is out to ${blocking.client} until ${fmtTime(blocking.end)}, so it can't be moved to ${bayById(r.to).name} for ${booking.client}.`,
      });
    }
  }

  return issues;
}

// Earliest clean start for a bay: when the last booking that ends before `before` has been reset.
export function bayReadyAt(bookings: Booking[], bayId: BayId, before: number): { at: number; prev?: Booking } {
  const prev = bayBookings(bookings, bayId)
    .filter((b) => b.end <= before)
    .sort((a, b) => b.end - a.end)[0];
  return prev ? { at: prev.end + TURNAROUND, prev } : { at: DAY_START };
}

export function nextInBay(bookings: Booking[], bayId: BayId, after: number): Booking | undefined {
  return bayBookings(bookings, bayId).find((b) => b.start >= after);
}

// ---------------------------------------------------------------------------
// Later-slot search for offering a client time
// ---------------------------------------------------------------------------

export interface Slot {
  bayId: BayId;
  start: number;
  end: number;
}

// For each bay, the earliest start (on a 15-minute grid, at or after `earliest`) where
// `duration` minutes fit with turnaround on both sides.
export function findSlots(bookings: Booking[], duration: number, earliest: number, excludeId?: string): Slot[] {
  const slots: Slot[] = [];
  for (const bay of BAYS) {
    for (let s = earliest; s + duration <= DAY_END; s += 15) {
      const e = s + duration;
      const clash = bookings.some(
        (b) => b.id !== excludeId && b.bayId === bay.id && s < b.end + TURNAROUND && b.start < e + TURNAROUND,
      );
      if (!clash) {
        slots.push({ bayId: bay.id, start: s, end: e });
        break;
      }
    }
  }
  return slots.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// The three ways Kofi can answer Lena's request
// ---------------------------------------------------------------------------

export type OptionId = 'A' | 'B' | 'C';

export interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

export interface Ghost {
  bayId: BayId;
  start: number;
  end: number;
  ok: boolean;
  label: string;
}

export interface OptionResult {
  id: OptionId;
  title: string;
  blocked: boolean;
  verdict: 'blocked' | 'changes' | 'clear';
  verdictLabel: string;
  summary: string;
  checks: Check[];
  changes: string[];
  bookings: Booking[];
  units: KitUnit[];
  ghosts: Ghost[];
  issues: Issue[];
  recommended?: boolean;
}

export interface OptionParams {
  slotIdx: number; // index into the later-slot list used by Option C
  offerAccepted: boolean; // whether Lena has said yes to the offered slot
}

export const REQUEST = {
  bookingId: LENA_ID,
  extraMinutes: 90,
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function applyRelocations(units: KitUnit[], relocs: Relocation[]): KitUnit[] {
  const next = clone(units);
  for (const r of relocs) {
    const u = next.find((x) => x.id === r.unitId);
    if (u) u.homeBay = r.to;
  }
  return next;
}

export function buildOptions(
  base: Booking[] = BOOKINGS,
  units: KitUnit[] = UNITS,
  params: OptionParams = { slotIdx: 0, offerAccepted: false },
): { options: OptionResult[]; slots: Slot[] } {
  const lenaBase = base.find((b) => b.id === LENA_ID)!;
  const arloBase = base.find((b) => b.id === ARLO_ID)!;
  const currentEnd = lenaBase.end; // 2:00 PM
  const extEnd = currentEnd + REQUEST.extraMinutes; // 3:30 PM
  const extCost = fmtMoney(chargeCents(REQUEST.extraMinutes));
  const extLen = `${REQUEST.extraMinutes} min`;

  const slots = findSlots(base, REQUEST.extraMinutes, currentEnd, LENA_ID);
  const slot = slots[Math.min(params.slotIdx, Math.max(slots.length - 1, 0))];

  // ---- Option A: extend Lena where she is -----------------------------------
  const a = clone(base);
  a.find((b) => b.id === LENA_ID)!.end = extEnd;
  const aIssues = validate(a, units);
  const aOverlap = aIssues.find((i) => i.code === 'bay-overlap' && i.bayId === 'bay2');
  const optA: OptionResult = {
    id: 'A',
    title: 'Extend Lena in Bay 2',
    blocked: aIssues.length > 0,
    verdict: aIssues.length > 0 ? 'blocked' : 'clear',
    verdictLabel: aIssues.length > 0 ? 'Blocked' : 'Works',
    summary: `Blocked: Arlo Goods has Bay 2 from 3:00 PM.`,
    checks: [
      { label: 'Extension is at least 1 h', ok: REQUEST.extraMinutes >= MIN_EXTENSION, detail: `${extLen} requested · ${extCost}` },
      {
        label: 'Bay 2 clear by 4:00 PM (30-min clean-down)',
        ok: !aOverlap,
        detail: aOverlap ? aOverlap.message : 'Bay 2 clear',
      },
      { label: 'Kit reservations', ok: !aIssues.some((i) => i.code === 'kit-out' || i.code === 'kit-overlap'), detail: 'No kit change needed' },
      { label: 'Inside studio hours', ok: true, detail: 'Closes 10:00 PM' },
    ],
    changes: [],
    bookings: a,
    units,
    ghosts: [{ bayId: 'bay2', start: currentEnd, end: extEnd, ok: false, label: 'Lena +90 min · clashes with Arlo' }],
    issues: aIssues,
  };

  // ---- Option B: move Arlo to Bay 3, extend Lena, carry SB-2 over ------------
  const b = clone(base);
  b.find((x) => x.id === LENA_ID)!.end = extEnd;
  const arloB = b.find((x) => x.id === ARLO_ID)!;
  arloB.bayId = 'bay3';
  arloB.movedFrom = arloBase.bayId;
  const bIssues = validate(b, units);
  const bRelocs = relocationsFor(b, units, NOW);
  const bUnits = applyRelocations(units, bRelocs);
  const bayOk = (id: BayId) => !bIssues.some((i) => i.code === 'bay-overlap' && i.bayId === id);
  const bReady3 = bayReadyAt(base, 'bay3', arloB.start);
  const bNext3 = nextInBay(b, 'bay3', arloB.end);
  const bNext2 = nextInBay(b, 'bay2', extEnd);
  const optB: OptionResult = {
    id: 'B',
    title: 'Move Arlo to Bay 3, extend Lena',
    blocked: bIssues.length > 0,
    verdict: bIssues.length > 0 ? 'blocked' : 'changes',
    verdictLabel: bIssues.length > 0 ? 'Blocked' : 'Works · 2 moves',
    summary: 'Lena keeps Bay 2 and her set. Arlo is the only one who has not arrived yet.',
    checks: [
      { label: 'Extension is at least 1 h', ok: REQUEST.extraMinutes >= MIN_EXTENSION, detail: `${extLen} · ${extCost} at $85/h` },
      {
        label: 'Bay 2 clean-down after Lena',
        ok: bayOk('bay2'),
        detail: bayOk('bay2')
          ? `Lena out ${fmtTime(extEnd)} · clean to ${fmtTime(extEnd + TURNAROUND)} · next ${bNext2 ? `${bNext2.client} ${fmtTime(bNext2.start)}` : 'none'}`
          : bIssues.find((i) => i.bayId === 'bay2')!.message,
      },
      {
        label: 'Bay 3 ready for Arlo at 3:00 PM',
        ok: bayOk('bay3') && arloB.start >= bReady3.at,
        detail: bayOk('bay3')
          ? `${bReady3.prev?.client ?? 'Bay 3'} out ${fmtTime(bReady3.prev?.end ?? DAY_START)} · reset to ${fmtTime(bReady3.at)}`
          : bIssues.find((i) => i.bayId === 'bay3')!.message,
      },
      {
        label: 'White cyc for Arlo’s product shoot',
        ok: !bIssues.some((i) => i.code === 'surface'),
        detail: 'Bay 3 is a white cyc, same as Bay 2',
      },
      {
        label: 'Softbox SB-2 can move to Bay 3',
        ok: !bIssues.some((i) => i.code === 'kit-out' || i.code === 'kit-overlap'),
        detail: bRelocs.length
          ? `SB-2 is free for the rest of the day · carry to Bay 3 before 3:00 PM`
          : 'Kit already in place',
      },
      {
        label: 'Arlo wraps before Bay 3 is next used',
        ok: bayOk('bay3'),
        detail: bNext3 ? `Arlo out ${fmtTime(arloB.end)} · clear ${fmtTime(arloB.end + TURNAROUND)} · ${bNext3.client} ${fmtTime(bNext3.start)}` : 'Bay 3 free after Arlo',
      },
    ],
    changes: [
      `Arlo Goods moves Bay 2 → Bay 3, ${fmtRange(arloB.start, arloB.end)}, and is told the room change before arrival`,
      `Softbox SB-2 moves from Bay 2 to Bay 3 before 3:00 PM`,
      `Lena Strauss extended to ${fmtTime(extEnd)} in Bay 2 (${extCost})`,
      `Arlo’s wrap at 6:00 PM hands over to Jas`,
    ],
    bookings: b,
    units: bUnits,
    ghosts: [
      { bayId: 'bay2', start: currentEnd, end: extEnd, ok: true, label: 'Lena +90 min' },
      { bayId: 'bay3', start: arloB.start, end: arloB.end, ok: true, label: 'Arlo Goods (moved)' },
    ],
    issues: bIssues,
    recommended: true,
  };
  // ---- Option C: offer Lena a later 90-min slot (no extension) -------------
  const c = clone(base);
  const follow: Booking | undefined = slot
    ? {
        id: 'b04x',
        client: 'Lena Strauss',
        contact: 'Lena Strauss',
        project: 'Velvet Static press photos · follow-on',
        bayId: slot.bayId,
        start: slot.start,
        end: slot.end,
        crew: lenaBase.crew,
        deposit: 'Paid',
        needsCyc: false,
        kit: ['st3', 'pap-black'],
        addons: ['Strobe kit ×1', 'Midnight Black paper'],
        offered: !params.offerAccepted,
      }
    : undefined;
  if (follow) c.push(follow);
  const cIssues = validate(c, units);
  const cBay = slot ? bayById(slot.bayId) : undefined;
  const cPrev = slot ? bayReadyAt(base, slot.bayId, slot.start) : undefined;
  const optC: OptionResult = {
    id: 'C',
    title: slot ? `Offer Lena ${cBay!.name}, ${fmtRange(slot.start, slot.end)}` : 'Offer Lena a later slot',
    blocked: cIssues.length > 0 || !slot,
    verdict: !slot || cIssues.length > 0 ? 'blocked' : 'changes',
    verdictLabel: !slot || cIssues.length > 0 ? 'Blocked' : params.offerAccepted ? 'Works · confirmed' : 'Works · Lena to confirm',
    summary: 'Lena stops at 2:00 PM as booked and rebooks 90 min later. Arlo stays put.',
    checks: slot && cBay
      ? [
          { label: 'Slot is at least 1 h', ok: REQUEST.extraMinutes >= MIN_EXTENSION, detail: `${extLen} · ${extCost}` },
          {
            label: `${cBay.name} clear for the slot`,
            ok: !cIssues.some((i) => i.bayId === slot.bayId && i.code === 'bay-overlap'),
            detail: `${cPrev?.prev ? `${cPrev.prev.client} out ${fmtTime(cPrev.prev.end)}` : 'Bay free'} · reset to ${fmtTime(cPrev?.at ?? DAY_START)} · starts ${fmtTime(slot.start)}`,
          },
          {
            label: 'Bay 2 free for Arlo at 3:00 PM',
            ok: !cIssues.some((i) => i.bayId === 'bay2'),
            detail: `Lena out of Bay 2 at 2:00 PM · clean to 2:30 PM · Arlo 3:00 PM`,
          },
          { label: 'Kit reservations', ok: !cIssues.some((i) => i.code === 'kit-overlap' || i.code === 'kit-out'), detail: 'Strobe ST-3 and Midnight Black paper move with Lena' },
          {
            label: 'Lena confirms the new slot',
            ok: params.offerAccepted,
            detail: params.offerAccepted ? 'Confirmed by Lena Strauss' : 'Waiting on Lena’s yes',
          },
        ]
      : [{ label: 'Later slot', ok: false, detail: 'No later 90-min slot fits today' }],
    changes: slot && cBay
      ? [
          `Lena Strauss moves from Bay 2 to ${cBay.name} at ${fmtTime(slot.start)} (${cBay.surface.toLowerCase()})`,
          `Her 2:00 PM booking runs as booked, no extension`,
          `Lena has to confirm the offer`,
        ]
      : [],
    bookings: c,
    units,
    ghosts: slot && cBay
      ? [{ bayId: slot.bayId, start: slot.start, end: slot.end, ok: true, label: 'Lena · offered slot' }]
      : [],
    issues: cIssues,
  };

  const options = [optA, optB, optC];
  return { options, slots };
}

// Bay status line for the board labels, as of `now`.
export interface BayStatusLine {
  tone: 'busy' | 'clean' | 'free';
  headline: string;
  sub: string;
}

export function bayStatus(bookings: Booking[], bay: Bay, now = NOW): BayStatusLine {
  const list = bayBookings(bookings, bay.id).filter((b) => !b.offered);
  const current = list.find((b) => b.start <= now && now < b.end);
  const next = list.find((b) => b.start >= now);
  if (current) {
    return {
      tone: 'busy',
      headline: 'In session',
      sub: `${current.client} · until ${fmtTime(current.end)}`,
    };
  }
  const cleaning = list.filter((b) => b.end <= now && now < b.end + TURNAROUND).pop();
  if (cleaning) {
    return {
      tone: 'clean',
      headline: 'Cleaning down',
      sub: `ready ${fmtTime(cleaning.end + TURNAROUND)}`,
    };
  }
  if (next) {
    return { tone: 'free', headline: 'Free', sub: `next ${next.client} · ${fmtTime(next.start)}` };
  }
  return { tone: 'free', headline: 'Free', sub: 'no more bookings today' };
}

// Arrivals and starts still to come, for the "Up next" handoff list.
export interface UpNextItem {
  booking: Booking;
  readyAt: number;
  readyNote: string;
  clash: boolean;
  signLine: string;
}

export function upNext(bookings: Booking[], units: KitUnit[], now = NOW, limit = 4): UpNextItem[] {
  return bookings
    .filter((b) => b.start >= now && !b.offered)
    .sort((x, y) => x.start - y.start)
    .slice(0, limit)
    .map((b) => {
      const bay = bayById(b.bayId);
      const prev = bayReadyAt(bookings, b.bayId, b.start);
      const kitNames = b.kit
        .map((k) => unitById(units, k))
        .filter((u): u is KitUnit => !!u && u.kind === 'softbox')
        .map((u) => u.label);
      // A booking that overlaps this arrival (even with turnaround) means the room is not ready.
      const clashWith = bayBookings(bookings, b.bayId).find(
        (o) => o.id !== b.id && !o.offered && o.start < b.end + TURNAROUND && b.start < o.end + TURNAROUND,
      );
      const readyNote = clashWith
        ? `Not clear: ${clashWith.client} in ${bay.name} until ${fmtTime(clashWith.end)}`
        : prev.prev
          ? `${bay.name} clean and ready from ${fmtTime(prev.at)}`
          : `${bay.name} ready now`;
      const kitNote = kitNames.length ? ` · softbox ${kitNames.join(', ')} set up in ${bay.name}` : '';
      return {
        booking: b,
        readyAt: prev.at,
        readyNote,
        clash: !!clashWith,
        signLine: `${bay.surface}${kitNote}`,
      };
    });
}
