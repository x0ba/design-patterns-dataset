import { useState } from 'react';
import type { Month, Series } from '../data/bike';

export function niceTicks(max: number, count = 5, min = 0): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => span / s <= count) || mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

export const fmtK = (v: number) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(Math.round(v)));
const fmtN = (v: number) => v.toLocaleString('en-US');

export function sliceYears(series: Series[], months: Month[], from: number, to: number) {
  const idx = months.map((m, i) => (m.y >= from && m.y <= to ? i : -1)).filter((i) => i >= 0);
  return {
    months: idx.map((i) => months[i]),
    series: series.map((s) => ({ ...s, values: idx.map((i) => s.values[i]), imputed: s.imputed ? idx.map((i) => s.imputed![i]) : undefined })),
  };
}

export function indexSeries(series: Series[], months: Month[]): Series[] {
  return series.map((s) => {
    const baseVals = s.values.filter((v, i) => v !== null && months[i].y === months[0].y) as number[];
    const firstVals = baseVals.length ? baseVals : (s.values.filter((v) => v !== null).slice(0, 12) as number[]);
    const base = firstVals.reduce((a, b) => a + b, 0) / Math.max(1, firstVals.length);
    return { ...s, values: s.values.map((v) => (v === null ? null : Math.round((v / base) * 1000) / 10)) };
  });
}

