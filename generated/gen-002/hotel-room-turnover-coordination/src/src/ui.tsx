import type { ReactNode } from 'react'
import { Accessibility, Brush, Check, CheckCheck, LogOut, Lock, User, Wrench, X } from 'lucide-react'
import type { Actor, Status, Tier } from './types'
import { useStore } from './store'

export function StatusIcon({ status, size = 11 }: { status: Status; size?: number }) {
  const p = { size, strokeWidth: 2.6 }
  switch (status) {
    case 'occupied':
      return <User {...p} />
    case 'dueout':
      return <LogOut {...p} />
    case 'dirty':
      return <X {...p} />
    case 'cleaning':
      return <Brush {...p} />
    case 'clean':
      return <Check {...p} />
    case 'inspected':
      return <CheckCheck {...p} />
    case 'ooo':
      return <Wrench {...p} />
  }
}

export function AccIcon({ size = 12 }: { size?: number }) {
  return <Accessibility size={size} strokeWidth={2.4} />
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`tier t-${tier}`}>
      <i />
      {tier}
    </span>
  )
}

/** Swatch for a status, used in legends and pills. */
export function Swatch({ status, size = 17 }: { status: Status; size?: number }) {
  return (
    <span className={`sw t-${status}`} style={{ width: size, height: size }}>
      <StatusIcon status={status} size={size - 7} />
    </span>
  )
}

export const ACTOR_INFO: Record<Actor, { name: string; role: string; initials: string; color: string }> = {
  marisol: { name: 'Marisol D.', role: 'Housekeeping', initials: 'MD', color: '#8bd0a6' },
  kenji: { name: 'Kenji T.', role: 'Front desk', initials: 'KT', color: '#8fb8ff' },
}

/**
 * Action button that honours role permissions. When the current person
 * at the display is not allowed, the button reads as locked and a press
 * explains who can do it (the reducer enforces the rule as well).
 */
export function Act({
  allowed,
  lockedHint,
  onClick,
  children,
  className = '',
  title,
}: {
  allowed: boolean
  lockedHint: string
  onClick: () => void
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      className={`btn ${className} ${allowed ? '' : 'locked'}`}
      aria-disabled={!allowed}
      title={allowed ? title : lockedHint}
      onClick={onClick}
    >
      {!allowed && <Lock size={12} strokeWidth={2.4} />}
      {children}
    </button>
  )
}

export function useActor() {
  const { s, dispatch } = useStore()
  return {
    actor: s.actor,
    isMarisol: s.actor === 'marisol',
    isKenji: s.actor === 'kenji',
    switchTo: (a: Actor) => dispatch({ type: 'setActor', actor: a }),
  }
}
