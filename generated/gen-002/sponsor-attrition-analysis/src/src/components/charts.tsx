import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { EVENTS, FAIL_WEEKS, FUNNEL, MONTHS, WAVE_SHORT, fmtDay, fmtDayLong } from '../data';
import { COLORS, GROUP_COLORS, fmt, fmtSigned, rate } from '../format';
import { Overview, N_WEEKS, WEEK0 } from '../model';
import { GROUP_LABEL, GROUPS } from '../data';

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const read = () => { setW(el.clientWidth); setH(el.clientHeight); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w, h] as const;
}

export function niceMax(v: number, steps = 4) {
  if (v <= 0) return 1;
  const raw = v / steps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return Math.ceil(v / step) * step;
}
function ticks(max: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const step = [1, 2, 2.5, 5, 10, 20].map((c) => c * mag).find((st) => max / st <= 5 && Math.abs(max / st - Math.round(max / st)) < 1e-6) ?? max / 4;
  return Array.from({ length: Math.round(max / step) + 1 }, (_, i) => step * i);
}
const tickFmt = (v: number) => (v === 0 ? '0' : v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : rate(v, v < 10 && v % 1 ? 1 : 0));

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const flip = x > width - 220;
  return (
    <div className="tooltip" style={{ left: flip ? undefined : x + 14, right: flip ? width - x + 14 : undefined, top: y }}>
      {children}
    </div>
  );
}
export function Dot({ c }: { c: string }) { return <span className="dot" style={{ background: c }} />; }

