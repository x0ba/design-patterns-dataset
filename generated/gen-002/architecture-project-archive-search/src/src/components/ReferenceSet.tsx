import { useEffect, useRef, useState } from 'react'
import type { Sheet } from '../data/types'
import { CURRENT_PROJECT } from '../data/vocab'
import type { PullResult } from './PullDialog'

interface Props {
  pulls: PullResult[]
  onOpenSheet: (sheets: Sheet[], index: number) => void
  onRemove: (r: PullResult) => void
}

export function ReferenceSet({ pulls, onOpenSheet, onRemove }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const total = pulls.reduce((s, p) => s + p.sheets.length, 0)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div className="refset" ref={ref}>
      <button className={total ? 'refset-btn has' : 'refset-btn'} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="refset-proj mono">{CURRENT_PROJECT.id}</span>
        <span>{total ? `${total} sheets pulled` : 'Reference set empty'}</span>
      </button>
      {open && (
        <div className="refset-pop">
          <h4>
            {CURRENT_PROJECT.id} {CURRENT_PROJECT.name}
          </h4>
          {!pulls.length && <p className="dim">Nothing pulled yet. Compare candidates, then pick two to pull their detail sheets here.</p>}
          {pulls.map((r, i) => (
            <div key={i} className="refset-group">
              <div className="refset-gh">
                <span>
                  {r.projectIds.join(' + ')} → {r.folder}
                </span>
                <button className="link" onClick={() => onRemove(r)}>
                  Remove
                </button>
              </div>
              <ul>
                {r.sheets.map((s, j) => (
                  <li key={s.id}>
                    <button className="link-plain" onClick={() => onOpenSheet(r.sheets, j)}>
                      <span className="mono">{s.projectId} {s.number}</span> {s.title}
                    </button>
                  </li>
                ))}
              </ul>
              {(r.print || r.specs) && (
                <p className="dim small">
                  {[r.print && '11×17 set printed', r.specs && 'Spec 05 75 00 included'].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
