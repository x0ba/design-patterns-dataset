import { useState, useEffect, useMemo, Fragment } from 'react'
import Icon from './Icons.jsx'
import { photoUrl, shotList } from '../data/photos.js'
import { STATUS, availInfo, leadInfo, parkingInfo, ago, prodText, nf, closureText, metaLine } from '../utils.js'
import { WINDOW, WINDOW_DAYS, toTime, fmt, fmtRange, CREW, DAYS_TO_START } from '../data/dates.js'

function Gallery({ loc }) {
  const shots = useMemo(() => shotList(loc), [loc])
  const cats = useMemo(() => ['All', ...new Set(shots.map((s) => s.cat))], [shots])
  const [cat, setCat] = useState('All')
  const [pos, setPos] = useState(0)
  useEffect(() => { setCat('All'); setPos(0) }, [loc.id])
  const list = cat === 'All' ? shots : shots.filter((s) => s.cat === cat)
  const cur = list[Math.min(pos, list.length - 1)]
  const go = (d) => setPos((p) => (p + d + list.length) % list.length)
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
  return (
    <section className="gal" aria-label="Reference photos">
      <div className="gal-main">
        <img src={photoUrl(loc, cur.i, cur.kind)} alt={cur.caption} />
        <button className="gal-nav l" onClick={() => go(-1)} aria-label="Previous photo"><Icon n="left" size={20} /></button>
        <button className="gal-nav r" onClick={() => go(1)} aria-label="Next photo"><Icon n="chev" size={20} /></button>
        <div className="gal-cap"><b>{cur.caption}</b><span>{Math.min(pos, list.length - 1) + 1} / {list.length}{cat !== 'All' ? ` in ${cat}` : ` · ${loc.photos} photos`}</span></div>
      </div>
      <div className="gal-cats">{cats.map((c) => <button key={c} className={c === cat ? 'on' : ''} onClick={() => { setCat(c); setPos(0) }}>{c}</button>)}</div>
      <div className="gal-strip">
        {list.slice(0, 40).map((s, k) => (
          <button key={s.i} className={k === pos ? 'on' : ''} onClick={() => setPos(k)} aria-label={s.caption}><img src={photoUrl(loc, s.i, s.kind)} alt="" loading="lazy" /></button>
        ))}
      </div>
    </section>
  )
}

function Timeline({ loc }) {
  const t0 = toTime(WINDOW.start), t1 = toTime(WINDOW.end), span = t1 - t0
  const av = availInfo(loc)
  return (
    <div className="tl">
      <div className="tl-bar">
        {loc.blackouts.map((b, i) => {
          const s = Math.max(toTime(b.from), t0), e = Math.min(toTime(b.to), t1)
          if (s > e) return null
          return <span key={i} className="tl-blk" style={{ left: ((s - t0) / span) * 100 + '%', width: Math.max(1.5, ((e - s) / span) * 100) + '%' }} title={`${b.reason}: ${fmtRange(b.from, b.to)}`} />
        })}
      </div>
      <div className="tl-ends"><span>Mar 9</span><span>Apr 24, 2027</span></div>
      <p className={'tx-' + av.cls}><b>{av.label}.</b> {av.cls !== 'ok' && av.detail}</p>
      {loc.blackouts.length > 0 && (
        <ul className="blk-list">{loc.blackouts.map((b, i) => <li key={i}><span>{fmtRange(b.from, b.to)}</span>{b.reason}</li>)}</ul>
      )}
    </div>
  )
}