// ---------------- monthly stacked bars ----------------
export function MonthlyChart({ ov, baselineMode, minHeight = 280 }: { ov: Overview; baselineMode: 'pre' | 'yoy'; minHeight?: number }) {
  const [ref, width, measured] = useWidth<HTMLDivElement>();
  const height = Math.max(measured, minHeight);
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 44, r: 10, t: 40, b: 34 };
  const iw = Math.max(width - m.l - m.r, 10);
  const ih = height - m.t - m.b;
  const n = MONTHS.length;
  const band = iw / n;
  const max = niceMax(Math.max(...ov.total, ...ov.expMonthly.filter((v) => !isNaN(v))));
  const y = (v: number) => m.t + ih - (v / max) * ih;
  const xOfDay = (day: number) => {
    const mi = MONTHS.findIndex((mo) => day >= mo.start && day < mo.start + mo.days);
    const mo = MONTHS[mi];
    return m.l + band * mi + band * 0.15 + ((day - mo.start) / mo.days) * band * 0.7;
  };
  const bw = band * 0.7;
  return (
    <div ref={ref} className="chart fill" style={{ minHeight }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <rect x={m.l + band * 20} y={m.t - 6} width={band * 2} height={ih + 6} fill="#F7F1EC" />
          {ticks(max).map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{tickFmt(t)}</text>
            </g>
          ))}
          {MONTHS.map((mo, i) => {
            const x0 = m.l + band * i + band * 0.15;
            let acc = 0;
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="transparent" />
                {[0, 1, 2].map((g) => {
                  const v = ov.mg[i][g];
                  const y1 = y(acc + v), y0 = y(acc);
                  acc += v;
                  return <rect key={g} x={x0} y={y1} width={bw} height={Math.max(0, y0 - y1)} fill={GROUP_COLORS[g]} opacity={hover === null || hover === i ? 1 : 0.55} />;
                })}
                <text x={x0 + bw / 2} y={m.t + ih + 14} textAnchor="middle" className="axis">{mo.label.slice(0, 3)}</text>
                {mo.month === 0 && <text x={m.l + band * i + 2} y={m.t + ih + 28} className="axis strong">{mo.year}</text>}
                {i >= 20 && hover === null && (
                  <text x={x0 + bw / 2} y={y(ov.total[i]) - 6} textAnchor="middle" className="bar-label">{fmt(ov.total[i])}</text>
                )}
              </g>
            );
          })}
          {/* baseline */}
          {baselineMode === 'pre' ? (
            <>
              <line x1={m.l} x2={width - m.r} y1={y(ov.expMonthly[0])} y2={y(ov.expMonthly[0])} stroke={COLORS.ink} strokeDasharray="4 3" strokeWidth={1.2} />
              <text x={m.l + 4} y={y(ov.expMonthly[0]) - 6} className="annot halo">Baseline {fmt(ov.expMonthly[0])}/mo</text>
            </>
          ) : (
            <path
              d={MONTHS.map((_, i) => (i < 12 ? '' : `${i === 12 ? 'M' : 'L'}${m.l + band * i + band * 0.1},${y(ov.expMonthly[i])} L${m.l + band * (i + 1) - band * 0.1},${y(ov.expMonthly[i])}`)).join(' ')}
              fill="none" stroke={COLORS.ink} strokeDasharray="4 3" strokeWidth={1.2}
            />
          )}
          {/* events */}
          {(() => {
            const price = EVENTS.filter((e) => e.kind === 'price');
            const mig = EVENTS.find((e) => e.kind === 'payment')!;
            const px = price.map((e) => xOfDay(e.day));
            const mx = xOfDay(mig.day);
            return (
              <g>
                <text x={px[0] - 8} y={13} textAnchor="end" className="annot" fill={COLORS.deliberate}>Price letters, waves 1–3</text>
                {px.map((x, i) => <path key={i} d={`M${x - 4},8 L${x + 4},8 L${x},15 Z`} fill={COLORS.deliberate} />)}
                <text x={mx - 8} y={29} textAnchor="end" className="annot" fill={COLORS.payment}>Processor migration</text>
                <path d={`M${mx},20 L${mx + 4},25 L${mx},30 L${mx - 4},25 Z`} fill={COLORS.payment} />
              </g>
            );
          })()}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={m.l + band * (hover + 0.85)} y={m.t} width={width}>
          <div className="tt-title">{MONTHS[hover].label}</div>
          {GROUPS.map((g, gi) => (
            <div className="tt-row" key={g}><span><Dot c={GROUP_COLORS[gi]} />{GROUP_LABEL[g]}</span><b>{fmt(ov.mg[hover][gi])}</b></div>
          ))}
          <div className="tt-row tt-total"><span>Total</span><b>{fmt(ov.total[hover])}</b></div>
          {!isNaN(ov.expMonthly[hover]) && (
            <div className="tt-row muted"><span>vs baseline</span><span>{fmtSigned(ov.total[hover] - ov.expMonthly[hover])}</span></div>
          )}
          {hover === 19 && <div className="tt-note">Aug 4 wave 1 letters · Aug 18 migration · Aug 25 wave 2</div>}
          {hover === 20 && <div className="tt-note">Sep 15 wave 3 letters</div>}
        </Tooltip>
      )}
    </div>
  );
}

// ---------------- sparkline ----------------
export function Sparkline({ series, color, width = 132, height = 26, highlightFrom = 20 }: { series: number[]; color: string; width?: number; height?: number; highlightFrom?: number }) {
  const max = Math.max(...series, 1);
  const bw = width / series.length;
  return (
    <svg width={width} height={height} className="spark">
      {series.map((v, i) => {
        const h = Math.max(1, (v / max) * (height - 2));
        return <rect key={i} x={i * bw + 0.5} y={height - h} width={Math.max(bw - 1.2, 1)} height={h} fill={i >= highlightFrom ? color : '#CFCCC5'} />;
      })}
    </svg>
  );
}

// ---------------- split bar ----------------
export function SplitBar({ values, height = 14, max, showLabels = false }: { values: number[]; height?: number; max?: number; showLabels?: boolean }) {
  const pos = values.map((v) => Math.max(0, v));
  const total = max ?? pos.reduce((a, b) => a + b, 0);
  return (
    <div className="splitbar" style={{ height }}>
      {pos.map((v, i) => (v > 0 && total > 0 ? (
        <div key={i} style={{ width: `${(v / total) * 100}%`, background: GROUP_COLORS[i] }}>
          {showLabels && v / total > 0.08 && <span>{fmt(v)}</span>}
        </div>
      ) : null))}
    </div>
  );
}

