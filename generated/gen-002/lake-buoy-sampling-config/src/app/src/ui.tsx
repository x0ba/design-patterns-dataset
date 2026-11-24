import type { ReactNode } from 'react'

export function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? 'on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <span className="knob" />
    </button>
  )
}

export function Was({ children }: { children: ReactNode }) {
  return <span className="was">was {children}</span>
}

export function Badge({ tone, children, title }: { tone: 'warn' | 'bad' | 'ok' | 'muted' | 'accent' | 'edit'; children: ReactNode; title?: string }) {
  return <span className={`badge ${tone}`} title={title}>{children}</span>
}

export function ViewHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="view-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right && <div className="view-head-right">{right}</div>}
    </header>
  )
}
