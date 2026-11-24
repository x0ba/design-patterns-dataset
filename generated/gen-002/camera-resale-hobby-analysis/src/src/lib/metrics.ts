import raw from '../data/items.json';
import type { Cat, Item, Row } from './types';

export const TODAY_ISO = '2026-11-17';
export const dayNum = (iso: string) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000);
export const TODAY = dayNum(TODAY_ISO);

export const CAT_ORDER: Cat[] = ['slr', 'pns', 'mf', 'lens', 'acc'];
export const CAT_LABEL: Record<Cat, string> = {
  slr: '35mm SLR', pns: 'Point-and-shoot', mf: 'Medium format', lens: 'Lenses', acc: 'Accessories',
};
export const CAT_COLOR: Record<Cat, string> = {
  slr: '#2f5f8f', pns: '#d9822b', mf: '#8a3f6d', lens: '#1f7f77', acc: '#8f8672',
};
export const PLATFORMS = ['eBay', 'Etsy', 'Photrio Forum'] as const;
export const SOURCES = ['Estate sale', 'Thrift store', 'Flea market', 'Online lot'] as const;
export const SEQ_COLORS = ['#2f5f8f', '#d9822b', '#8a3f6d', '#1f7f77', '#7d8a2e', '#b04a4a', '#5c5fa3', '#8f8672', '#4b8f4f', '#a8782f'];

export function buildRows(items: Item[]): Row[] {
  return items.map((it) => {
    const cost = it.purchase + it.parts;
    const sold = it.status === 'sold';
    const revenue = sold ? it.salePrice ?? 0 : 0;
    const feesShip = sold ? (it.fee ?? 0) + (it.shipping ?? 0) : 0;
    const net = Math.round((revenue - feesShip - cost) * 100) / 100;
    const listDay = it.listed ? dayNum(it.listed) : null;
    const soldDay = it.sold ? dayNum(it.sold) : null;
    const cuts = it.cuts ?? [];
    const cutPcts = cuts.map((c, i) => {
      const prev = i === 0 ? it.listPrice ?? c.price : cuts[i - 1].price;
      return ((prev - c.price) / prev) * 100;
    });
    return {
      ...it,
      title: `${it.brand} ${it.model}`,
      cost, revenue, feesShip, net,
      perHour: it.hours > 0 ? net / it.hours : null,
      acqDay: dayNum(it.acquired),
      listDay, soldDay,
      daysListed: listDay === null ? null : (soldDay ?? TODAY) - listDay,
      cutPcts,
      lastPrice: it.listPrice === undefined ? null : cuts.length ? cuts[cuts.length - 1].price : it.listPrice,
    };
  });
}

export const ALL_ROWS: Row[] = buildRows(raw as Item[]);
export const ROW_BY_ID = new Map(ALL_ROWS.map((r) => [r.id, r]));

// ---------- range filter ----------
export type Range = 'all' | '12m' | '6m';
export const RANGE_LABEL: Record<Range, string> = { all: 'All time', '12m': 'Last 12 months', '6m': 'Last 6 months' };
export function inRange(rows: Row[], range: Range): Row[] {
  if (range === 'all') return rows;
  const cutoff = TODAY - (range === '12m' ? 365 : 182);
  return rows.filter((r) => r.acqDay >= cutoff);
}

// ---------- stats ----------
export function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

export interface Stat {
  key: string;
  label: string;
  n: number;
  sold: number;
  listed: number;
  retired: number;
  revenue: number;
  cost: number;
  feesShip: number;
  net: number;
  hours: number;
  perHour: number | null;
  medianDays: number | null;
  soldShare: number;
  netPerItem: number;
  shelfCost: number;
  rows: Row[];
}

export function stat(rows: Row[], key = 'all', label = 'All items'): Stat {
  const sold = rows.filter((r) => r.status === 'sold');
  const listed = rows.filter((r) => r.status === 'listed');
  const hours = sum(rows.map((r) => r.hours));
  const net = sum(rows.map((r) => r.net));
  return {
    key, label, rows,
    n: rows.length,
    sold: sold.length,
    listed: listed.length,
    retired: rows.length - sold.length - listed.length,
    revenue: sum(rows.map((r) => r.revenue)),
    cost: sum(rows.map((r) => r.cost)),
    feesShip: sum(rows.map((r) => r.feesShip)),
    net, hours,
    perHour: hours > 0 ? net / hours : null,
    medianDays: median(sold.map((r) => r.daysListed as number)),
    soldShare: rows.length ? sold.length / rows.length : 0,
    netPerItem: rows.length ? net / rows.length : 0,
    shelfCost: sum(listed.map((r) => r.cost)),
  };
}

export type GroupKey = 'category' | 'platform' | 'source' | 'brand';
export const GROUP_LABEL: Record<GroupKey, string> = { category: 'Category', platform: 'Platform', source: 'Source', brand: 'Brand' };
export const NOT_LISTED = 'Never listed';