// ---------------- daily (Aug–Oct) ----------------
export function DailyChart({ days, expected, start, height = 260 }: { days: number[][]; expected: number[]; start: number; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 40, r: 10, t: 40, b: 30 };
  const iw = Math.max(width - m.l - m.r, 10);
  const ih = height - m.t - m.b;
  const n = days.length;
  const band = iw / n;
  const totals = days.map((d) => d[0] + d[1] + d[2]);
  const max = niceMax(Math.max(...totals));
  const y = (v: number) => m.t + ih - (v / max) * ih;
  const x = (j: number) => m.l + band * j;
  return (
    <div ref={ref} className="chart" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {ticks(max).map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{tickFmt(t)}</text>
            </g>
          ))}
          {days.map((d, j) => {
            let acc = 0;
            const dn = start + j;
            const date = new Date(Date.UTC(2025, 0, 1 + dn));
            return (
              <g key={j} onMouseEnter={() => setHover(j)}>
                <rect x={x(j)} y={m.t} width={band} height={ih} fill="transparent" />
                {[0, 1, 2].map((g) => {
                  const v = d[g];
                  const y1 = y(acc + v), y0 = y(acc);
                  acc += v;
                  return <rect key={g} x={x(j) + band * 0.12} y={y1} width={band * 0.76} height={Math.max(0, y0 - y1)} fill={GROUP_COLORS[g]} opacity={hover === null || hover === j ? 1 : 0.6} />;
                })}
                {(date.getUTCDate() === 1 || date.getUTCDate() === 15) && (
                  <text x={x(j) + band / 2} y={m.t + ih + 16} textAnchor="middle" className={`axis ${date.getUTCDate() === 1 ? 'strong' : ''}`}>{fmtDay(dn)}</text>
                )}
              </g>
            );
          })}
          <path d={expected.map((v, j) => `${j ? 'L' : 'M'}${x(j)},${y(v)} L${x(j + 1)},${y(v)}`).join(' ')} fill="none" stroke={COLORS.ink} strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
          {EVENTS.map((e, i) => {
            const ex = x(e.day - start) + band / 2;
            const col = e.kind === 'price' ? COLORS.deliberate : COLORS.payment;
            const row = e.kind === 'price' ? 0 : 1;
            return (
              <g key={i}>
                <line x1={ex} x2={ex} y1={14 + row * 14} y2={m.t + ih} stroke={col} strokeDasharray="2 3" opacity={0.7} />
                <text x={ex + 4} y={12 + row * 14} className="annot" fill={col}>{e.kind === 'price' ? `${e.short} letters` : 'Migration'} · {fmtDay(e.day)}</text>
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={x(hover) + band} y={m.t} width={width}>
          <div className="tt-title">{fmtDayLong(start + hover)}</div>
          {GROUPS.map((g, gi) => (
            <div className="tt-row" key={g}><span><Dot c={GROUP_COLORS[gi]} />{GROUP_LABEL[g]}</span><b>{fmt(days[hover][gi])}</b></div>
          ))}
          <div className="tt-row tt-total"><span>Total</span><b>{fmt(totals[hover])}</b></div>
          <div className="tt-row muted"><span>Typical for this day</span><span>{fmt(expected[hover])}</span></div>
        </Tooltip>
      )}
    </div>
  );
}

