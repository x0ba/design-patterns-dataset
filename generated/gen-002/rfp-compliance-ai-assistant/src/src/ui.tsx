import type { ReactNode } from 'react';
import { PEOPLE, CRITERIA, type PersonId, type Status, type Crit } from './data';
import type { Req } from './state';

export function StatusPill({ status, conflict }: { status: Status; conflict?: boolean }) {
  const label = status === 'addressed' ? 'Addressed' : status === 'partial' ? 'Partial' : conflict ? 'Missing · conflicts' : 'Missing';
  return <span className={`pill pill-${status}`}><i className="dot" />{label}</span>;
}

export function ReviewMark({ r, withLabel }: { r: Req; withLabel?: boolean }) {
  const map = {
    unreviewed: { cls: 'rv-un', glyph: '', label: 'Unreviewed' },
    accepted: { cls: 'rv-ok', glyph: '✓', label: 'Accepted' },
    corrected: { cls: 'rv-fix', glyph: '✎', label: r.added ? 'Added by you' : 'Corrected' },
    rejected: { cls: 'rv-no', glyph: '✕', label: 'Mapping rejected' },
    removed: { cls: 'rv-rm', glyph: '−', label: 'Removed' },
  }[r.review];
  return (
    <span className={`rv ${map.cls}`} title={map.label}>
      <span className="rv-glyph">{map.glyph}</span>
      {withLabel && <span className="rv-label">{map.label}{r.reviewedAt ? ` · ${r.reviewedAt}` : ''}</span>}
    </span>
  );
}

export function Avatar({ id, size = 22 }: { id: PersonId; size?: number }) {
  const p = PEOPLE[id];
  return (
    <span className="avatar" style={{ background: p.color, width: size, height: size, fontSize: size * 0.42 }} title={`${p.name}, ${p.role}`}>
      {p.initials}
    </span>
  );
}

export function ConfMeter({ conf }: { conf: number }) {
  const pct = Math.round(conf * 100);
  const cls = conf < 0.75 ? 'low' : conf < 0.85 ? 'mid' : 'high';
  return (
    <span className={`conf conf-${cls}`} title={`Model confidence ${pct}%`}>
      <span className="conf-track"><span className="conf-fill" style={{ width: `${pct}%` }} /></span>
      <span className="conf-num">{pct}</span>
    </span>
  );
}

export function CritTag({ crit, passFail }: { crit: Crit; passFail?: boolean }) {
  const c = CRITERIA[crit];
  return (
    <>
      {crit !== 'R' && <span className={`tag tag-crit`}>{c.short} · {c.weight} pts</span>}
      {(crit === 'R' || passFail) && <span className="tag tag-pf">Pass/fail</span>}
    </>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Icon({ name, size = 14 }: { name: 'check' | 'x' | 'pen' | 'send' | 'search' | 'alert' | 'link' | 'doc' | 'download' | 'undo' | 'arrow' | 'clock' | 'flag' | 'plus'; size?: number }) {
  const p: Record<string, ReactNode> = {
    check: <path d="M3.5 8.5l3 3 6-7" />,
    x: <path d="M4 4l8 8M12 4l-8 8" />,
    pen: <path d="M10.5 2.5l3 3L6 13H3v-3z" />,
    send: <path d="M2 8l12-5-5 12-2-5z" />,
    search: <><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></>,
    alert: <><path d="M8 2l6.5 11.5h-13z" /><path d="M8 6.5v3M8 11.5v.5" /></>,
    link: <path d="M6.5 9.5l3-3M5 8l-1.5 1.5a2.1 2.1 0 003 3L8 11M11 8l1.5-1.5a2.1 2.1 0 00-3-3L8 5" />,
    doc: <><path d="M4 1.5h5.5L12.5 4.5V14.5h-8.5z" /><path d="M9.5 1.5v3h3M6 8h4.5M6 10.5h4.5" /></>,
    download: <path d="M8 2v8M4.5 7L8 10.5 11.5 7M3 13.5h10" />,
    undo: <path d="M5 4L2 7l3 3M2 7h7.5a3.5 3.5 0 010 7H7" />,
    arrow: <path d="M3 8h10M9 4l4 4-4 4" />,
    clock: <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></>,
    flag: <path d="M3.5 14V2.5M3.5 3h8l-2 3 2 3h-8" />,
    plus: <path d="M8 3v10M3 8h10" />,
  };
  return (
    <svg className="ico" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p[name]}
    </svg>
  );
}
