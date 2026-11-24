import { useState } from 'react'
import { BookMarked, ClipboardCheck, Download, Layers, ShieldAlert, Tags } from 'lucide-react'
import { fmtDateTime } from '../lib/format'
import { downloadCsv } from '../lib/export'
import { useStore, type LogKind } from '../store'
import { Segmented } from '../components/ui'

const ICON: Record<LogKind, typeof Layers> = {
  run: Layers, codebook: BookMarked, review: ClipboardCheck, label: Tags, system: ShieldAlert,
}

export default function ActivityPage() {
  const s = useStore()
  const [f, setF] = useState<'all' | LogKind>('all')
  const events = [...s.log].sort((a, b) => b.at - a.at || b.id - a.id).filter((e) => f === 'all' || e.kind === f)
  const exportLog = () => {
    downloadCsv('threadcoder-activity-log.csv', [
      ['time', 'actor', 'type', 'event', 'detail'],
      ...[...s.log].sort((a, b) => a.at - b.at || a.id - b.id).map((e) => [new Date(e.at).toISOString(), e.actor, e.kind, e.text, e.detail ?? '']),
    ])
    s.say('Exported the activity log.', 'info')
  }
  return (
    <div className="page activity">
      <header className="page-head">
        <div>
          <h1>Activity</h1>
          <p className="muted small">An append-only record of runs, codebook versions, reviews and decisions: the audit trail behind every label.</p>
        </div>
        <button className="btn btn-secondary" onClick={exportLog}><Download size={15} /> Export log (CSV)</button>
      </header>
      <Segmented<'all' | LogKind> label="Filter by type" value={f} onChange={setF}
        options={[
          { value: 'all', label: 'All' }, { value: 'run', label: 'Runs' }, { value: 'codebook', label: 'Codebook' },
          { value: 'review', label: 'Review' }, { value: 'label', label: 'Label decisions' }, { value: 'system', label: 'Policy' },
        ]} />
      <ol className="timeline card">
        {events.map((e) => {
          const Icon = ICON[e.kind]
          return (
            <li key={e.id} className={`ev ev-${e.kind}`}>
              <span className="ev-icon" aria-hidden><Icon size={15} /></span>
              <div className="ev-body">
                <div><b>{e.text}</b></div>
                {e.detail && <p className="small muted">{e.detail}</p>}
              </div>
              <div className="ev-meta small muted"><span>{fmtDateTime(e.at)}</span><span>{e.actor}</span></div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
