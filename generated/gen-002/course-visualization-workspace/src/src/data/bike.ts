// Deterministic synthetic San Diego bike-counter data, shaped to behave like the real thing
// (seasonality, a 2020 commuting drop, a 2022 protected-lane bump on 30th St, a 2021 outage).

export interface Counter {
  id: string;
  name: string;
  short: string;
  neighborhood: string;
  base: number; // typical monthly total in 2019
  summer: number; // seasonal amplitude
  kind: 'commute' | 'recreation' | 'mixed';
  color: string;
  since?: number; // month index the counter starts reporting
  core?: boolean;
}

export const COUNTERS: Counter[] = [
  { id: 'HBR-01', name: 'Harbor Dr', short: 'Harbor Dr', neighborhood: 'Downtown', base: 10400, summer: 0.12, kind: 'commute', color: '#4269d0', core: true },
  { id: 'UNV-02', name: 'University Ave', short: 'University Ave', neighborhood: 'Hillcrest', base: 6300, summer: 0.08, kind: 'commute', color: '#e0a100', core: true },
  { id: '30T-03', name: '30th St', short: '30th St', neighborhood: 'North Park', base: 3900, summer: 0.1, kind: 'mixed', color: '#ff725c', core: true },
  { id: 'PBB-04', name: 'Pacific Beach Boardwalk', short: 'PB Boardwalk', neighborhood: 'Pacific Beach', base: 21500, summer: 0.34, kind: 'recreation', color: '#2f9c86', core: true },
  { id: 'BSB-05', name: 'Bayshore Bikeway', short: 'Bayshore', neighborhood: 'Coronado', base: 8200, summer: 0.28, kind: 'recreation', color: '#a463f2' },
  { id: 'MVP-06', name: 'Mission Valley River Path', short: 'Mission Valley', neighborhood: 'Mission Valley', base: 5200, summer: 0.15, kind: 'mixed', color: '#9c6b4e' },
  { id: 'MBD-07', name: 'Mission Bay Dr', short: 'Mission Bay Dr', neighborhood: 'Mission Bay', base: 7400, summer: 0.25, kind: 'recreation', color: '#ff8ab7', since: 72 },
  { id: 'IMP-08', name: 'Imperial Ave', short: 'Imperial Ave', neighborhood: 'Logan Heights', base: 2600, summer: 0.06, kind: 'commute', color: '#97bbf5', since: 72 },
  { id: 'ECB-09', name: 'El Cajon Blvd', short: 'El Cajon Blvd', neighborhood: 'City Heights', base: 3400, summer: 0.06, kind: 'commute', color: '#9498a0', since: 74 },
  { id: 'RCN-10', name: 'Rose Canyon', short: 'Rose Canyon', neighborhood: 'University City', base: 4100, summer: 0.18, kind: 'recreation', color: '#3ca951', since: 74 },
];

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Month { y: number; m: number; label: string; days: number }

export function monthsFor(count: number): Month[] {
  const out: Month[] = [];
  for (let i = 0; i < count; i++) {
    const y = 2019 + Math.floor(i / 12);
    const m = i % 12;
    out.push({ y, m, label: `${MONTH_NAMES[m]} ${y}`, days: new Date(y, m + 1, 0).getDate() });
  }
  return out;
}

export function versionMonthCount(v: number) {
  if (v <= 2) return 60; // through Dec 2023
  if (v <= 5) return 81; // through Sep 2025
  return 82; // through Oct 2025
}

