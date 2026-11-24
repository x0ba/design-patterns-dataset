import { PIN_TYPES } from '../data/types.js';
import { isoToDate } from '../lib/useNow.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(iso) {
  const d = isoToDate(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export function TypeChip({ type, small }) {
  const color = PIN_TYPES[type]?.color || '#56606b';
  return (
    <span className={`type-chip${small ? ' small' : ''}`} style={{ '--c': color }}>
      {type}
    </span>
  );
}

// Pictogram per pin type, drawn in SVG so the tile stands in for a photo.
const GLYPHS = {
  Shutoff: <><circle cx="12" cy="12" r="7" /><path d="M5 12h14M12 5v14" /></>,
  Electrical: <path d="M13 3 5 14h6l-1 7 8-11h-6z" />,
  Drain: <path d="M12 3c3 4.5 5.5 7.5 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 10.5 9 7.5 12 3z" />,
  Appliance: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="12" cy="12" r="3.2" /></>,
  Propane: <><rect x="7" y="4" width="10" height="16" rx="5" /><path d="M10 4V2h4v2" /></>,
  Septic: <><rect x="4" y="7" width="16" height="11" rx="2" /><path d="M4 11h16" /></>,
  Chimney: <><path d="M8 20V8h8v12" /><path d="M7 8h10l-1-4H8z" /></>,
  Access: <><rect x="5" y="3" width="14" height="18" /><circle cx="15" cy="12" r="1" /></>,
  Quirk: <><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17.2v.1" /></>,
  Safety: <><rect x="9" y="3" width="6" height="4" /><rect x="7" y="7" width="10" height="14" rx="3" /></>,
  Outdoor: <><path d="M12 3 5 13h4l-3 6h12l-3-6h4z" /></>,
};

export function PhotoTile({ pin }) {
  const color = PIN_TYPES[pin.type]?.color || '#56606b';
  return (
    <figure className="photo-tile" style={{ '--c': color }}>
      <div className="photo-art" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {GLYPHS[pin.type]}
        </svg>
      </div>
      <figcaption>
        Pinned by {pin.by} · {shortDate(pin.at)}
        <span className="photo-note">Pictogram stands in for the photo</span>
      </figcaption>
    </figure>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
