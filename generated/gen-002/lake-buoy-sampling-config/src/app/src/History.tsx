import { useMemo, useState } from 'react'
import { HISTORY, fmtDate, type HistoryEntry } from './data'
import { useApp } from './store'
import { Badge, ViewHeader } from './ui'

export function HistoryView() {
  const { st, groups } = useApp()
  const [q, setQ] = useState('')
  const [author, setAuthor] = useState('all')
  const [year, setYear] = useState('all')

  const pending: HistoryEntry[] = st.scheduled
    ? groups.map((g, i) => ({
        id: 1000 + i, date: st.retrieval.date, time: st.retrieval.time, author: 'Mareike Holt', pending: true,
        scope: g.scope.join(', '),
        change: `${g.title}: ${g.from} → ${g.to}`, reason: st.reasons[g.key] ?? '',
      }))
    : []

  const authors = useMemo(() => [...new Set(HISTORY.map((h) => h.author))], [])
  const years = useMemo(() => [...new Set(HISTORY.map((h) => h.date.slice(0, 4)))], [])
  const rows = [...pending, ...HISTORY].filter((h) => {
    if (author !== 'all' && h.author !== author) return false
    if (year !== 'all' && !h.date.startsWith(year)) return false
    if (q) {
      const hay = `${h.scope} ${h.change} ${h.reason}`.toLowerCase()
      if (!q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false
    }
    return true
  })

  return (
    <div className="view">
      <ViewHeader title="Change history" sub={<>{HISTORY.length} edits since March 2021, each with its author and reason.{pending.length > 0 && <> Plus {pending.length} scheduled for {fmtDate(st.retrieval.date, false)}.</>}</>} />
      <div className="toolbar">
        <input className="search wide" placeholder="Search scope, change or reason — e.g. thermistor, cutoff, DNR" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="Author">
          <option value="all">All authors</option>
          {authors.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
          <option value="all">All years</option>
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        <span className="dim small">{rows.length} shown</span>
      </div>
      <div className="table-wrap scroll">
        <table className="grid history">
          <thead><tr><th className="c-date">When</th><th>Author</th><th>Scope</th><th>Change</th><th>Reason</th></tr></thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id} className={h.pending ? 'pending' : ''}>
                <td className="mono small">{h.pending ? <Badge tone="accent">Scheduled</Badge> : null} {fmtDate(h.date)}<span className="dim"> {h.time}</span></td>
                <td className="small">{h.author}</td>
                <td className="small">{h.scope}</td>
                <td>{h.change}</td>
                <td className="dim small">{h.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty pad">No edits match.</p>}
      </div>
    </div>
  )
}
