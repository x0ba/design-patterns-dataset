import { useState } from 'react';
import { CONTAINERS, ContainerId, PLANNED_DAYS, Reading, TODAY_DAY, containerName, PEOPLE } from '../data';
import { checkReading, g } from '../util';

interface Props {
  readings: Reading[];
  visible: ContainerId[];
  mode: 'g' | 'pct';
  questioned: Set<string>;
  selectedId?: string;
  onPick?: (r: Reading) => void;
  width?: number;
  height?: number;
}

export default function Chart({ readings, visible, mode, questioned, selectedId, onPick, width = 780, height = 270 }: Props) {
  const [hover, setHover] = useState<Reading | null>(null);
  const M = { l: 52, r: 18, t: 14, b: 34 };
  const W = width - M.l - M.r;
  const H = height - M.t - M.b;

  const series = CONTAINERS.filter((c) => c.hasFoam && visible.includes(c.id)).map((c) => {
    const rs = readings.filter((r) => r.container === c.id && r.mass != null && !r.second).sort((a, b) => a.day - b.day);
    const start = rs.find((r) => r.day === 0)?.mass ?? rs[0]?.mass ?? 1;
    return { c, rs, start };
  });

  const val = (r: Reading, start: number) => (mode === 'g' ? r.mass! : (r.mass! / start) * 100);
  const all = series.flatMap((s) => s.rs.map((r) => val(r, s.start)));
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (!isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  const step = mode === 'g' ? 0.2 : 2;
  lo = Math.floor((lo - step * 0.3) / step) * step;
  hi = Math.ceil((hi + step * 0.3) / step) * step;
  const x = (d: number) => M.l + (d / PLANNED_DAYS) * W;
  const y = (v: number) => M.t + H - ((v - lo) / (hi - lo)) * H;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);

  return (
    <div className="chart-wrap" style={{ width, height }}>
      <svg width={width} height={height} className="chart">
        <rect x={x(TODAY_DAY)} y={M.t} width={x(PLANNED_DAYS) - x(TODAY_DAY)} height={H} fill="#f1ede3" />
        <text x={(x(TODAY_DAY) + x(PLANNED_DAYS)) / 2} y={M.t + 16} textAnchor="middle" className="chart-note">
          Days 22–28 still to come
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={M.l + W} y1={y(t)} y2={y(t)} stroke="#e6e0d2" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="chart-tick">
              {mode === 'g' ? t.toFixed(1) : `${t.toFixed(0)}%`}
            </text>
          </g>
        ))}
        {[0, 7, 14, 21, 28].map((d) => (
          <g key={d}>
            <line x1={x(d)} x2={x(d)} y1={M.t} y2={M.t + H} stroke="#e6e0d2" strokeDasharray="2 3" />
            <text x={x(d)} y={M.t + H + 18} textAnchor="middle" className="chart-tick">
              Day {d}
            </text>
          </g>
        ))}
        <text x={14} y={M.t + H / 2} transform={`rotate(-90 14 ${M.t + H / 2})`} textAnchor="middle" className="chart-axis">
          {mode === 'g' ? 'Foam mass (g)' : '% of starting mass'}
        </text>
        {series.map(({ c, rs, start }) => {
          const dashed = c.site === 'grandma';
          const pts = rs.map((r) => `${x(r.day)},${y(val(r, start))}`).join(' ');
          return (
            <g key={c.id}>
              <polyline points={pts} fill="none" stroke={c.color} strokeWidth={2} strokeDasharray={dashed ? '6 4' : undefined} />
              {rs.map((r) => {
                const flag = checkReading(readings, r);
                const q = questioned.has(r.id);
                const cx = x(r.day);
                const cy = y(val(r, start));
                return (
                  <g key={r.id}>
                    {(flag || q) && <circle cx={cx} cy={cy} r={9} fill="#fbe3c4" stroke="#c46a12" strokeWidth={1.6} />}
                    {selectedId === r.id && <circle cx={cx} cy={cy} r={12} fill="none" stroke="#1f2a30" strokeWidth={1.4} />}
                    <circle cx={cx} cy={cy} r={dashed ? 3.6 : 2.2} fill={dashed ? '#fff' : c.color} stroke={c.color} strokeWidth={dashed ? 1.8 : 0} />
                    {flag && (
                      <text x={cx - 12} y={cy - 12} textAnchor="end" className="chart-flag">
                        {g(r.mass)}?
                      </text>
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={9}
                      fill="transparent"
                      style={{ cursor: onPick ? 'pointer' : 'default' }}
                      onMouseEnter={() => setHover(r)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => onPick?.(r)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {hover && (() => {
        const s = series.find((s) => s.c.id === hover.container)!;
        const left = x(hover.day);
        const top = y(val(hover, s.start));
        return (
          <div className="chart-tip" style={{ left: Math.min(left + 12, width - 210), top: Math.max(top - 64, 0) }}>
            <div className="chart-tip-t">{containerName(hover.container)} · Day {hover.day}</div>
            <div>
              <b>{g(hover.mass)}</b> · {((hover.mass! / s.start) * 100).toFixed(1)}% of start
            </div>
            <div className="muted">Entered by {PEOPLE[hover.by].short}</div>
          </div>
        );
      })()}
    </div>
  );
}
