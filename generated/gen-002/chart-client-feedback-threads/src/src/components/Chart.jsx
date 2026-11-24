import { useRef, useState } from 'react';
import { VERSIONS } from '../data.js';
import { seriesFor, indexLabel, N_MONTHS } from '../lib.js';

const W = 780;
const H = 230;
const M = { l: 50, r: 64, t: 30, b: 26 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const APR_2020 = 15;
const Y2020_START = 12; // Jan 2020
const Y2020_END = 23; // Dec 2020
const OCT_INDEX_V3 = 93;

// Renders the ridership series for one version. Pure view: all state lives in the parent.
export default function Chart({ version, floor, muted, oct, pinned, highlight, flash, onPickIndex, onPinClick }) {
  const v = VERSIONS[version];
  const values = seriesFor(version, oct);
  const last = values.length - 1;
  const max = v.axisMax;
  const min = floor;
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const x = (i) => M.l + (i / (N_MONTHS - 1)) * PW;
  const y = (val) => {
    const c = Math.min(Math.max(val, min), max);
    return M.t + (1 - (c - min) / (max - min)) * PH;
  };
  const bottom = M.t + PH;

  const path = (from, to) => {
    let d = '';
    for (let i = from; i <= to; i++) {
      d += `${i === from ? 'M' : 'L'}${x(i).toFixed(1)},${y(values[i]).toFixed(1)} `;
    }
    return d;
  };

  const ticks = [];
  for (let t = 0; t <= max; t += 20) if (t >= min) ticks.push(t);

  const clipped = values.map((val, i) => (val < min ? i : -1)).filter((i) => i >= 0);
  const aprVal = values[APR_2020];
  const aprClipped = aprVal < min;

  function indexFromEvent(e) {
    const r = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - M.l) / PW) * (N_MONTHS - 1));
    return Math.max(0, Math.min(last, i));
  }

  const hoverVal = hover != null ? values[hover] : null;
  const hoverNote =
    hover === OCT_INDEX_V3 && version === 'v3' ? (oct === 'corrected' ? ' · corrected' : ' · preliminary') : '';
  const tipLeft = hover != null ? x(hover) : 0;
  const tipFlip = tipLeft > W * 0.7;

  // With the 2020 treatment muted, the 2020 span is drawn as a lighter overlay on top of the dark line.
  const mainLine = muted ? path(0, Y2020_START) + path(Y2020_END, last) : path(0, last);

  const pin1Active = flash?.key === 'pin1';
  const pin2Active = flash?.key === 'pin2';

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label={`Ridership recovery chart, ${version}, axis floor ${floor}%`}
        onMouseMove={(e) => setHover(indexFromEvent(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => onPickIndex(indexFromEvent(e))}
      >
        {/* Axis title and pin 2 (the y-axis label note from Sam) */}
        <g
          className={`pin ${pin2Active ? 'pulse' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onPinClick('pin2');
          }}
          key={`p2-${pin2Active ? flash.n : 0}`}
        >
          <circle cx={M.l} cy={M.t - 12} r={8.5} className="pin-dot" />
          <text x={M.l} y={M.t - 8.5} textAnchor="middle" className="pin-num">2</text>
        </g>
        <text x={M.l + 14} y={M.t - 8} className="axis-title">Ridership, % of 2019 average</text>

        {/* Gridlines and y ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={M.l + PW} y1={y(t)} y2={y(t)} className="grid" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="tick">{t}</text>
          </g>
        ))}

        {/* 2019 reference */}
        <line x1={M.l} x2={M.l + PW} y1={y(100)} y2={y(100)} className="ref" />
        <text x={M.l + PW} y={y(100) - 6} textAnchor="end" className="ref-label">2019 average = 100</text>

        {/* X axis: one label per January */}
        {[0, 12, 24, 36, 48, 60, 72, 84].map((i) => (
          <text key={i} x={x(i)} y={bottom + 18} textAnchor={i === 0 ? 'start' : 'middle'} className="tick">
            {2019 + i / 12}
          </text>
        ))}

        {/* Series */}
        <path d={mainLine} className="line" />
        {muted && <path d={path(Y2020_START, Y2020_END)} className="line-muted" />}
        {clipped.map((i) => (
          <circle key={i} cx={x(i)} cy={bottom} r={2.8} className="clip-dot" />
        ))}

        {/* Last point label */}
        <circle cx={x(last)} cy={y(values[last])} r={3.2} className="end-dot" />
        <text x={x(last) + 8} y={y(values[last]) + 4} className="end-label">
          {values[last].toFixed(1)}
          {version === 'v3' && <tspan x={x(last) + 8} dy={13} className="end-sub">{oct === 'corrected' ? 'corrected' : 'prelim'}</tspan>}
        </text>

        {/* Pin 1: the April 2020 low, pinned by Renée */}
        <g
          className={`pin ${pin1Active ? 'pulse' : ''}`}
          key={`p1-${pin1Active ? flash.n : 0}`}
          onClick={(e) => {
            e.stopPropagation();
            onPinClick('pin1');
          }}
        >
          <circle cx={x(APR_2020)} cy={y(aprVal)} r={9} className="pin-dot" />
          <text x={x(APR_2020)} y={y(aprVal) + 3.8} textAnchor="middle" className="pin-num">1</text>
        </g>
        {aprClipped && (
          <text x={x(APR_2020) - 12} y={bottom - 12} textAnchor="end" className="clip-note">
            Apr 2020: {aprVal.toFixed(1)}%, off scale
          </text>
        )}

        {/* Composer pin and highlight ring */}
        {pinned && pinned.version === version && (
          <circle cx={x(pinned.index)} cy={y(values[pinned.index])} r={7} className="pinned-ring" />
        )}
        {highlight && highlight.version === version && (
          <circle
            key={highlight.n}
            cx={x(highlight.index)}
            cy={y(values[highlight.index])}
            r={7}
            className="highlight-ring"
          />
        )}

        {/* Hover and click target */}
        <rect x={M.l} y={M.t} width={PW} height={PH} fill="transparent" className="hit" />
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={bottom} className="guide" />
            <circle cx={x(hover)} cy={y(hoverVal)} r={4} className="hover-dot" />
          </g>
        )}
      </svg>

      {hover != null && (
        <div
          className={`chart-tip ${tipFlip ? 'flip' : ''}`}
          style={{ left: `${(tipLeft / W) * 100}%`, top: `${(y(hoverVal) / H) * 100}%` }}
        >
          <strong>{indexLabel(hover)}</strong> · {hoverVal.toFixed(1)}%{hoverNote}
          {hoverVal < min && <span className="tip-warn"> · below the axis floor</span>}
          <div className="tip-sub">Click to pin this month to your next client message</div>
        </div>
      )}
    </div>
  );
}

