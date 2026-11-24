import { useMemo, useState } from 'react';
import type { Row } from '../lib/types';
import { CAT_COLOR, CAT_LABEL, TODAY, dayNum } from '../lib/metrics';
import type { Stat } from '../lib/metrics';
import { dayMonth, days as fmtDays, perHr1, usd0, MINUS_SIGN, signed0, hrs0, pct0 } from '../lib/format';
import { niceTicks, useWidth } from './ui';

// ---------------------------------------------------------------
// Bubble chart: x = median days to sell, y = profit per hour, area = net profit
// ---------------------------------------------------------------
export interface BubbleDatum { stat: Stat; color: string }

export function BubbleChart({ data, selectedKey, onSelect, overall }: {
  data: BubbleDatum[]; selectedKey: string | null; onSelect: (k: string) => void;
  overall: { perHour: number | null; medianDays: number | null };
}) {
  const [ref, wRaw] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const W = Math.max(320, wRaw), H = 350;
  const m = { l: 54, r: 22, t: 18, b: 46 };
  const pts = data.filter((d) => d.stat.medianDays !== null && d.stat.perHour !== null);

  const layout = useMemo(() => {
    const xs = pts.map((d) => d.stat.medianDays as number);
    const ys = pts.map((d) => d.stat.perHour as number);
    const xMax = Math.max(40, Math.max(...xs, overall.medianDays ?? 0) * 1.22);
    const yHi = Math.max(10, Math.max(...ys, overall.perHour ?? 0) * 1.22);
    const yLo = Math.min(0, Math.min(...ys) * 1.3);
    const maxNet = Math.max(1, ...pts.map((d) => d.stat.net));
    return { xMax, yHi, yLo, maxNet };
  }, [pts, overall]);

  const sx = (v: number) => m.l + (v / layout.xMax) * (W - m.l - m.r);
  const sy = (v: number) => m.t + (1 - (v - layout.yLo) / (layout.yHi - layout.yLo)) * (H - m.t - m.b);
  const rad = (net: number) => 7 + 27 * Math.sqrt(Math.max(0, net) / layout.maxNet);

  // greedy label placement so names don't sit on top of each other
  const labels = useMemo(() => {
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const circles = pts.map((d) => ({ x: sx(d.stat.medianDays as number), y: sy(d.stat.perHour as number), r: rad(d.stat.net) }));
    const order = [...pts.keys()].sort((a, b) => circles[b].r - circles[a].r);
    const res: Record<string, { x: number; y: number; anchor: 'start' | 'end' | 'middle'; show: boolean }> = {};
    for (const i of order) {
      const d = pts[i], c = circles[i];
      const text = d.stat.label.replace(/ \(.*\)$/, '');
      const tw = text.length * 6.6 + 4;
      const cands: { x: number; y: number; anchor: 'start' | 'end' | 'middle'; box: [number, number, number, number] }[] = [
        { x: c.x + c.r + 5, y: c.y + 4, anchor: 'start', box: [c.x + c.r + 3, c.y - 8, c.x + c.r + 7 + tw, c.y + 8] },
        { x: c.x - c.r - 5, y: c.y + 4, anchor: 'end', box: [c.x - c.r - 7 - tw, c.y - 8, c.x - c.r - 3, c.y + 8] },
        { x: c.x, y: c.y - c.r - 6, anchor: 'middle', box: [c.x - tw / 2, c.y - c.r - 18, c.x + tw / 2, c.y - c.r - 2] },
        { x: c.x, y: c.y + c.r + 14, anchor: 'middle', box: [c.x - tw / 2, c.y + c.r + 2, c.x + tw / 2, c.y + c.r + 18] },
      ];
      let chosen = cands[0], ok = false;
      for (const cd of cands) {
        const [a, b, c2, d2] = cd.box;
        if (a < m.l - 4 || c2 > W - 2 || b < 2 || d2 > H - m.b + 2) continue;
        if (placed.some((p) => a < p.x1 && c2 > p.x0 && b < p.y1 && d2 > p.y0)) continue;
        // keep clear of every bubble except its own
        if (circles.some((o, j) => j !== i && Math.hypot(o.x - Math.max(a, Math.min(o.x, c2)), o.y - Math.max(b, Math.min(o.y, d2))) < o.r + 2)) continue;
        chosen = cd; ok = true; break;
      }
      if (ok) placed.push({ x0: chosen.box[0], y0: chosen.box[1], x1: chosen.box[2], y1: chosen.box[3] });
      res[d.stat.key] = { x: chosen.x, y: chosen.y, anchor: chosen.anchor, show: ok };
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts, W, layout]);

  const xt = niceTicks(0, layout.xMax, 5);
  const yt = niceTicks(layout.yLo, layout.yHi, 5);
  const hv = pts.find((d) => d.stat.key === hover);

  return (
    <div className="chart-wrap" ref={ref}>
      <svg width={W} height={H} role="img" aria-label="Bubble chart of profit per hour against median days to sell">
        {yt.map((v) => (
          <g key={'y' + v}>
            <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} className={v === 0 ? 'ax-zero' : 'grid'} />
            <text x={m.l - 8} y={sy(v) + 4} textAnchor="end" className="tick">{v < 0 ? MINUS_SIGN : ''}${Math.abs(v)}</text>
          </g>
        ))}
        {xt.map((v) => (
          <g key={'x' + v}>
            <line x1={sx(v)} x2={sx(v)} y1={m.t} y2={H - m.b} className="grid grid-v" />
            <text x={sx(v)} y={H - m.b + 16} textAnchor="middle" className="tick">{v}</text>
          </g>
        ))}
        {overall.perHour !== null && (
          <g>
            <line x1={m.l} x2={W - m.r} y1={sy(overall.perHour)} y2={sy(overall.perHour)} className="ref" />
            <text x={W - m.r - 2} y={sy(overall.perHour) - 5} textAnchor="end" className="ref-label">all items {perHr1(overall.perHour)}</text>
          </g>
        )}
        {overall.medianDays !== null && (
          <g>
            <line x1={sx(overall.medianDays)} x2={sx(overall.medianDays)} y1={m.t} y2={H - m.b} className="ref" />
            <text x={sx(overall.medianDays) + 4} y={H - m.b - 6} className="ref-label">all items {Math.round(overall.medianDays)} d</text>
          </g>
        )}
        <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="axis-title">Median days to sell (listing to sale) →  slower</text>
        <text transform={`translate(13 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">Net profit per hour of work</text>
        <text x={m.l + 6} y={m.t + 12} className="quad">quick and lucrative</text>

        {pts.map((d) => {
          const c = { x: sx(d.stat.medianDays as number), y: sy(d.stat.perHour as number), r: rad(d.stat.net) };
          const sel = selectedKey === d.stat.key;
          const lab = labels[d.stat.key];
          return (
            <g key={d.stat.key} className="bubble" onMouseEnter={() => setHover(d.stat.key)} onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(d.stat.key)} tabIndex={0} role="button" aria-label={`${d.stat.label}: ${perHr1(d.stat.perHour)}, ${fmtDays(d.stat.medianDays)}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d.stat.key); } }}>
              <circle cx={c.x} cy={c.y} r={c.r} fill={d.color} fillOpacity={sel ? 0.9 : 0.62} stroke={sel ? '#201d18' : d.color} strokeWidth={sel ? 2.5 : 1.2} />
              {lab && (lab.show || sel || hover === d.stat.key) && (
                <text x={lab.x} y={lab.y} textAnchor={lab.anchor} className={'blabel' + (sel ? ' sel' : '')}>{d.stat.label.replace(/ \(.*\)$/, '')}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hv && (() => {
        const x = sx(hv.stat.medianDays as number), y = sy(hv.stat.perHour as number);
        const left = x > W * 0.6;
        return (
          <div className="tip" style={{ left: left ? undefined : x + rad(hv.stat.net) + 10, right: left ? W - x + rad(hv.stat.net) + 10 : undefined, top: Math.max(4, y - 40) }}>
            <b>{hv.stat.label}</b>
            <span>{signed0(hv.stat.net)} net · {perHr1(hv.stat.perHour)}</span>
            <span>{hrs0(hv.stat.hours)} logged · {fmtDays(hv.stat.medianDays)} median to sell</span>
            <span>{hv.stat.n} items · {pct0(hv.stat.soldShare * 100)} sold</span>
          </div>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------
// Scatter of sold items: x = days listed, y = net profit
// ---------------------------------------------------------------
export function SalesScatter({ rows, onOpen, activeId }: { rows: Row[]; onOpen: (id: string) => void; activeId: string | null }) {
  const [ref, wRaw] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Row | null>(null);
  const W = Math.max(400, wRaw), H = 270;
  const m = { l: 54, r: 20, t: 14, b: 40 };
  const sold = rows.filter((r) => r.status === 'sold' && r.daysListed !== null);
  const xMax = Math.max(60, Math.ceil((Math.max(0, ...sold.map((r) => r.daysListed as number)) * 1.04) / 30) * 30);
  const yMaxRaw = Math.max(50, ...sold.map((r) => r.net));
  const yMinRaw = Math.min(-10, ...sold.map((r) => r.net));
  const yMax = Math.ceil(yMaxRaw * 1.08 / 50) * 50, yMin = Math.floor(yMinRaw * 1.1 / 25) * 25;
  const sx = (v: number) => m.l + (v / xMax) * (W - m.l - m.r);
  const sy = (v: number) => m.t + (1 - (v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const xt = niceTicks(0, xMax, 8), yt = niceTicks(yMin, yMax, 5);

  const callouts = useMemo(() => {
    if (!sold.length) return [] as Row[];
    const longest = [...sold].sort((a, b) => (b.daysListed as number) - (a.daysListed as number))[0];
    const best = [...sold].sort((a, b) => b.net - a.net)[0];
    const worst = [...sold].sort((a, b) => a.net - b.net)[0];
    return [...new Set([longest, best, worst])];
  }, [sold]);

  function nearest(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best: Row | null = null, bd = 14 * 14;
    for (const r of sold) {
      const dx = sx(r.daysListed as number) - mx, dy = sy(r.net) - my;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = r; }
    }
    setHover(best);
  }

  return (
    <div className="chart-wrap" ref={ref}>
      <svg width={W} height={H} onMouseMove={nearest} onMouseLeave={() => setHover(null)}
        onClick={() => hover && onOpen(hover.id)} style={{ cursor: hover ? 'pointer' : 'default' }} role="img" aria-label="Scatter of every sold item: days listed against net profit">
        {yt.map((v) => (
          <g key={'y' + v}>
            <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} className={v === 0 ? 'ax-zero' : 'grid'} />
            <text x={m.l - 8} y={sy(v) + 4} textAnchor="end" className="tick">{v < 0 ? MINUS_SIGN : ''}${Math.abs(v)}</text>
          </g>
        ))}
        {xt.map((v) => (
          <g key={'x' + v}>
            <line x1={sx(v)} x2={sx(v)} y1={m.t} y2={H - m.b} className="grid grid-v" />
            <text x={sx(v)} y={H - m.b + 16} textAnchor="middle" className="tick">{v}</text>
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 5} textAnchor="middle" className="axis-title">Days from listing to sale →</text>
        <text transform={`translate(13 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">Net profit per item</text>
        {sold.map((r) => (
          <circle key={r.id} cx={sx(r.daysListed as number)} cy={sy(r.net)} r={r.id === activeId || r.id === hover?.id ? 6 : 3.6}
            fill={CAT_COLOR[r.category]} fillOpacity={r.id === hover?.id ? 1 : 0.62} stroke={r.id === activeId || r.id === hover?.id ? '#201d18' : '#fffdf8'} strokeWidth={r.id === activeId || r.id === hover?.id ? 2 : 0.6} />
        ))}
        {callouts.map((r) => {
          const x = sx(r.daysListed as number), y = sy(r.net);
          const right = x < W - 230;
          return (
            <text key={'c' + r.id} x={right ? x + 9 : x - 9} y={y + (r.net < 0 ? 14 : -8)} textAnchor={right ? 'start' : 'end'} className="callout">{r.title}</text>
          );
        })}
      </svg>
      {hover && (
        <div className="tip" style={{ left: sx(hover.daysListed as number) > W * 0.6 ? undefined : sx(hover.daysListed as number) + 14, right: sx(hover.daysListed as number) > W * 0.6 ? W - sx(hover.daysListed as number) + 14 : undefined, top: Math.max(2, sy(hover.net) - 30) }}>
          <b>{hover.title}</b>
          <span>{CAT_LABEL[hover.category]} · {hover.platform}</span>
          <span>{fmtDays(hover.daysListed)} listed · {signed0(hover.net)} net</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Price history step chart for one item
// ---------------------------------------------------------------
export function PriceHistory({ row, width, height = 190, mini = false }: { row: Row; width: number; height?: number; mini?: boolean }) {
  if (row.listDay === null || row.listPrice === undefined) return null;
  const cuts = (row.cuts ?? []).map((c) => ({ day: dayNum(c.date), price: c.price }));
  const end = row.soldDay ?? TODAY;
  const m = mini ? { l: 4, r: 4, t: 6, b: 6 } : { l: 44, r: 16, t: 16, b: 28 };
  const prices = [row.listPrice, ...cuts.map((c) => c.price), row.salePrice ?? row.listPrice];
  const pMax = Math.max(...prices), pMin = Math.min(...prices);
  const lo = mini ? pMin * 0.8 : Math.max(0, pMin - (pMax - pMin) * 0.25 - 4), hi = pMax + (pMax - pMin) * 0.12 + 2;
  const span = Math.max(1, end - row.listDay);
  const sx = (d: number) => m.l + ((d - row.listDay!) / span) * (width - m.l - m.r);
  const sy = (p: number) => m.t + (1 - (p - lo) / (hi - lo)) * (height - m.t - m.b);

  let d = `M${sx(row.listDay)},${sy(row.listPrice)}`;
  let cur = row.listPrice;
  for (const c of cuts) { d += `H${sx(c.day)}V${sy(c.price)}`; cur = c.price; }
  d += `H${sx(end)}`;
  const sale = row.status === 'sold' ? row.salePrice! : null;
  const ticks = niceTicks(lo, hi, 4);
  const xticks = (() => {
    // quarter-ish ticks by month starts
    const out: { d: number; label: string }[] = [];
    const step = span > 240 ? 90 : span > 100 ? 30 : span > 40 ? 14 : 7;
    for (let t = 0; t <= span; t += step) out.push({ d: row.listDay! + t, label: dayMonth(new Date((row.listDay! + t) * 86400000).toISOString().slice(0, 10)) });
    return out;
  })();

  return (
    <svg width={width} height={height} role="img" aria-label="Asking price over time" className={mini ? 'ph-mini' : 'ph'}>
      {!mini && ticks.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={width - m.r} y1={sy(v)} y2={sy(v)} className="grid" />
          <text x={m.l - 6} y={sy(v) + 4} textAnchor="end" className="tick">${Math.round(v)}</text>
        </g>
      ))}
      {!mini && xticks.map((t) => (
        <text key={t.d} x={sx(t.d)} y={height - 8} textAnchor={t.d === row.listDay ? 'start' : 'middle'} className="tick">{t.label}</text>
      ))}
      {!mini && row.cost > lo && row.cost < hi && (
        <g>
          <line x1={m.l} x2={width - m.r} y1={sy(row.cost)} y2={sy(row.cost)} className="ref" />
          <text x={width - m.r} y={sy(row.cost) - 5} textAnchor="end" className="ref-label">your cost {usd0(row.cost)}</text>
        </g>
      )}
      <path d={d} className="ph-line" />
      {cuts.map((c, i) => (
        <g key={i}>
          <circle cx={sx(c.day)} cy={sy(c.price)} r={mini ? 2.5 : 4} className="ph-cut" />
          {!mini && <text x={sx(c.day)} y={sy(c.price) - 9} textAnchor="middle" className="ph-cutlabel">{MINUS_SIGN}{Math.round(row.cutPcts[i])}%</text>}
        </g>
      ))}
      <circle cx={sx(row.listDay)} cy={sy(row.listPrice)} r={mini ? 2.5 : 4} className="ph-start" />
      {sale !== null && (
        <g>
          {sale !== cur && <line x1={sx(end)} x2={sx(end)} y1={sy(cur)} y2={sy(sale)} className="ph-offer" />}
          <circle cx={sx(end)} cy={sy(sale)} r={mini ? 3.5 : 6} className="ph-sale" />
          {!mini && <text x={sx(end) - 9} y={sy(sale) + 4} textAnchor="end" className="ph-salelabel">sold {usd0(sale)}</text>}
        </g>
      )}
      {sale === null && <circle cx={sx(end)} cy={sy(cur)} r={mini ? 3 : 5} className="ph-now" />}
    </svg>
  );
}

