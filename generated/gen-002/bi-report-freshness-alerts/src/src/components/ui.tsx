import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { Severity } from '../data/rules'
import { PEOPLE } from '../data/people'
import { useStore } from '../store'

export const Chip = ({ children, tone = 'neutral', icon, title }: { children: ReactNode; tone?: 'neutral' | 'crit' | 'warn' | 'ok' | 'info' | 'accent'; icon?: ReactNode; title?: string }) => (
  <span className={`chip chip-${tone}`} title={title}>
    {icon}
    {children}
  </span>
)

export const sevTone = (s: Severity) => (s === 'Critical' ? 'crit' : s === 'Warning' ? 'warn' : 'info')

export const Avatar = ({ name, size = 24 }: { name: string; size?: number }) => {
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
  let hue = 0
  for (const c of name) hue = (hue * 31 + c.charCodeAt(0)) % 360
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue} 30% 88%)`, color: `hsl(${hue} 40% 26%)` }} aria-hidden>
      {initials}
    </span>
  )
}

export const personName = (id: string) => PEOPLE[id]?.name ?? id

export function Modal({ title, sub, onClose, children, footer, width = 640 }: { title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Toasts() {
  const { state, dispatch } = useStore()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {state.toasts.slice(-3).map((t) => (
        <div className="toast" key={t.id}>
          <span>{t.text}</span>
          {t.undo && (
            <button
              className="toast-undo"
              onClick={() => {
                t.undo!()
                dispatch({ t: 'dismiss', id: t.id })
              }}
            >
              Undo
            </button>
          )}
          <button className="toast-x" onClick={() => dispatch({ t: 'dismiss', id: t.id })} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
)

export const Kv = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="kv">
    <dt>{k}</dt>
    <dd>{v}</dd>
  </div>
)

export const Section = ({ title, aside, children, tone }: { title: string; aside?: ReactNode; children: ReactNode; tone?: string }) => (
  <section className={`sect ${tone ?? ''}`}>
    <div className="sect-head">
      <h3>{title}</h3>
      {aside && <div className="sect-aside">{aside}</div>}
    </div>
    {children}
  </section>
)

export const Empty = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="empty">
    <strong>{title}</strong>
    {sub && <p>{sub}</p>}
  </div>
)
