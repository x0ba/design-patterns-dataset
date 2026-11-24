import { ReactNode } from 'react'

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={'switch' + (checked ? ' on' : '')}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

export function Card({
  title,
  sub,
  right,
  children,
  className = '',
  pad = true,
}: {
  title?: ReactNode
  sub?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  pad?: boolean
}) {
  return (
    <section className={'card ' + className}>
      {(title || right) && (
        <header className="card-h">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p className="muted small">{sub}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={pad ? 'card-b' : ''}>{children}</div>
    </section>
  )
}

export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'accent'; children: ReactNode }) {
  return <span className={'pill ' + tone}>{children}</span>
}

export type IconName = 'watch' | 'bell' | 'bill' | 'plug' | 'flame' | 'clock' | 'check' | 'alert' | 'bolt' | 'arrow' | 'send' | 'undo'

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'watch':
      return (
        <svg {...p}>
          <path d="M3 17l5-7 4 5 3-4 6 6" />
          <path d="M3 21h18" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...p}>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" />
          <path d="M10 21h4" />
        </svg>
      )
    case 'bill':
      return (
        <svg {...p}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      )
    case 'plug':
      return (
        <svg {...p}>
          <path d="M9 3v5M15 3v5" />
          <path d="M6 8h12v3a6 6 0 0 1-12 0z" />
          <path d="M12 17v4" />
        </svg>
      )
    case 'flame':
      return (
        <svg {...p}>
          <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-3-.5-5 1-8z" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'check':
      return (
        <svg {...p}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...p}>
          <path d="M12 4l9 16H3z" />
          <path d="M12 10v4M12 17.2v.1" />
        </svg>
      )
    case 'bolt':
      return (
        <svg {...p}>
          <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
        </svg>
      )
    case 'arrow':
      return (
        <svg {...p}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )
    case 'send':
      return (
        <svg {...p}>
          <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />
        </svg>
      )
    case 'undo':
      return (
        <svg {...p}>
          <path d="M9 7L4 12l5 5" />
          <path d="M4 12h10a6 6 0 0 1 0 8h-3" />
        </svg>
      )
  }
}
