import { createContext, Dispatch, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Confidence, Spot, Tab } from './data'
import { Action, State } from './store'

export type HelpView =
  | { kind: 'home'; expand?: string }
  | { kind: 'article'; id: string }
  | { kind: 'all' }
  | { kind: 'step'; id: string }
  | { kind: 'ask'; q: string }
  | { kind: 'book' }

export interface Ctx {
  state: State
  dispatch: Dispatch<Action>
  saving: boolean
  spot: Spot | null
  showMe: (s: Spot, tab?: Tab) => void
  help: HelpView
  openHelp: (v: HelpView) => void
  helpOpen: boolean
  setHelpOpen: (b: boolean) => void
}

export const AppCtx = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(AppCtx)

/* ---------- Icons ---------- */
const P = {
  check: 'M4 10.5l4 4 8-9',
  x: 'M5 5l10 10M15 5L5 15',
  chev: 'M7 4l6 6-6 6',
  chevDown: 'M4 7l6 6 6-6',
  back: 'M13 4l-6 6 6 6',
  search: 'M9 15a6 6 0 100-12 6 6 0 000 12zM13.5 13.5L17 17',
  help: 'M10 18a8 8 0 100-16 8 8 0 000 16zM7.8 7.6a2.3 2.3 0 014.4.9c0 1.6-2.2 2-2.2 3.3M10 14.4v.1',
  clock: 'M10 18a8 8 0 100-16 8 8 0 000 16zM10 5.5V10l3 2',
  cloud: 'M5.5 15.5h9a3.5 3.5 0 00.4-7A5 5 0 005 9.6a3 3 0 00.5 5.9z',
  doc: 'M5 2.5h6.5L15 6v11.5H5zM11.5 2.5V6H15',
  shield: 'M10 2l6.5 2.5V9c0 4.2-2.8 7.4-6.5 9-3.7-1.6-6.5-4.8-6.5-9V4.5z',
  user: 'M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3.5 17.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5',
  undo: 'M6 8H13a4 4 0 010 8H9M6 8l3-3M6 8l3 3',
  eye: 'M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6S1.5 10 1.5 10zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  pen: 'M13.5 3.5l3 3L7 16H4v-3z',
  send: 'M2.5 9.5L17.5 3l-6.5 15-2-6.5z',
  lock: 'M5.5 9V6.5a4.5 4.5 0 019 0V9M4 9h12v8.5H4z',
  flag: 'M4.5 18V3M4.5 3.5h10l-2 3.5 2 3.5h-10',
  book: 'M3 4c2.5-1 5-1 7 .5v12.5c-2-1.5-4.5-1.5-7-.5zM17 4c-2.5-1-5-1-7 .5v12.5c2-1.5 4.5-1.5 7-.5z',
  calendar: 'M3 5h14v12H3zM3 8.5h14M7 3v4M13 3v4',
  spark: 'M10 2.5l1.6 4.6 4.9.4-3.8 3 1.3 4.8L10 12.6l-4 2.7 1.3-4.8-3.8-3 4.9-.4z',
  list: 'M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01',
  mail: 'M2.5 4.5h15v11h-15zM2.5 5l7.5 6 7.5-6',
  phone: 'M4 3h3l1.5 4-2 1.2a9 9 0 004.3 4.3L12 10.5l4 1.5v3a2 2 0 01-2 2A12 12 0 012 5a2 2 0 012-2z',
  route: 'M5 17a2 2 0 100-4 2 2 0 000 4zM15 7a2 2 0 100-4 2 2 0 000 4zM5 13V9a3 3 0 013-3h5',
  info: 'M10 18a8 8 0 100-16 8 8 0 000 16zM10 9v5M10 6.2v.1',
  panel: 'M3 4h14v12H3zM12.5 4v12',
  keyboard: 'M2.5 5.5h15v9h-15zM5.5 8.5h.01M8.5 8.5h.01M11.5 8.5h.01M14.5 8.5h.01M6 11.5h8',
}
export type IconName = keyof typeof P
export function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={'ico ' + className} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  )
}

export function ConfBadge({ c, onClick, spotlit }: { c: Confidence; onClick?: () => void; spotlit?: boolean }) {
  const label = c === 'high' ? 'High confidence' : 'Medium confidence'
  const inner = (
    <>
      <span className="conf-dots" aria-hidden="true">
        <i className="on" />
        <i className={c === 'high' ? 'on' : ''} />
      </span>
      {c === 'high' ? 'High' : 'Medium'}
    </>
  )
  if (!onClick) return <span className={`conf conf-${c}`} title={label}>{inner}</span>
  return (
    <button type="button" className={`conf conf-${c} conf-btn ${spotlit ? 'spot' : ''}`} onClick={onClick} aria-label={`${label}: what does this mean?`}>
      {inner}
      <Icon name="help" size={13} />
    </button>
  )
}

/** Click-to-open popover anchored below its trigger. */
export function Popover({ trigger, children, width = 340, align = 'left', open: ctrlOpen, onOpenChange }: {
  trigger: (open: boolean, toggle: () => void) => ReactNode
  children: (close: () => void) => ReactNode
  width?: number
  align?: 'left' | 'right'
  open?: boolean
  onOpenChange?: (b: boolean) => void
}) {
  const [inner, setInner] = useState(false)
  const open = ctrlOpen ?? inner
  const set = (b: boolean) => (onOpenChange ? onOpenChange(b) : setInner(b))
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) set(false)
    }
    const k = (e: KeyboardEvent) => e.key === 'Escape' && set(false)
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  })
  return (
    <span className="pop-wrap" ref={ref}>
      {trigger(open, () => set(!open))}
      {open && (
        <div className={`pop pop-${align}`} style={{ width }} role="dialog">
          {children(() => set(false))}
        </div>
      )}
    </span>
  )
}

export function Modal({ title, children, onClose, width = 560 }: { title: string; children: ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
