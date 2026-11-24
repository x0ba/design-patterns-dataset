import { useState } from 'react'
import { Save } from 'lucide-react'
import { PEOPLE, ME } from '../lib/types'
import { longDate, now, relTime } from '../lib/time'
import { useApp } from './ctx'
import { Avatar } from './ui'

export function HistoryTab() {
  const { doc, apply, toast } = useApp()
  const next = Math.max(...doc.versions.map((v) => v.n)) + 1
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)
  const latest = doc.versions[0]
  const changedSince = doc.log.filter((l) => l.ts > latest.ts)

  return (
    <div className="tab-body">
      <div className="save-card">
        {!open ? (
          <>
            <div>
              <strong>Working copy of v{latest.n}</strong>
              <small>
                {doc.elements.length} elements · {doc.edges.length} connections
              </small>
            </div>
            <button className="btn primary" onClick={() => setOpen(true)}>
              <Save size={13} /> Save as v{next}
            </button>
          </>
        ) : (
          <form
            className="save-form"
            onSubmit={(e) => {
              e.preventDefault()
              const label = name.trim() || 'Untitled version'
              apply(`Saved version v${next}, “${label}”`, (d) => {
                d.versions.unshift({
                  id: `v${next}`,
                  n: next,
                  name: label,
                  author: ME,
                  ts: now(),
                  summary: `${d.elements.length} elements and ${d.edges.length} connections.`,
                  elements: d.elements.length,
                  edges: d.edges.length,
                })
              })
              toast(`Saved as v${next}`)
              setName('')
              setOpen(false)
            }}
          >
            <label className="field-label">Name this version</label>
            <input autoFocus className="text-field" value={name} placeholder="e.g. Sent to McCune" onChange={(e) => setName(e.target.value)} />
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn primary">Save v{next}</button>
            </div>
          </form>
        )}
      </div>

      <h4 className="sub-h">Versions</h4>
      <ol className="versions">
        {doc.versions.map((v, i) => (
          <li key={v.id} className={i === 0 ? 'cur' : ''}>
            <span className="vtag">v{v.n}</span>
            <div>
              <strong>{v.name}</strong>
              {i === 0 && <span className="live">Current</span>}
              <p>{v.summary}</p>
              <small className="who">
                <Avatar id={v.author} size={16} />
                <span>
                  {PEOPLE[v.author].name} · {longDate(v.ts)} · {v.elements} elements, {v.edges} links
                </span>
              </small>
            </div>
          </li>
        ))}
      </ol>

      <h4 className="sub-h">Changes since v{latest.n} was saved</h4>
      <ul className="log">
        {(changedSince.length ? changedSince : doc.log).map((l) => (
          <li key={l.id}>
            <Avatar id={l.author} size={20} />
            <div>
              <span>{l.text}</span>
              <small>
                {PEOPLE[l.author].name} · {relTime(l.ts)}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
