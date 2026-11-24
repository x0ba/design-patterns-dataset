import { useState } from 'react';
import type { Review } from '../data/types';
import { AGE_BUCKETS, type WeekPoint } from '../analysis/analyze';
import { pct } from '../format';

export const AGE_COLORS = ['#e4572e', '#f3a33c', '#8fb3e8', '#c5cbda'];
export const RATING_COLORS: Record<number, string> = {
  1: '#d64545',
  2: '#e9a23b',
  3: '#2f9e7a',
  4: '#4a6fd8',
};
export const RATING_NAMES: Record<number, string> = {
  1: 'Again (missed)',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

/* ------------------------------------------------------------------ */
/* Six-week view: card-age mix as bars, recall as a line.             */
/* ------------------------------------------------------------------ */

interface WeeklyChartProps {
  weeks: WeekPoint[];
}

export function WeeklyChart({ weeks }: WeeklyChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 260;
  const padL = 42;
  const padR = 18;
  const padT = 14;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const slot = plotW / weeks.length;
  const barW = slot * 0.56;
  const y = (v: number) => padT + plotH - (v / 100) * plotH;

  const linePts = weeks
    .map((w, i) => (w.recall === null ? null : `${padL + slot * i + slot / 2},${y(w.recall)}`))
    .filter(Boolean)
    .join(' ');

  return (
    <div className="weekly">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Six weeks of reviews by card age, with recall as a line" className="weekly-svg">
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 8} y={y(t) + 4} className="axis-label" textAnchor="end">
              {t}%
            </text>
          </g>
        ))}

        {weeks.map((w, i) => {
          const total = w.ageCounts.reduce((a, b) => a + b, 0) || 1;
          let acc = 0;
          const cx = padL + slot * i + (slot - barW) / 2;
          return (
            <g
              key={w.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={hover === i ? 'week-col active' : 'week-col'}
            >
              <rect x={padL + slot * i} y={padT} width={slot} height={plotH} className="week-hit" />
              {w.ageCounts.map((n, k) => {
                const share = (n / total) * 100;
                const top = y(acc + share);
                const h = y(acc) - y(acc + share);
                acc += share;
                return (
                  <rect
                    key={AGE_BUCKETS[k].key}
                    x={cx}
                    y={top}
                    width={barW}
                    height={Math.max(0, h)}
                    fill={AGE_COLORS[k]}
                    opacity={hover === null || hover === i ? 0.9 : 0.5}
                  />
                );
              })}
              <text x={padL + slot * i + slot / 2} y={H - 18} textAnchor="middle" className="axis-label">
                {w.label}
              </text>
            </g>
          );
        })}

        {linePts && <polyline points={linePts} className="recall-line" />}
        {weeks.map((w, i) =>
          w.recall === null ? null : (
            <g key={`dot-${w.label}`}>
              <circle cx={padL + slot * i + slot / 2} cy={y(w.recall)} r={hover === i ? 6 : 4.5} className="recall-dot" />
              <text x={padL + slot * i + slot / 2} y={y(w.recall) - 10} textAnchor="middle" className="recall-label">
                {pct(w.recall)}
              </text>
            </g>
          ),
        )}
      </svg>

      <div className="weekly-legend">
        {AGE_BUCKETS.map((b, k) => (
          <span key={b.key}>
            <i style={{ background: AGE_COLORS[k] }} /> {b.label} old
          </span>
        ))}
        <span>
          <i className="legend-line" /> Recall (share answered Hard, Good or Easy)
        </span>
      </div>

      {hover !== null && weeks[hover] && (
        <div className="weekly-tip" style={{ left: `${((padL + slot * hover + slot / 2) / W) * 100}%` }}>
          <strong>{weeks[hover].label}</strong>
          <div>Reviews: {weeks[hover].reviews.toLocaleString('en-US')}</div>
          <div>Recall: {pct(weeks[hover].recall)}</div>
          <div>New cards (under 3 weeks): {weeks[hover].newShare === null ? '–' : `${Math.round(weeks[hover].newShare!)}% of reviews`}</div>
          <div>Sessions after 10:30pm: {weeks[hover].lateShare === null ? '–' : `${Math.round(weeks[hover].lateShare!)}%`}</div>
          <div>New cards added: {weeks[hover].newCardsAdded}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Side-by-side comparison bars (0–100 scale).                        */
/* ------------------------------------------------------------------ */

export interface BarItem {
  label: string;
  value: number | null;
  n: number;
  tone: 'accent' | 'muted' | 'warn' | 'good';
}

export function CompareBars({ groups }: { groups: { title: string; items: BarItem[] }[] }) {
  return (
    <div className="compare-bars">
      {groups.map((g) => (
        <div className="cb-group" key={g.title}>
          <div className="cb-title">{g.title}</div>
          {g.items.map((it) => (
            <div className="cb-row" key={it.label}>
              <span className="cb-label">{it.label}</span>
              <span className="cb-track">
                <span
                  className={`cb-fill tone-${it.tone}`}
                  style={{ width: `${Math.max(0, Math.min(100, it.value ?? 0))}%` }}
                />
              </span>
              <span className="cb-value">
                {pct(it.value)}
                <span className="cb-n"> n={it.n}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Daily new-card additions with batches of 25+ highlighted.          */
/* ------------------------------------------------------------------ */

export function DailyAdds({ days, label }: { days: { day: number; added: number }[]; label: (day: number) => string }) {
  const max = Math.max(1, ...days.map((d) => d.added));
  const H = 84;
  return (
    <div className="daily-adds">
      <div className="daily-bars" style={{ height: H }}>
        {days.map((d) => (
          <div
            key={d.day}
            className={`daily-bar ${d.added >= 25 ? 'big' : ''}`}
            style={{ height: `${(d.added / max) * 100}%` }}
            title={`${label(d.day)}: ${d.added} new cards`}
          />
        ))}
      </div>
      <div className="daily-axis">
        <span>{label(days[0].day)}</span>
        <span>{label(days[Math.floor(days.length / 2)].day)}</span>
        <span>{label(days[days.length - 1].day)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Every review of one card, by rating lane across six weeks.        */
/* ------------------------------------------------------------------ */

export function ReviewTimeline({ reviews, dayLabel }: { reviews: Review[]; dayLabel: (day: number) => string }) {
  const W = 440;
  const H = 168;
  const padL = 66;
  const padR = 12;
  const padT = 10;
  const padB = 26;
  const lanes = [1, 2, 3, 4] as const;
  const laneH = (H - padT - padB) / lanes.length;
  const x = (day: number) => padL + ((day + 41) / 41) * (W - padL - padR);
  const yLane = (rating: number) => padT + (rating - 1) * laneH + laneH / 2;
  const ticks = [-41, -27, -13, 0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="timeline" role="img" aria-label="Each review of this card, by answer">
      {lanes.map((r) => (
        <g key={r}>
          <line x1={padL} x2={W - padR} y1={yLane(r)} y2={yLane(r)} className="lane" />
          <text x={padL - 8} y={yLane(r) + 4} textAnchor="end" className="axis-label">
            {['', 'Again', 'Hard', 'Good', 'Easy'][r]}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 6} textAnchor={t === 0 ? 'end' : t === -41 ? 'start' : 'middle'} className="axis-label">
          {dayLabel(t)}
        </text>
      ))}
      {reviews.map((r, i) => (
        <circle
          key={`${r.ts}-${i}`}
          cx={x(r.day) + ((i % 3) - 1) * 1.5}
          cy={yLane(r.rating)}
          r={4.2}
          fill={RATING_COLORS[r.rating]}
          opacity={0.9}
        >
          <title>
            {dayLabel(r.day)} at {new Date(r.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}: {RATING_NAMES[r.rating]}, answered in {r.responseSec.toFixed(1)}s
          </title>
        </circle>
      ))}
    </svg>
  );
}
