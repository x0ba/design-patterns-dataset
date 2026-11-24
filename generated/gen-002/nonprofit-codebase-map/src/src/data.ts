import raw from './data/codebase.json';

export type ServiceId = 'dispatch' | 'sms' | 'donor';
export interface Service { id: ServiceId; name: string; lang: string; blurb: string }
export interface Mod {
  i: number; path: string; name: string; dir: string; service: ServiceId; pkg: string; area: string;
  lines: number; cov: number; mod: string; by: string; x: number; y: number; r: number;
  out: number[]; inn: number[];
}
export interface Edge { s: number; t: number; w: number; http: boolean }
export interface Issue { n: number; title: string; opened: string; path: string; labels: string[]; note?: string; module: number }
export interface Person { name: string; full: string; active: boolean; end: string; joined: string; role: string }
export interface Pkg { key: string; service: ServiceId; label: string; count: number; anchor: [number, number] }

export const TODAY = new Date(raw.repo.today + 'T12:00:00Z');
export const repo = raw.repo;
export const services = raw.services as Service[];
export const serviceById = Object.fromEntries(services.map((s) => [s.id, s])) as Record<ServiceId, Service>;
export const packages = raw.packages as Pkg[];
export const people = raw.people as Person[];
export const personByName = Object.fromEntries(people.map((p) => [p.name, p])) as Record<string, Person>;

export const radiusFor = (lines: number) => 3.2 + 0.28 * Math.sqrt(lines);

export const mods: Mod[] = raw.modules.map((m) => {
  const parts = m.p.split('/');
  const name = parts[parts.length - 1];
  return {
    i: m.i, path: m.p, name, dir: parts.slice(0, -1).join('/'), service: m.s as ServiceId, pkg: m.k,
    area: m.k, lines: m.l, cov: m.c, mod: m.d, by: m.b, x: m.x, y: m.y, r: radiusFor(m.l), out: [], inn: [],
  };
});
export const edges: Edge[] = raw.edges.map(([s, t, w, h]) => ({ s, t, w, http: h === 1 }));
const edgeIndex = new Map<string, Edge>();
for (const e of edges) { mods[e.s].out.push(e.t); mods[e.t].inn.push(e.s); edgeIndex.set(e.s + '>' + e.t, e); }
export const edgeBetween = (s: number, t: number) => edgeIndex.get(s + '>' + t);
export const issues = (raw.issues as Issue[]).slice().sort((a, b) => b.n - a.n);
export const issueByModule = new Map<number, Issue[]>();
for (const is of issues) issueByModule.set(is.module, [...(issueByModule.get(is.module) ?? []), is]);

export const byPath = new Map(mods.map((m) => [m.path, m]));
export const mod = (p: string) => { const m = byPath.get(p); if (!m) throw new Error(p); return m; };

// ---- people helpers
export const modsBy = (name: string) => mods.filter((m) => m.by === name);
export const lastActivity = (name: string) => {
  const ds = modsBy(name).map((m) => m.mod).sort();
  return ds.length ? ds[ds.length - 1] : null;
};

// ---- dates
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const parseDate = (d: string) => new Date(d + 'T12:00:00Z');
export const fmtDate = (d: string) => { const x = parseDate(d); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`; };
export const fmtMonth = (d: string) => { const x = parseDate(d); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
export const fmtShort = (d: string) => { const x = parseDate(d); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}`; };
export const daysAgo = (d: string) => Math.round((TODAY.getTime() - parseDate(d).getTime()) / 86400000);
export const ago = (d: string) => {
  const n = daysAgo(d);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  if (n < 31) return `${n} days ago`;
  const months = Math.round(n / 30.44);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const y = Math.floor(months / 12), r = months % 12;
  return r === 0 ? `${y} year${y === 1 ? '' : 's'} ago` : r >= 6 && y === 1 ? `${months} months ago` : `${months} months ago`;
};
export const fmtNum = (n: number) => n.toLocaleString('en-US');

// ---- graph helpers
export interface Trail { ids: number[]; edges: { s: number; t: number; forward: boolean }[]; forward: boolean }
/** Shortest path that follows "calls/imports" direction; falls back to ignoring direction. */
export function findTrail(a: number, b: number): Trail | null {
  if (a === b) return null;
  const run = (directed: boolean) => {
    const prev = new Map<number, number>([[a, -1]]);
    const q = [a];
    while (q.length) {
      const u = q.shift()!;
      if (u === b) break;
      const nb = directed ? mods[u].out : [...mods[u].out, ...mods[u].inn];
      for (const v of nb) if (!prev.has(v)) { prev.set(v, u); q.push(v); }
    }
    if (!prev.has(b)) return null;
    const ids: number[] = [];
    for (let c = b; c !== -1; c = prev.get(c)!) ids.unshift(c);
    return ids;
  };
  const fwd = run(true);
  const ids = fwd ?? run(false);
  if (!ids) return null;
  const es = ids.slice(1).map((t, k) => {
    const s = ids[k];
    const forward = !!edgeBetween(s, t);
    return { s: forward ? s : t, t: forward ? t : s, forward };
  });
  return { ids, edges: es, forward: !!fwd };
}