export function versionCounters(v: number): Counter[] {
  return v >= 6 ? COUNTERS : COUNTERS.slice(0, 6);
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rand(seed: string) {
  let t = hash(seed) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const OUTAGE = new Set([26, 27, 28]); // Mar, Apr, May 2021

function rawMonthly(c: Counter, i: number): number {
  const mon = monthsFor(i + 1)[i];
  // seasonal peak in Jul/Aug
  const s = 1 + c.summer * Math.cos(((mon.m - 6.8) / 6) * Math.PI);
  const years = i / 12;
  let trend = 1 + 0.025 * years;
  // Pandemic: commuting drops, recreation spikes
  if (i >= 15 && i < 36) {
    const k = i < 18 ? (i - 14) / 3 : Math.max(0, 1 - (i - 18) / 18);
    if (c.kind === 'commute') trend *= 1 - 0.42 * k;
    if (c.kind === 'recreation') trend *= 1 + 0.22 * k;
    if (c.kind === 'mixed') trend *= 1 - 0.12 * k;
  }
  // 30th St protected bike lanes open Aug 2022
  if (c.id === '30T-03' && i >= 43) trend *= 1 + Math.min(0.38, 0.1 + (i - 43) * 0.03);
  // University Ave slow post-2022 recovery
  if (c.id === 'UNV-02' && i >= 36) trend *= 0.95;
  const noise = 1 + (rand(`${c.id}-${i}`) - 0.5) * 0.09;
  const dayAdj = mon.days / 30.4;
  return Math.round(c.base * s * trend * noise * dayAdj);
}

export interface Series { id: string; label: string; color: string; values: (number | null)[]; imputed?: boolean[] }

export function monthlySeries(v: number, ids?: string[]): Series[] {
  const n = versionMonthCount(v);
  return versionCounters(v)
    .filter((c) => !ids || ids.includes(c.id))
    .map((c) => {
      const imputed: boolean[] = [];
      const values = Array.from({ length: n }, (_, i) => {
        imputed.push(false);
        if (c.since !== undefined && i < c.since) return null;
        let val: number | null = rawMonthly(c, i);
        if (c.id === 'UNV-02' && OUTAGE.has(i)) {
          if (v >= 5) {
            imputed[i] = true;
            val = Math.round(((rawMonthly(c, i - 12) + rawMonthly(c, i + 12)) / 2) * 1.09);
          } else val = null;
        }
        if (v === 1 && c.id === 'HBR-01' && i === 29) val = (val ?? 0) * 2; // duplicated rows bug
        return val;
      });
      return { id: c.id, label: c.short, color: c.color, values, imputed };
    });
}

export interface DailyRow { date: string; counter_id: string; location: string; neighborhood: string; count: number | null; status: string; imputed?: boolean; hour?: number }

export function dailyRows(v: number, opts: { limit?: number; counters?: string[] } = {}): DailyRow[] {
  const months = monthsFor(versionMonthCount(v));
  const counters = versionCounters(v).filter((c) => !opts.counters || opts.counters.includes(c.id));
  const series = monthlySeries(v);
  const rows: DailyRow[] = [];
  for (let mi = 0; mi < months.length; mi++) {
    const mon = months[mi];
    for (let d = 1; d <= mon.days; d++) {
      const date = `${mon.y}-${String(mon.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(mon.y, mon.m, d).getDay();
      for (const c of counters) {
        const s = series.find((x) => x.id === c.id)!;
        const total = s.values[mi];
        if (c.since !== undefined && mi < c.since) continue;
        let count: number | null = null;
        if (total !== null) {
          const weekendBoost = c.kind === 'recreation' ? (dow === 0 || dow === 6 ? 1.45 : 0.82) : dow === 0 || dow === 6 ? 0.62 : 1.15;
          const noise = 1 + (rand(`${c.id}-${date}`) - 0.5) * 0.3;
          count = Math.max(0, Math.round((total / mon.days) * weekendBoost * noise));
        }
        rows.push({
          date,
          counter_id: c.id,
          location: c.name,
          neighborhood: c.neighborhood,
          count,
          status: count === null ? 'offline' : 'ok',
          imputed: s.imputed?.[mi] ?? false,
        });
        if (opts.limit && rows.length >= opts.limit) return rows;
      }
    }
  }
  return rows;
}

export function columnsFor(v: number): string[] {
  if (v === 1) return ['date', 'counter_id', 'location', 'neighborhood', 'count'];
  if (v <= 3) return ['date', 'counter_id', 'location', 'neighborhood', 'count', 'counter_status'];
  if (v === 4) return ['date', 'hour', 'counter_id', 'location', 'neighborhood', 'count', 'counter_status'];
  return ['date', 'hour', 'counter_id', 'location_name', 'neighborhood', 'bike_count', 'counter_status', 'imputed'];
}

export function rowToCells(r: DailyRow, v: number, hour = 0): string[] {
  const c = r.count === null ? '' : String(r.count);
  if (v === 1) return [r.date, r.counter_id, r.location, r.neighborhood, c];
  if (v <= 3) return [r.date, r.counter_id, r.location, r.neighborhood, c, r.status];
  const hc = r.count === null ? '' : String(Math.round(r.count * (hour >= 7 && hour <= 9 ? 0.11 : 0.035)));
  if (v === 4) return [r.date, String(hour), r.counter_id, r.location, r.neighborhood, hc, r.status];
  return [r.date, String(hour), r.counter_id, r.location, r.neighborhood, hc, r.status, String(!!r.imputed)];
}

export function buildCsv(v: number): string {
  const head = columnsFor(v);
  const rows = dailyRows(v);
  const lines = [head.join(',')];
  const esc = (s: string) => (s.includes(',') ? `"${s}"` : s);
  if (v >= 4) {
    // Hourly versions are large; the browser export is a daily-at-08:00 slice with a note.
    lines.unshift('# Browser export: 08:00 slice of the hourly file. Full file is on the course data share.');
    for (const r of rows) lines.push(rowToCells(r, v, 8).map(esc).join(','));
  } else {
    for (const r of rows) lines.push(rowToCells(r, v).map(esc).join(','));
  }
  return lines.join('\n');
}

export const CORE_IDS = COUNTERS.filter((c) => c.core).map((c) => c.id);
