import { ORG_TYPES, SLOTS } from '../data/network.js';
import { slotShort } from '../lib/placement.js';

export function OrgBadge({ type }) {
  const color = ORG_TYPES[type]?.color ?? '#64748b';
  return (
    <span className="org">
      <i style={{ background: color }} aria-hidden="true" />
      {type}
    </span>
  );
}

export function SlotChips({ codes, matched = [] }) {
  return (
    <span className="chips">
      {codes.map((code) => (
        <span
          key={code}
          className={`chip slot${matched.includes(code) ? ' match' : ''}`}
          title={SLOTS[code]}
        >
          {slotShort(code)}
        </span>
      ))}
    </span>
  );
}

export function RouteChips({ routes }) {
  return (
    <span className="chips">
      {routes.map((r) => (
        <span key={r} className={`chip route${r === 'Blue Line' ? ' rail' : ''}`}>
          {r}
        </span>
      ))}
    </span>
  );
}

export function Tag({ children, tone = 'neutral' }) {
  return <span className={`tag tone-${tone}`}>{children}</span>;
}

export function SeatBar({ filled, capacity }) {
  const pct = capacity > 0 ? Math.min(100, (filled / capacity) * 100) : 0;
  return (
    <span className="seatbar" aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

// Tone for "how many recommended sites does this student have".
export function optionsTone(n) {
  if (n === 0) return 'danger';
  if (n <= 2) return 'warn';
  return 'ok';
}

export function plural(n, word, others = `${word}s`) {
  return `${n} ${n === 1 ? word : others}`;
}
