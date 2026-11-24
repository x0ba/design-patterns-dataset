import { useId, useMemo, useState, type MouseEvent } from 'react';
import { GRID_START, HOUR, SAMPLE, hhmm } from '../lib/time';
import { GRID_N, SERIES, tAt } from '../data/series';

const W = 960;
const H = 280;
const PL = 44;
const PR = 14;
const PT = 14;
const PB = 28;
const IW = W - PL - PR;
const IH = H - PT - PB;
const Y_MIN = 40;
const Y_MAX = 200;
const PT_SHIFT = 8 * HOUR; // Pacific Standard Time

interface Props {
  pid: string;
  from: number;
  to: number;
  /** Highlight a moment (e.g., the alert time). */
  marker?: number;
  markerLabel?: string;
  /** Tick spacing in hours. */
  tickHours?: number;
  label: string;
}

export function GlucoseChart({ pid, from, to, marker, markerLabel, tickHours = 3, label }: Props) {
  const uid = useId().replace(/:/g, '');
  const [hoverT, setHoverT] = useState<number | null>(null);
  const span = to - from;
  const x = (t: number) => PL + ((t - from) / span) * IW;
  const y = (v: number) => PT + (1 - (Math.min(Y_MAX, Math.max(Y_MIN, v)) - Y_MIN) / (Y_MAX - Y_MIN)) * IH;

  const geom = useMemo(() => {
    const s = SERIES[pid];
    const i0 = Math.max(0, Math.floor((from - GRID_START) / SAMPLE));
    const i1 = Math.min(GRID_N - 1, Math.floor((to - GRID_START) / SAMPLE));
    let d = '';
    let pen = false;
    const gaps: [number, number][] = [];
    let gapStart: number | null = null;
    const pts: { t: number; v: number; i: number }[] = [];
    for (let i = i0; i <= i1; i++) {
      const t = tAt(i);
      const v = s.glucose[i];
      if (v === null) {
        if (gapStart === null) gapStart = t;
        pen = false;
        continue;
      }
      if (gapStart !== null) {
        gaps.push([gapStart, t]);
        gapStart = null;
      }
      d += `${pen ? 'L' : 'M'}${x(t).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
      pts.push({ t, v, i });
    }
    if (gapStart !== null) gaps.push([gapStart, Math.min(to, tAt(i1) + SAMPLE)]);

    const nights = s.nights
      .filter((n) => n.end > from && n.start < to)
      .map((n) => [Math.max(n.start, from), Math.min(n.end, to)] as [number, number]);

    const meals = s.meals.filter((m) => m.at >= from && m.at <= to);

    const step = tickHours * HOUR;
    const ticks: number[] = [];
    for (let t = Math.ceil((from - PT_SHIFT) / step) * step + PT_SHIFT; t <= to; t += step) ticks.push(t);

    return { d, gaps, nights, meals, ticks, pts };
  }, [pid, from, to, tickHours]);

  const hoverPoint = useMemo(() => {
    if (hoverT === null) return null;
    const i = Math.round((hoverT - GRID_START) / SAMPLE);
    const v = SERIES[pid].glucose[i] ?? null;
    return { t: tAt(i), v };
  }, [hoverT, pid]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const frac = (vx - PL) / IW;
    if (frac < 0 || frac > 1) {
      setHoverT(null);
      return;
    }
    const t = from + frac * span;
    setHoverT(Math.min(to, Math.max(from, t)));
  };

  const yTicks = [60, 100, 140, 180];
  const clipId = `clip-${uid}`;
  const hatchId = `hatch-${uid}`;

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverT(null)}
      >
        <defs>
          <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#f2f4f7" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#c4cbd5" strokeWidth="2" />
          </pattern>
          <clipPath id={clipId}>
            <rect x={PL} y={PT} width={IW} height={IH} />
          </clipPath>
        </defs>

        {/* Plot frame */}
        <rect x={PL} y={PT} width={IW} height={IH} fill="#ffffff" />

        {/* Sleep windows */}
        {geom.nights.map(([a, b], i) => (
          <rect key={`n${i}`} x={x(a)} y={PT} width={Math.max(0, x(b) - x(a))} height={IH} fill="#eef2f7" />
        ))}

        {/* Missing data */}
        {geom.gaps.map(([a, b], i) => (
          <rect key={`g${i}`} x={x(a)} y={PT} width={Math.max(0, x(b) - x(a))} height={IH} fill={`url(#${hatchId})`} />
        ))}

        {/* Y grid and labels */}
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#e4e8ee" strokeWidth="1" />
            <text x={PL - 8} y={y(v) + 4} textAnchor="end" fontSize="13" fill="#5b6776">{v}</text>
          </g>
        ))}

        {/* Safety and target lines */}
        <line x1={PL} x2={W - PR} y1={y(54)} y2={y(54)} stroke="#b42318" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x={W - PR - 4} y={y(54) - 5} textAnchor="end" fontSize="12" fill="#b42318">54 safety</text>
        <line x1={PL} x2={W - PR} y1={y(70)} y2={y(70)} stroke="#b54708" strokeWidth="1" strokeDasharray="2 4" />
        <text x={W - PR - 4} y={y(70) - 5} textAnchor="end" fontSize="12" fill="#b54708">70</text>

        {/* Trace */}
        <g clipPath={`url(#${clipId})`}>
          <path d={geom.d} fill="none" stroke="#1b2430" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>

        {/* Meal markers */}
        {geom.meals.map((m) => (
          <g key={m.id} transform={`translate(${x(m.at).toFixed(1)} ${PT + IH - 14})`}>
            <circle r="9" fill={m.photo ? '#0d6b6b' : '#ffffff'} stroke="#0d6b6b" strokeWidth="1.5" />
            <text y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill={m.photo ? '#ffffff' : '#0d6b6b'}>
              {m.kind[0]}
            </text>
          </g>
        ))}

        {/* Event marker */}
        {marker !== undefined && marker >= from && marker <= to && (
          <g>
            <line x1={x(marker)} x2={x(marker)} y1={PT} y2={PT + IH} stroke="#1b2430" strokeWidth="1.5" strokeDasharray="3 3" />
            {markerLabel && (
              <text x={x(marker) + 6} y={PT + 16} fontSize="13" fontWeight="600" fill="#1b2430">
                {markerLabel}
              </text>
            )}
          </g>
        )}

        {/* X ticks */}
        {geom.ticks.map((t) => (
          <g key={`t${t}`}>
            <line x1={x(t)} x2={x(t)} y1={PT + IH} y2={PT + IH + 5} stroke="#8a94a3" />
            <text x={x(t)} y={H - 6} textAnchor="middle" fontSize="13" fill="#5b6776">{hhmm(t)}</text>
          </g>
        ))}
        <line x1={PL} x2={W - PR} y1={PT + IH} y2={PT + IH} stroke="#8a94a3" />

        {/* Hover cursor and point */}
        {hoverPoint && (
          <g pointerEvents="none">
            <line x1={x(hoverPoint.t)} x2={x(hoverPoint.t)} y1={PT} y2={PT + IH} stroke="#5b6776" strokeWidth="1" />
            {hoverPoint.v !== null && (
              <circle cx={x(hoverPoint.t)} cy={y(hoverPoint.v)} r="5" fill="#0d6b6b" stroke="#ffffff" strokeWidth="2" />
            )}
          </g>
        )}
      </svg>

      {hoverPoint && (
        <div
          className="chart-tip"
          style={{ left: `${(x(hoverPoint.t) / W) * 100}%` }}
        >
          <strong>{hhmm(hoverPoint.t)}</strong>
          <span>{hoverPoint.v === null ? 'No sensor data' : `${hoverPoint.v} mg/dL`}</span>
        </div>
      )}
    </div>
  );
}
