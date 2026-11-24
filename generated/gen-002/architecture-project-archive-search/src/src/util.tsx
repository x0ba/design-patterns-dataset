import type { ReactNode } from 'react'

export const fmt = (n: number) => n.toLocaleString('en-US')

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function highlight(text: string, terms: string[]): ReactNode {
  if (!terms.length) return text
  const re = new RegExp(`\\b(${terms.map(esc).join('|')})[a-z]*`, 'gi')
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<mark key={k++}>{m[0]}</mark>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function matchesAny(text: string, terms: string[]) {
  if (!terms.length) return false
  const re = new RegExp(`\\b(${terms.map(esc).join('|')})`, 'i')
  return re.test(text)
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
