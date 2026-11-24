import { ReactNode } from 'react';
import { ME, PEOPLE, PersonId } from '../data';

export function Avatar({ id, size = 28 }: { id: PersonId; size?: number }) {
  const p = PEOPLE[id];
  return (
    <span
      className="avatar"
      title={p.name}
      style={{ width: size, height: size, fontSize: size * 0.38, background: p.tint, color: p.color, borderColor: p.color + '55' }}
    >
      {p.initials}
    </span>
  );
}

export function Who({ id, strong = true }: { id: PersonId; strong?: boolean }) {
  const p = PEOPLE[id];
  const label = id === ME ? 'You' : p.short;
  return strong ? (
    <b className="who" style={{ color: p.color }}>
      {label}
    </b>
  ) : (
    <span className="who" style={{ color: p.color }}>
      {label}
    </span>
  );
}

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s = { width: size, height: size };
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, ReactNode> = {
    changes: <><circle cx="12" cy="12" r="8.5" {...common} /><path d="M12 7.5V12l3 2" {...common} /></>,
    bulb: <><path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3.5Z" {...common} /></>,
    list: <><path d="M9 6.5h11M9 12h11M9 17.5h11" {...common} /><circle cx="4.5" cy="6.5" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="17.5" r="1" fill="currentColor" /></>,
    data: <><path d="M4 19.5h16M6.5 16V11M11 16V6.5M15.5 16v-3.5M20 16V9" {...common} /></>,
    photo: <><rect x="3.5" y="6" width="17" height="13" rx="2" {...common} /><path d="M8.5 6l1.4-2h4.2l1.4 2" {...common} /><circle cx="12" cy="12.5" r="3.3" {...common} /></>,
    flag: <><path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11" {...common} /></>,
    pen: <><path d="M14.5 5.5l4 4L9 19H5v-4l9.5-9.5Z" {...common} /></>,
    people: <><circle cx="9" cy="8.5" r="3.2" {...common} /><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" {...common} /><circle cx="16.5" cy="9.5" r="2.5" {...common} /><path d="M16 14.3c2.3 0 4 1.5 4.5 4" {...common} /></>,
    lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" {...common} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...common} /></>,
    chat: <><path d="M4.5 5.5h15v10h-8l-4 3.5v-3.5h-3Z" {...common} /></>,
    question: <><circle cx="12" cy="12" r="8.5" {...common} /><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.6-2.4 2-2.4 3.5" {...common} /><circle cx="12" cy="17" r=".9" fill="currentColor" /></>,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" {...common} />,
    x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...common} />,
    warn: <><path d="M12 4l9 16H3Z" {...common} /><path d="M12 10v4.5" {...common} /><circle cx="12" cy="17.2" r=".9" fill="currentColor" /></>,
    plus: <path d="M12 5v14M5 12h14" {...common} />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...common} />,
    home: <><path d="M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5" {...common} /></>,
    car: <><path d="M5 16.5V12l2-4.5h10l2 4.5v4.5M3.5 12h17" {...common} /><circle cx="8" cy="16.5" r="1.6" {...common} /><circle cx="16" cy="16.5" r="1.6" {...common} /></>,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...common} /><circle cx="12" cy="12" r="2.8" {...common} /></>,
    quote: <path d="M6 10.5c0-2.5 1.5-4 3.5-4.5M6 10.5h3.5V15H6v-4.5ZM14 10.5c0-2.5 1.5-4 3.5-4.5M14 10.5h3.5V15H14v-4.5Z" {...common} />,
    calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2" {...common} /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" {...common} /></>,
    upload: <><path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9M4.5 15v4.5h15V15" {...common} /></>,
    chevron: <path d="M9 6l6 6-6 6" {...common} />,
  };
  return (
    <svg viewBox="0 0 24 24" style={s} aria-hidden="true" className="icon">
      {paths[name]}
    </svg>
  );
}
