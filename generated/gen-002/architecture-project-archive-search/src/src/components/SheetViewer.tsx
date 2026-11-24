import { useEffect } from 'react'
import { BY_ID } from '../data/generate'
import type { Sheet } from '../data/types'
import { cx } from '../util'
import { SheetImage } from './SheetImage'

interface Props {
  sheets: Sheet[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}

export function SheetViewer({ sheets, index, onIndex, onClose }: Props) {
  const s = sheets[index]
  const p = BY_ID.get(s.projectId)!
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndex(Math.min(sheets.length - 1, index + 1))
      if (e.key === 'ArrowLeft') onIndex(Math.max(0, index - 1))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [index, sheets.length, onIndex])

  return (
    <div className="overlay viewer" role="dialog" aria-modal="true" aria-label={`Sheet ${s.number}`}>
      <div className="viewer-top">
        <div>
          <span className="mono">
            {p.id} · {s.number}
          </span>
          <h2>{s.title}</h2>
          <span className="viewer-sub">
            {p.name} · {s.scale} · Issued for construction {s.issued}
          </span>
        </div>
        <div className="viewer-ctrls">
          <span className="viewer-pos">
            {index + 1} / {sheets.length}
          </span>
          <button className="btn btn-dark" onClick={onClose}>
            Close <kbd>Esc</kbd>
          </button>
        </div>
      </div>
      <div className="viewer-stage">
        <button className="viewer-nav" disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous sheet">
          ‹
        </button>
        <SheetImage sheet={s} project={p} detailed className="viewer-sheet" />
        <button className="viewer-nav" disabled={index === sheets.length - 1} onClick={() => onIndex(index + 1)} aria-label="Next sheet">
          ›
        </button>
      </div>
      <div className="viewer-strip">
        {sheets.map((x, i) => (
          <button key={x.id} className={cx('viewer-thumb', i === index && 'on')} onClick={() => onIndex(i)}>
            <SheetImage sheet={x} project={BY_ID.get(x.projectId)!} />
            <span className="mono">{x.number}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
