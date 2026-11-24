import { useState, useEffect } from 'react'
import Icon from './Icons.jsx'
import { REQUEST } from './Header.jsx'
import { BY_ID } from '../data/gen.js'
import { thumbUrl } from '../data/photos.js'
import { STATUS, availInfo, metaLine } from '../utils.js'

const flagsFor = (l) => {
  const out = []
  if (l.contact.status === 'unresponsive') out.push('Owner unresponsive')
  if (l.contact.status === 'declined') out.push('Owner declined')
  const av = availInfo(l)
  if (av.cls === 'warn') out.push(av.label)
  if (av.cls === 'bad') out.push('Blocked in window')
  if (l.drive > 90) out.push(`${l.drive} min away`)
  return out
}

export function ShortlistPanel({ needs, shortlist, activeId, sent, onSelect, onRemove, onNote, onOpen, onCompareNeed, onReview }) {
  const all = needs.flatMap((n) => (shortlist[n.id] || []).map((x) => BY_ID[x.id]))
  const counties = new Set(all.map((l) => l.county))
  const drives = all.map((l) => l.drive)
  const empties = needs.filter((n) => !(shortlist[n.id] || []).length)
  return (
    <aside className="sl-panel" aria-label="Candidate set for the production">
      <div className="slp-head">
        <h2>Candidate set</h2>
        <p>For {REQUEST.manager}, {REQUEST.company}</p>
        <div className="cover" aria-label={`${needs.filter((n) => (shortlist[n.id] || []).length).length} of ${needs.length} needs covered`}>
          {needs.map((n) => <i key={n.id} className={(shortlist[n.id] || []).length ? 'on' : ''} />)}
          <span>{needs.filter((n) => (shortlist[n.id] || []).length).length} of {needs.length} needs covered</span>
        </div>
      </div>
      <div className="slp-scroll">
        {needs.map((n, i) => {
          const items = shortlist[n.id] || []
          return (
            <section key={n.id} className={'slp-need' + (n.id === activeId ? ' on' : '')}>
              <header>
                <button className="slp-title" onClick={() => onSelect(n.id)}><span className="need-n sm">{i + 1}</span>{n.title}</button>
                <span className="slp-count">{items.length}</span>
                {items.length >= 2 && <button className="link" onClick={() => onCompareNeed(n.id)}>Compare</button>}
              </header>
              {items.length === 0 && (
                <div className="slp-empty">
                  <p>No candidates yet.</p>
                  {n.id !== activeId && <button className="link" onClick={() => onSelect(n.id)}>Go to this need</button>}
                </div>
              )}
              {items.map((it) => {
                const l = BY_ID[it.id]
                const fl = flagsFor(l)
                return (
                  <div key={l.id} className="slp-item">
                    <button className="slp-img" onClick={() => onOpen(l.id)}><img src={thumbUrl(l)} alt="" /></button>
                    <div className="slp-info">
                      <button className="slp-name" onClick={() => onOpen(l.id)}>{l.name}</button>
                      <small>{metaLine(l)} · {l.drive} min</small>
                      {fl.length > 0 && <small className="slp-flag"><Icon n="warn" size={11} />{fl.join(' · ')}</small>}
                      <input value={it.note} onChange={(e) => onNote(n.id, l.id, e.target.value)} placeholder="Note for Priya (optional)" aria-label={`Note for ${l.name}`} />
                    </div>
                    <button className="icon-btn sm" onClick={() => onRemove(n.id, l.id)} aria-label={`Remove ${l.name}`}><Icon n="x" size={14} /></button>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
      <footer className="slp-foot">
        {all.length > 0 && (
          <p className="spread">
            {all.length} propert{all.length === 1 ? 'y' : 'ies'} across {counties.size} count{counties.size === 1 ? 'y' : 'ies'}, {Math.min(...drives) === Math.max(...drives) ? Math.min(...drives) : Math.min(...drives) + '–' + Math.max(...drives)} min from the Capitol.
          </p>
        )}
        {all.length === 0 && <p className="spread dim">Shortlist properties from the results. Aim for a few per need so the production has choices.</p>}
        {all.length > 0 && empties.length > 0 && <p className="spread warn"><Icon n="warn" size={12} /> Still nothing for {empties.map((n) => n.title.toLowerCase()).join(' and ')}.</p>}
        {sent && <p className="spread ok"><Icon n="check" size={12} /> Sent to {REQUEST.manager} at {sent.at} — {sent.count} propert{sent.count === 1 ? 'y' : 'ies'}.</p>}
        <button className="btn btn-primary btn-wide" disabled={all.length === 0} onClick={onReview}><Icon n="send" size={14} />{sent ? 'Review and send again' : 'Review and send'}</button>
      </footer>
    </aside>
  )
}

export function SendDialog({ needs, shortlist, sent, onClose, onSend }) {
  const all = needs.flatMap((n) => (shortlist[n.id] || []).map((x) => ({ ...x, need: n, loc: BY_ID[x.id] })))
  const [inc, setInc] = useState({ photos: true, permits: true, history: true, contact: false })
  const [msg, setMsg] = useState(
    `Hi Priya,\n\nHere is a first set of candidates for ${REQUEST.title} (${REQUEST.id}). Everything below is inside the 90-minute radius you gave us, and I’ve noted anything that touches your March 9 – April 24 window.\n\nHappy to set up site visits or a call once you’ve had a look.\n\nDesmond Achebe\nProduction Services, State Film Office`
  )
  const [done, setDone] = useState(null)
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const warns = []
  for (const it of all) {
    const f = flagsFor(it.loc)
    if (f.length) warns.push([it.loc.name, f.join(', ')])
  }
  const empties = needs.filter((n) => !(shortlist[n.id] || []).length)
  const T = (k, l, d) => (
    <label className="chk"><input type="checkbox" checked={inc[k]} onChange={() => setInc({ ...inc, [k]: !inc[k] })} /><span><b>{l}</b><small>{d}</small></span></label>
  )
  if (done) {
    return (
      <>
        <div className="scrim" onClick={onClose} />
        <div className="modal send done" role="dialog" aria-label="Candidate set sent">
          <div className="done-mark"><Icon n="check" size={26} /></div>
          <h2>Candidate set sent</h2>
          <p>{done.count} propert{done.count === 1 ? 'y' : 'ies'} across {done.needs} need{done.needs === 1 ? '' : 's'} went to {REQUEST.manager} ({REQUEST.email}) at {done.at}. A copy is saved to {REQUEST.id}.</p>
          <button className="btn btn-primary" onClick={onClose}>Back to the request</button>
        </div>
      </>
    )
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal send" role="dialog" aria-label="Review and send candidate set">
        <header className="m-head"><h2>Send candidates to {REQUEST.manager}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon n="x" size={18} /></button></header>
        <div className="send-body">
          <div className="send-col">
            <label className="lbl">To</label>
            <div className="to"><Icon n="mail" size={14} />{REQUEST.manager} &lt;{REQUEST.email}&gt;<span className="dim">· {REQUEST.company}</span></div>
            <label className="lbl" htmlFor="msg">Message</label>
            <textarea id="msg" rows="11" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <label className="lbl">Include with each property</label>
            <div className="chks">
              {T('photos', 'Reference photos', 'First 12 per property')}
              {T('permits', 'Permit and closure summary', 'Lead times, fees, closure rules')}
              {T('history', 'Production history', 'Past productions on file')}
              {T('contact', 'Owner contact details', 'Off by default; share once the production wants to proceed')}
            </div>
          </div>
          <div className="send-col">
            <label className="lbl">Package · {all.length} propert{all.length === 1 ? 'y' : 'ies'}</label>
            <div className="pkg">
              {needs.map((n, i) => (
                <div key={n.id}>
                  <h4><span className="need-n sm">{i + 1}</span>{n.title}</h4>
                  {(shortlist[n.id] || []).length === 0 && <p className="dim pkg-empty">Nothing shortlisted</p>}
                  {(shortlist[n.id] || []).map((it) => (
                    <div key={it.id} className="pkg-item"><b>{BY_ID[it.id].name}</b><small>{BY_ID[it.id].drive} min{it.note ? ` · “${it.note}”` : ''}</small></div>
                  ))}
                </div>
              ))}
            </div>
            {(warns.length > 0 || empties.length > 0) && (
              <div className="warnbox">
                <b><Icon n="warn" size={13} /> Check before sending</b>
                <ul>
                  {empties.map((n) => <li key={n.id}>No candidates for {n.title.toLowerCase()}.</li>)}
                  {warns.map(([name, f]) => <li key={name}><b>{name}</b>: {f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
        <footer className="m-foot">
          <span className="dim">This sends the package by email to the production. Nothing is shared with owners.</span>
          <div>
            <button className="btn btn-ghost" onClick={onClose}>Keep working</button>
            <button className="btn btn-primary" onClick={() => {
              const d = { at: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), count: all.length, needs: needs.filter((n) => (shortlist[n.id] || []).length).length }
              setDone(d); onSend(d)
            }}><Icon n="send" size={14} />Send {all.length} to Priya</button>
          </div>
        </footer>
      </div>
    </>
  )
}
