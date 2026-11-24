import { useState } from 'react'
import { BY_ID } from '../data/generate'
import type { Sheet } from '../data/types'
import { CURRENT_PROJECT } from '../data/vocab'
import { cx } from '../util'
import { SheetImage } from './SheetImage'

export interface PullResult {
  projectIds: string[]
  sheets: Sheet[]
  folder: string
  print: boolean
  specs: boolean
  at: Date
}

interface Props {
  ids: string[]
  onCancel: () => void
  onConfirm: (r: PullResult) => void
  onOpenSheets: (sheets: Sheet[], index: number) => void
}

const FOLDERS = ['04 Reference / Precedents', '02 Concept / Pin-up 2026-11-16', '05 Facade / Screen studies']

export function PullDialog({ ids, onCancel, onConfirm, onOpenSheets }: Props) {
  const ps = ids.map((id) => BY_ID.get(id)!).filter(Boolean)
  const all = ps.flatMap((p) => p.detailSheets)
  const [on, setOn] = useState<Set<string>>(() => new Set(all.map((s) => s.id)))
  const [folder, setFolder] = useState(FOLDERS[0])
  const [print, setPrint] = useState(true)
  const [specs, setSpecs] = useState(true)
  const chosen = all.filter((s) => on.has(s.id))
  const hasSpec = ps.some((p) => p.specs.includes('05 75 00'))

  const flip = (id: string) =>
    setOn((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="Pull detail drawings" onClick={onCancel}>
      <div className="modal pull" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Pull detail drawings</h2>
          <p className="dim">
            Into {CURRENT_PROJECT.id} {CURRENT_PROJECT.name}
          </p>
        </div>
        <div className="pull-cols" style={{ gridTemplateColumns: `repeat(${ps.length}, 1fr)` }}>
          {ps.map((p) => {
            const n = p.detailSheets.filter((s) => on.has(s.id)).length
            const allOn = n === p.detailSheets.length
            return (
              <div key={p.id} className="pull-col">
                <div className="pull-col-head">
                  <div>
                    <span className="mono pnum">{p.id}</span>
                    <h3>{p.name}</h3>
                  </div>
                  <button
                    className="link"
                    onClick={() =>
                      setOn((prev) => {
                        const s = new Set(prev)
                        for (const sh of p.detailSheets) {
                          if (allOn) s.delete(sh.id)
                          else s.add(sh.id)
                        }
                        return s
                      })
                    }
                  >
                    {allOn ? 'None' : 'All'}
                  </button>
                </div>
                <ul className="pull-list">
                  {p.detailSheets.map((s, i) => (
                    <li key={s.id} className={cx(on.has(s.id) && 'on')}>
                      <label>
                        <input type="checkbox" checked={on.has(s.id)} onChange={() => flip(s.id)} />
                        <span className="box" aria-hidden />
                        <span className="mono">{s.number}</span>
                        <span className="pull-title">{s.title}</span>
                      </label>
                      <button className="pull-peek" onClick={() => onOpenSheets(p.detailSheets, i)} aria-label={`View ${s.number}`}>
                        <SheetImage sheet={s} project={p} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="pull-opts">
          <label className="field">
            <span>Folder</span>
            <select value={folder} onChange={(e) => setFolder(e.target.value)}>
              {FOLDERS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={print} onChange={(e) => setPrint(e.target.checked)} />
            <span className="box" aria-hidden />
            Print 11×17 set for markup (Studio plotter)
          </label>
          {hasSpec && (
            <label className="check">
              <input type="checkbox" checked={specs} onChange={(e) => setSpecs(e.target.checked)} />
              <span className="box" aria-hidden />
              Include spec section 05 75 00 Decorative Formed Metal
            </label>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-lg"
            disabled={!chosen.length}
            onClick={() => onConfirm({ projectIds: ids, sheets: chosen, folder, print, specs: hasSpec && specs, at: new Date() })}
          >
            Copy {chosen.length} sheet{chosen.length === 1 ? '' : 's'} to {CURRENT_PROJECT.id}
          </button>
        </div>
      </div>
    </div>
  )
}
