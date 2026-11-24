import type { Comment, Doc } from './types'
import { ROSTER } from './data'
import { fmtTorque } from './util'

export interface Check {
  id: 'complete' | 'fits' | 'comments' | 'note' | 'numbers' | 'agree'
  ok: boolean
  label: string
  detail: string
}

export function runChecks(doc: Doc, comments: Comment[], agreed: string[], overPx: number): Check[] {
  const open = comments.filter((c) => !c.resolved).length

  const missing: string[] = []
  if (!doc.title.trim()) missing.push('title')
  if (!doc.author.trim()) missing.push('author')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date.trim())) missing.push('date (YYYY-MM-DD)')
  const blank = doc.steps.map((s, i) => (s.text.trim() ? 0 : i + 1)).filter(Boolean)
  if (blank.length) missing.push(`step ${blank.join(', ')} is empty`)
  if (!doc.tools.length) missing.push('required tools')

  const torqueMismatch = doc.steps
    .map((s, i) => ({ i, m: s.text.match(/(\d+(?:[.,]\d+)?)\s*N[·.\s]?m/i) }))
    .filter((x) => x.m && parseFloat(x.m[1].replace(',', '.')) !== doc.torque)

  return [
    {
      id: 'comments',
      ok: open === 0,
      label: 'Every comment dealt with',
      detail: open === 0 ? 'No open comments' : `${open} open comment${open > 1 ? 's' : ''} to resolve`,
    },
    {
      id: 'note',
      ok: doc.note.stepId !== null,
      label: 'Common-mistake note beside its step',
      detail: doc.note.stepId ? `Beside step ${doc.steps.findIndex((s) => s.id === doc.note.stepId) + 1}` : 'Still at the foot of the sheet',
    },
    {
      id: 'numbers',
      ok: torqueMismatch.length === 0,
      label: 'Torque in steps matches the torque box',
      detail: torqueMismatch.length
        ? `Step ${torqueMismatch[0].i + 1} says ${torqueMismatch[0].m![0]}, box says ${fmtTorque(doc.torque)} N·m`
        : `${fmtTorque(doc.torque)} N·m everywhere`,
    },
    {
      id: 'complete',
      ok: missing.length === 0,
      label: 'Nothing left blank',
      detail: missing.length ? `Missing: ${missing.join('; ')}` : 'Title, author, date, steps and tools filled in',
    },
    {
      id: 'fits',
      ok: overPx === 0,
      label: 'Fits on one page',
      detail: overPx === 0 ? 'Fits on one page' : `Over the page by about ${Math.ceil(overPx)} px – shorten text or remove a photo`,
    },
    {
      id: 'agree',
      ok: agreed.length === ROSTER.length,
      label: 'Whole huddle agrees it reads correctly',
      detail: `${agreed.length} of ${ROSTER.length} have agreed`,
    },
  ]
}
