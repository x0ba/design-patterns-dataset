// Minute-resolution view of the selected range (with context on each side). Three lanes share
// one time axis: request volume, failures, and cert-submit p95 on a log scale.

import { useMemo, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Dataset } from '../data/generate.ts';
import { buildSeries, type Series } from '../data/series.ts';
import { GATEWAY_TIMEOUT_MS, MINUTES } from '../data/scenario.ts';
import { linScale, logScale, niceTicks, useWidth } from '../lib/chart.ts';
import { clock, fmtInt, fmtMs, fmtPct, hhmm } from '../lib/format.ts';
import { BatchBand, COLORS, EventLines, HGrid, MinuteAxis, YTicks } from './chartParts.tsx';

const LEFT = 62;
const BASELINE_P95_MS = 1800; // Baseline cert-submit p95 from the brief (Sat–Sun, pre-deploy)
const RIGHT = 14;
const LANE = { rpm: 100, fail: 66, p95: 110 };
const GAP = 26;
const HEADER = 30;

export function FocusChart({ ds, sel }: { ds: Dataset; sel: [number, number] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const span = sel[1] - sel[0];
  const pad = Math.max(30, Math.round(span * 0.35));
  const d0 = Math.max(0, sel[0] - pad);
  const d1 = Math.min(MINUTES, sel[1] + pad);
  const step = Math.max(1, Math.ceil((d1 - d0) / 360));
  const series: Series = useMemo(() => buildSeries(ds, d0, d1, step), [ds, d0, d1, step]);

  const x0 = LEFT;
  const x1 = width - RIGHT;
  const xs = linScale(d0, d1, x0, x1);

  const laneTop = [HEADER, HEADER + LANE.rpm + GAP, HEADER + LANE.rpm + GAP + LANE.fail + GAP];
  const laneBottom = [laneTop[0] + LANE.rpm, laneTop[1] + LANE.fail, laneTop[2] + LANE.p95];
  const height = laneBottom[2] + 30;

  const n = series.n;
  const barW = Math.max(1, (x1 - x0) / n - (n > 120 ? 0 : 1));

  // Lane 1: requests per minute, stacked.
  const maxRpm = Math.max(...Array.from(series.rpm), 1) * 1.1;
  const yr = linScale(0, maxRpm, laneBottom[0], laneTop[0]);
  const stackPath = (lowerKey: (b: number) => number, upperKey: (b: number) => number) => {
    let d = '';
    for (let b = 0; b < n; b++) d += `${b === 0 ? 'M' : 'L'}${xs(series.m[b]).toFixed(1)},${yr(upperKey(b)).toFixed(1)} `;
    for (let b = n - 1; b >= 0; b--) d += `L${xs(series.m[b]).toFixed(1)},${yr(lowerKey(b)).toFixed(1)} `;
    return d + 'Z';
  };
  const c1 = (b: number) => series.rpmCert[b];
  const c2 = (b: number) => series.rpmCert[b] + series.rpmClaims[b];
  const c3 = (b: number) => series.rpmCert[b] + series.rpmClaims[b] + series.rpmOther[b];

  // Lane 2: failures per minute.
  const maxFail = Math.max(...Array.from(series.failed).map((v) => v / step), 1) * 1.1;
  const yfl = linScale(0, maxFail, laneBottom[1], laneTop[1]);

  // Lane 3: cert-submit p95 (log).
  const p95Vals = Array.from(series.certP95).filter((v) => v > 0);
  const p95Max = Math.max(GATEWAY_TIMEOUT_MS * 1.1, ...p95Vals);
  const yp = logScale(0.5e3, p95Max, laneBottom[2], laneTop[2]);
  const p95Path = Array.from(series.certP95)
    .map((v, b) => `${b === 0 ? 'M' : 'L'}${xs(series.m[b]).toFixed(1)},${yp(Math.max(v, 500)).toFixed(1)}`)
    .join(' ');

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const m = xs.invert(px);
    const b = Math.floor((m - d0) / step);
    setHover(b >= 0 && b < n ? b : null);
  };

  const hb = hover;
  const hm = hb !== null ? series.m[hb] : 0;
  const hovered = hb !== null;
  const certFailRate = hovered && series.certTotal[hb!] ? series.certFailed[hb!] / series.certTotal[hb!] : 0;

  // Selection shading and the requests-per-minute value at hover.
  const selX0 = xs(sel[0]);
  const selX1 = xs(sel[1]);
  const tipX = hovered ? xs(hm) : 0;
  const tipLeft = hovered && tipX > width * 0.6;

  return (
    <div ref={ref} className="focus-chart">
      <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Minute-level request volume, failures and cert-submit p95 for the selected range">
        {/* selection band across all lanes */}
        <rect x={selX0} y={HEADER - 2} width={Math.max(2, selX1 - selX0)} height={laneBottom[2] - HEADER + 4} fill={COLORS.accentSoft} />

        <BatchBand x={xs} m0={d0} m1={d1} top={0} bottom={laneBottom[2]} labelAtTop />

        {/* lane 1 */}
        <HGrid ticks={niceTicks(0, maxRpm, 3)} y={yr} x0={x0} x1={x1} />
        <YTicks ticks={niceTicks(0, maxRpm, 3)} y={yr} x={LEFT} format={(v) => fmtInt(v)} />
        <path d={stackPath(() => 0, c1)} fill={COLORS.cert} opacity={0.85} />
        <path d={stackPath(c1, c2)} fill={COLORS.claims} opacity={0.85} />
        <path d={stackPath(c2, c3)} fill={COLORS.other} opacity={0.8} />
        <LaneLabel x={x0 + 6} y={laneTop[0] + 14} title="Requests per minute" legend={['cert-submit', 'claims', 'other']} />

        {/* lane 2 */}
        <HGrid ticks={niceTicks(0, maxFail, 2)} y={yfl} x0={x0} x1={x1} />
        <YTicks ticks={niceTicks(0, maxFail, 2)} y={yfl} x={LEFT} format={(v) => fmtInt(v)} />
        {Array.from({ length: n }, (_, b) => {
          const v = series.failed[b] / step;
          if (v <= 0) return null;
          return <rect key={b} x={xs(series.m[b])} y={yfl(v)} width={barW} height={laneBottom[1] - yfl(v)} fill={COLORS.fail} opacity={0.88} />;
        })}
        <LaneLabel x={x0 + 6} y={laneTop[1] + 14} title="Failed requests per minute" />

        {/* lane 3 */}
        {[1e3, 2e3, 5e3, 10e3, 30e3]
          .filter((v) => v >= 0.5e3 && v <= p95Max)
          .map((v) => (
            <g key={v}>
              <line x1={x0} x2={x1} y1={yp(v)} y2={yp(v)} stroke={COLORS.grid} />
              <text x={LEFT - 6} y={yp(v) + 3.5} textAnchor="end" fontSize={10.5} fill={COLORS.muted}>
                {v / 1000} s
              </text>
            </g>
          ))}
        <line x1={x0} x2={x1} y1={yp(BASELINE_P95_MS)} y2={yp(BASELINE_P95_MS)} stroke={COLORS.ok} strokeDasharray="5 4" />
        <text x={x1 - 4} y={yp(BASELINE_P95_MS) - 4} textAnchor="end" fontSize={10.5} fill={COLORS.ok}>
          baseline p95 1.8 s
        </text>
        <line x1={x0} x2={x1} y1={yp(GATEWAY_TIMEOUT_MS)} y2={yp(GATEWAY_TIMEOUT_MS)} stroke={COLORS.fail} strokeDasharray="5 4" />
        <text x={x1 - 4} y={yp(GATEWAY_TIMEOUT_MS) - 4} textAnchor="end" fontSize={10.5} fill={COLORS.fail}>
          gateway timeout 30 s
        </text>
        <path d={p95Path} fill="none" stroke={COLORS.cert} strokeWidth={1.6} />
        <LaneLabel x={x0 + 6} y={laneTop[2] + 14} title="Cert-submit p95 latency (log scale)" />

        <EventLines x={xs} m0={d0} m1={d1} top={0} bottom={laneBottom[2]} labels={true} />

        {/* hover crosshair */}
        {hovered && <line x1={tipX} x2={tipX} y1={HEADER} y2={laneBottom[2]} stroke={COLORS.inkSoft} strokeDasharray="2 3" />}

        <MinuteAxis x={xs} m0={d0} m1={d1} y={laneBottom[2] + 6} target={8} />
      </svg>

      {hovered && (
        <div className="focus-tip" style={{ left: tipLeft ? tipX - 240 : tipX + 12 }}>
          <div className="focus-tip-title">{clock(hm)} · {step > 1 ? `${step}-min bucket` : '1 min'}</div>
          <div>Requests <b>{fmtInt(series.rpm[hb!] * step)}</b> ({fmtInt(series.rpm[hb!])}/min)</div>
          <div>Failed <b>{fmtInt(series.failed[hb!])}</b></div>
          <div>Cert-submit <b>{fmtInt(series.certTotal[hb!])}</b> · fail <b>{fmtPct(certFailRate)}</b></div>
          <div>Cert p95 <b>{fmtMs(series.certP95[hb!])}</b></div>
          <div className="focus-tip-foot">{hhmm(hm)}–{hhmm(hm + step)}</div>
        </div>
      )}
    </div>
  );
}

function LaneLabel({ x, y, title, legend }: { x: number; y: number; title: string; legend?: string[] }) {
  const colors = [COLORS.cert, COLORS.claims, COLORS.other];
  return (
    <g>
      <text x={x} y={y} fontSize={11} fill={COLORS.inkSoft} fontWeight={600}>
        {title}
      </text>
      {legend?.map((l, i) => (
        <g key={l} transform={`translate(${x + 190 + i * 96},${y - 9})`}>
          <rect width={9} height={9} rx={2} fill={colors[i]} />
          <text x={13} y={8} fontSize={10.5} fill={COLORS.inkSoft}>
            {l}
          </text>
        </g>
      ))}
    </g>
  );
}

