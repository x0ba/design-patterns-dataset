import type { ReactNode } from 'react'
import type { Verdict } from '../data/types'
import { personById } from '../data/people'
import { NAME_RE } from '../lib/derived'

export function Avatar({ id, size = 28, ring }: { id: string; size?: number; ring?: boolean }) {
  const p = personById(id)
  return (
    <span className={`avatar${ring ? ' ring' : ''}`} style={{ width: size, height: size, background: p.color, fontSize: size * 0.38 }} title={`${p.name} · ${p.role}`}>
      {p.initials}
    </span>
  )
}

export const VERDICT_LABEL: Record<Verdict, string> = { listen: 'Listen', skim: 'Skim', skip: 'Skip' }

export function VerdictPill({ v }: { v: Verdict }) {
  return <span className={`vpill v-${v}`}>{VERDICT_LABEL[v]}</span>
}

/** Wraps Adaeze / Okonkwo in an amber mark. */
export function NameMarked({ text }: { text: string }): ReactNode {
  const parts = text.split(/(Adaeze|Okonkwo)/)
  return parts.map((p, i) => (NAME_RE.test(p) && /^(Adaeze|Okonkwo)$/.test(p) ? <mark key={i} className="me">{p}</mark> : <span key={i}>{p}</span>))
}

export function Legend() {
  return (
    <span className="legend">
      <span><i className="sw v-listen" />Listen</span>
      <span><i className="sw v-skim" />Skim</span>
      <span><i className="sw v-skip" />Skip</span>
    </span>
  )
}