function segments(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  const segs: string[] = [];
  let cur = '';
  values.forEach((v, i) => {
    if (v === null) {
      if (cur) segs.push(cur);
      cur = '';
    } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (cur) segs.push(cur);
  return segs;
}

function gapRanges(series: Series[]) {
  // contiguous null runs that are bracketed by data (i.e. outages, not "not yet installed")
  const out: { id: string; label: string; a: number; b: number }[] = [];
  series.forEach((s) => {
    const first = s.values.findIndex((v) => v !== null);
    let start = -1;
    s.values.forEach((v, i) => {
      if (i < first) return;
      if (v === null && start < 0) start = i;
      if (v !== null && start >= 0) {
        out.push({ id: s.id, label: s.label, a: start, b: i - 1 });
        start = -1;
      }
    });
  });
  return out;
}

interface LineProps {
  series: Series[];
  months: Month[];
  width: number;
  height: number;
  markGap?: boolean;
  yMax?: number;
  indexed?: boolean;
  compact?: boolean;
  directLabels?: boolean;
  title?: string;
}

export function LineChart({ series, months, width, height, markGap, yMax, indexed, compact, directLabels = true, title }: LineProps) {
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: compact ? 34 : 50, r: directLabels ? (compact ? 8 : 104) : 12, t: title ? 26 : 12, b: compact ? 20 : 28 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const minV = indexed ? Math.min(40, ...all) : 0;
  const max = yMax ?? Math.max(1, ...all) * 1.05;
  const ticks = niceTicks(max, compact ? 3 : 5, indexed ? Math.floor(minV / 20) * 20 : 0);
  const y0 = ticks[0];
  const top = Math.max(max, ticks[ticks.length - 1]);
  const n = months.length;
  const x = (i: number) => m.l + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const y = (v: number) => m.t + ih - ((v - y0) / (top - y0)) * ih;
  const gaps = gapRanges(series);
  const yearTicks = months.map((mo, i) => (mo.m === 0 ? i : -1)).filter((i) => i >= 0);

  // label placement: last non-null value, nudged apart
  const labels = series
    .map((s) => {
      let i = s.values.length - 1;
      while (i >= 0 && s.values[i] === null) i--;
      return { s, y: i >= 0 ? y(s.values[i] as number) : m.t };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;
  const maxLabelY = m.t + ih;
  for (let i = labels.length - 1; i >= 0; i--) {
    if (labels[i].y > maxLabelY) labels[i].y = maxLabelY;
    if (i > 0 && labels[i - 1].y > labels[i].y - 13) labels[i - 1].y = labels[i].y - 13;
  }

  return (
    <svg width={width} height={height} className="chart" role="img" aria-label={title || 'line chart'}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const px = e.clientX - r.left;
        if (px < m.l || px > m.l + iw) return setHover(null);
        setHover(Math.round(((px - m.l) / iw) * (n - 1)));
      }}>
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#b9b2a4" strokeWidth="2" />
        </pattern>
      </defs>
      {title && <text x={m.l} y={14} className="chart-title">{title}</text>}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} className={t === y0 && !indexed ? 'axis-base' : 'grid'} />
          <text x={m.l - 6} y={y(t) + 3.5} className="tick" textAnchor="end">{indexed ? t : fmtK(t)}</text>
        </g>
      ))}
      {indexed && <line x1={m.l} x2={m.l + iw} y1={y(100)} y2={y(100)} className="ref-line" />}
      {yearTicks.map((i) => (
        <g key={i}>
          <line x1={x(i)} x2={x(i)} y1={m.t + ih} y2={m.t + ih + 4} className="axis-base" />
          <text x={x(i) + 2} y={m.t + ih + (compact ? 13 : 16)} className="tick">{compact ? `’${String(months[i].y).slice(2)}` : months[i].y}</text>
        </g>
      ))}
      {markGap && gaps.map((g) => (
        <g key={g.id + g.a}>
          <rect x={x(g.a - 1)} y={m.t} width={Math.max(4, x(g.b + 1) - x(g.a - 1))} height={ih} fill="url(#hatch)" opacity={0.7} />
          {!compact && <text x={x(g.b + 1) + 4} y={m.t + 10} className="annot">{g.label} offline {months[g.a].label.slice(0, 3)}–{months[g.b].label}</text>}
          {compact && <text x={x(g.b + 1) + 3} y={m.t + 9} className="annot small">offline</text>}
        </g>
      ))}
      {series.map((s) =>
        segments(s.values, x, y).map((d, k) => <path key={s.id + k} d={d} fill="none" stroke={s.color} strokeWidth={compact ? 1.4 : 1.7} strokeLinejoin="round" />),
      )}
      {directLabels && !compact && labels.map(({ s, y: ly }) => (
        <text key={s.id} x={m.l + iw + 6} y={ly + 3.5} className="dlabel" fill={s.color}>{s.label}</text>
      ))}
      {hover !== null && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} className="crosshair" />
          {series.map((s) => (s.values[hover] !== null ? <circle key={s.id} cx={x(hover)} cy={y(s.values[hover] as number)} r={3} fill={s.color} stroke="#fff" /> : null))}
          <Tip x={x(hover)} y={m.t} bound={width} rows={[months[hover].label, ...series.map((s) => `${s.label}: ${s.values[hover] === null ? 'no data' : indexed ? s.values[hover] : fmtN(s.values[hover] as number)}`)]} />
        </g>
      )}
    </svg>
  );
}

function Tip({ x, y, rows, bound }: { x: number; y: number; rows: string[]; bound: number }) {
  const w = Math.max(...rows.map((r) => r.length)) * 6.3 + 16;
  const h = rows.length * 15 + 8;
  const left = x + 10 + w > bound ? x - 10 - w : x + 10;
  return (
    <g transform={`translate(${left},${y})`}>
      <rect width={w} height={h} rx={4} className="tip-bg" />
      {rows.map((r, i) => (
        <text key={i} x={8} y={16 + i * 15} className={i === 0 ? 'tip-head' : 'tip-row'}>{r}</text>
      ))}
    </g>
  );
}

export function SmallMultiples({ series, months, width, height, sharedY, markGap, indexed }: { series: Series[]; months: Month[]; width: number; height: number; sharedY: boolean; markGap?: boolean; indexed?: boolean }) {
  const cols = series.length <= 4 ? 2 : 3;
  const rows = Math.ceil(series.length / cols);
  const pw = Math.floor(width / cols);
  const ph = Math.floor(height / rows);
  const globalMax = Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null))) * 1.05;
  return (
    <div className="multiples" style={{ width, gridTemplateColumns: `repeat(${cols}, ${pw}px)` }}>
      {series.map((s) => (
        <div key={s.id} className="multiple">
          <div className="multiple-label" style={{ color: s.color }}>{s.label}</div>
          <LineChart series={[s]} months={months} width={pw - 8} height={ph - 22} yMax={sharedY ? globalMax : undefined} compact directLabels={false} markGap={markGap} indexed={indexed} />
        </div>
      ))}
    </div>
  );
}

