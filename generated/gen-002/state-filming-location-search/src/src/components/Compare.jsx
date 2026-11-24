import { useEffect, Fragment } from 'react'
import Icon from './Icons.jsx'
import { thumbUrl } from '../data/photos.js'
import { STATUS, availInfo, leadInfo, parkingInfo, prodText, nf, closureText, metaLine } from '../utils.js'
import { CREW } from '../data/dates.js'

export default function Compare({ locs, shortlistedIds, needTitle, onClose, onRemove, onShortlist, onOpen }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const best = (fn, v, lowerBetter = true) => {
    if (locs.length < 2 || !v) return false
    const vals = locs.map(fn)
    if (vals.every((x) => x === vals[0])) return false
    return v === (lowerBetter ? Math.min(...vals) : Math.max(...vals))
  }
  const rows = [
    { h: 'Fit for this request' },
    { k: 'Drive from Capitol', v: (l) => `${l.drive} min`, best: (l) => best((x) => x.drive, l.drive) },
    { k: 'Shoot window', v: (l) => availInfo(l).label, cls: (l) => availInfo(l).cls, sub: (l) => (availInfo(l).cls === 'ok' ? '' : availInfo(l).detail) },
    { k: 'Permit lead time', v: (l) => `${l.permitLead} days`, best: (l) => best((x) => x.permitLead, l.permitLead), cls: (l) => leadInfo(l).cls },
    { k: `Parking (crew of ${CREW})`, v: (l) => `${nf(l.parking)} spaces`, cls: (l) => parkingInfo(l).cls, best: (l) => best((x) => x.parking, l.parking, false) },
    { k: 'Indicative rate', v: (l) => (l.rate ? `$${nf(l.rate)} / ${l.type === 'Main street segment' ? 'night' : 'day'}` : 'No fee'), best: (l) => best((x) => x.rate, l.rate) },
    { h: 'Owner' },
    { k: 'Owner type', v: (l) => l.ownerType },
    { k: 'Willingness', v: (l) => STATUS[l.contact.status].label, cls: (l) => STATUS[l.contact.status].cls, sub: (l) => l.contact.note },
    { h: 'Character' },
    { k: 'Built', v: (l) => `${l.yearBuilt}` },
    { k: 'Style', v: (l) => l.styles.join(', ') },
    { k: 'Interior looks', v: (l) => l.lookEras.join(', ') },
    { k: 'Floor area', v: (l) => (l.sqft ? `${nf(l.sqft)} sq ft` : '—'), best: (l) => best((x) => x.sqft, l.sqft, false) },
    { k: 'Ceiling height', v: (l) => (l.ceilingFt ? `${l.ceilingFt} ft` : '—'), best: (l) => best((x) => x.ceilingFt, l.ceilingFt, false) },
    { k: 'Features', v: (l) => (l.court?.balcony ? ['balcony gallery', ...l.features.filter((f) => f !== 'balcony gallery')] : l.features).join(', ') },
    { k: 'Power', v: (l) => l.power },
    { h: 'Specifics' },
    {
      k: 'Site rules',
      v: (l) =>
        l.type === 'Courthouse'
          ? `${l.court.courtrooms} courtroom${l.court.courtrooms > 1 ? 's' : ''}; in session ${l.court.sessionDays}; filming ${l.court.filmDays.toLowerCase()}`
          : l.type === 'Main street segment'
          ? `${closureText(l.street.closure)}, ${l.street.closure.hours}; ${l.street.closure.noticeDays} days’ notice${l.street.closure.councilVote ? ', council vote' : ''}`
          : l.type === 'Rail yard'
          ? `${l.yard.status}; ${l.yard.trackMiles} mi track; ${l.yard.traffic === 'None' ? 'no live traffic' : l.yard.traffic}`
          : '—',
    },
    { k: 'Past productions', v: (l) => (l.productions.length ? l.productions.slice(0, 3).map(prodText).join('; ') : 'None on file') },
  ]
  const cols = `150px repeat(${locs.length}, 1fr)`
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal cmp" role="dialog" aria-label="Compare locations">
        <header className="m-head">
          <h2>Compare {locs.length} locations <small>for {needTitle}</small></h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon n="x" size={18} /></button>
        </header>
        <div className="cmp-scroll">
          <div className="cmp-grid" style={{ gridTemplateColumns: cols }}>
            <div className="cmp-corner" />
            {locs.map((l) => (
              <div key={l.id} className="cmp-col-head">
                <button className="cmp-img" onClick={() => onOpen(l.id)}><img src={thumbUrl(l)} alt="" /></button>
                <h3><button onClick={() => onOpen(l.id)}>{l.name}</button></h3>
                <p>{metaLine(l)} · {l.type}</p>
                <div className="cmp-act">
                  <button className={'btn btn-sm ' + (shortlistedIds.has(l.id) ? 'btn-on' : 'btn-primary')} onClick={() => onShortlist(l.id)}>
                    <Icon n={shortlistedIds.has(l.id) ? 'check' : 'plus'} size={13} />{shortlistedIds.has(l.id) ? 'Shortlisted' : 'Shortlist'}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => onRemove(l.id)}>Remove</button>
                </div>
              </div>
            ))}
            {rows.map((r, i) =>
              r.h ? (
                <div key={i} className="cmp-h" style={{ gridColumn: `1 / span ${locs.length + 1}` }}>{r.h}</div>
              ) : (
                <Fragment key={i}>
                  <div className="cmp-k">{r.k}</div>
                  {locs.map((l) => (
                    <div key={l.id} className={'cmp-v' + (r.cls ? ' tx-' + r.cls(l) : '') + (r.best && r.best(l) ? ' best' : '')}>
                      {r.v(l)}
                      {r.sub && r.sub(l) ? <small>{r.sub(l)}</small> : null}
                    </div>
                  ))}
                </Fragment>
              )
            )}
          </div>
        </div>
        <footer className="m-foot">
          <span className="dim">Shaded values are the best of the group on that row.</span>
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </footer>
      </div>
    </>
  )
}