// ---------------- weekly by letter wave ----------------
export function WaveChart({ rates, counts, sends, height = 250, unit }: { rates: number[][]; counts: number[][]; sends: number[]; height?: number; unit: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 40, r: 16, t: 26, b: 30 };
  const iw = Math.max(width - m.l - m.r, 10);
  const ih = height - m.t - m.b;
  const max = niceMax(Math.max(...rates.flat()));
  const y = (v: number) => m.t + ih - (v / max) * ih;
  const step = iw / (N_WEEKS - 1);
  const x = (wk: number) => m.l + step * wk;
  const xDay = (d: number) => m.l + step * ((d - WEEK0) / 7);
  return (
    <div ref={ref} className="chart" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {ticks(max).map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{tickFmt(t)}</text>
            </g>
          ))}
          {Array.from({ length: N_WEEKS }, (_, wk) => (
            <g key={wk}>
              {wk % 2 === 0 && <text x={x(wk)} y={m.t + ih + 16} textAnchor="middle" className="axis">{fmtDay(WEEK0 + wk * 7)}</text>}
              <rect x={x(wk) - step / 2} y={m.t} width={step} height={ih} fill="transparent" onMouseEnter={() => setHover(wk)} />
            </g>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke="#C9C5BC" />}
          {sends.map((d, w) => (
            <g key={w}>
              <line x1={xDay(d)} x2={xDay(d)} y1={m.t - 10} y2={m.t + ih} stroke={COLORS.waves[w]} strokeDasharray="2 3" />
              <text x={xDay(d) + 4} y={m.t - 4} className="annot" fill={COLORS.waves[w]}>{WAVE_SHORT[w]} letter · {fmtDay(d)}</text>
            </g>
          ))}
          {rates.map((row, w) => (
            <g key={w}>
              <path d={row.map((v, wk) => `${wk ? 'L' : 'M'}${x(wk)},${y(v)}`).join(' ')} fill="none" stroke={COLORS.waves[w]} strokeWidth={2} strokeLinejoin="round" />
              {row.map((v, wk) => <circle key={wk} cx={x(wk)} cy={y(v)} r={hover === wk ? 3.5 : 2} fill={COLORS.waves[w]} />)}
            </g>
          ))}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={x(hover)} y={m.t} width={width}>
          <div className="tt-title">Week of {fmtDay(WEEK0 + hover * 7)}{hover === N_WEEKS - 1 ? ' (to Oct 31)' : ''}</div>
          {rates.map((row, w) => (
            <div className="tt-row" key={w}><span><Dot c={COLORS.waves[w]} />{WAVE_SHORT[w]}</span><b>{rate(row[hover])}</b><span className="muted small">&nbsp;({fmt(counts[w][hover])})</span></div>
          ))}
          <div className="tt-note">{unit}</div>
        </Tooltip>
      )}
    </div>
  );
}

// ---------------- failed charges by week ----------------
export function FailChart({ minHeight = 250 }: { minHeight?: number }) {
  const [ref, width, measured] = useWidth<HTMLDivElement>();
  const height = Math.max(measured, minHeight);
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 44, r: 10, t: 22, b: 30 };
  const iw = Math.max(width - m.l - m.r, 10);
  const ih = height - m.t - m.b;
  const n = FAIL_WEEKS.length;
  const band = iw / n;
  const max = niceMax(Math.max(...FAIL_WEEKS.map((w) => w.failed)));
  const y = (v: number) => m.t + ih - (v / max) * ih;
  const migIdx = FAIL_WEEKS.findIndex((w) => !w.pre);
  return (
    <div ref={ref} className="chart fill" style={{ minHeight }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          {ticks(max).map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{tickFmt(t)}</text>
            </g>
          ))}
          <line x1={m.l} x2={width - m.r} y1={y(FUNNEL.preWeekly)} y2={y(FUNNEL.preWeekly)} stroke={COLORS.ink} strokeDasharray="4 3" />
          <text x={m.l + 4} y={y(FUNNEL.preWeekly) - 22} className="annot halo">Pre-migration typical ≈ {FUNNEL.preWeekly}/wk</text>
          {FAIL_WEEKS.map((w, i) => {
            const x0 = m.l + band * i + band * 0.15;
            const bw = band * 0.7;
            const un = w.failed - w.recovered;
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="transparent" />
                <rect x={x0} y={y(un)} width={bw} height={y(0) - y(un)} fill={w.pre ? '#9BA6C8' : COLORS.payment} opacity={hover === null || hover === i ? 1 : 0.6} />
                <rect x={x0} y={y(w.failed)} width={bw} height={y(un) - y(w.failed)} fill={COLORS.paymentSoft} opacity={hover === null || hover === i ? 1 : 0.6} />
                {i % 2 === 0 && <text x={x0 + bw / 2} y={m.t + ih + 16} textAnchor="middle" className="axis">{w.label}</text>}
              </g>
            );
          })}
          <line x1={m.l + band * migIdx} x2={m.l + band * migIdx} y1={m.t - 8} y2={m.t + ih} stroke={COLORS.payment} strokeDasharray="2 3" />
          <text x={m.l + band * migIdx + 5} y={m.t - 2} className="annot" fill={COLORS.payment}>Migration · Aug 18</text>
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={m.l + band * (hover + 0.85)} y={m.t} width={width}>
          <div className="tt-title">Week of {FAIL_WEEKS[hover].label}</div>
          <div className="tt-row"><span>Failed charges</span><b>{fmt(FAIL_WEEKS[hover].failed)}</b></div>
          <div className="tt-row"><span><Dot c={COLORS.paymentSoft} />Recovered</span><b>{fmt(FAIL_WEEKS[hover].recovered)}</b></div>
          <div className="tt-row"><span><Dot c={COLORS.payment} />Still unpaid</span><b>{fmt(FAIL_WEEKS[hover].failed - FAIL_WEEKS[hover].recovered)}</b></div>
          <div className="tt-row muted"><span>Recovery rate</span><span>{Math.round((FAIL_WEEKS[hover].recovered / FAIL_WEEKS[hover].failed) * 100)}%</span></div>
          {hover === migIdx && <div className="tt-note">Migration week: Aug 18–23 only</div>}
        </Tooltip>
      )}
    </div>
  );
}

