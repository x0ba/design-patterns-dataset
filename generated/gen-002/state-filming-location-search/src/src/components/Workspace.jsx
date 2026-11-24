import { useState, useEffect, useRef, useMemo } from 'react'
import Icon from './Icons.jsx'
import ResultCard, { Chip } from './ResultCard.jsx'
import MapView from './MapView.jsx'
import { BY_ID, LIBRARY } from '../data/gen.js'
import { FILTER_REASONS, DEFAULT_FILTERS } from '../data/search.js'
import { DAYS_TO_START, CREW, fmt } from '../data/dates.js'
import { STATUS, availInfo, nf } from '../utils.js'
import { thumbUrl } from '../data/photos.js'

function RefPicker({ value, onPick }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    return LIBRARY.filter((l) => (t ? l.name.toLowerCase().includes(t) : l.type === 'Courthouse')).slice(0, 8)
  }, [q])
  return (
    <div className="refpick" ref={ref}>
      <label className="lbl">Properties like</label>
      <div className="refpick-in">
        <Icon n="search" size={14} />
        <input value={open ? q : value ? value.name : ''} onFocus={() => { setOpen(true); setQ('') }} onChange={(e) => { setQ(e.target.value); setOpen(true) }} placeholder="Type a property name" />
      </div>
      {open && (
        <div className="refpick-pop">
          {matches.map((l) => (
            <button key={l.id} onClick={() => { onPick(l.id); setOpen(false) }}>
              <span>{l.name}</span><small>{l.town}, {l.county} Co. · {l.type}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Filters({ f, set, more }) {
  const upd = (patch) => set({ ...f, ...patch })
  const defaults = DEFAULT_FILTERS()
  const changed = JSON.stringify(f) !== JSON.stringify(defaults)
  return (
    <div className="filters">
      <div className="frow">
        <div className="fgroup fdrive">
          <label htmlFor="drv">Drive from Ellery</label>
          <div className="slider"><input id="drv" type="range" min="15" max="240" step="5" value={f.maxDrive} onChange={(e) => upd({ maxDrive: +e.target.value })} /><output>≤ {f.maxDrive} min</output></div>
        </div>
        <div className="fgroup">
          <label>Owner willingness</label>
          <div className="seg">
            {['active', 'unresponsive', 'declined'].map((k) => (
              <button key={k} className={'segb st-' + STATUS[k].cls + (f.status[k] ? ' on' : '')} aria-pressed={f.status[k]} onClick={() => upd({ status: { ...f.status, [k]: !f.status[k] } })}>
                <i />{STATUS[k].short}
              </button>
            ))}
          </div>
        </div>
        <div className="fgroup">
          <label htmlFor="av">Open in window</label>
          <select id="av" value={f.avail} onChange={(e) => upd({ avail: e.target.value })}>
            <option value="clear">Every day</option>
            <option value="partial">Most days</option>
            <option value="any">Don’t filter</option>
          </select>
        </div>
        <div className="fgroup">
          <label>Permit history</label>
          <button className={'tog' + (f.history ? ' on' : '')} aria-pressed={f.history} onClick={() => upd({ history: !f.history })}><i />Filmed here before</button>
        </div>
      </div>
      {more && (
        <div className="frow frow2">
          <div className="fgroup">
            <label>Owner type</label>
            <div className="seg">
              {['State', 'Municipal', 'Private'].map((k) => (
                <button key={k} className={'segb' + (f.ownerTypes[k] ? ' on' : '')} aria-pressed={f.ownerTypes[k]} onClick={() => upd({ ownerTypes: { ...f.ownerTypes, [k]: !f.ownerTypes[k] } })}>{k}</button>
              ))}
            </div>
          </div>
          <div className="fgroup fdrive">
            <label htmlFor="lead">Permit lead time (starts in {DAYS_TO_START} days)</label>
            <div className="slider"><input id="lead" type="range" min="7" max={DAYS_TO_START} step="1" value={f.maxLead} onChange={(e) => upd({ maxLead: +e.target.value })} /><output>≤ {f.maxLead} d</output></div>
          </div>
          <div className="fgroup">
            <label>Crew parking</label>
            <button className={'tog' + (f.crewParking ? ' on' : '')} aria-pressed={f.crewParking} onClick={() => upd({ crewParking: !f.crewParking })}><i />Room for {CREW}+ vehicles</button>
          </div>
          {changed && <button className="link" onClick={() => set(defaults)}>Reset filters</button>}
        </div>
      )}
    </div>
  )
}

export default function Workspace({ need, c, onPatch, ui, handlers }) {
  const [draft, setDraft] = useState(need.text)
  useEffect(() => setDraft(need.text), [need.id, need.text])
  useEffect(() => {
    if (draft === need.q) return
    const t = setTimeout(() => onPatch({ q: draft, text: draft }), 350)
    return () => clearTimeout(t)
  }, [draft])
  const ref = need.refId ? BY_ID[need.refId] : null
  const mode = need.mode
  const [more, setMore] = useState(false)
  const [hot, setHot] = useState(null)
  const [selOnMap, setSelOnMap] = useState(null)
  const slIds = new Set((ui.shortlist[need.id] || []).map((x) => x.id))
  const allSl = new Set(Object.values(ui.shortlist).flat().map((x) => x.id))
  const nHidden = Object.values(c.hidden).reduce((s, a) => s + a.length, 0)
  const relax = (why) => {
    const f = { ...need.filters }
    if (why === 'drive') f.maxDrive = Math.min(240, f.maxDrive + 30)
    if (why === 'status') f.status = { active: true, unresponsive: true, declined: true }
    if (why === 'availability') f.avail = 'any'
    if (why === 'ownerType') f.ownerTypes = { State: true, Municipal: true, Private: true }
    if (why === 'history') f.history = false
    if (why === 'lead') f.maxLead = DAYS_TO_START
    if (why === 'parking') f.crewParking = false
    onPatch({ filters: f })
  }
  const hiddenLabel = (why, n) => {
    if (why === 'drive') return `${n} beyond ${need.filters.maxDrive} min`
    if (why === 'status') return `${n} owner declined`
    if (why === 'availability') return `${n} blocked in the window`
    return `${n} ${FILTER_REASONS[why]}`
  }
  const hoverRow = c.shown.find((r) => r.loc.id === (selOnMap || hot))
  const sortOpts = mode === 'similar' ? [['fit', 'Most alike']] : [['fit', 'Best match']]
  sortOpts.push(['drive', 'Shortest drive'], ['lead', 'Shortest permit lead'], ['recent', 'Most recent production'], ['history', 'Most production history'])
  const noCriteria = mode === 'words' && c.criteria.length === 0

  return (
    <main className="work">
      <div className="work-head">
        <div className="wh-top">
          <h2><span className="wh-n">Need {ui.index + 1}</span>{need.title}</h2>
          <div className="modeseg" role="tablist" aria-label="How to search">
            <button role="tab" aria-selected={mode === 'words'} className={mode === 'words' ? 'on' : ''} onClick={() => onPatch({ mode: 'words' })}>Describe it</button>
            <button role="tab" aria-selected={mode === 'similar'} className={mode === 'similar' ? 'on' : ''} onClick={() => onPatch({ mode: 'similar' })}>Find similar to…</button>
          </div>
        </div>

        {mode === 'words' ? (
          <div className="query">
            <div className="qlabel"><label className="lbl" htmlFor="q">In your own words</label><span className="asked">Production asked for <q>{need.ask}</q></span></div>
            <div className="qbox">
              <textarea id="q" rows="2" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onPatch({ q: draft, text: draft }) } }} placeholder="Describe the place — era, features, what has to be possible…" />
              <button className="btn btn-primary" onClick={() => onPatch({ q: draft, text: draft })}><Icon n="search" size={14} />Search</button>
            </div>
            <div className="understood">
              <span className="lbl">Understood as</span>
              {c.criteria.length === 0 && <span className="dim">Nothing recognised yet — try a type of place, an era, or a feature.</span>}
              {c.criteria.map((cr) => {
                const off = need.off.includes(cr.id)
                return (
                  <button key={cr.id} className={'ichip k-' + cr.kind + (off ? ' off' : '')} aria-pressed={!off} onClick={() => onPatch({ off: off ? need.off.filter((x) => x !== cr.id) : [...need.off, cr.id] })} title={off ? 'Turned off — click to use again' : 'Click to ignore this term'}>
                    {cr.label}<Icon n={off ? 'plus' : 'x'} size={11} />
                  </button>
                )
              })}
            </div>
            {need.id === 'courthouse' && ref && (
              <div className="liked">
                <Icon n="similar" size={14} />
                <span>You liked <button className="link" onClick={() => handlers.open(ref.id)}>{ref.name}</button>, but it’s closed for renovation until Apr 30, 2027.</span>
                <button className="btn btn-sm" onClick={() => onPatch({ mode: 'similar' })}>Find similar</button>
              </div>
            )}
          </div>
        ) : (
          <div className="query similar">
            <RefPicker value={ref} onPick={(id) => onPatch({ refId: id })} />
            {ref ? (
              <div className="refcard">
                <img src={thumbUrl(ref)} alt="" />
                <div>
                  <b>{ref.name}</b>
                  <p>{ref.town}, {ref.county} Co. · {ref.styles.join(', ')} · {ref.yearBuilt} · {ref.lookEras.join(', ')} interior</p>
                  <p className={'tx-' + availInfo(ref).cls}>{availInfo(ref).cls !== 'ok' ? `Not usable in the window — ${availInfo(ref).detail.replace(/\.$/, '')}` : 'Available in the window'}</p>
                </div>
                <div className="ref-feat">{[...new Set([...(ref.court?.balcony ? ['balcony gallery'] : []), ...ref.features])].slice(0, 5).map((f) => <span key={f} className="tagx">{f}</span>)}</div>
              </div>
            ) : <p className="dim">Pick a property to see what else in the library is close to it.</p>}
          </div>
        )}
      </div>

      <Filters f={need.filters} set={(f) => onPatch({ filters: f })} more={more} />

      <div className="sticky-bars">
      <div className="results-bar">
        <div className="rb-count">
          <b>{c.shown.length} candidate{c.shown.length === 1 ? '' : 's'}</b>
          {mode === 'similar' && ref && <span> similar to {ref.name.replace(' County Courthouse', '')}</span>}
          {nHidden > 0 && <span className="dim"> · {nHidden} more hidden by filters</span>}
        </div>
        <button className={"more" + (more ? " on" : "")} onClick={() => setMore(!more)} aria-expanded={more}><Icon n="sliders" size={14} />{more ? "Fewer filters" : "More filters"}</button>
        <label className="sortsel">Sort <select value={need.sort} onChange={(e) => onPatch({ sort: e.target.value })}>{sortOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <div className="viewseg" role="group" aria-label="View">
          <button className={need.view === 'list' ? 'on' : ''} onClick={() => onPatch({ view: 'list' })} aria-pressed={need.view === 'list'}><Icon n="list" size={14} />List</button>
          <button className={need.view === 'map' ? 'on' : ''} onClick={() => onPatch({ view: 'map' })} aria-pressed={need.view === 'map'}><Icon n="map" size={14} />Map</button>
        </div>
      </div>

      {nHidden > 0 && (
        <div className="hidden-strip">
          <span className="lbl">Hidden:</span>
          {Object.entries(c.hidden).map(([why, arr]) => (
            <button key={why} className="hchip" onClick={() => relax(why)} title="Show these">{hiddenLabel(why, arr.length)}<span>Show</span></button>
          ))}
        </div>
      )}
      </div>

      <div className="results">
        {noCriteria && <div className="empty"><h3>Describe the place you need</h3><p>Try “1970s courthouse interior with a balcony gallery”, or name an era, a type of place and a feature. The terms we read appear as chips so you can correct them.</p></div>}
        {!noCriteria && c.shown.length === 0 && (
          <div className="empty">
            <h3>Nothing fits with these filters</h3>
            <p>{c.total > 0 ? `${c.total} propert${c.total === 1 ? 'y matches' : 'ies match'} your description, but all are hidden by the filters above.` : 'No property in the library matches this description. Turn off a chip above to widen it.'}</p>
          </div>
        )}
        {need.view === 'list' && c.shown.map((r, i) => (
          <ResultCard key={r.loc.id} r={r} idx={i} mode={mode} hot={hot === r.loc.id}
            inShortlist={slIds.has(r.loc.id)} inCompare={ui.compare.includes(r.loc.id)} compareFull={ui.compare.length >= 4}
            onHover={setHot} onOpen={handlers.open} onShortlist={(id) => handlers.toggleShortlist(need.id, id)} onCompare={handlers.toggleCompare} onSimilar={handlers.similar} />
        ))}
        {need.view === 'map' && c.shown.length > 0 && (
          <div className="mapview">
            <MapView rows={c.shown} hotId={selOnMap || hot} onHover={setHot} onOpen={(id) => setSelOnMap(id)} shortlistIds={allSl} maxDrive={need.filters.maxDrive} refLoc={mode === 'similar' ? ref : null} />
            {hoverRow ? <ResultCard r={hoverRow} idx={c.shown.indexOf(hoverRow)} mode={mode} inShortlist={slIds.has(hoverRow.loc.id)} inCompare={ui.compare.includes(hoverRow.loc.id)} compareFull={ui.compare.length >= 4} onOpen={handlers.open} onShortlist={(id) => handlers.toggleShortlist(need.id, id)} onCompare={handlers.toggleCompare} onSimilar={handlers.similar} /> : <p className="dim maphint">Hover or click a pin to see the property.</p>}
          </div>
        )}
        {need.view === 'list' && c.shown.length > 0 && <p className="endnote">End of list — {c.shown.length} of {c.total} matches shown{nHidden ? `, ${nHidden} hidden by filters` : ''}.</p>}
      </div>

      {ui.compare.length > 0 && (
        <div className="comparebar" role="region" aria-label="Compare">
          <span className="cb-l"><Icon n="compare" size={15} />Compare</span>
          <div className="cb-items">
            {ui.compare.map((id) => <span key={id} className="cb-chip">{BY_ID[id].name}<button onClick={() => handlers.toggleCompare(id)} aria-label={`Remove ${BY_ID[id].name} from compare`}><Icon n="x" size={11} /></button></span>)}
          </div>
          <button className="link" onClick={handlers.clearCompare}>Clear</button>
          <button className="btn btn-primary" disabled={ui.compare.length < 2} onClick={handlers.openCompare}>{ui.compare.length < 2 ? 'Add one more to compare' : `Compare ${ui.compare.length}`}</button>
        </div>
      )}
    </main>
  )
}
