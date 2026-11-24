// Implied concurrent mainframe sessions per connector instance, against the pool limit.
// Derived (not measured): arrival rate of mainframe transactions × mean hold time (Little's law).

import { useMemo, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Dataset } from '../data/generate.ts';
import { buildSeries } from '../data/series.ts';
import { CONNECTORS, M_POOL_CHANGE } from '../data/scenario.ts';
import { linScale, niceTicks, useWidth } from '../lib/chart.ts';
import { clock, hhmm } from '../lib/format.ts';
import { BatchBand, COLORS, EventLines, HGrid, MinuteAxis, YTicks } from './chartParts.tsx';

const LEFT = 62;
const RIGHT = 16;
const TOP = 30;
const H = 230;

export function ConcurrencyChart({ ds, d0, d1 }: { ds: Dataset; d0: number; d1: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const span = d1 - d0;
  const step = Math.max(1, Math.ceil(span / 400));
  const series = useMemo(() => buildSeries(ds, d0, d1, step), [ds, d0, d1, step]);
  const C = CONNECTORS.length;
  const x0 = LEFT;
  const x1 = width - RIGHT;
  const xs = linScale(d0, d1, x0, x1);

  let maxY = 0;
  for (let i = 0; i < series.conc.length; i++) maxY = Math.max(maxY, series.conc[i]);
  for (let b = 0; b < series.n; b++) maxY = Math.max(maxY, series.pool[b]);
  maxY = Math.ceil(maxY * 1.1 / 10) * 10;
  const yc = linScale(0, maxY, TOP + H, TOP);
  const ticks = niceTicks(0, maxY, 4);

  const path = (c: number) => {
    let d = '';
    for (let b = 0; b < series.n; b++) {
      d += `${b === 0 ? 'M' : 'L'}${xs(series.m[b]).toFixed(1)},${yc(series.conc[b * C + c]).toFixed(1)} `;
    }
    return d;
  };
  // pool limit as a step line (it changes once, at the pool-change minute)
  let poolPath = '';
  for (let b = 0; b < series.n; b++) {
    const px = xs(series.m[b]);
    const py = yc(series.pool[b]);
    poolPath += `${b === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)} `;
  }

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const m = xs.invert(e.clientX - rect.left);
    const b = Math.floor((m - d0) / step);
    setHover(b >= 0 && b < series.n ? b : null);
  };

  const hb = hover;
  const tipX = hb !== null ? xs(series.m[hb]) : 0;

  return (
    <div ref={ref} className="conc-chart">
      <svg width={width} height={TOP + H + 30} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Implied concurrent mainframe sessions per connector against the pool limit">
        <HGrid ticks={ticks} y={yc} x0={x0} x1={x1} />
        <YTicks ticks={ticks} y={yc} x={LEFT} format={(v) => String(v)} />
        <BatchBand x={xs} m0={d0} m1={d1} top={0} bottom={TOP + H} labelAtTop />
        <EventLines x={xs} m0={d0} m1={d1} top={TOP} bottom={TOP + H} labels={true} />
        <path d={poolPath} fill="none" stroke={COLORS.ink} strokeWidth={1.6} strokeDasharray="6 4" />
        {CONNECTORS.map((id, c) => (
          <path key={id} d={path(c)} fill="none" stroke={COLORS.conn[c]} strokeWidth={c === 1 ? 2 : 1.4} opacity={c === 1 ? 1 : 0.85} />
        ))}
        {hb !== null && <line x1={tipX} x2={tipX} y1={TOP} y2={TOP + H} stroke={COLORS.inkSoft} strokeDasharray="2 3" />}
        <MinuteAxis x={xs} m0={d0} m1={d1} y={TOP + H + 6} target={8} />
      </svg>
      <div className="conc-legend">
        {CONNECTORS.map((id, c) => (
          <span key={id} className="legend-item">
            <i style={{ background: COLORS.conn[c] }} />
            {id}
          </span>
        ))}
        <span className="legend-item">
          <i className="dash" />
          pool limit per instance (40 → 80 at {hhmm(M_POOL_CHANGE)} Mon)
        </span>
      </div>
      {hb !== null && (
        <div className="conc-tip" style={{ left: tipX > width * 0.6 ? tipX - 210 : tipX + 12 }}>
          <div className="focus-tip-title">{clock(series.m[hb])}</div>
          {CONNECTORS.map((id, c) => {
            const v = series.conc[hb * C + c];
            return (
              <div key={id}>
                {id} <b>{v.toFixed(1)}</b> sessions · {(v / series.pool[hb] * 100).toFixed(0)}% of pool
              </div>
            );
          })}
          <div className="focus-tip-foot">pool limit {series.pool[hb].toFixed(0)}</div>
        </div>
      )}
    </div>
  );
}