export function Heatmap({ series, months, width, markGap }: { series: Series[]; months: Month[]; width: number; markGap?: boolean }) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const m = { l: 110, r: 12, t: 10, b: 54 };
  const cw = (width - m.l - m.r) / months.length;
  const ch = 34;
  const h = m.t + series.length * ch + m.b;
  const max = Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const color = (v: number) => {
    const t = Math.sqrt(v / max);
    const a = [244, 239, 226];
    const b = [22, 74, 92];
    return `rgb(${a.map((av, i) => Math.round(av + (b[i] - av) * t)).join(',')})`;
  };
  return (
    <svg width={width} height={h} className="chart" onMouseLeave={() => setHover(null)}>
      <defs>
        <pattern id="hatch2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#fff" />
          <line x1="0" y1="0" x2="0" y2="5" stroke={markGap ? '#c0612b' : '#c9c2b4'} strokeWidth="1.6" />
        </pattern>
      </defs>
      {series.map((s, r) => (
        <g key={s.id}>
          <text x={m.l - 8} y={m.t + r * ch + ch / 2 + 4} textAnchor="end" className="dlabel" fill="#33302a">{s.label}</text>
          {s.values.map((v, c) => (
            <rect key={c} x={m.l + c * cw} y={m.t + r * ch} width={cw + 0.4} height={ch - 3} fill={v === null ? 'url(#hatch2)' : color(v)}
              onMouseEnter={() => setHover({ r, c })} />
          ))}
        </g>
      ))}
      {months.map((mo, i) => (mo.m === 0 ? (
        <g key={i}>
          <line x1={m.l + i * cw} x2={m.l + i * cw} y1={m.t + series.length * ch - 2} y2={m.t + series.length * ch + 4} className="axis-base" />
          <text x={m.l + i * cw + 2} y={m.t + series.length * ch + 16} className="tick">{mo.y}</text>
        </g>
      ) : null))}
      {/* legend */}
      <g transform={`translate(${m.l},${h - 20})`}>
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={i * 26} y={0} width={26} height={8} fill={color((max * (i + 0.5)) / 6)} />
        ))}
        <text x={0} y={18} className="tick">0</text>
        <text x={156} y={18} className="tick" textAnchor="end">{fmtK(max)} / month</text>
        <rect x={180} y={0} width={14} height={8} fill="url(#hatch2)" stroke="#c9c2b4" strokeWidth={0.5} />
        <text x={198} y={8} className="tick">{markGap ? 'counter offline (no data)' : 'no data'}</text>
      </g>
      {hover && (
        <g pointerEvents="none">
          <rect x={m.l + hover.c * cw} y={m.t + hover.r * ch} width={cw} height={ch - 3} fill="none" stroke="#111" strokeWidth={1.5} />
          <Tip x={m.l + hover.c * cw} y={m.t + hover.r * ch + ch} bound={width}
            rows={[`${series[hover.r].label} · ${months[hover.c].label}`, series[hover.r].values[hover.c] === null ? 'no data (offline)' : `${fmtN(series[hover.r].values[hover.c] as number)} bikes`]} />
        </g>
      )}
    </svg>
  );
}

