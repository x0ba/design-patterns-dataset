// Renders each chart's data as SVG (or an HTML table) so the preview is what the
// release would show. Suppressed cells (null values) are drawn hatched and marked (s).

import { useId } from 'react';
import type { Chart, LinePoint, TilePoint } from '../lib/types';
import { fmtAxis, fmtLevel, fmtValue } from '../lib/format';

const W = 720;

function niceStep(span: number, count: number): number {
  const raw = span / count || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const s of [1, 2, 2.5, 5, 10]) {
    if (s * mag >= raw) return s * mag;
  }
  return 10 * mag;
}

function niceDomain(min: number, max: number, count = 4) {
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks };
}

function UnitTag({ unit }: { unit: string }) {
  const label = unit === 'jobs' ? 'jobs' : unit === 'dollars' ? 'dollars' : unit === 'points' ? 'points' : '%';
  return <text x={6} y={12} className="axis-unit">{label}</text>;
}

function ColumnChart({ points, unit, idPrefix }: { points: LinePoint[]; unit: 'jobs' | 'percent' | 'rate'; idPrefix: string }) {
  const H = 300;
  const pad = { l: 64, r: 12, t: 18, b: 40 };
  const vals = points.map((p) => p.value ?? 0);
  const { lo, hi, ticks } = niceDomain(Math.min(0, ...vals), Math.max(0, ...vals));
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo || 1)) * plotH;
  const slot = plotW / points.length;
  const bw = Math.min(72, slot * 0.56);
  const zero = y(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-labelledby={`${idPrefix}-t`}>
      <title id={`${idPrefix}-t`}>Column chart</title>
      <UnitTag unit={unit} />
      {ticks.map((t) => (
        <g key={`t${t}`}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis-zero' : 'grid'} />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{fmtAxis(t)}</text>
        </g>
      ))}
      {points.map((p, i) => {
        const x0 = pad.l + i * slot + (slot - bw) / 2;
        const cx = x0 + bw / 2;
        if (p.value === null) {
          return (
            <g key={p.label}>
              <rect x={x0} y={zero - 22} width={bw} height={22} fill={`url(#${idPrefix}-hatch)`} />
              <text x={cx} y={zero - 28} textAnchor="middle" className="val">(s)</text>
              <text x={pad.l + i * slot + slot / 2} y={H - pad.b + 18} textAnchor="middle" className="cat">{p.label}</text>
            </g>
          );
        }
        const v = p.value;
        const top = Math.min(y(v), zero);
        const h = Math.max(1, Math.abs(y(v) - zero));
        const pos = v >= 0;
        return (
          <g key={p.label}>
            <rect x={x0} y={top} width={bw} height={h} rx={2} className={pos ? 'bar-pos' : 'bar-neg'} />
            {p.revised && <rect x={x0 - 3} y={top - 3} width={bw + 6} height={h + 6} rx={3} className="bar-revised" />}
            <text x={cx} y={pos ? top - 7 : top + h + 14} textAnchor="middle" className="val">{fmtValue(v, unit)}</text>
            <text x={pad.l + i * slot + slot / 2} y={H - pad.b + 18} textAnchor="middle" className="cat">
              {p.label}
              {p.revised ? ' (rev.)' : ''}
            </text>
          </g>
        );
      })}
      <defs>
        <pattern id={`${idPrefix}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" className="hatch-bg" />
          <line x1="0" y1="0" x2="0" y2="6" className="hatch-line" />
        </pattern>
      </defs>
    </svg>
  );
}

function LineChart({ points, unit, idPrefix }: { points: LinePoint[]; unit: 'jobs' | 'percent' | 'rate'; idPrefix: string }) {
  const H = 300;
  const pad = { l: 76, r: 16, t: 18, b: 40 };
  const known = points.map((p) => p.value).filter((v): v is number => v !== null);
  const min = Math.min(...known);
  const max = Math.max(...known);
  const margin = (max - min) * 0.15 || 0.5;
  const { lo, hi, ticks } = niceDomain(min - margin, max + margin, 4);
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const slot = plotW / points.length;
  const x = (i: number) => pad.l + (i + 0.5) * slot;
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo || 1)) * plotH;
  const last = points.length - 1;

  let d = '';
  points.forEach((p, i) => {
    if (p.value === null) return;
    d += `${d ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)} `;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-labelledby={`${idPrefix}-t`}>
      <title id={`${idPrefix}-t`}>Line chart</title>
      <UnitTag unit={unit} />
      {ticks.map((t) => (
        <g key={`t${t}`}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{fmtAxis(t)}</text>
        </g>
      ))}
      <path d={d} className="series" fill="none" />
      {points.map((p, i) => {
        if (p.value === null) return null;
        const showLabel = unit === 'jobs' ? i === last || p.revised : true;
        return (
          <g key={p.label}>
            <circle cx={x(i)} cy={y(p.value)} r={p.revised ? 5 : 4} className={p.revised ? 'dot-revised' : 'dot'} />
            {showLabel && (
              <text x={x(i)} y={y(p.value) - 10} textAnchor="middle" className="val">
                {fmtLevel(p.value, unit)}
              </text>
            )}
            <text x={x(i)} y={H - pad.b + 18} textAnchor="middle" className="cat">{p.label}</text>
            {p.revised && (
              <text x={x(i)} y={H - pad.b + 32} textAnchor="middle" className="cat rev">revised</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function HBar({ rows, unit, idPrefix }: { rows: TilePoint[]; unit: 'jobs' | 'percent' | 'rate' | 'dollars'; idPrefix: string }) {
  const rowH = 26;
  const H = rows.length * rowH + 16;
  const labelW = 228;
  const plotL = labelW + 10;
  const plotR = W - 84;
  const vals = rows.map((r) => r.value ?? 0);
  const vmin = Math.min(0, ...vals);
  const vmax = Math.max(0, ...vals);
  const span = vmax - vmin || 1;
  const lo = vmin < 0 ? vmin - span * 0.12 : 0;
  const hi = vmax > 0 ? vmax + span * 0.04 : 0;
  const x = (v: number) => plotL + ((v - lo) / (hi - lo || 1)) * (plotR - plotL);
  const zeroX = x(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg hbar" role="img" aria-labelledby={`${idPrefix}-t`}>
      <title id={`${idPrefix}-t`}>Horizontal bar chart</title>
      {rows.map((r, i) => {
        const y = 8 + i * rowH;
        const barY = y + 5;
        const barH = rowH - 10;
        if (r.value === null) {
          return (
            <g key={r.label}>
              <text x={0} y={y + rowH / 2 + 4} className="hlabel">{r.label}</text>
              <rect x={zeroX - 36} y={barY} width={36} height={barH} fill={`url(#${idPrefix}-hatch)`} />
              <text x={zeroX + 6} y={y + rowH / 2 + 4} className="val">(s)</text>
            </g>
          );
        }
        const v = r.value;
        const left = Math.min(x(v), zeroX);
        const w = Math.max(1, Math.abs(x(v) - zeroX));
        const pos = v >= 0;
        return (
          <g key={r.label}>
            <text x={0} y={y + rowH / 2 + 4} className="hlabel">{r.label}</text>
            <rect x={left} y={barY} width={w} height={barH} rx={2} className={pos ? 'bar-pos' : 'bar-neg'} />
            <text
              x={pos ? x(v) + 6 : x(v) - 6}
              y={y + rowH / 2 + 4}
              textAnchor={pos ? 'start' : 'end'}
              className="val"
            >
              {fmtValue(v, unit)}
            </text>
          </g>
        );
      })}
      <line x1={zeroX} x2={zeroX} y1={4} y2={H - 4} className="axis-zero" />
      <defs>
        <pattern id={`${idPrefix}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" className="hatch-bg" />
          <line x1="0" y1="0" x2="0" y2="6" className="hatch-line" />
        </pattern>
      </defs>
    </svg>
  );
}

const SEQ_COLORS = ['#e6f1f1', '#b7dadb', '#7fbcbd', '#3f9598', '#1f6c70'];
const DIV_COLORS = ['#1f6c70', '#7fbcbd', '#ececec', '#e7b08f', '#b4532a'];

function Tiles({ cells, unit, diverging, idPrefix }: { cells: TilePoint[]; unit: 'rate' | 'points'; diverging: boolean; idPrefix: string }) {
  const cols = 8;
  const gap = 4;
  const rows = Math.ceil(cells.length / cols);
  const cellW = (W - gap * (cols - 1)) / cols;
  const cellH = 34;
  const H = rows * cellH + (rows - 1) * gap;
  const known = cells.map((c) => c.value).filter((v): v is number => v !== null);

  let binOf: (v: number) => number;
  if (diverging) {
    binOf = (v) => (v <= -0.6 ? 0 : v <= -0.2 ? 1 : v < 0.2 ? 2 : v < 0.6 ? 3 : 4);
  } else {
    const sorted = [...known].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    const cuts = [q(0.2), q(0.4), q(0.6), q(0.8)];
    binOf = (v) => cuts.filter((c) => v >= c).length;
  }

  return (
    <div className="tiles-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg tiles" role="img" aria-labelledby={`${idPrefix}-t`}>
        <title id={`${idPrefix}-t`}>County tile grid</title>
        {cells.map((c, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * (cellW + gap);
          const y = row * (cellH + gap);
          if (c.value === null) {
            return (
              <g key={c.label}>
                <rect x={x} y={y} width={cellW} height={cellH} rx={3} fill={`url(#${idPrefix}-hatch)`} className="tile-supp" />
                <text x={x + 6} y={y + 13} className="tile-name">{c.label}</text>
                <text x={x + 6} y={y + 27} className="tile-val">(s)</text>
              </g>
            );
          }
          const bin = binOf(c.value);
          const palette = diverging ? DIV_COLORS : SEQ_COLORS;
          const dark = diverging ? bin === 0 || bin === 4 : bin >= 3;
          const valText = unit === 'points' ? `${c.value > 0 ? '+' : c.value < 0 ? '−' : ''}${Math.abs(c.value).toFixed(1)}` : `${c.value.toFixed(1)}%`;
          return (
            <g key={c.label}>
              <rect x={x} y={y} width={cellW} height={cellH} rx={3} fill={palette[bin]} />
              <text x={x + 6} y={y + 13} className="tile-name" fill={dark ? '#fff' : '#1b2a33'}>{c.label}</text>
              <text x={x + 6} y={y + 27} className="tile-val" fill={dark ? '#fff' : '#1b2a33'}>{valText}</text>
            </g>
          );
        })}
        <defs>
          <pattern id={`${idPrefix}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" className="hatch-bg" />
            <line x1="0" y1="0" x2="0" y2="6" className="hatch-line" />
          </pattern>
        </defs>
      </svg>
      <div className="legend">
        {(diverging ? ['≤ −0.6', '−0.6 to −0.2', '−0.2 to +0.2', '+0.2 to +0.6', '≥ +0.6'] : ['Lowest fifth', '', '', '', 'Highest fifth']).map(
          (label, i) => (
            <span key={i} className="legend-item">
              <span className="swatch" style={{ background: (diverging ? DIV_COLORS : SEQ_COLORS)[i] }} />
              {label}
            </span>
          ),
        )}
        <span className="legend-item">
          <span className="swatch hatch-swatch" /> (s) suppressed
        </span>
      </div>
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: { label: string; cells: (string | null)[] }[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} scope="col" className={i > 0 ? 'num' : ''}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {r.cells.map((c, i) =>
                c === null ? (
                  <td key={i} className="num supp" title="Suppressed under disclosure rules">(s)</td>
                ) : (
                  <td key={i} className="num">{c}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartPreview({ chart }: { chart: Chart }) {
  const uid = useId().replace(/:/g, '');
  const spec = chart.chart;
  const idPrefix = `${chart.id}-${uid}`;
  switch (spec.kind) {
    case 'column':
      return <div className="preview-body"><ColumnChart points={spec.points} unit={spec.unit} idPrefix={idPrefix} /></div>;
    case 'line':
      return <div className="preview-body"><LineChart points={spec.points} unit={spec.unit} idPrefix={idPrefix} /></div>;
    case 'hbar':
      return <div className="preview-body"><HBar rows={spec.rows} unit={spec.unit} idPrefix={idPrefix} /></div>;
    case 'tiles':
      return (
        <div className="preview-body">
          <Tiles cells={spec.cells} unit={spec.unit} diverging={spec.diverging} idPrefix={idPrefix} />
        </div>
      );
    case 'table':
      return <div className="preview-body"><DataTable columns={spec.columns} rows={spec.rows} /></div>;
  }
}