/** Modules that would feel a change in `id`: reverse reachability (callers), by hop distance. */
export function dependents(id: number, maxDepth: number): Map<number, number> {
  const seen = new Map<number, number>([[id, 0]]);
  const q = [id];
  while (q.length) {
    const u = q.shift()!;
    const d = seen.get(u)!;
    if (d >= maxDepth) continue;
    for (const v of mods[u].inn) if (!seen.has(v)) { seen.set(v, d + 1); q.push(v); }
  }
  seen.delete(id);
  return seen;
}
/** Undirected hop distance (for "how near is this issue"). */
export function hopsFrom(id: number, maxDepth = 3): Map<number, number> {
  const seen = new Map<number, number>([[id, 0]]);
  const q = [id];
  while (q.length) {
    const u = q.shift()!;
    const d = seen.get(u)!;
    if (d >= maxDepth) continue;
    for (const v of [...mods[u].out, ...mods[u].inn]) if (!seen.has(v)) { seen.set(v, d + 1); q.push(v); }
  }
  return seen;
}

export const sizeRank = (m: Mod) => {
  const bigger = mods.filter((o) => o.lines > m.lines).length;
  return (bigger + 1) / mods.length; // top x%
};
export const serviceAvgCov = (s: ServiceId) => {
  const ms = mods.filter((m) => m.service === s);
  return Math.round(ms.reduce((a, m) => a + m.cov, 0) / ms.length);
};

// ---- lenses
export type Lens = 'coverage' | 'fresh' | 'person' | 'service';
export interface Bucket { key: string; label: string; color: string; test: (m: Mod) => boolean }

const COV_STOPS: [number, [number, number, number]][] = [
  [0, [184, 64, 44]], [50, [232, 216, 174]], [100, [30, 106, 134]],
];
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
export function covColor(c: number): string {
  const v = Math.max(0, Math.min(100, c));
  for (let i = 0; i < COV_STOPS.length - 1; i++) {
    const [x0, c0] = COV_STOPS[i], [x1, c1] = COV_STOPS[i + 1];
    if (v <= x1) { const t = (v - x0) / (x1 - x0); return `rgb(${lerp(c0[0], c1[0], t)},${lerp(c0[1], c1[1], t)},${lerp(c0[2], c1[2], t)})`; }
  }
  return 'rgb(30,106,134)';
}
export const SERVICE_COLOR: Record<ServiceId, string> = { dispatch: '#3F6E8C', sms: '#6C8A3B', donor: '#B0683F' };
export const PERSON_COLOR: Record<string, string> = {
  'Ruth A.': '#0072B2', 'Marco D.': '#D55E00', 'Joanna B.': '#009E73', 'Tomás R.': '#CC79A7', 'Kenji M.': '#E69F00', 'Wen L.': '#56B4E9',
};
export const FORMER_COLOR = '#A89F92';
export const personColor = (name: string) => PERSON_COLOR[name] ?? FORMER_COLOR;

const covB = (lo: number, hi: number, label: string, mid: number): Bucket => ({ key: `c${lo}`, label, color: covColor(mid), test: (m) => m.cov >= lo && m.cov <= hi });
const FRESH = ['#3B1F73', '#6A4BA8', '#9C86CC', '#C6B8E2', '#DCCBA3'];
export const BUCKETS: Record<Lens, Bucket[]> = {
  coverage: [covB(0, 19, 'Under 20%', 8), covB(20, 39, '20–39%', 30), covB(40, 59, '40–59%', 55), covB(60, 79, '60–79%', 72), covB(80, 100, '80%+', 92)],
  fresh: [
    { key: 'f30', label: 'This month', color: FRESH[0], test: (m) => daysAgo(m.mod) <= 30 },
    { key: 'f90', label: '1–3 months', color: FRESH[1], test: (m) => daysAgo(m.mod) > 30 && daysAgo(m.mod) <= 90 },
    { key: 'f180', label: '3–6 months', color: FRESH[2], test: (m) => daysAgo(m.mod) > 90 && daysAgo(m.mod) <= 180 },
    { key: 'f365', label: '6–12 months', color: FRESH[3], test: (m) => daysAgo(m.mod) > 180 && daysAgo(m.mod) <= 365 },
    { key: 'f999', label: 'Over a year', color: FRESH[4], test: (m) => daysAgo(m.mod) > 365 },
  ],
  person: [
    ...people.filter((p) => p.active && p.name !== 'Wen L.').map((p) => ({ key: p.name, label: p.name, color: personColor(p.name), test: (m: Mod) => m.by === p.name })),
    { key: 'former', label: 'Former', color: FORMER_COLOR, test: (m: Mod) => !personByName[m.by].active },
  ],
  service: services.map((s) => ({ key: s.id, label: s.name, color: SERVICE_COLOR[s.id], test: (m: Mod) => m.service === s.id })),
};
export function nodeColor(m: Mod, lens: Lens): string {
  if (lens === 'coverage') return covColor(m.cov);
  if (lens === 'service') return SERVICE_COLOR[m.service];
  if (lens === 'person') return personColor(m.by);
  const b = BUCKETS.fresh.find((x) => x.test(m));
  return b ? b.color : FRESH[4];
}
