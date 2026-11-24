// 72-hour overview. Drag across it to set the investigation range used by every other view.

import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Dataset } from '../data/generate.ts';
import { buildSeries } from '../data/series.ts';
import { MINUTES } from '../data/scenario.ts';
import { linScale, niceTicks, useWidth } from '../lib/chart.ts';
import { fmtInt } from '../lib/format.ts';
import { BatchBand, COLORS, EventLines, HGrid, MinuteAxis, YTicks } from './chartParts.tsx';

const H_AREA = 74;
const H_FAIL = 26;
const TOP = 26;
const LEFT = 52;
const RIGHT = 14;

export function ContextTimeline({
  ds,
  sel,
  onSelect,
}: {
  ds: Dataset;
  sel: [number, number];
  onSelect: (m0: number, m1: number) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const series = useMemo(() => buildSeries(ds, 0, MINUTES, 10), [ds]);
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const x0 = LEFT;
  const x1 = width - RIGHT;
  const xs = linScale(0, MINUTES, x0, x1);
  const xInv = (px: number) => xs.invert(px);

  const areaTop = TOP;
  const areaBottom = TOP + H_AREA;
  const failTop = areaBottom + 22;
  const failBottom = failTop + H_FAIL;
  const height = failBottom + 24;

  const maxRpm = Math.max(...Array.from(series.rpm)) * 1.08;
  const ys = linScale(0, maxRpm, areaBottom, areaTop);
  const maxFail = Math.max(...Array.from(series.failed));
  const yf = linScale(0, maxFail, failBottom, failTop);

  // Stacked area paths per group (cert bottom, claims, other top).
  const n = series.n;
  const stack = (lower: (b: number) => number, upper: (b: number) => number) => {
    let d = '';
    for (let b = 0; b < n; b++) {
      const px = xs(series.m[b]);
      d += `${b === 0 ? 'M' : 'L'}${px.toFixed(1)},${ys(upper(b)).toFixed(1)} `;
    }
    for (let b = n - 1; b >= 0; b--) {
      d += `L${xs(series.m[b]).toFixed(1)},${ys(lower(b)).toFixed(1)} `;
    }
    return d + 'Z';
  };
  const certTop = (b: number) => series.rpmCert[b];
  const claimsTop = (b: number) => series.rpmCert[b] + series.rpmClaims[b];
  const allTop = (b: number) => series.rpmCert[b] + series.rpmClaims[b] + series.rpmOther[b];
  const zero = () => 0;
  const barW = Math.max(1, (x1 - x0) / n - 0.5);

  const toMinute = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const px = clientX - (rect?.left ?? 0);
    return Math.max(0, Math.min(MINUTES, Math.round(xInv(px))));
  };

  const onDown = (e: RPointerEvent<SVGRectElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const m = toMinute(e.clientX);
    setDrag({ a: m, b: m });
  };
  const onMove = (e: RPointerEvent<SVGRectElement>) => {
    if (!drag) return;
    setDrag({ a: drag.a, b: toMinute(e.clientX) });
  };
  const onUp = () => {
    if (!drag) return;
    let lo = Math.min(drag.a, drag.b);
    let hi = Math.max(drag.a, drag.b);
    if (hi - lo < 5) {
      // a click without a drag selects the 24-hour day that was clicked
      const day = Math.floor(lo / 1440) * 1440;
      lo = day;
      hi = day + 1440;
    }
    onSelect(lo, hi);
    setDrag(null);
  };

  const shown = drag ? [Math.min(drag.a, drag.b), Math.max(drag.a, drag.b)] : sel;
  const selX0 = xs(shown[0]);
  const selX1 = xs(shown[1]);

  return (
    <div ref={ref} className="ctx-timeline">
      <svg ref={svgRef} width={width} height={height} role="img" aria-label="72-hour request volume and failures. Drag to select a range.">
        <text x={LEFT} y={14} fontSize={11} fill={COLORS.inkSoft} fontWeight={600}>
          Requests per minute, all endpoints
        </text>
        <g transform={`translate(${LEFT + 210},6)`}>
          {[['cert-submit', COLORS.cert], ['claims', COLORS.claims], ['other', COLORS.other]].map(([l, c], i) => (
            <g key={l} transform={`translate(${i * 96},0)`}>
              <rect y={1} width={9} height={9} rx={2} fill={c} />
              <text x={13} y={9} fontSize={10.5} fill={COLORS.inkSoft}>{l}</text>
            </g>
          ))}
        </g>
        <HGrid ticks={niceTicks(0, maxRpm, 3)} y={ys} x0={x0} x1={x1} />
        <YTicks ticks={niceTicks(0, maxRpm, 3)} y={ys} x={LEFT} format={(v) => fmtInt(v)} />

        <path d={stack(zero, certTop)} fill={COLORS.cert} opacity={0.85} />
        <path d={stack(certTop, claimsTop)} fill={COLORS.claims} opacity={0.85} />
        <path d={stack(claimsTop, allTop)} fill={COLORS.other} opacity={0.8} />

        <BatchBand x={xs} m0={0} m1={MINUTES} top={areaTop} bottom={areaBottom} label={false} />
        <EventLines x={xs} m0={0} m1={MINUTES} top={areaTop - 6} bottom={failBottom} labels={true} only={['idv-4.12']} />

        <text x={LEFT} y={failTop - 7} fontSize={11} fill={COLORS.inkSoft} fontWeight={600}>
          Failed requests per 10 min
        </text>
        {Array.from({ length: n }, (_, b) => {
          const v = series.failed[b];
          if (v <= 0) return null;
          const px = xs(series.m[b]);
          return <rect key={b} x={px} y={yf(v)} width={barW} height={failBottom - yf(v)} fill={COLORS.fail} opacity={0.85} />;
        })}
        <text x={LEFT - 6} y={failTop + 4} textAnchor="end" fontSize={10.5} fill={COLORS.muted}>
          {fmtInt(maxFail)}
        </text>
        <text x={LEFT - 6} y={failBottom} textAnchor="end" fontSize={10.5} fill={COLORS.muted}>0</text>

        {/* selection */}
        <rect
          x={selX0}
          y={areaTop - 4}
          width={Math.max(2, selX1 - selX0)}
          height={failBottom - areaTop + 8}
          fill={COLORS.accentSoft}
          stroke={COLORS.accent}
          strokeWidth={1.25}
          pointerEvents="none"
        />

        <MinuteAxis x={xs} m0={0} m1={MINUTES} y={failBottom + 6} target={9} />

        {/* capture layer for brushing */}
        <rect
          x={x0}
          y={areaTop - 4}
          width={x1 - x0}
          height={failBottom - areaTop + 8}
          fill="transparent"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setDrag(null)}
        />
      </svg>
      <div className="ctx-hint">
        Dashed lines: identity-verify v4.12 (Sun 23:05), plant closure announced (about 07:35 Mon), claims-web hotfix (09:20 Mon), pool 40 → 80 (10:38 Mon). Drag across the chart to set the range; click a day to select it.
      </div>
    </div>
  );
}
