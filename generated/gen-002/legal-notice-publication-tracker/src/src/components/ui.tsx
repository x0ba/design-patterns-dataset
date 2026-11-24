import type { ReactNode } from 'react';
import { STAFF } from '../data';
import { STATUS_LABEL } from '../logic';
import type { Insertion, StaffId, Status } from '../types';
import { d } from '../dates';

const P: Record<string, ReactNode> = {
  overview: <><path d="M3 4h7v7H3zM14 4h7v4h-7zM14 12h7v8h-7zM3 15h7v5H3z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  affidavit: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 13l2 2 4-4" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 3h6l1-3h5" /></>,
  bell: <><path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" /><path d="M10 21h4" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  close: <><path d="M6 6l12 12M18 6L6 18" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  alert: <><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4.5M12 17.5v.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  paper: <><path d="M4 5h13v14a2 2 0 002 2H6a2 2 0 01-2-2z" /><path d="M17 9h3v10a2 2 0 01-2 2M7 9h7M7 13h7M7 17h4" /></>,
  phone: <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" /></>,
  chevron: <><path d="M9 6l6 6-6 6" /></>,
  chevronLeft: <><path d="M15 6l-6 6 6 6" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6" /></>,
  filter: <><path d="M4 5h16l-6 8v6l-4-2v-4z" /></>,
  send: <><path d="M4 12l16-8-6 16-3-7z" /></>,
  undo: <><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 010 10h-3" /></>,
  sparkle: <><path d="M12 3v18M3 12h18" /></>,
  dot: <><circle cx="12" cy="12" r="4" /></>,
};

export function Icon({ name, size = 16, className }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {P[name]}
    </svg>
  );
}

export function StatusPill({ status, small }: { status: Status; small?: boolean }) {
  return (
    <span className={`pill pill-${status}${small ? ' pill-sm' : ''}`}>
      <span className="pill-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Avatar({ id, size = 24 }: { id: StaffId; size?: number }) {
  const s = STAFF[id];
  return (
    <span className={`avatar av-${id}`} style={{ width: size, height: size, fontSize: size * 0.42 }} title={`${s.name} — ${s.covers}`}>
      {s.initials}
    </span>
  );
}

const INS_TITLE: Record<Insertion['state'], string> = {
  published: 'Ran — confirmed by paper',
  confirmed: 'Booked — paper confirmed placement',
  unconfirmed: 'Booked — no confirmation from paper',
  not_published: 'Did not run',
  edition_cancelled: 'Edition cancelled',
};

export function InsChip({ ins, invalid }: { ins: Insertion; invalid?: boolean }) {
  const dt = d(ins.date);
  const label = `${dt.toLocaleDateString('en-US', { weekday: 'short' })} ${dt.getMonth() + 1}/${dt.getDate()}`;
  return (
    <span className={`ins ins-${ins.state}${invalid ? ' ins-invalid' : ''}`} title={`${INS_TITLE[ins.state]}${invalid ? ' — after last legal run date' : ''}`}>
      {ins.state === 'published' && <Icon name="check" size={11} />}
      {ins.state === 'unconfirmed' && <span className="ins-q">?</span>}
      {(ins.state === 'not_published' || ins.state === 'edition_cancelled') && <Icon name="close" size={10} />}
      {label}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}
