import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { pct, pts, signed } from '../lib/format';

export const COLORS = {
  before: '#8b97a8',
  after: '#0f766e',
  marker: '#b45309',
  down: '#b42318',
  up: '#067647',
  flat: '#6b7280',
  grid: '#e7e9e4',
  axis: '#9aa1ab',
  ink: '#1c1f24',
  muted: '#667085',
};

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(640);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || 640);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  dashed?: boolean;
}

export interface VMarker {
  x: number;
  label: string;
  color: string;
}

interface LineChartProps {
  series: LineSeries[];
  xMax: number;
  xMin?: number;
  xLabel?: (x: number) => string;
  xTicks?: number[];
  markers?: VMarker[];
  height?: number;
  yFormat?: (v: number) => string;
  yDomain?: [number, number];
  ariaLabel: string;
}

/** Line chart with optional vertical markers, hover readout, and auto y-domain. */
export function LineChart({
  series,
  xMax,
  xMin = 0,
  xLabel = (x) => String(x),
  xTicks,
  markers = [],
  height = 280,
  yFormat = (v) => pct(v, 0),
  yDomain,
  ariaLabel,
}: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 46, r: 16, t: 16, b: 30 };
  const innerW = Math.max(40, width - pad.l - pad.r);
  const innerH = Math.max(40, height - pad.t - pad.b);

  const vals = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  let yMin: number;
  let yMax: number;
  if (yDomain) {
    [yMin, yMax] = yDomain;
  } else if (vals.length) {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    yMin = Math.max(0, Math.floor((lo - 0.03) * 10) / 10);
    yMax = Math.min(1, Math.ceil((hi + 0.01) * 10) / 10);
    if (yMax - yMin < 0.2) yMin = Math.max(0, yMax - 0.2);
  } else {
    yMin = 0;
    yMax = 1;
  }
  const step = yMax - yMin > 0.5 ? 0.1 : 0.05;
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax + 1e-9; v += step) yTicks.push(Number(v.toFixed(3)));

  const xs = (x: number) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * innerW;
  const ys = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const pathFor = (values: (number | null)[]) => {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v === null || i < xMin || i > xMax) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const ticks = xTicks ?? Array.from({ length: Math.floor((xMax - xMin) / 10) + 1 }, (_, k) => xMin + k * 10);

  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const x = Math.round(xMin + (px / innerW) * (xMax - xMin));
    setHover(Math.min(xMax, Math.max(xMin, x)));
  };

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {yTicks.map((v) => (
            <g key={`y${v}`}>
              <line x1={pad.l} x2={pad.l + innerW} y1={ys(v)} y2={ys(v)} stroke={COLORS.grid} />
              <text x={pad.l - 8} y={ys(v) + 4} textAnchor="end" className="axis-text">
                {yFormat(v)}
              </text>
            </g>
          ))}
          {ticks.map((x) => (
            <text key={`x${x}`} x={xs(x)} y={height - 8} textAnchor="middle" className="axis-text">
              {xLabel(x)}
            </text>
          ))}
          {markers.map((m, i) => (
            <g key={`m${m.label}${m.x}`}>
              <line x1={xs(m.x)} x2={xs(m.x)} y1={pad.t} y2={pad.t + innerH} stroke={m.color} strokeDasharray="4 4" strokeWidth={1.5} />
              <text
                x={i === 0 && markers.length > 1 && markers[0].x < markers[1].x ? xs(m.x) - 5 : xs(m.x) + 5}
                y={pad.t + 11 + i * 14}
                textAnchor={i === 0 && markers.length > 1 && markers[0].x < markers[1].x ? 'end' : 'start'}
                className="marker-text"
                fill={m.color}
              >
                {m.label}
              </text>
            </g>
          ))}
          {series.map((s) => (
            <path
              key={s.key}
              d={pathFor(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2.2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              strokeLinejoin="round"
            />
          ))}
          {hover !== null && (
            <g>
              <line x1={xs(hover)} x2={xs(hover)} y1={pad.t} y2={pad.t + innerH} stroke={COLORS.ink} strokeOpacity={0.35} />
              {series.map((s) => {
                const v = s.values[hover];
                if (v === null || v === undefined) return null;
                return <circle key={`d${s.key}`} cx={xs(hover)} cy={ys(v)} r={4} fill="#fff" stroke={s.color} strokeWidth={2} />;
              })}
            </g>
          )}
          <rect
            x={pad.l}
            y={pad.t}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hover !== null && (
        <div
          className="chart-tip"
          style={{
            left: Math.min(width - 190, Math.max(8, xs(hover) + 12)),
            top: 8,
          }}
        >
          <div className="chart-tip-title">{xLabel(hover)}</div>
          {series.map((s) => {
            const v = s.values[hover];
            return (
              <div key={s.key} className="chart-tip-row">
                <span className="swatch" style={{ background: s.color }} />
                <span>{s.label}</span>
                <strong>{v === null || v === undefined ? '—' : yFormat(v)}</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface BarsProps {
  values: (number | null)[];
  xMax: number;
  xMin?: number;
  height?: number;
  xLabel?: (x: number) => string;
  xTicks?: number[];
  ariaLabel: string;
  colorFor?: (v: number) => string;
  format?: (v: number) => string;
  markers?: VMarker[];
}

/** Per-minute bars around zero, used for the before/after difference. */
export function BarsChart({
  values,
  xMax,
  xMin = 0,
  height = 110,
  xLabel = (x) => String(x),
  xTicks,
  ariaLabel,
  colorFor = (v) => (v < 0 ? COLORS.down : COLORS.up),
  format = (v) => signed(v * 100) + ' pts',
  markers = [],
}: BarsProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 46, r: 16, t: 10, b: 24 };
  const innerW = Math.max(40, width - pad.l - pad.r);
  const innerH = Math.max(30, height - pad.t - pad.b);
  const vals = values.filter((v): v is number => v !== null);
  const span = Math.max(0.02, ...vals.map((v) => Math.abs(v)));
  const yMax = span * 1.1;
  const xs = (x: number) => pad.l + ((x - xMin + 0.5) / (xMax - xMin + 1)) * innerW;
  const zeroY = pad.t + innerH / 2;
  const ys = (v: number) => zeroY - (v / yMax) * (innerH / 2);
  const barW = Math.max(1.5, innerW / (xMax - xMin + 1) - 1.5);
  const ticks = xTicks ?? Array.from({ length: Math.floor((xMax - xMin) / 10) + 1 }, (_, k) => xMin + k * 10);

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <line x1={pad.l} x2={pad.l + innerW} y1={zeroY} y2={zeroY} stroke={COLORS.axis} />
          <text x={pad.l - 8} y={pad.t + 8} textAnchor="end" className="axis-text">
            +{Math.round(yMax * 100)}
          </text>
          <text x={pad.l - 8} y={pad.t + innerH} textAnchor="end" className="axis-text">
            −{Math.round(yMax * 100)}
          </text>
          {markers.map((m) => (
            <line
              key={`bm${m.label}${m.x}`}
              x1={xs(m.x)}
              x2={xs(m.x)}
              y1={pad.t}
              y2={pad.t + innerH}
              stroke={m.color}
              strokeDasharray="4 4"
            />
          ))}
          {values.map((v, x) => {
            if (v === null || x < xMin || x > xMax) return null;
            const y0 = ys(0);
            const y1 = ys(v);
            return (
              <rect
                key={`b${x}`}
                x={xs(x) - barW / 2}
                y={Math.min(y0, y1)}
                width={barW}
                height={Math.max(1, Math.abs(y1 - y0))}
                fill={colorFor(v)}
                opacity={hover === null || hover === x ? 0.9 : 0.4}
              />
            );
          })}
          {ticks.map((x) => (
            <text key={`bx${x}`} x={xs(x)} y={height - 6} textAnchor="middle" className="axis-text">
              {xLabel(x)}
            </text>
          ))}
          <rect
            x={pad.l}
            y={pad.t}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const px = e.clientX - rect.left;
              const x = Math.round(xMin + (px / innerW) * (xMax - xMin + 1) - 0.5);
              setHover(Math.min(xMax, Math.max(xMin, x)));
            }}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hover !== null && values[hover] !== null && values[hover] !== undefined && (
        <div className="chart-tip" style={{ left: Math.min(width - 170, Math.max(8, xs(hover) + 10)), top: 4 }}>
          <div className="chart-tip-title">{xLabel(hover)}</div>
          <div className="chart-tip-row">
            <strong>{format(values[hover] as number)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export interface DeltaRow {
  key: string;
  label: string;
  note?: string;
  est: number | null;
  lo?: number | null;
  hi?: number | null;
  selected?: boolean;
  onSelect?: () => void;
}

/** Horizontal dot-and-whisker chart for changes, in percentage points. */
export function DeltaChart({ rows, ariaNote }: { rows: DeltaRow[]; ariaNote?: string }) {
  const nums = rows.flatMap((r) => [r.est, r.lo, r.hi]).filter((x): x is number => x !== null && x !== undefined);
  const lo = Math.min(0, ...nums);
  const hi = Math.max(0, ...nums);
  const span = hi - lo || 0.05;
  const pad = span * 0.08;
  const left = lo - pad;
  const total = span + 2 * pad;
  const at = (v: number) => ((v - left) / total) * 100;

  return (
    <div className="delta" aria-label={ariaNote ?? 'Change by group'}>
      <div className="delta-axis-row" aria-hidden="true">
        <span />
        <span className="delta-axis">
          <span style={{ left: `${at(0)}%` }}>0</span>
        </span>
        <span />
      </div>
      {rows.map((r) => {
        const clear = r.lo !== undefined && r.lo !== null && r.hi !== undefined && r.hi !== null && (r.lo > 0 || r.hi < 0);
        const color = r.est === null ? COLORS.flat : clear ? (r.est < 0 ? COLORS.down : COLORS.up) : COLORS.flat;
        const hasCI = r.lo !== undefined && r.lo !== null && r.hi !== undefined && r.hi !== null;
        return (
          <button
            key={r.key}
            type="button"
            className={`delta-row${r.selected ? ' is-selected' : ''}`}
            onClick={r.onSelect}
            disabled={!r.onSelect}
          >
            <span className="delta-label">
              {r.label}
              {r.note && <small>{r.note}</small>}
            </span>
            <span className="delta-track">
              <span className="delta-zero" style={{ left: `${at(0)}%` }} />
              {est(r.est) && hasCI && (
                <span
                  className="delta-whisker"
                  style={{ left: `${at(r.lo as number)}%`, width: `${at(r.hi as number) - at(r.lo as number)}%`, background: color }}
                />
              )}
              {est(r.est) && <span className="delta-dot" style={{ left: `${at(r.est as number)}%`, background: color }} />}
            </span>
            <span className="delta-value" style={{ color }}>
              {r.est === null ? '—' : pts(r.est)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function est(x: number | null | undefined): boolean {
  return x !== null && x !== undefined && !Number.isNaN(x);
}