export function groupStats(rows: Row[], by: GroupKey): Stat[] {
  const bucket = new Map<string, Row[]>();
  const push = (k: string, r: Row) => { const a = bucket.get(k); if (a) a.push(r); else bucket.set(k, [r]); };
  if (by === 'category') {
    for (const r of rows) push(r.category, r);
    return CAT_ORDER.filter((c) => bucket.has(c)).map((c) => stat(bucket.get(c)!, c, CAT_LABEL[c]));
  }
  if (by === 'platform') {
    for (const r of rows) push(r.platform ?? NOT_LISTED, r);
    const out = PLATFORMS.filter((p) => bucket.has(p)).map((p) => stat(bucket.get(p)!, p, p));
    if (bucket.has(NOT_LISTED)) out.push(stat(bucket.get(NOT_LISTED)!, NOT_LISTED, 'Never listed (kept or written off)'));
    return out;
  }
  if (by === 'source') {
    for (const r of rows) push(r.source, r);
    return SOURCES.filter((s) => bucket.has(s)).map((s) => stat(bucket.get(s)!, s, s));
  }
  // brand: the 8 most common, everything else together
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.brand, (counts.get(r.brand) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0]);
  const rest: Row[] = [];
  for (const r of rows) { if (top.includes(r.brand)) push(r.brand, r); else rest.push(r); }
  const out = top.map((b) => stat(bucket.get(b) ?? [], b, b)).filter((s) => s.n > 0);
  if (rest.length) out.push(stat(rest, 'Other', `Other brands (${new Set(rest.map((r) => r.brand)).size})`));
  return out;
}

export function groupFilter(by: GroupKey, key: string): Partial<ItemFilters> {
  if (by === 'category') return { cats: [key as Cat] };
  if (by === 'platform') return key === NOT_LISTED ? { statuses: ['kept', 'written-off'] } : { platforms: [key] };
  if (by === 'source') return { sources: [key] };
  return key === 'Other' ? {} : { q: key };
}

// ---------- models within a set of rows ----------
export interface ModelStat { key: string; title: string; n: number; sold: number; net: number; hours: number; perHour: number | null; category: Cat }
export function modelStats(rows: Row[], minItems = 3): ModelStat[] {
  const m = new Map<string, Row[]>();
  for (const r of rows) { const a = m.get(r.title); if (a) a.push(r); else m.set(r.title, [r]); }
  const out: ModelStat[] = [];
  for (const [title, rs] of m) {
    if (rs.length < minItems) continue;
    const hours = sum(rs.map((r) => r.hours));
    const net = sum(rs.map((r) => r.net));
    out.push({ key: title, title, n: rs.length, sold: rs.filter((r) => r.status === 'sold').length, net, hours, perHour: hours >= 2 ? net / hours : null, category: rs[0].category });
  }
  return out;
}

// ---------- cumulative cash for the sparkline ----------
export function cashCurve(rows: Row[]): { day: number; value: number }[] {
  const ev: { day: number; v: number }[] = [];
  for (const r of rows) {
    ev.push({ day: r.acqDay, v: -r.cost });
    if (r.status === 'sold' && r.soldDay !== null) ev.push({ day: r.soldDay, v: r.revenue - r.feesShip });
  }
  ev.sort((a, b) => a.day - b.day);
  const out: { day: number; value: number }[] = [];
  let acc = 0;
  for (const e of ev) { acc += e.v; if (out.length && out[out.length - 1].day === e.day) out[out.length - 1].value = acc; else out.push({ day: e.day, value: acc }); }
  return out;
}
/** The first day after which cumulative cash never dips below zero again. */
export function inTheBlackSince(curve: { day: number; value: number }[]): number | null {
  let since: number | null = null;
  for (const p of curve) { if (p.value >= 0) { if (since === null) since = p.day; } else since = null; }
  return since;
}

// ---------- items filtering ----------
export interface ItemFilters {
  q: string;
  cats: Cat[];
  platforms: string[];
  sources: string[];
  statuses: string[];
  preset: Preset | null;
}
export type Preset = 'stale' | 'slow' | 'loss' | 'top' | 'cut3';
export const PRESET_LABEL: Record<Preset, string> = {
  stale: 'Listed 90+ days',
  slow: 'Took 6+ months to sell',
  loss: 'Lost money',
  top: 'Top 25 by profit',
  cut3: 'Cut 3+ times',
};
export const EMPTY_FILTERS: ItemFilters = { q: '', cats: [], platforms: [], sources: [], statuses: [], preset: null };

export function applyFilters(rows: Row[], f: ItemFilters): Row[] {
  const q = f.q.trim().toLowerCase();
  let out = rows.filter((r) => {
    if (q && !(r.title.toLowerCase().includes(q) || r.id.toLowerCase() === q)) return false;
    if (f.cats.length && !f.cats.includes(r.category)) return false;
    if (f.platforms.length && !(r.platform && f.platforms.includes(r.platform))) return false;
    if (f.sources.length && !f.sources.includes(r.source)) return false;
    if (f.statuses.length && !f.statuses.includes(r.status)) return false;
    return true;
  });
  switch (f.preset) {
    case 'stale': out = out.filter((r) => r.status === 'listed' && (r.daysListed ?? 0) >= 90); break;
    case 'slow': out = out.filter((r) => r.status === 'sold' && (r.daysListed ?? 0) >= 180); break;
    case 'loss': out = out.filter((r) => r.status === 'sold' && r.net < 0); break;
    case 'top': out = [...out].filter((r) => r.status === 'sold').sort((a, b) => b.net - a.net).slice(0, 25); break;
    case 'cut3': out = out.filter((r) => (r.cuts?.length ?? 0) >= 3); break;
    default: break;
  }
  return out;
}

