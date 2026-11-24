import { useMemo, useState } from 'react';
import { PRESERVE, SPECIES_COLOR } from '../data/collection';
import type { Specimen } from '../types';

/*
 * Map in miles from the preserve (north is up). Positions use a local flat
 * projection, which is accurate enough across the scales used here.
 */

const MILES_PER_DEG_LAT = 69.0;
const MILES_PER_DEG_LON = 69.17 * Math.cos((PRESERVE.lat * Math.PI) / 180);

function project(s: Specimen) {
  return {
    x: (s.longitude - PRESERVE.lon) * MILES_PER_DEG_LON,
    y: -(s.latitude - PRESERVE.lat) * MILES_PER_DEG_LAT,
  };
}

const SCALES = {
  center: { label: 'Preserve, 2.5 miles', half: 2.5 },
  close: { label: 'Close, 12 miles', half: 12 },
  county: { label: 'County, 45 miles', half: 45 },
} as const;

interface MapViewProps {
  results: Specimen[];
  onOpen: (id: string) => void;
}

export function MapView({ results, onOpen }: MapViewProps) {
  const [scale, setScale] = useState<keyof typeof SCALES>('close');
  const half = SCALES[scale].half;

  const points = useMemo(() => results.map((s) => ({ spec: s, ...project(s) })), [results]);
  const inView = points.filter((p) => Math.abs(p.x) <= half && Math.abs(p.y) <= half);
  const outside = points.length - inView.length;

  const legend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of results) counts.set(s.epithet, (counts.get(s.epithet) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [results]);

  const dotR = half <= 3 ? 0.08 : half <= 12 ? 0.3 : 0.6;
  const ringLabel = (r: number) => `${r} mi`;

  return (
    <div className='map'>
      <div className='map__controls'>
        {(Object.keys(SCALES) as (keyof typeof SCALES)[]).map((k) => (
          <button key={k} type='button' className='chip' aria-pressed={scale === k} onClick={() => setScale(k)}>
            {SCALES[k].label}
          </button>
        ))}
      </div>

      <div className='map__stage'>
        <svg
          className='map__svg'
          viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
          preserveAspectRatio='xMidYMid meet'
          role='img'
          aria-label={`Map of ${inView.length} sheets around ${PRESERVE.name}`}
        >
          <rect x={-half} y={-half} width={half * 2} height={half * 2} fill='#eef0e6' />
          {[1, 5, 10, 25].filter((r) => r <= half).map((r) => (
            <g key={r}>
              <circle
                cx={0}
                cy={0}
                r={r}
                fill='none'
                stroke={r === 10 ? '#2f6d4f' : '#9aa48f'}
                strokeWidth={r === 10 ? 0.12 : 0.08}
                strokeDasharray={r === 10 ? '0' : '0.6 0.6'}
              />
              <text x={0} y={-r - 0.3} fontSize={half / 36} textAnchor='middle' fill='#56604c'>
                {ringLabel(r)}
              </text>
            </g>
          ))}
          <g>
            <line x1={-half * 0.04} y1={0} x2={half * 0.04} y2={0} stroke='#1d2b22' strokeWidth={half * 0.012} />
            <line x1={0} y1={-half * 0.04} x2={0} y2={half * 0.04} stroke='#1d2b22' strokeWidth={half * 0.012} />
            <text x={0} y={half * 0.1} textAnchor='middle' fontSize={half / 34} fill='#1d2b22' fontWeight='600'>
              {PRESERVE.name}
            </text>
          </g>
          {inView.map(({ spec, x, y }) => (
            <circle
              key={spec.catalogNumber}
              cx={x}
              cy={y}
              r={dotR}
              fill={SPECIES_COLOR[spec.epithet] ?? '#444'}
              stroke={spec.imaged ? '#ffffff' : '#222'}
              strokeDasharray={spec.imaged ? undefined : `${dotR * 0.5} ${dotR * 0.4}`}
              strokeWidth={dotR * (spec.imaged ? 0.3 : 0.4)}
              className='map__dot'
              role='button'
              tabIndex={0}
              aria-label={`${spec.catalogNumber}, ${spec.currentName}, ${spec.date.year}, ${spec.locality}`}
              onClick={() => onOpen(spec.catalogNumber)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpen(spec.catalogNumber);
              }}
            >
              <title>{`${spec.catalogNumber} · ${spec.currentName} · ${spec.date.year} · ${spec.locality}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className='map__side'>
        <h3>Sheets on this map</h3>
        <p className='muted'>
          {inView.length} shown{outside > 0 ? `, ${outside} outside this view. Use the County view to see more.` : '.'}
        </p>
        <ul className='legend'>
          {legend.map(([ep, n]) => (
            <li key={ep}>
              <span className='swatch' style={{ background: SPECIES_COLOR[ep] }} aria-hidden='true' />
              <span>
                Penstemon <em>{ep}</em>
              </span>
              <span className='check__count'>{n}</span>
            </li>
          ))}
        </ul>
        <p className='muted small'>
          Touch a dot to open the sheet. Dashed outlines mark sheets on loan and not imaged.
        </p>
      </div>
    </div>
  );
}
