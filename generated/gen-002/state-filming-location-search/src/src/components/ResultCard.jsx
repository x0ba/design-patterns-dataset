import Icon from './Icons.jsx'
import { thumbUrl } from '../data/photos.js'
import { fitLabel } from '../data/search.js'
import { STATUS, availInfo, leadInfo, parkingInfo, ago, prodText, closureText, nf, metaLine } from '../utils.js'
import { DAYS_TO_START } from '../data/dates.js'

export function Chip({ c }) {
  const cls = c.credit >= 1 ? 'm-yes' : c.credit > 0 ? 'm-part' : 'm-no'
  return (
    <span className={'mchip ' + cls} title={c.credit >= 1 ? 'Meets this' : c.credit > 0 ? 'Partly meets this' : 'Does not meet this'}>
      <i aria-hidden="true">{c.credit >= 1 ? '✓' : c.credit > 0 ? '◐' : '✕'}</i>{c.label}
    </span>
  )
}

export function typeFacts(loc) {
  if (loc.type === 'Courthouse') return [['Courtroom', `${loc.ceilingFt} ft ceiling`], ['Floor area', `${nf(loc.sqft)} sq ft`]]
  if (loc.type === 'Main street segment') {
    const c = loc.street.closure
    return [['Closure', `${closureText(c)}`], ['Notice', `${c.noticeDays} days${c.councilVote ? ' · council vote' : ''}`]]
  }
  if (loc.type === 'Rail yard') return [['Status', loc.yard.disused ? 'Disused' : 'Active yard'], ['Track', `${loc.yard.trackMiles} mi`]]
  return [['Size', loc.sqft ? `${nf(loc.sqft)} sq ft` : '—'], ['Ceiling', loc.ceilingFt ? `${loc.ceilingFt} ft` : '—']]
}

export default function ResultCard({ r, idx, mode, inShortlist, inCompare, compareFull, hot, onHover, onOpen, onShortlist, onCompare, onSimilar }) {
  const l = r.loc
  const av = availInfo(l), ld = leadInfo(l), pk = parkingInfo(l), st = STATUS[l.contact.status]
  const facts = typeFacts(l)
  const lbl = mode === 'similar' ? `${Math.round(r.fit * 100)}% alike` : fitLabel(r.fit)
  const fitCls = r.fit >= 0.97 ? 'f-all' : r.fit >= 0.8 ? 'f-strong' : 'f-good'
  return (
    <article className={'card' + (hot ? ' hot' : '') + (inShortlist ? ' sl' : '')} onMouseEnter={() => onHover?.(l.id)} onMouseLeave={() => onHover?.(null)}>
      <button className="thumb" onClick={() => onOpen(l.id)} aria-label={`Open ${l.name}`}>
        <img src={thumbUrl(l)} alt="" loading="lazy" />
        <span className="thumb-n"><Icon n="photo" size={12} />{l.photos}</span>
        <span className="rank">{idx + 1}</span>
      </button>
      <div className="card-body">
        <header>
          <div>
            <h3><button onClick={() => onOpen(l.id)}>{l.name}</button></h3>
            <p className="meta">{metaLine(l)} · {l.type} · {l.ownerType} · Built {l.yearBuilt}</p>
          </div>
          <span className={'fit ' + fitCls}>{lbl}</span>
        </header>
        <div className="chips">{r.chips.map((c) => <Chip key={c.id} c={c} />)}</div>
        <dl className="facts">
          <div><dt>Drive</dt><dd>{l.drive} min</dd></div>
          <div><dt>Permit lead</dt><dd className={ld.cls === 'warn' ? 'tx-warn' : ''}>{ld.label}</dd></div>
          {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          <div><dt>Parking</dt><dd className={pk.cls === 'bad' ? 'tx-bad' : ''}>{pk.label}</dd></div>
        </dl>
        <div className="status-row">
          <span className={'st st-' + st.cls}><i />{st.label}{l.contact.status !== 'declined' && <small> · contacted {ago(l.contact.lastContact)}</small>}</span>
          <span className={'st st-' + av.cls} title={av.detail}><i />{av.label}{av.cls !== 'ok' && <small> · {av.detail.replace(/\s\(.*\)\.?$/, '')}</small>}</span>
        </div>
        <p className="prod">{l.productions.length ? <><b>Filmed here:</b> {l.productions.slice(0, 3).map(prodText).join(' · ')}</> : <span className="dim">No productions on file with this office.</span>}</p>
      </div>
      <div className="card-actions">
        <button className={'btn ' + (inShortlist ? 'btn-on' : 'btn-primary')} onClick={() => onShortlist(l.id)} aria-pressed={inShortlist}>
          <Icon n={inShortlist ? 'check' : 'plus'} size={14} />{inShortlist ? 'Shortlisted' : 'Shortlist'}
        </button>
        <button className={'btn btn-ghost' + (inCompare ? ' on' : '')} onClick={() => onCompare(l.id)} disabled={!inCompare && compareFull} aria-pressed={inCompare} title={!inCompare && compareFull ? 'Compare holds up to 4' : ''}>
          <Icon n="compare" size={14} />{inCompare ? 'In compare' : 'Compare'}
        </button>
        <button className="btn btn-ghost" onClick={() => onSimilar(l.id)}><Icon n="similar" size={14} />Find similar</button>
      </div>
    </article>
  )
}