export function StackedArea({ series, months, width, height, colors, title }: { series: Series[]; months: Month[]; width: number; height: number; colors?: string[]; title?: string }) {
  const m = { l: 50, r: 120, t: title ? 26 : 12, b: 28 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const n = months.length;
  const totals = months.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  const ticks = niceTicks(Math.max(...totals) * 1.05, 5);
  const top = ticks[ticks.length - 1];
  const x = (i: number) => m.l + (i / (n - 1)) * iw;
  const y = (v: number) => m.t + ih - (v / top) * ih;
  const cum = months.map(() => 0);
  const layers = series.map((s, k) => {
    const lower = [...cum];
    s.values.forEach((v, i) => (cum[i] += v ?? 0));
    const upper = [...cum];
    const d = `M${upper.map((v, i) => `${x(i)},${y(v)}`).join('L')}L${lower.map((v, i) => `${x(i)},${y(v)}`).reverse().join('L')}Z`;
    const mid = (upper[n - 1] + lower[n - 1]) / 2;
    return { d, color: colors?.[k] ?? s.color, label: s.label, mid };
  });
  return (
    <svg width={width} height={height} className="chart">
      {title && <text x={m.l} y={14} className="chart-title">{title}</text>}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} className="grid" />
          <text x={m.l - 6} y={y(t) + 3.5} className="tick" textAnchor="end">{fmtK(t)}</text>
        </g>
      ))}
      {layers.map((l) => <path key={l.label} d={l.d} fill={l.color} opacity={0.92} stroke="#fff" strokeWidth={0.4} />)}
      {months.map((mo, i) => (mo.m === 0 ? <text key={i} x={x(i) + 2} y={m.t + ih + 16} className="tick">{mo.y}</text> : null))}
      {layers.map((l) => <text key={l.label} x={m.l + iw + 6} y={y(l.mid) + 4} className="dlabel" fill="#333">{l.label}</text>)}
    </svg>
  );
}

export function TruncatedBars({ series, months, width, height, baseline, title }: { series: Series[]; months: Month[]; width: number; height: number; baseline: number; title?: string }) {
  const years = Array.from(new Set(months.map((mo) => mo.y)));
  const totals = series.map((s) => years.map((yr) => s.values.reduce<number>((a, v, i) => (months[i].y === yr ? a + (v ?? 0) : a), 0) / 1000));
  const m = { l: 46, r: 12, t: title ? 26 : 12, b: 48 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const max = Math.max(...totals.flat()) * 1.05;
  const ticks = [baseline, ...niceTicks(max, 5, baseline).filter((t) => t > baseline)];
  const top = ticks[ticks.length - 1];
  const gw = iw / years.length;
  const bw = (gw - 12) / series.length;
  const y = (v: number) => m.t + ih - ((Math.max(v, baseline) - baseline) / (top - baseline)) * ih;
  const palette = ['#d7263d', '#f46036', '#2e294e', '#1b998b'];
  return (
    <svg width={width} height={height} className="chart">
      {title && <text x={m.l} y={14} className="chart-title">{title}</text>}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} className="grid" />
          <text x={m.l - 6} y={y(t) + 3.5} className="tick" textAnchor="end">{t}k</text>
        </g>
      ))}
      {years.map((yr, gi) => (
        <g key={yr}>
          {series.map((s, si) => (
            <rect key={s.id} x={m.l + gi * gw + 6 + si * bw} y={y(totals[si][gi])} width={bw - 1} height={m.t + ih - y(totals[si][gi])} fill={palette[si % 4]} />
          ))}
          <text x={m.l + gi * gw + gw / 2} y={m.t + ih + 15} className="tick" textAnchor="middle">{yr}{yr === 2025 ? '*' : ''}</text>
        </g>
      ))}
      <g transform={`translate(${m.l},${height - 14})`}>
        {series.map((s, i) => (
          <g key={s.id} transform={`translate(${i * 128},0)`}>
            <rect width={10} height={10} y={-9} fill={palette[i % 4]} />
            <text x={14} y={0} className="tick">{s.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Tiny sparkline for list rows */
export function Spark({ values, color = '#1f6f6a', width = 120, height = 28 }: { values: (number | null)[]; color?: string; width?: number; height?: number }) {
  const nums = values.filter((v): v is number => v !== null);
  const max = Math.max(1, ...nums);
  const x = (i: number) => (i / (values.length - 1)) * (width - 2) + 1;
  const y = (v: number) => height - 2 - (v / max) * (height - 4);
  return (
    <svg width={width} height={height}>
      {segments(values, x, y).map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth={1.3} />)}
    </svg>
  );
}
