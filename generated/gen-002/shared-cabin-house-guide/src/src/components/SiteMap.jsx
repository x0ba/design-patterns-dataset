import { BUILDINGS, SITE, BOATHOUSE_REF } from '../data/property.js';
import { shortTitle } from '../lib/lookup.js';
import { pinColor } from './PlanView.jsx';
import { distance, bearing, compass } from '../lib/geo.js';

// Site map in metres. SVG y is flipped: svgY = 104 - y (north is up).
const TOP = 104;
const Y = (y) => TOP - y;

export default function SiteMap({ pins, selectedId, onPin, reference, showRef = true }) {
  const selected = pins.find((p) => p.id === selectedId);
  return (
    <svg className="site-map" viewBox="-6 0 124 116" role="img" aria-label="Property site plan, north up">
      <defs>
        <pattern id="birch-hatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="0.35" fill="#f4efe3" />
        </pattern>
      </defs>

      {/* lake */}
      <rect x="-6" y={Y(8)} width="124" height={Y(-12) - Y(8)} className="site-lake" />
      <text x="88" y={Y(-6)} className="site-water-label">Ten Mile Lake</text>
      <line x1="-6" x2="118" y1={Y(8)} y2={Y(8)} className="site-shore" />

      {/* road */}
      <rect x="-6" y={Y(SITE.road.y + SITE.road.h)} width="124" height={SITE.road.h} className="site-road" />
      <text x="2" y={Y(SITE.road.y) + 4.2} className="site-road-label">road</text>

      {/* lot line */}
      <rect x={SITE.lot.x} y={Y(SITE.lot.y + SITE.lot.h)} width={SITE.lot.w} height={SITE.lot.h} className="site-lot" />

      {/* trees */}
      {SITE.trees.map((t, i) => (
        <circle key={i} cx={t.x} cy={Y(t.y)} r={t.r} className="site-tree" />
      ))}

      {/* birch clump (septic cleanout sits beside it) */}
      <circle cx={SITE.birchClump.x} cy={Y(SITE.birchClump.y)} r={SITE.birchClump.r} className="site-birch" />
      <circle cx={SITE.birchClump.x} cy={Y(SITE.birchClump.y)} r={SITE.birchClump.r} fill="url(#birch-hatch)" />
      <text x={SITE.birchClump.x} y={Y(SITE.birchClump.y) + SITE.birchClump.r + 1.3} className="site-small-label" textAnchor="middle">
        birch clump
      </text>

      {/* driveway */}
      <polyline
        points={SITE.driveway.map((p) => `${p.x},${Y(p.y)}`).join(' ')}
        className="site-drive"
      />

      {/* dock */}
      <rect x={SITE.dock.x} y={Y(SITE.dock.y + SITE.dock.h)} width={SITE.dock.w} height={SITE.dock.h} className="site-dock" />

      {/* buildings */}
      {BUILDINGS.map((b) => (
        <g key={b.id} className={`site-building site-b-${b.id}`}>
          <rect x={b.x} y={Y(b.y + b.h)} width={b.w} height={b.h} />
        </g>
      ))}
      <text x={45} y={Y(47.2)} className="site-building-label" textAnchor="middle">Main cabin</text>
      <text x={58} y={Y(32.4)} className="site-small-label">Bunkhouse</text>
      <text x={74} y={Y(3.6)} className="site-small-label" textAnchor="middle">Boathouse dock</text>
      <text x={33} y={Y(58.4)} className="site-small-label" textAnchor="middle">Woodshed</text>
      <text x={71} y={Y(57.4)} className="site-small-label" textAnchor="middle">Outhouse</text>

      {/* lot corner label */}
      <text x="1" y={Y(96)} className="site-small-label">Sørby lot · 2.3 acres</text>

      {/* measure line from reference to selected pin */}
      {showRef && reference && selected && (
        <g className="site-measure">
          <line x1={reference.x} y1={Y(reference.y)} x2={selected.x} y2={Y(selected.y)} />
          <text
            x={(reference.x + selected.x) / 2}
            y={(Y(reference.y) + Y(selected.y)) / 2 + 2.6}
            textAnchor="middle"
          >
            {`${Math.round(distance(reference, selected))} m ${compass(bearing(reference, selected))}`}
          </text>
        </g>
      )}

      {/* reference point */}
      {showRef && reference && (
        <g className="site-ref" pointerEvents="none">
          <circle cx={reference.x} cy={Y(reference.y)} r="0.9" />
          <line x1={reference.x - 1.6} x2={reference.x + 1.6} y1={Y(reference.y)} y2={Y(reference.y)} />
          <line x1={reference.x} x2={reference.x} y1={Y(reference.y) - 1.6} y2={Y(reference.y) + 1.6} />
        </g>
      )}

      {/* pins */}
      {pins.map((p) => {
        const isSel = p.id === selectedId;
        return (
          <g
            key={p.id}
            className={`site-pin${isSel ? ' is-sel' : ''}`}
            onClick={onPin ? () => onPin(p) : undefined}
            role={onPin ? 'button' : undefined}
            tabIndex={onPin ? 0 : undefined}
            onKeyDown={onPin ? (e) => { if (e.key === 'Enter') onPin(p); } : undefined}
          >
            <title>{`${p.id} · ${p.title}`}</title>
            {isSel && <circle cx={p.x} cy={Y(p.y)} r="2.1" className="site-pin-ring" />}
            <circle cx={p.x} cy={Y(p.y)} r={isSel ? 1.4 : 1.0} style={{ fill: pinColor(p.type) }} />
            <text x={p.x + 1.5} y={Y(p.y) + 0.8} className="site-pin-id">{p.id}</text>
          </g>
        );
      })}

      {/* selected label */}
      {selected && (() => {
        const label = shortTitle(selected.title);
        const w = label.length * 1.4 + 1.8;
        const x = Math.min(Math.max(selected.x - w / 2, -4), 116 - w);
        return (
          <g pointerEvents="none" className="site-callout">
            <rect x={x} y={Y(selected.y) - 6.4} width={w} height="3.2" rx="0.5" />
            <text x={x + 0.8} y={Y(selected.y) - 4.1}>{label}</text>
          </g>
        );
      })()}

      {/* scale bar and north arrow */}
      <g className="site-scale">
        <line x1="2" x2="12" y1={Y(-1)} y2={Y(-1)} />
        <line x1="2" x2="2" y1={Y(-1) - 0.6} y2={Y(-1) + 0.6} />
        <line x1="12" x2="12" y1={Y(-1) - 0.6} y2={Y(-1) + 0.6} />
        <text x="7" y={Y(-1) - 1.1} textAnchor="middle">10 m</text>
      </g>
      <g className="site-north" transform="translate(110 4)">
        <path d="M0 -4 L2.2 3 L0 1.6 L-2.2 3 Z" />
        <text y="7" textAnchor="middle">N</text>
      </g>
    </svg>
  );
}

export const REFERENCES = [
  { id: 'boathouse', label: 'Boathouse (centre)', x: BOATHOUSE_REF.x, y: BOATHOUSE_REF.y },
  { id: 'cabin', label: 'Main cabin (centre)', x: 45, y: 40.5 },
  { id: 'bunkhouse', label: 'Guest bunkhouse', x: 61.5, y: 37 },
  { id: 'woodshed', label: 'Woodshed', x: 33, y: 62 },
];
