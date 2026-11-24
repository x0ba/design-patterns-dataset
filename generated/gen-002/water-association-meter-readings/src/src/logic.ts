import { Connection, Entry, RATES } from './data';

export const NEAR_ZERO = 1000; // gallons: vacant/seasonal homes should read below this

export type Severity = 'error' | 'warn' | 'info';
export type FlagCode =
  | 'backwards'
  | 'needs-old'
  | 'old-lower'
  | 'high'
  | 'low'
  | 'zero'
  | 'idle-use'
  | 'replaced-ok';

export interface Flag {
  code: FlagCode;
  severity: Severity;
  short: string; // for the table chip
}

export interface Evaluation {
  entered: boolean;
  usage: number | null;
  flags: Flag[];
  key: string;
  isReplaced: boolean;
  /** needs Gordon's attention before the cycle can be locked */
  open: boolean;
  /** highest-priority blocking flag, if any */
  main: Flag | null;
  ratio: number | null; // usage / average
}

export const fmt = (n: number) => n.toLocaleString('en-US');
export const fmtSigned = (n: number) => (n < 0 ? '−' : n > 0 ? '+' : '') + fmt(Math.abs(n));

export function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function billParts(usage: number) {
  const over = Math.max(0, usage - RATES.includedGal);
  const overCents = Math.round((over * RATES.perThousandCents) / 1000);
  return { baseCents: RATES.baseCents, over, overCents, totalCents: RATES.baseCents + overCents };
}

export const isReplaced = (c: Connection, e: Entry) => !!c.replacedOn || e.swapped;

export function evaluate(c: Connection, e: Entry): Evaluation {
  const replaced = isReplaced(c, e);
  const key = `${e.reading}|${e.oldFinal}`;
  const base: Evaluation = { entered: e.reading != null, usage: null, flags: [], key, isReplaced: replaced, open: false, main: null, ratio: null };
  if (e.reading == null) return base;

  const flags: Flag[] = [];
  let usage: number | null = null;

  if (replaced) {
    if (e.oldFinal == null) {
      flags.push({ code: 'needs-old', severity: 'warn', short: 'Needs old meter reading' });
    } else if (e.oldFinal < c.prev) {
      flags.push({ code: 'old-lower', severity: 'error', short: 'Old meter reading too low' });
    } else {
      usage = e.oldFinal - c.prev + e.reading;
    }
  } else if (e.reading < c.prev) {
    flags.push({ code: 'backwards', severity: 'error', short: 'Lower than previous' });
  } else {
    usage = e.reading - c.prev;
  }

  let ratio: number | null = null;
  if (usage != null) {
    ratio = c.avg > 0 ? usage / c.avg : null;
    if (c.status === 'active') {
      if (usage >= c.avg * 2 && usage - c.avg >= 3000) {
        flags.push({ code: 'high', severity: 'warn', short: 'Much higher than usual' });
      } else if (usage === 0) {
        flags.push({ code: 'zero', severity: 'warn', short: 'No water used' });
      } else if (usage <= c.avg * 0.25 && c.avg - usage >= 1500) {
        flags.push({ code: 'low', severity: 'warn', short: 'Much lower than usual' });
      }
    } else if (usage > NEAR_ZERO) {
      flags.push({ code: 'idle-use', severity: 'warn', short: c.status === 'vacant' ? 'Vacant, but used water' : 'Used more than expected' });
    }
    if (replaced && flags.length === 0) {
      flags.push({ code: 'replaced-ok', severity: 'info', short: 'New meter counted in' });
    }
  }

  const blocking = flags.filter((f) => f.severity !== 'info');
  const hasError = blocking.some((f) => f.severity === 'error');
  const open = hasError || (blocking.length > 0 && e.confirmedKey !== key);
  const main = blocking.find((f) => f.severity === 'error') ?? blocking[0] ?? null;
  return { entered: true, usage, flags, key, isReplaced: replaced, open, main, ratio };
}

/** Parse a string of digits/commas into a whole number (or null). */
export function parseReading(s: string): number | null {
  const digits = s.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
}

/**
 * Typo helper: find readings one keystroke away from what was typed
 * (one digit wrong, two digits swapped, one digit dropped or added)
 * that would give a believable month of water use.
 */
export function suggest(c: Connection, typed: number): number[] {
  const s = String(typed);
  const cands = new Set<number>();
  const add = (t: string) => {
    if (!t || t.length > 7) return;
    const n = parseInt(t, 10);
    if (n !== typed) cands.add(n);
  };
  for (let i = 0; i < s.length; i++) {
    for (let d = 0; d <= 9; d++) add(s.slice(0, i) + d + s.slice(i + 1)); // wrong digit
    add(s.slice(0, i) + s.slice(i + 1)); // extra digit
    if (i < s.length - 1) add(s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2)); // swapped
  }
  for (let i = 0; i <= s.length; i++) for (let d = 0; d <= 9; d++) add(s.slice(0, i) + d + s.slice(i)); // missing digit

  const active = c.status === 'active';
  const lo = active ? c.avg * 0.4 : 0;
  const hi = active ? c.avg * 1.8 : NEAR_ZERO;
  const target = active ? c.avg : 0;
  return [...cands]
    .filter((n) => n >= c.prev && n - c.prev >= lo && n - c.prev <= hi)
    .sort((a, b) => Math.abs(a - c.prev - target) - Math.abs(b - c.prev - target))
    .slice(0, 2);
}

export function ratioText(r: number | null): string {
  if (r == null) return '';
  if (r >= 1.95) return `${r.toFixed(1).replace(/\.0$/, '')} times`;
  return `${Math.round(r * 100)}%`;
}

/** Estimated old-meter final reading: average daily use × days before the swap. */
export function estimateOldFinal(c: Connection, daysBeforeSwap = 13): number {
  const daily = c.avg / 31;
  return Math.round((c.prev + daily * daysBeforeSwap) / 10) * 10;
}
