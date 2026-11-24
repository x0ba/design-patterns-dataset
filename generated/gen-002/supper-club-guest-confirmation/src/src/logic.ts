import {
  CAPACITY,
  FULL_REFUND_THROUGH,
  PARTIAL_REFUND_RATE,
  PROCESSING_RATE,
  REQUESTS,
  SEAT_PRICE,
  VENUE_DEPOSIT,
  type Request,
} from './data';

const byId = new Map(REQUESTS.map((r) => [r.id, r]));
export const getRequest = (id: string) => byId.get(id);

// Priority tier: founding members, then other members (incl. group leaders), then guests of members.
function tier(r: Request): number {
  if (r.kind === 'guest') return 2;
  return r.founding ? 0 : 1;
}

// Sort key: tier, then past dinners (most first), then earliest request.
export function compareRequests(a: Request, b: Request): number {
  const t = tier(a) - tier(b);
  if (t !== 0) return t;
  const d = (b.dinnersAttended ?? 0) - (a.dinnersAttended ?? 0);
  if (d !== 0) return d;
  return a.requestedAt.localeCompare(b.requestedAt);
}

export const PRIORITY_ORDER: Request[] = [...REQUESTS].sort(compareRequests);
export const PRIORITY_RANK = new Map(PRIORITY_ORDER.map((r, i) => [r.id, i + 1]));

// Suggested selection: walk the priority order, skip dietary conflicts (left for Dani to decide),
// and take a request only if the whole party still fits in the remaining seats.
export function suggestSelection(): string[] {
  const picked: string[] = [];
  let seats = 0;
  for (const r of PRIORITY_ORDER) {
    if (r.dietary?.conflict) continue;
    if (seats + r.partySize <= CAPACITY) {
      picked.push(r.id);
      seats += r.partySize;
    }
  }
  return picked;
}

export function seatsFor(ids: Iterable<string>): number {
  let total = 0;
  for (const id of ids) total += getRequest(id)?.partySize ?? 0;
  return total;
}

// Everyone not holding a live charge, in priority order. Before confirmation that is everyone not
// selected; after confirmation it is everyone without a charged or refunded seat.
export function waitlistIds(s: {
  confirmedAt: number | null;
  selected: string[];
  charges: Record<string, { status: string }>;
}): string[] {
  return PRIORITY_ORDER.filter((r) => {
    if (s.confirmedAt === null) return !s.selected.includes(r.id);
    const c = s.charges[r.id];
    return !c || c.status === 'reversed';
  }).map((r) => r.id);
}

export function totalsFor(seats: number, charges: number) {
  const amount = chargeFor(seats);
  const fee = feeFor(amount);
  return { seats, charges, amount, fee, deposit: VENUE_DEPOSIT, net: round2(amount - fee - VENUE_DEPOSIT) };
}

export const chargeFor = (seats: number) => round2(seats * SEAT_PRICE);
export const feeFor = (amount: number) => round2(amount * PROCESSING_RATE);
export const round2 = (n: number) => Math.round(n * 100) / 100;

// Refund rate under Dani's policy: full up to 7 days before dinner, 50% after.
export function refundRateAt(now: number): number {
  return now <= FULL_REFUND_THROUGH ? 1 : PARTIAL_REFUND_RATE;
}

// ---------- formatting ----------

const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const money = (n: number) => money0.format(n);

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const fmtDate = (ms: number) => dateFmt.format(ms);
export const fmtTime = (ms: number) => timeFmt.format(ms);
export const fmtDateTime = (ms: number) => dateTimeFmt.format(ms);
export const fmtRequested = (iso: string) => dateTimeFmt.format(new Date(iso));

export function fmtDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// "11/26" -> true if the card expires in or before the dinner month.
export function cardExpiresBeforeDinner(expiry: string): boolean {
  const [mm, yy] = expiry.split('/').map(Number);
  const year = 2000 + yy;
  return year < 2026 || (year === 2026 && mm <= 11);
}

export const dietaryFlags = REQUESTS.filter((r) => r.dietary);
export const founding = REQUESTS.filter((r) => r.founding);
export const groups = REQUESTS.filter((r) => r.kind === 'group');
export const guests = REQUESTS.filter((r) => r.kind === 'guest');
export const expiringCards = REQUESTS.filter((r) => cardExpiresBeforeDinner(r.card.expiry));
// Members who submitted requests (guests of members are not counted as members).
export const memberCount = new Set(REQUESTS.filter((r) => r.kind !== 'guest').map((r) => r.name)).size;