// ---------------- segment small multiple ----------------
export function MiniRate({ monthly, active, max, title, sub, height = 128 }: { monthly: number[][]; active: number; max: number; title: string; sub: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 28, r: 6, t: 8, b: 18 };
  const iw = Math.max(width - m.l - m.r, 10);
  const ih = height - m.t - m.b;
  const n = monthly.length;
  const step = iw / (n - 1);
  const y = (v: number) => m.t + ih - (Math.min(v, max) / max) * ih;
  const x = (i: number) => m.l + step * i;
  const series = [0, 1].map((g) => monthly.map((row) => (row[g] / Math.max(active, 1)) * 1000));
  return (
    <div className="mini">
      <div className="mini-head"><b>{title}</b><span className="muted">{sub}</span></div>
      <div ref={ref} className="chart" style={{ height }} onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height}>
            <rect x={x(19.5)} y={m.t} width={x(21) - x(19.5) + 4} height={ih} fill="#F7F1EC" />
            {[0, max / 2, max].map((t) => (
              <g key={t}>
                <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
                <text x={m.l - 5} y={y(t) + 3.5} textAnchor="end" className="axis small">{t === 0 ? '0' : rate(t, t % 1 ? 1 : 0)}</text>
              </g>
            ))}
            <text x={x(0)} y={height - 4} className="axis small">Jan 25</text>
            <text x={x(12)} y={height - 4} textAnchor="middle" className="axis small">Jan 26</text>
            <text x={x(21)} y={height - 4} textAnchor="end" className="axis small">Oct 26</text>
            {series.map((s, g) => (
              <path key={g} d={s.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={GROUP_COLORS[g]} strokeWidth={1.8} strokeLinejoin="round" />
            ))}
            {Array.from({ length: n }, (_, i) => (
              <rect key={i} x={x(i) - step / 2} y={m.t} width={step} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
            ))}
            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke="#C9C5BC" />
                {series.map((s, g) => <circle key={g} cx={x(hover)} cy={y(s[hover])} r={3} fill={GROUP_COLORS[g]} />)}
              </>
            )}
          </svg>
        )}
        {hover !== null && (
          <Tooltip x={x(hover)} y={0} width={width}>
            <div className="tt-title">{MONTHS[hover].label}</div>
            {series.map((s, g) => (
              <div className="tt-row" key={g}><span><Dot c={GROUP_COLORS[g]} />{GROUP_LABEL[GROUPS[g]]}</span><b>{rate(s[hover])}</b></div>
            ))}
            <div className="tt-note">per 1,000 active sponsorships</div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
