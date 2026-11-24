import type { CSSProperties, ReactNode } from 'react'
import { X } from 'lucide-react'
import { PEOPLE, type PersonId } from './model'

export type Slot = 'night' | 'ride' | 'appt' | 'check' | null

export const personVars = (p: PersonId): CSSProperties =>
  ({ '--c': PEOPLE[p].color, '--t': PEOPLE[p].tint, '--i': PEOPLE[p].ink }) as CSSProperties

export function Avatar({ p, size = 20 }: { p: PersonId; size?: number }) {
  return (
    <span
      className="av"
      aria-hidden="true"
      style={{ background: PEOPLE[p].color, width: size, height: size, fontSize: Math.round(size * 0.52) }}
    >
      {PEOPLE[p].first[0]}
    </span>
  )
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#173F36" />
      <path d="M11 16a5 5 0 0 1 5-5h1a5 5 0 0 1 0 10h-1" fill="none" stroke="#F6C66B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="11" cy="16" r="2.4" fill="#fff" />
    </svg>
  )
}

export function Modal({
  title, onClose, children, width = 760, label,
}: { title: ReactNode; onClose: () => void; children: ReactNode; width?: number; label: string }) {
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label} style={{ width }}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
