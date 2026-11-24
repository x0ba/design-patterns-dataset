const MINUS = '−';
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (n: number) => nf0.format(n);
export const usd0 = (n: number) => (Math.round(n) < 0 ? MINUS : '') + '$' + nf0.format(Math.abs(Math.round(n)));
export const usd2 = (n: number) => (n < 0 ? MINUS : '') + '$' + nf2.format(Math.abs(n));
export const signed0 = (n: number) => (Math.round(n) > 0 ? '+' : '') + usd0(n);
export const perHr = (n: number | null) => (n === null || !isFinite(n) ? '—' : usd0(n) + '/h');
export const perHr1 = (n: number | null) => (n === null || !isFinite(n) ? '—' : (n < 0 ? MINUS : '') + '$' + nf1.format(Math.abs(n)) + '/h');
export const hrs = (n: number) => nf1.format(n) + ' h';
export const hrs0 = (n: number) => nf0.format(n) + ' h';
export const pct0 = (n: number) => nf0.format(n) + '%';
export const days = (n: number | null) => (n === null ? '—' : nf0.format(Math.round(n)) + ' d');

const dfShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const dfMonth = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const dfDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const parse = (iso: string) => new Date(iso + 'T00:00:00Z');
export const dateShort = (iso: string) => dfShort.format(parse(iso));
export const monthYear = (iso: string) => dfMonth.format(parse(iso));
export const dayMonth = (iso: string) => dfDay.format(parse(iso));
export const dayMonthFromDay = (d: number) => dfDay.format(new Date(d * 86400000));
export const monthYearFromDay = (d: number) => dfMonth.format(new Date(d * 86400000));

export function plural(n: number, one: string, many = one + 's') { return `${nf0.format(n)} ${n === 1 ? one : many}`; }
export const MINUS_SIGN = MINUS;