export default function Detail({ loc, needId, inShortlist, inCompare, onClose, onShortlist, onCompare, onSimilar, note, setNote, needTitle }) {
  const st = STATUS[loc.contact.status], ld = leadInfo(loc), pk = parkingInfo(loc)
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const spec = []
  if (loc.type === 'Courthouse') {
    const c = loc.court
    spec.push(['Courtrooms', c.courtrooms], ['Public gallery', c.balcony ? `Balcony, about ${c.gallerySeats} seats` : `Floor level, about ${c.gallerySeats} seats`], ['Court in session', c.sessionDays], ['Filming days', c.filmDays], ['Security', c.security])
  }
  if (loc.type === 'Rail yard') {
    const y = loc.yard
    spec.push(['Status', y.status], ['Track', `${y.trackMiles} mi across ${y.acres} acres`], ['Structures', y.structures.join(', ')], ['Live traffic', y.traffic], ['Safety', y.safety], ['Access', y.access])
  }
  if (loc.type === 'Main street segment') {
    const s = loc.street, c = s.closure
    spec.push(['Blocks', s.blocks], ['Street', `${nf(s.lengthFt)} ft long, ${s.widthFt} ft wide`], ['Storefronts', `${s.storefronts} (${s.occupiedPct}% occupied)`], ['Overnight closure', closureText(c)], ['Closure hours', c.hours], ['Notice required', `${c.noticeDays} days${c.councilVote ? ', council vote needed' : ', administrative approval'}`], ['City fee', c.feePerNight ? `$${nf(c.feePerNight)} per night` : 'No fee'], ['Police', c.policeDetail], ['Parking displaced', `${c.parkingDisplaced} spaces`])
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={loc.name}>
        <header className="dr-head">
          <div>
            <p className="eyebrow">{loc.id} · {loc.type}</p>
            <h2>{loc.name}</h2>
            <p className="meta">{metaLine(loc)} · {loc.ownerType} owner{loc.ownerName ? ` (${loc.ownerName})` : ''} · {loc.drive} min from the Capitol</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon n="x" size={18} /></button>
        </header>
        <div className="dr-actions">
          <button className={'btn ' + (inShortlist ? 'btn-on' : 'btn-primary')} onClick={onShortlist}><Icon n={inShortlist ? 'check' : 'plus'} size={14} />{inShortlist ? `Shortlisted for ${needTitle}` : `Shortlist for ${needTitle}`}</button>
          <button className={'btn btn-ghost' + (inCompare ? ' on' : '')} onClick={onCompare}><Icon n="compare" size={14} />{inCompare ? 'In compare' : 'Add to compare'}</button>
          <button className="btn btn-ghost" onClick={onSimilar}><Icon n="similar" size={14} />Find similar</button>
        </div>

        <div className="dr-scroll">
          <Gallery loc={loc} />
          <p className="dr-summary">{loc.summary}</p>

          <section className="dr-sec">
            <h3>Against this request</h3>
            <div className="fitgrid">
              <div className={'fg ' + availInfo(loc).cls}><span>Shoot window</span><b>{availInfo(loc).label}</b></div>
              <div className={'fg ' + ld.cls}><span>Permit lead time</span><b>{ld.label}</b><small>{ld.slack >= 0 ? `${ld.slack} days to spare before Mar 9` : `${-ld.slack} days short of Mar 9`}</small></div>
              <div className={'fg ' + pk.cls}><span>Crew of {CREW}</span><b>{pk.label}</b><small>{loc.parking >= CREW ? 'Covers one vehicle each' : 'Less than one per crew member'}</small></div>
              <div className={'fg ' + (loc.drive <= 90 ? 'ok' : 'bad')}><span>From the Capitol</span><b>{loc.drive} min</b><small>{loc.drive <= 90 ? 'Inside the hotel radius' : `${loc.drive - 90} min past the 90-minute limit`}</small></div>
            </div>
          </section>

          <section className="dr-sec">
            <h3>Dates</h3>
            <Timeline loc={loc} />
          </section>

          <section className="dr-sec two">
            <div>
              <h3>Property</h3>
              <dl className="kv">
                <dt>Built</dt><dd>{loc.yearBuilt}, {loc.styles.join(' / ')}</dd>
                <dt>Looks like</dt><dd>{loc.lookEras.join(', ')}</dd>
                {loc.sqft > 0 && <><dt>Floor area</dt><dd>{nf(loc.sqft)} sq ft</dd></>}
                {loc.ceilingFt > 0 && <><dt>Ceiling height</dt><dd>{loc.ceilingFt} ft</dd></>}
                <dt>Power</dt><dd>{loc.power}</dd>
                <dt>Parking</dt><dd>{nf(loc.parking)} spaces</dd>
                <dt>Shoots</dt><dd>{loc.shootModes.join(' and ')}</dd>
              </dl>
              <div className="tags">{(loc.court?.balcony ? ['balcony gallery', ...loc.features.filter((f) => f !== 'balcony gallery')] : loc.features).map((f) => <span key={f} className="tagx">{f}</span>)}</div>
            </div>
            <div>
              <h3>{loc.type === 'Courthouse' ? 'Courthouse details' : loc.type === 'Rail yard' ? 'Yard details' : loc.type === 'Main street segment' ? 'Street and closure rules' : 'Site details'}</h3>
              {spec.length > 0 ? <dl className="kv">{spec.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl> : <p className="dim">No special site rules on file.</p>}
            </div>
          </section>

          <section className="dr-sec two">
            <div>
              <h3>Permits and rates</h3>
              <dl className="kv">
                <dt>Issued by</dt><dd>{loc.permitIssuer}</dd>
                <dt>Typical lead</dt><dd>{loc.permitLead} days</dd>
                <dt>Indicative rate</dt><dd>{loc.rate ? `$${nf(loc.rate)} per ${loc.type === 'Main street segment' ? 'night' : 'day'}` : 'No fee'}</dd>
              </dl>
              <h3 className="sp">Past productions</h3>
              {loc.productions.length ? <ul className="prodlist">{loc.productions.map((p, i) => <li key={i}><b>{p.title}</b>{p.season ? ` ${p.season}` : ''}<span>{p.kind} · {p.year}</span></li>)}</ul> : <p className="dim">None on file with this office.</p>}
            </div>
            <div>
              <h3>Owner contact</h3>
              <div className={'contact st-' + st.cls}>
                <span className={'st st-' + st.cls}><i />{st.label}</span>
                <b>{loc.contact.name}</b>
                <small>{loc.contact.role}{loc.ownerName ? `, ${loc.ownerName}` : ''}</small>
                <p>{loc.contact.note}</p>
                <small className="dim">{loc.contact.status === 'declined' ? 'Decision recorded' : 'Last contact'} {ago(loc.contact.lastContact)} · {loc.contact.phone}</small>
              </div>
              <h3 className="sp">Your notes</h3>
              <textarea className="notes" rows="3" value={note || ''} onChange={(e) => setNote(e.target.value)} placeholder="Scouting notes — saved with this request" />
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
