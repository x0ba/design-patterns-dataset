import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { CODE_BY_ID, type CodeId } from '../data/codes'

export function CodeChip({ id, size = 'md', plain }: { id: CodeId; size?: 'sm' | 'md' | 'lg'; plain?: boolean }) {
  const c = CODE_BY_ID[id]
  return (
    <span
      className={`chip chip-${size}`}
      style={plain ? undefined : { background: c.bg, color: c.fg }}
      title={c.name}
    >
      <i className="chip-dot" style={{ background: c.dot }} aria-hidden />
      {c.name}
    </span>
  )
}

export function Dialog({
  title, sub, onClose, children, footer, width = 560,
}: { title: string; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('textarea, input, select, button.btn-primary, button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input, select, [href]')
        if (!f.length) return
        const a = f[0], z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('keydown', onKey, true); prev?.focus?.() }
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} style={{ width }} ref={ref}>
        <header className="dialog-head">
          <div>
            <h2>{title}</h2>
            {sub && <p className="muted small">{sub}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value} role="radio" aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}
        >{o.label}</button>
      ))}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}
