import { useMemo } from 'react';
import type { Dataset } from '../data/generate.ts';
import { ENDPOINT_INDEX, M_WINDOW_END, M_WINDOW_START } from '../data/scenario.ts';
import { linScale, niceTicks, useWidth } from '../lib/chart.ts';
import { fmtInt, fmtX, hhmm } from '../lib/format.ts';
import { COLORS } from '../components/chartParts.tsx';

export function VolumeView({ ds }: { ds: Dataset }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const claims = ENDPOINT_INDEX.claims;
  const cert = ENDPOINT_INDEX.cert;

  const hours = useMemo(() => {
    const out: { h: number; now: number; ago: number; cert: number }[] = [];
    for (let h = 0; h < 24; h++) {
      let now = 0;
      let c = 0;
      for (let mm = 0; mm < 60; mm++) {
        const m = 2880 + h * 60 + mm;
        now += ds.totalMe[m * ds.endpoints.length + claims];
        c += ds.totalMe[m * ds.endpoints.length + cert];
      }
      out.push({ h, now, ago: ds.yearAgoClaims[h], cert: c });
    }
    return out;
  }, [ds, claims, cert]);

  const peakWindow = hours.filter((r) => r.h >= 8 && r.h <= 10);
  const windowNow = peakWindow.reduce((a, r) => a + r.now, 0);
  const windowAgo = peakWindow.reduce((a, r) => a + r.ago, 0);
  const multiple = windowAgo ? windowNow / windowAgo : 0;
  const totalNow = hours.reduce((a, r) => a + r.now, 0);
  const totalAgo = hours.reduce((a, r) => a + r.ago, 0);

  const H = 290;
  const L = 56;
  const B = 34;
  const T = 16;
  const x0 = L;
  const x1 = width - 12;
  const bandW = (x1 - x0) / 24;
  const maxV = Math.max(...hours.map((r) => Math.max(r.now, r.ago))) * 1.08;
  const ys = linScale(0, maxV, H - B, T);
  const ticks = niceTicks(0, maxV, 5);

  return (
    <div className="view volume">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Initial claim filings, Monday by hour</h2>
            <p className="card-sub">
              Mon 16 Nov 2026 against Mon 17 Nov 2025, the same weekday a year earlier. The employer announcement reached the public at about 07:35; from 08:00 to 11:00, filings ran at roughly four times last year's rate.
            </p>
          </div>
          <div className="kpi-inline">
            <div><span className="muted small">08:00–11:00 filings</span><b>{fmtInt(windowNow)}</b></div>
            <div><span className="muted small">Same hours last year</span><b>{fmtInt(windowAgo)}</b></div>
            <div><span className="muted small">Multiple</span><b className="bad">{fmtX(multiple)}</b></div>
          </div>
        </div>
        <div ref={ref} className="volume-chart">
          <svg width={width} height={H} role="img" aria-label="Hourly claim filings on Monday 16 Nov 2026 against Monday 17 Nov 2025">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x0} x2={x1} y1={ys(t)} y2={ys(t)} stroke={COLORS.grid} />
                <text x={L - 8} y={ys(t) + 3.5} textAnchor="end" fontSize={10.5} fill={COLORS.muted}>
                  {fmtInt(t)}
                </text>
              </g>
            ))}
            <rect x={x0 + 8 * bandW} y={T} width={3 * bandW} height={H - B - T} fill={COLORS.accentSoft} />
            <text x={x0 + 8 * bandW + 6} y={T + 12} fontSize={10.5} fill={COLORS.accent} fontWeight={600}>
              08:00–11:00
            </text>
            {hours.map((r) => {
              const bx = x0 + r.h * bandW;
              const w = Math.max(2, bandW - 6);
              return (
                <g key={r.h}>
                  <rect x={bx + 3} y={ys(r.now)} width={w} height={H - B - ys(r.now)} fill={r.h >= 8 && r.h <= 10 ? COLORS.fail : COLORS.cert} opacity={0.88} />
                  <line x1={bx + 3} x2={bx + 3 + w} y1={ys(r.ago)} y2={ys(r.ago)} stroke={COLORS.inkSoft} strokeWidth={2} />
                  {r.h % 2 === 0 && (
                    <text x={bx + 3 + w / 2} y={H - B + 14} textAnchor="middle" fontSize={10} fill={COLORS.muted}>
                      {hhmm(r.h * 60)}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={x0} x2={x1} y1={H - B} y2={H - B} stroke={COLORS.gridStrong} />
          </svg>
        </div>
        <div className="conc-legend">
          <span className="legend-item"><i style={{ background: COLORS.cert }} />16 Nov 2026 filings</span>
          <span className="legend-item"><i style={{ background: COLORS.fail }} />16 Nov, 08:00–10:59</span>
          <span className="legend-item"><i className="line-only" />17 Nov 2025, same hour</span>
        </div>
      </section>

      <section className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hour</th>
              <th className="num">Filings, 2026</th>
              <th className="num">Same hour, 2025</th>
              <th className="num">Multiple</th>
              <th className="num">Weekly certifications, 2026</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((r) => (
              <tr key={r.h} className={r.h >= 8 && r.h <= 10 ? 'row-focus' : undefined}>
                <td>{hhmm(r.h * 60)}–{hhmm(r.h * 60 + 60, true)}</td>
                <td className="num">{fmtInt(r.now)}</td>
                <td className="num">{fmtInt(r.ago)}</td>
                <td className={`num ${r.now / r.ago >= 2 ? 'bad' : ''}`}>{fmtX(r.now / r.ago)}</td>
                <td className="num">{fmtInt(r.cert)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>Monday</td>
              <td className="num">{fmtInt(totalNow)}</td>
              <td className="num">{fmtInt(totalAgo)}</td>
              <td className="num">{fmtX(totalAgo ? totalNow / totalAgo : 0)}</td>
              <td className="num">{fmtInt(hours.reduce((a, r) => a + r.cert, 0))}</td>
            </tr>
          </tbody>
        </table>
        <p className="small muted">
          Surge window in the traces runs {hhmm(M_WINDOW_START)}–{hhmm(M_WINDOW_END, true)}. Last year's figures are the hourly baseline; they do not include any surge.
        </p>
      </section>
    </div>
  );
}