// ---------- price-cut analysis ----------
export interface Bucket { label: string; n: number; k: number; rate: number | null }
export interface CutAnalysis {
  baseline: Bucket;
  bySize: Bucket[];
  byNumber: Bucket[];
  anyCut: Bucket;
  reachedDay30: number;
  soldAfterDay30: number;
  stillListedAfterDay30: number;
  medianFirstCut: number | null;
  ladder: LadderRow[];
  cutItems: number;
}
export interface LadderRow { label: string; n: number; avgCuts: number | null; keptPct: number | null; medianNet: number | null; netTotal: number; shareOfNet: number; medianPerHour: number | null }

const bucket = (label: string, n: number, k: number): Bucket => ({ label, n, k, rate: n >= 1 ? (k / n) * 100 : null });

export function cutAnalysis(rows: Row[]): CutAnalysis {
  const listedRows = rows.filter((r) => r.listDay !== null);
  // Baseline: still unsold on day 16 (and observed through day 30). Did it sell by day 30, with no cut yet?
  let bn = 0, bk = 0;
  for (const r of listedRows) {
    const L = r.listDay as number;
    if (TODAY - L < 30) continue;
    const soldOff = r.soldDay !== null ? r.soldDay - L : Infinity;
    if (soldOff <= 16) continue;
    bn++; if (soldOff <= 30) bk++;
  }
  const sizeB = [bucket('Under 10%', 0, 0), bucket('10–14%', 0, 0), bucket('15–19%', 0, 0), bucket('20% or more', 0, 0)];
  const numB = [bucket('First cut', 0, 0), bucket('Second cut', 0, 0), bucket('Third or later', 0, 0)];
  let an = 0, ak = 0;
  const firstCuts: number[] = [];
  for (const r of listedRows) {
    const cuts = r.cuts ?? [];
    cuts.forEach((c, i) => {
      const cd = dayNum(c.date);
      if (TODAY - cd < 14) return; // window not fully observed yet
      const soldAfter = r.soldDay !== null ? r.soldDay - cd : Infinity;
      const hit = soldAfter <= 14 ? 1 : 0;
      const pct = r.cutPcts[i];
      const si = pct < 10 ? 0 : pct < 15 ? 1 : pct < 20 ? 2 : 3;
      sizeB[si].n++; sizeB[si].k += hit;
      const ni = Math.min(i, 2);
      numB[ni].n++; numB[ni].k += hit;
      an++; ak += hit;
    });
    if (r.cutPcts.length) firstCuts.push(r.cutPcts[0]);
  }
  const fin = (b: Bucket) => bucket(b.label, b.n, b.k);

  // Waiting ladder over sold items
  const soldRows = rows.filter((r) => r.status === 'sold');
  const totalNet = sum(soldRows.map((r) => r.net));
  const defs: [string, number, number][] = [['Within 30 days', 0, 30], ['31–60 days', 31, 60], ['61–120 days', 61, 120], ['121–180 days', 121, 180], ['Over 180 days', 181, 9999]];
  const ladder: LadderRow[] = defs.map(([label, lo, hi]) => {
    const g = soldRows.filter((r) => (r.daysListed as number) >= lo && (r.daysListed as number) <= hi);
    const kept = g.filter((r) => r.listPrice).map((r) => ((r.salePrice as number) / (r.listPrice as number)) * 100);
    const ph = g.filter((r) => r.perHour !== null).map((r) => r.perHour as number);
    return {
      label, n: g.length,
      avgCuts: g.length ? sum(g.map((r) => r.cuts?.length ?? 0)) / g.length : null,
      keptPct: median(kept),
      medianNet: median(g.map((r) => r.net)),
      netTotal: sum(g.map((r) => r.net)),
      shareOfNet: totalNet !== 0 ? (sum(g.map((r) => r.net)) / totalNet) * 100 : 0,
      medianPerHour: median(ph),
    };
  });

  const reached = listedRows.filter((r) => (r.daysListed as number) >= 30);
  return {
    baseline: bucket('No cut yet (days 16–30)', bn, bk),
    bySize: sizeB.map(fin),
    byNumber: numB.map(fin),
    anyCut: bucket('After any cut', an, ak),
    reachedDay30: reached.length,
    soldAfterDay30: reached.filter((r) => r.status === 'sold').length,
    stillListedAfterDay30: reached.filter((r) => r.status === 'listed').length,
    medianFirstCut: median(firstCuts),
    ladder,
    cutItems: listedRows.filter((r) => (r.cuts?.length ?? 0) > 0).length,
  };
}
