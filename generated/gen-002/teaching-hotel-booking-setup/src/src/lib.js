import { CANCEL_OPTIONS, DEPOSIT_OPTIONS, PENALTY_OPTIONS, ACTIONS, TOPICS } from './data.js';

export const money = (n, opts = {}) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts.cents || n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);

export const pct = (n) => `${Number(n.toFixed(2))}%`;

const parse = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const fmtDate = (iso, { weekday = false, year = true } = {}) =>
  parse(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    ...(year ? { year: 'numeric' } : {}),
    ...(weekday ? { weekday: 'short' } : {}),
  });
export const weekdayOf = (iso) => parse(iso).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' });
export const addDays = (iso, n) => {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

export function dateRangeText(r, opts = {}) {
  if (!r.start || !r.end) return 'All year';
  const sameYear = r.start.slice(0, 4) === r.end.slice(0, 4);
  const s = fmtDate(r.start, { weekday: opts.weekday, year: !sameYear });
  const e = fmtDate(r.end, { weekday: opts.weekday, year: true });
  return `${s} – ${e}`;
}

export const cancelOpt = (id) => CANCEL_OPTIONS.find((c) => c.id === id) || CANCEL_OPTIONS[0];
export const depositOpt = (id) => DEPOSIT_OPTIONS.find((c) => c.id === id) || DEPOSIT_OPTIONS[0];
export const penaltyOpt = (id) => PENALTY_OPTIONS.find((c) => c.id === id) || PENALTY_OPTIONS[0];

export function cancelText(r) {
  if (r.cancel === 'nonref') return 'Non-refundable';
  return `Free until ${cancelOpt(r.cancel).short} before arrival`;
}
export function cancelDetail(r) {
  if (r.cancel === 'nonref') return 'Guest forfeits the full amount paid.';
  const p = r.penalty === 'full-stay' ? 'the entire stay' : 'the first night plus tax';
  return `After that, the guest is charged ${p}.`;
}

export function pricingText(p) {
  if (p.mode === 'flat') return `${money(p.value)} flat per night`;
  if (p.value === 0) return 'Base rate';
  return `${p.value > 0 ? '+' : '−'}${Math.abs(p.value)}% of base`;
}

export const nightlyRate = (base, pricing) =>
  pricing.mode === 'flat' ? pricing.value : Math.round(base * (1 + pricing.value / 100));

export function priceStay({ nightly, nights, tax }) {
  const room = nightly * nights;
  const lodging = Math.round(room * (tax.lodgingPct / 100) * 100) / 100;
  const fee = tax.feePerNight * nights;
  return { room, lodging, fee, total: Math.round((room + lodging + fee) * 100) / 100 };
}

export const actionById = (id) => ACTIONS.find((a) => a.id === id);
export const topicLabel = (id) => TOPICS.find((t) => t.id === id)?.label || id;

export const LEVELS = [
  { id: 'no', label: 'Not allowed', short: 'Off' },
  { id: 'yes', label: 'Allowed', short: 'On' },
  { id: 'reason', label: 'Allowed with a reason', short: 'Reason' },
];
export const levelLabel = (id) => LEVELS.find((l) => l.id === id)?.label || id;

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
export const roomLabel = (r) => `${r.number}`;
