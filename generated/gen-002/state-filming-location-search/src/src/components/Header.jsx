import { useState, useRef, useEffect } from 'react'
import Icon from './Icons.jsx'
import { LIBRARY, COUNTS } from '../data/gen.js'
import { WINDOW, WINDOW_DAYS, DAYS_TO_START, CREW, fmtRange } from '../data/dates.js'
import { nf } from '../utils.js'

export const REQUEST = {
  id: 'SR-2026-0418', title: 'The Redhill Docket', kind: 'Streaming series, season 1', company: 'Lantern Row Pictures', manager: 'Priya Raman', email: 'praman@lanternrow.tv',
  received: 'Today, 8:12 AM', due: 'Today, 5:00 PM',
}

export function Header({ onOpen }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const matches = q.trim().length >= 2 ? LIBRARY.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 7) : []
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span className="brand-name">Framestate <b>Locations</b></span>
      </div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <span>Production requests</span><Icon n="chev" size={12} /><span className="crumb-cur">{REQUEST.id}</span>
      </nav>
      <div className="gsearch" ref={ref}>
        <Icon n="search" size={15} />
        <input
          value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          placeholder={`Look up any of ${nf(COUNTS.total)} locations by name`} aria-label="Look up a location by name"
        />
        {open && q.trim().length >= 2 && (
          <div className="gsearch-pop">
            {matches.length === 0 && <div className="gs-empty">No location named “{q}”.</div>}
            {matches.map((l) => (
              <button key={l.id} onClick={() => { onOpen(l.id); setOpen(false); setQ('') }}>
                <span>{l.name}</span><small>{l.type} · {l.town}, {l.county} Co. · {l.drive} min</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="whoami"><span className="avatar">DA</span><div><b>Desmond Achebe</b><small>Production Services</small></div></div>
    </header>
  )
}

export function RequestStrip() {
  const R = REQUEST
  return (
    <section className="reqstrip" aria-label="Request summary">
      <div className="rs-main">
        <div className="rs-id"><span className="pill pill-id">{R.id}</span><span className="rs-new">Received {R.received.toLowerCase()}</span></div>
        <h1>{R.title} <small>{R.kind}</small></h1>
      </div>
      <dl className="rs-facts">
        <div><dt>Production company</dt><dd>{R.company}</dd></div>
        <div><dt>Location manager</dt><dd>{R.manager}</dd></div>
        <div><dt>Shoot window</dt><dd>{fmtRange(WINDOW.start, WINDOW.end)}, 2027 <small>{WINDOW_DAYS} days · starts in {DAYS_TO_START} days</small></dd></div>
        <div><dt>Crew and base</dt><dd>{CREW} people <small>one hotel, ≤ 90 min from Ellery</small></dd></div>
      </dl>
      <div className="rs-due"><Icon n="clock" size={15} /><div><b>First candidates due {R.due.toLowerCase()}</b><small>to {R.manager}</small></div></div>
    </section>
  )
}
