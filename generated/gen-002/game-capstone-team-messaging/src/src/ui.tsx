import type { ReactNode } from 'react'
import { PEOPLE, ROLE_LABEL } from './data'

export function Avatar({ id, size = 36 }: { id: string; size?: number }) {
  const p = PEOPLE[id]
  const initials = p.name
    .replace('Prof. ', '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  const staff = p.role !== 'student'
  return (
    <span
      className={`avatar ${staff ? 'avatar-staff' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `oklch(${staff ? 0.42 : 0.9} ${staff ? 0.09 : 0.06} ${p.hue})`,
        color: staff ? '#fff' : `oklch(0.34 0.08 ${p.hue})`,
        borderRadius: staff ? size * 0.3 : '50%',
      }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

export function RoleTag({ id }: { id: string }) {
  const role = PEOPLE[id].role
  if (role === 'student') return null
  return <span className={`role-tag role-${role}`}>{ROLE_LABEL[role]}</span>
}

export function ThreadAvatar({ kind, id, size = 40 }: { kind: string; id: string; size?: number }) {
  if (kind === 'team') {
    return (
      <span className="avatar team-avatar" style={{ width: size, height: size }} aria-hidden>
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32">
          <path d="M8 21Q16 9 24 21" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="8" cy="21" r="4" fill="currentColor" />
          <circle cx="24" cy="21" r="4" fill="currentColor" />
        </svg>
      </span>
    )
  }
  if (kind === 'staff') {
    return (
      <span className="staff-stack" style={{ width: size, height: size }} aria-hidden>
        <span style={{ position: 'absolute', left: 0, top: 0 }}><Avatar id="halvorsen" size={size * 0.6} /></span>
        <span style={{ position: 'absolute', right: 0, bottom: 0, outline: '2px solid var(--side-bg)', borderRadius: size * 0.2 }}><Avatar id="mateo" size={size * 0.6} /></span>
      </span>
    )
  }
  return <Avatar id={id} size={size} />
}

/** Inline formatting: *emphasis* and @mentions. */
export function inline(text: string): ReactNode[] {
  return text.split(/(\*[^*]+\*|@\w+)/g).map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('@') && part.length > 1) return <span key={i} className="mention">{part}</span>
    return part
  })
}

export function wordCount(text: string) {
  return text.replace(/^## /gm, '').replace(/^- /gm, '').replace(/\*/g, '').split(/\s+/).filter(Boolean).length
}
