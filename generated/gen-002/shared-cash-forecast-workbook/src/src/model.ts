import {
  FLOOR, LINES, OPENING, V11, V11_OPENING, WEEKS, lineById, type Edit, type EntityId, type Grid, type Line,
} from './data';

export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

export function weekFlows(values: Grid, lines: Line[] = LINES) {
  return WEEKS.map((_, w) => sum(lines.map((l) => values[l.id][w])));
}

export function balances(values: Grid) {
  const flows = weekFlows(values);
  const begin: number[] = [];
  const end: number[] = [];
  let b = OPENING;
  flows.forEach((f, w) => {
    begin[w] = b;
    b += f;
    end[w] = b;
  });
  return { flows, begin, end };
}

export function v11Balances() {
  const end: (number | null)[] = [];
  let b = V11_OPENING;
  WEEKS.forEach((_, w) => {
    const vals = LINES.map((l) => V11[l.id][w]);
    if (vals.some((v) => v === null)) {
      end[w] = null;
      return;
    }
    b += sum(vals as number[]);
    end[w] = b;
  });
  return end;
}
export const V11_END = v11Balances();

export function linesFor(entity: 'all' | EntityId) {
  return entity === 'all' ? LINES : LINES.filter((l) => l.entity === entity);
}

export const delta = (e: Edit) => e.new - e.old;

export interface BridgeItem {
  key: string;
  by: string;
  lineId: string;
  weeks: number[];
  delta: number;
  edits: Edit[];
  missingNote: boolean;
}

/** What moved the ending balance for week `w` vs v11, grouped by editor + line. */
export function bridge(edits: Edit[], w: number) {
  const map = new Map<string, BridgeItem>();
  for (const e of edits) {
    if (e.week > w) continue;
    const key = e.by + '|' + e.lineId;
    let it = map.get(key);
    if (!it) {
      it = { key, by: e.by, lineId: e.lineId, weeks: [], delta: 0, edits: [], missingNote: false };
      map.set(key, it);
    }
    it.delta += delta(e);
    it.edits.push(e);
    if (!it.weeks.includes(e.week)) it.weeks.push(e.week);
    if (!e.note && Math.abs(delta(e)) >= 500) it.missingNote = true;
  }
  const all = [...map.values()];
  const moving = all.filter((i) => i.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const netZero = all.filter((i) => i.delta === 0);
  return { moving, netZero, opening: OPENING - V11_OPENING };
}

export function unexplained(edits: Edit[]) {
  return edits.filter((e) => !e.note && Math.abs(delta(e)) >= 500);
}

export function breachWeeks(end: number[]) {
  return end.map((v, w) => (v < FLOOR ? w : -1)).filter((w) => w >= 0);
}

// ---------- formatting ----------
const nf = new Intl.NumberFormat('en-US');
/** $000s grid style: (18,400) for negatives, – for zero */
export function fmtK(v: number) {
  if (v === 0) return '–';
  return v < 0 ? `(${nf.format(-v)})` : nf.format(v);
}
export function fmtDeltaK(v: number) {
  if (v === 0) return '–';
  return (v > 0 ? '+' : '−') + nf.format(Math.abs(v));
}
/** $M with one decimal from $000s */
export function fmtM(v: number, signed = false) {
  const m = Math.abs(v) / 1000;
  const s = `$${m.toFixed(1)}M`;
  if (signed) return (v > 0 ? '+' : v < 0 ? '−' : '') + s;
  return v < 0 ? '−' + s : s;
}
export function fmtMoneyK(v: number, signed = false) {
  // $4,200K → "$4.2M", $640K → "$640K"
  if (Math.abs(v) >= 1000) return fmtM(v, signed);
  const s = `$${nf.format(Math.abs(v))}K`;
  if (signed) return (v > 0 ? '+' : v < 0 ? '−' : '') + s;
  return v < 0 ? '−' + s : s;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const fmtDate = (d: Date) => `${MON[d.getMonth()]} ${d.getDate()}`;
export function fmtTime(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
/** relative to the simulated "now" (Wed Nov 18) */
export function fmtWhen(d: Date, now: Date) {
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Today ${fmtTime(d)}`;
  const diffDays = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 864e5);
  if (diffDays === 1) return `Yesterday ${fmtTime(d)}`;
  if (diffDays < 7) return `${DAY[d.getDay()]} ${fmtTime(d)}`;
  return `${DAY[d.getDay()]} ${fmtDate(d)}, ${fmtTime(d)}`;
}
export const fmtDay = (d: Date) => `${DAY[d.getDay()]} ${fmtDate(d)}`;

export function weekRange(ws: number[]) {
  const s = [...ws].sort((a, b) => a - b);
  if (s.length === 1) return `wk ${s[0] + 1}`;
  const contiguous = s.every((w, i) => i === 0 || w === s[i - 1] + 1);
  return contiguous ? `wks ${s[0] + 1}–${s[s.length - 1] + 1}` : 'wks ' + s.map((w) => w + 1).join(', ');
}
export const weekLabel = (w: number) => {
  const st = WEEKS[w];
  const en = new Date(st.getTime() + 6 * 864e5);
  return `Wk ${w + 1} · ${fmtDate(st)}–${st.getMonth() === en.getMonth() ? en.getDate() : fmtDate(en)}`;
};
export const lineLabel = (id: string) => {
  const l = lineById[id];
  return l.name;
};
