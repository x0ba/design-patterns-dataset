import { ReactNode } from 'react'
import { MType, PStatus, TYPE_LABEL } from './data'

const PATHS: Record<string, ReactNode> = {
  check: <path d="M3.5 8.5l3 3 6-7" />,
  x: <path d="M4 4l8 8M12 4l-8 8" />,
  alert: <><path d="M8 2.2l6.2 11H1.8L8 2.2z" /><path d="M8 6.8v3M8 11.8v.1" /></>,
  clock: <><circle cx="8" cy="8" r="6" /><path d="M8 4.6V8l2.4 1.4" /></>,
  calendar: <><rect x="2" y="3" width="12" height="10.5" rx="1.6" /><path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4" /></>,
  list: <path d="M5 4h8.5M5 8h8.5M5 12h8.5M2.2 4h.1M2.2 8h.1M2.2 12h.1" />,
  inbox: <><path d="M2 9l1.6-5.2a1 1 0 0 1 1-.7h6.8a1 1 0 0 1 1 .7L14 9v3.2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9z" /><path d="M2 9h3.4l.8 1.6h3.6L10.6 9H14" /></>,
  people: <><circle cx="6" cy="5.4" r="2.3" /><path d="M1.8 13c.3-2.3 2-3.6 4.2-3.6s3.9 1.3 4.2 3.6" /><path d="M10.6 3.4a2.2 2.2 0 0 1 0 4.2M12 9.6c1.3.4 2.1 1.5 2.3 3.2" /></>,
  swap: <path d="M3 5.5h9.5M10 3l2.5 2.5L10 8M13 10.5H3.5M6 8l-2.5 2.5L6 13" />,
  phone: <path d="M4 2h2l1 3-1.4 1c.7 1.4 1.8 2.5 3.2 3.2L9.9 8l3.1 1v2a1.8 1.8 0 0 1-2 1.8A9.6 9.6 0 0 1 2.2 4 1.8 1.8 0 0 1 4 2z" />,
  globe: <><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 1.8 2.8 3.8 2.8 6S10 12.2 8 14C6 12.2 5.2 10.2 5.2 8S6 3.8 8 2z" /></>,
  undo: <path d="M5.5 3.5L2.5 6.5l3 3M2.8 6.5h6.4a3.6 3.6 0 0 1 0 7.2H6.5" />,
  send: <path d="M14 2L7 9M14 2l-4.5 12L7 9 2 6.5 14 2z" />,
  chevron: <path d="M6 3.5L10.5 8 6 12.5" />,
  chevdown: <path d="M3.5 6L8 10.5 12.5 6" />,
  flag: <path d="M3.5 14V2.5M3.5 3h8l-1.6 2.8L11.5 8.6h-8" />,
  lock: <><rect x="3" y="7" width="10" height="6.6" rx="1.4" /><path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" /></>,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.2V11M8 4.8v.1" /></>,
  pin: <><path d="M8 14.2s4.6-4 4.6-7.4a4.6 4.6 0 1 0-9.2 0c0 3.4 4.6 7.4 4.6 7.4z" /><circle cx="8" cy="6.8" r="1.6" /></>,
}

export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg className="ico" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  )
}

export function Chip({ tone = 'neutral', children, title, icon }: { tone?: 'neutral' | 'teal' | 'amber' | 'red' | 'green' | 'blue'; children: ReactNode; title?: string; icon?: string }) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  )
}

export function TypeTag({ type }: { type: MType }) {
  return (
    <span className="typetag">
      <i className={`tdot t-${type}`} />
      {TYPE_LABEL[type]}
    </span>
  )
}

const PSTATUS: Record<PStatus, { label: string; tone: 'green' | 'amber' | 'red' | 'blue' }> = {
  confirmed: { label: 'Confirmed', tone: 'green' },
  pending: { label: 'Awaiting reply', tone: 'amber' },
  unavailable: { label: 'On leave', tone: 'red' },
  requested: { label: 'Requested', tone: 'blue' },
  excusal: { label: 'Excusal pending', tone: 'amber' },
  exception: { label: 'Needs OK', tone: 'amber' },
}
export function StatusPill({ status }: { status: PStatus }) {
  const s = PSTATUS[status]
  return (
    <span className={`pill pill-${s.tone}`}>
      <i />
      {s.label}
    </span>
  )
}

export function DotsFor({ statuses }: { statuses: PStatus[] }) {
  return (
    <span className="dots" aria-label={`${statuses.filter((s) => s === 'confirmed').length} of ${statuses.length} confirmed`}>
      {statuses.map((s, i) => (
        <i key={i} className={`d-${PSTATUS[s].tone}`} />
      ))}
    </span>
  )
}
