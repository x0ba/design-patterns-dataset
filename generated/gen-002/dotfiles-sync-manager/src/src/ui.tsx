import type { ReactNode } from 'react'
import { MACHINES, NOW, type MachineId } from './data'

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={'switch' + (on ? ' on' : '')}
      onClick={() => onChange(!on)}
    >
      <span className="knob" />
    </button>
  )
}

export function Check({ on, onChange, label, children }: { on: boolean; onChange: (v: boolean) => void; label?: string; children?: ReactNode }) {
  return (
    <label className={'check' + (on ? ' on' : '')}>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="box" aria-hidden>
        <Icon name="check" size={11} />
      </span>
      {children}
    </label>
  )
}

export function Dot({ m, size = 8 }: { m: MachineId; size?: number }) {
  return <span className="mdot" style={{ background: MACHINES[m].color, width: size, height: size }} aria-hidden />
}

export function MName({ m }: { m: MachineId }) {
  return (
    <span className="mname">
      <Dot m={m} />
      {MACHINES[m].name}
    </span>
  )
}

export function Scope({ kind }: { kind: 'inherited' | 'override' | 'shared' | MachineId }) {
  if (kind === 'inherited') return <span className="scope inherited">Inherited</span>
  if (kind === 'override') return <span className="scope override">pi-media only</span>
  if (kind === 'shared') return <span className="scope inherited">Shared</span>
  return (
    <span className="scope from">
      <Dot m={kind} size={6} />
      {MACHINES[kind].name} only
    </span>
  )
}

export function relTime(d: Date | null): string {
  if (!d) return 'never synced'
  const mins = Math.round((NOW.getTime() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const days = Math.round(h / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const PATHS: Record<string, ReactNode> = {
  check: <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  lock: (
    <>
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  unlock: (
    <>
      <rect x="3.5" y="7" width="9" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 014.8-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  warn: (
    <>
      <path d="M8 2l6.5 11.5h-13z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6.5v3M8 11.5v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.5v3.5M8 5v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  arrow: <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  back: <path d="M13 8H3M7 4L3 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  chev: <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  file: (
    <>
      <path d="M4 2h5l3 3v9H4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 2v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  terminal: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 6l2 2-2 2M8 10.5h3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  conflict: (
    <>
      <path d="M5 2v6a3 3 0 003 3h3M11 2v12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5" cy="2.8" r="1" fill="currentColor" />
    </>
  ),
  alias: <path d="M3 4h10M3 8h6M3 12h8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
  undo: <path d="M4 6h6a3 3 0 010 6H7M4 6l2.5-2.5M4 6l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  sync: (
    <path
      d="M13 6.5A5 5 0 004 5M3 9.5A5 5 0 0012 11M4 2v3h3M12 14v-3H9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  shield: (
    <>
      <path d="M8 1.8l5 2v4c0 3-2.2 5.2-5 6.4-2.8-1.2-5-3.4-5-6.4v-4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.8 8l1.6 1.6 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  x: <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
}

export function Icon({ name, size = 14 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      {PATHS[name]}
    </svg>
  )
}

export function Callout({ tone = 'warn', children, action }: { tone?: 'warn' | 'info' | 'ok'; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={'callout ' + tone}>
      <span className="callout-icon">
        <Icon name={tone === 'ok' ? 'check' : tone === 'warn' ? 'warn' : 'info'} />
      </span>
      <div className="callout-body">{children}</div>
      {action && <div className="callout-action">{action}</div>}
    </div>
  )
}
