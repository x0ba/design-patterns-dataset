import { BUNDLED, type Recipe } from './data';

export type Extras = Record<string, boolean>; // pandas, scipy, ffmpeg, R

export type RunStatus =
  | { kind: 'ready'; label: string; detail: string }
  | { kind: 'install'; label: string; detail: string; missing: string[] }
  | { kind: 'browser'; label: string; detail: string }
  | { kind: 'other'; label: string; detail: string };

const PY_MAP: Record<string, string> = { pandas: 'pandas', SciPy: 'scipy', ffmpeg: 'ffmpeg' };

export function hasReq(req: string, extras: Extras): boolean | null {
  if (req === 'Python' || req === 'matplotlib') return true;
  if (BUNDLED.includes(req)) return true;
  if (PY_MAP[req]) return !!extras[PY_MAP[req]];
  if (['R', 'ggplot2', 'tidyverse', 'ggridges'].includes(req)) return !!extras.R;
  if (req.includes('in browser')) return true;
  if (['JavaScript', 'JSON'].includes(req)) return null; // not an install, a language
  return false;
}

export function runStatus(r: Recipe, extras: Extras): RunStatus {
  if (r.tool === 'matplotlib') {
    const missing = r.requires.filter((q) => hasReq(q, extras) === false);
    if (missing.length === 0)
      return { kind: 'ready', label: 'Runs with your Python + matplotlib', detail: 'Nothing else to install.' };
    return {
      kind: 'install',
      label: `Also needs ${joinList(missing)}`,
      detail: `Python, but ${joinList(missing)} ${missing.length > 1 ? 'are' : 'is'} not in your setup.`,
      missing,
    };
  }
  if (r.tool === 'ggplot2') {
    if (extras.R) return { kind: 'ready', label: 'Runs with your R setup', detail: 'You marked R + ggplot2 as installed.' };
    const extra = r.requires.filter((q) => !['R', 'ggplot2'].includes(q));
    return {
      kind: 'other',
      label: 'Needs R + ggplot2',
      detail: `Written in R${extra.length ? `, plus ${joinList(extra)}` : ''}. Not in your setup.`,
    };
  }
  if (r.tool === 'D3') return { kind: 'other', label: 'Needs JavaScript + a local web server', detail: 'Written in JavaScript for web pages.' };
  return {
    kind: 'browser',
    label: `No install — runs in a browser editor`,
    detail: r.tool === 'Vega-Lite' ? 'Written as a JSON spec, not Python.' : 'Written in JavaScript, not Python.',
  };
}

export function joinList(xs: string[]) {
  if (xs.length <= 1) return xs.join('');
  return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
}

export function fitScore(r: Recipe, focus: 'winter' | 'year') {
  if (!r.match) return 0;
  let s = r.match.base;
  if (focus === 'winter') {
    if (r.match.winter === 'built-in') s += 4;
    if (r.match.winter === 'needs rework') s -= 10;
  } else {
    if (r.match.winter === 'built-in') s -= 6;
    if (r.match.winter === 'one setting') s += 6;
  }
  return Math.max(0, Math.min(100, s));
}

export function fitLabel(score: number) {
  if (score >= 85) return { label: 'Strong fit', tone: 'strong' };
  if (score >= 70) return { label: 'Good fit', tone: 'good' };
  return { label: 'Partial fit', tone: 'partial' };
}

export const DIFFICULTY = ['', 'Beginner', 'Comfortable', 'Stretch', 'Advanced'];

export function totalMinutes(r: Recipe) {
  return r.steps.reduce((a, s) => a + s.mins, 0);
}
export function fmtMinutes(m: number) {
  if (m < 60) return `about ${m} min`;
  const h = m / 60;
  return `about ${h % 1 === 0 ? h : h.toFixed(1)} hr`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso: string) {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/* -------------------------------------------------------------- search */

const STOP = new Set(
  'a an the of for in on to and or but with my me i how show way one only many years from by at as is it into over per'.split(' '),
);
const SYN: Record<string, string[]> = {
  picture: ['chart', 'image', 'heatmap', 'grid'],
  image: ['chart', 'picture'],
  temps: ['temperature'],
  temp: ['temperature'],
  temperatures: ['temperature'],
  winters: ['winter'],
  stripe: ['stripes'],
  snowfall: ['snow'],
  century: ['decade', 'decades', 'multi-decade'],
  decades: ['decade'],
  cold: ['coldest', 'lows', 'below'],
  change: ['changed', 'warming', 'anomaly'],
  changed: ['change', 'warming', 'anomaly'],
  daily: ['day', 'every day'],
  rain: ['rainfall', 'precipitation'],
};

export function tokenize(q: string) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9°\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

export function searchScore(r: Recipe, q: string) {
  const toks = tokenize(q);
  if (!toks.length) return 0;
  const title = r.title.toLowerCase();
  const kw = (r.keywords + ' ' + r.shapes.join(' ') + ' ' + r.tool).toLowerCase();
  const sum = r.summary.toLowerCase();
  let score = 0;
  let hits = 0;
  for (const t of toks) {
    const variants = [t, ...(SYN[t] ?? [])];
    let best = 0;
    for (const v of variants) {
      const w = v === t ? 1 : 0.6;
      if (title.includes(v)) best = Math.max(best, 3 * w);
      else if (kw.includes(v)) best = Math.max(best, 2 * w);
      else if (sum.includes(v)) best = Math.max(best, 1 * w);
    }
    if (best > 0) hits++;
    score += best;
  }
  if (hits === 0) return 0;
  // Require most of the query to be covered for longer queries.
  const coverage = hits / toks.length;
  if (toks.length >= 3 && coverage < 0.4) return 0;
  return score * (0.5 + coverage) + Math.log10(r.remakes + 1) * 0.3;
}

/* ---------------------------------------------------------- download */

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function codeFilename(r: Recipe) {
  const ext = r.tool === 'matplotlib' ? 'py' : r.tool === 'ggplot2' ? 'R' : r.tool === 'Vega-Lite' ? 'json' : 'js';
  return `${r.id}.${ext}`;
}
