import { Fragment, useEffect, useMemo, useRef } from 'react'
import { DOCS, DOC_BY_ID, getPage } from '../data/sources.js'
import { searchSources } from '../lib/search.js'
import { isHeading, paragraphs } from '../lib/text.js'
import { Alert, Arrow, ArrowLeft, Check, Cross, Link, Search } from './Icons.jsx'

// Split a paragraph into plain and highlighted runs.
function runs(para, marks) {
  const found = []
  for (const m of marks) {
    if (!m.text) continue
    const hay = m.ci ? para.toLowerCase() : para
    const needle = m.ci ? m.text.toLowerCase() : m.text
    const i = hay.indexOf(needle)
    if (i !== -1) found.push({ s: i, e: i + needle.length, cls: m.cls, label: m.label })
  }
  found.sort((a, b) => a.s - b.s)
  const out = []
  let pos = 0
  for (const f of found) {
    if (f.s < pos) continue
    if (f.s > pos) out.push({ t: para.slice(pos, f.s) })
    out.push({ t: para.slice(f.s, f.e), cls: f.cls, label: f.label })
    pos = f.e
  }
  if (pos < para.length) out.push({ t: para.slice(pos) })
  return out
}

function Para({ text, marks }) {
  const parts = runs(text, marks)
  return parts.map((p, i) =>
    p.cls ? (
      <mark key={i} className={p.cls} data-label={p.label || undefined}>{p.t}</mark>
    ) : (
      <Fragment key={i}>{p.t}</Fragment>
    ),
  )
}

function ScanPlaceholder({ page, ack, dispatch }) {
  return (
    <div className="scan" role="img" aria-label={`Page ${page} is a scanned image with no readable text`}>
      <div className="scan-note">
        <Alert width={18} height={18} />
        <div>
          <strong>Scanned image — no readable text.</strong>
          <p>The assistant skipped pages 6–8 of these minutes, so nothing in the draft can be checked against them here. Per the index on page 2, they cover Dunmore Road traffic safety (p. 6), the Alder Street rezoning request (p. 7) and the stormwater fee (p. 8).</p>
          <label className="ack">
            <input type="checkbox" checked={ack} onChange={(e) => dispatch({ type: 'setAck', value: e.target.checked })} />
            I checked pages 6–8 on paper
          </label>
        </div>
      </div>
      <div className="scan-sheet">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="scan-line" style={{ width: `${58 + ((i * 37) % 40)}%`, opacity: 0.35 + ((i * 13) % 5) / 14 }} />
        ))}
      </div>
    </div>
  )
}

function Results({ state, dispatch }) {
  const { query } = state.search
  const { hits, unsearchable } = useMemo(() => searchSources(query), [query])
  const item = state.items[state.selectedItem]
  const claim = item.claims.find((c) => c.id === state.selectedClaim && !c.removed)
  const claimNo = claim ? item.claims.filter((c) => !c.removed).indexOf(claim) + 1 : null
  const canLink = claim && item.decision !== 'rejected' && !item.busy
  const q = query.trim()
  return (
    <div className="results">
      {q.length < 2 ? (
        <p className="results-empty">Type a word or phrase to search every readable page in all five documents.</p>
      ) : hits.length === 0 ? (
        <div className="results-empty strong">
          <strong>No page contains “{q}”.</strong>
          <p>That’s worth knowing: if a claim rests on those words, nothing here backs it up. Try a shorter phrase, or check the unreadable pages by hand.</p>
        </div>
      ) : (
        <>
          <p className="results-count">{hits.length} {hits.length === 1 ? 'passage' : 'passages'} containing “{q}”</p>
          <ul>
            {hits.map((h, i) => {
              const linked = claim && claim.sources.some((s) => s.doc === h.doc && s.page === h.page && s.quote === h.snippet)
              return (
                <li key={i} className="hit">
                  <div className="hit-top">
                    <span className="chip chip-src"><span className="chip-doc">{DOC_BY_ID[h.doc].short} {DOC_BY_ID[h.doc].date}</span><span className="chip-pg">p. {h.page}</span></span>
                  </div>
                  <p className="hit-text"><Para text={h.snippet} marks={[{ text: h.term, ci: true, cls: 'mark-search' }]} /></p>
                  <div className="hit-actions">
                    <button className="btn btn-sm" onClick={() => dispatch({ type: 'viewSource', doc: h.doc, page: h.page, term: h.term, keepSearch: true })}>
                      Read on the page
                    </button>
                    {canLink && (
                      <button className="btn btn-sm btn-primary" disabled={linked} onClick={() => dispatch({ type: 'linkSource', itemId: item.id, claimId: claim.id, source: { doc: h.doc, page: h.page, quote: h.snippet } })}>
                        <Link width={13} height={13} /> {linked ? 'Linked' : `Link to claim ${claimNo}`}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {unsearchable.length > 0 && (
        <p className="results-foot">
          <Alert width={13} height={13} /> Council minutes Nov 10, pages {unsearchable.map((u) => u.page).join(', ')} are scanned images and can’t be searched.
        </p>
      )}
    </div>
  )
}

function Paper({ state, dispatch }) {
  const { viewer } = state
  const doc = DOC_BY_ID[viewer.doc]
  const page = getPage(viewer.doc, viewer.page)
  const item = state.items[state.selectedItem]
  const claim = item.claims.find((c) => c.id === state.selectedClaim && !c.removed)
  const ref = useRef(null)

  const marks = []
  if (claim && item.decision !== 'rejected') {
    claim.sources.forEach((s, i) => {
      if (s.doc === viewer.doc && s.page === viewer.page) {
        const conflictCls = claim.conflict ? (i === 0 ? ' mark-a' : ' mark-b') : ''
        marks.push({ text: s.quote, cls: 'mark' + (i === viewer.active ? ' active' : '') + conflictCls, label: claim.conflict ? s.label : null })
      }
    })
  }
  if (viewer.term) marks.push({ text: viewer.term, ci: true, cls: 'mark-search' })

  useEffect(() => {
    const box = ref.current
    if (!box) return
    const el = box.querySelector('mark.active, mark')
    if (el) {
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: 'smooth' })
    } else box.scrollTo({ top: 0 })
  }, [viewer.doc, viewer.page, viewer.active, state.selectedClaim, viewer.term])

  const go = (d) => {
    const n = viewer.page + d
    if (n >= 1 && n <= doc.pages.length) dispatch({ type: 'viewSource', doc: viewer.doc, page: n })
  }

  return (
    <div className="paper-wrap" ref={ref}>
      <article className="paper" aria-label={`${doc.title}, page ${viewer.page}`}>
        <div className="paper-run">{doc.running}</div>
        {page.unreadable ? (
          <ScanPlaceholder page={page.n} ack={state.ackUnread} dispatch={dispatch} />
        ) : (
          <div className="paper-body">
            {paragraphs(page.text).map((p, i) =>
              isHeading(p) ? (
                <h3 key={i}><Para text={p.slice(2)} marks={marks} /></h3>
              ) : (
                <p key={i}><Para text={p} marks={marks} /></p>
              ),
            )}
          </div>
        )}
        <div className="paper-foot">
          <button className="pg-btn" onClick={() => go(-1)} disabled={viewer.page <= 1} aria-label="Previous page"><ArrowLeft width={14} height={14} /></button>
          <span>Page {viewer.page} of {doc.pages.length}</span>
          <button className="pg-btn" onClick={() => go(1)} disabled={viewer.page >= doc.pages.length} aria-label="Next page"><Arrow width={14} height={14} /></button>
        </div>
      </article>
    </div>
  )
}

function ClaimBar({ state, dispatch }) {
  const item = state.items[state.selectedItem]
  const claim = item.claims.find((c) => c.id === state.selectedClaim && !c.removed)
  if (!claim || item.decision === 'rejected') return null
  const no = item.claims.filter((c) => !c.removed).indexOf(claim) + 1
  const unsourced = claim.sources.length === 0
  const set = (value) => dispatch({ type: 'setClaimState', itemId: item.id, claimId: claim.id, value })
  return (
    <div className="claimbar">
      <div className="claimbar-text">
        <span className="claimbar-tag">Item {item.id}, claim {no}</span>
        <span className="claimbar-claim">{claim.text}</span>
      </div>
      {unsourced ? (
        <button className="btn btn-sm" onClick={() => dispatch({ type: 'search', patch: { open: true, query: claim.searchHint || '' } })}><Search width={14} height={14} /> Find a source</button>
      ) : (
        <div className="btn-row">
          <button className={'btn btn-sm btn-ok' + (claim.state === 'verified' ? ' on' : '')} onClick={() => set('verified')}><Check width={14} height={14} /> Source says this</button>
          <button className={'btn btn-sm btn-bad' + (claim.state === 'flagged' ? ' on' : '')} onClick={() => set('flagged')}><Cross width={14} height={14} /> Doesn’t match</button>
        </div>
      )}
    </div>
  )
}

export default function SourcePane({ state, dispatch }) {
  const { viewer, search } = state
  const doc = DOC_BY_ID[viewer.doc]
  const item = state.items[state.selectedItem]
  const cited = new Set()
  const selected = new Set()
  item.claims.filter((c) => !c.removed).forEach((c) =>
    c.sources.forEach((s) => {
      if (s.doc === viewer.doc) {
        cited.add(s.page)
        if (c.id === state.selectedClaim) selected.add(s.page)
      }
    }),
  )

  return (
    <section className="source" aria-label="Source documents">
      <div className="source-head">
        <div className="searchbox">
          <Search width={16} height={16} />
          <input
            type="search"
            value={search.query}
            placeholder="Search all five documents for a word or phrase"
            onChange={(e) => dispatch({ type: 'search', patch: { query: e.target.value, open: true } })}
            onFocus={() => search.query && !search.open && dispatch({ type: 'search', patch: { open: true } })}
            aria-label="Search the source documents"
          />
          {search.open && (
            <button className="link-btn" onClick={() => dispatch({ type: 'search', patch: { open: false } })}>Back to page</button>
          )}
        </div>
        <div className="docs" role="tablist" aria-label="Documents">
          {DOCS.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={d.id === viewer.doc && !search.open}
              className={'doc-tab' + (d.id === viewer.doc && !search.open ? ' on' : '')}
              onClick={() => dispatch({ type: 'viewSource', doc: d.id, page: 1 })}
            >
              <span className="doc-tab-name">{d.short}</span>
              <span className="doc-tab-sub">{d.kind === 'minutes' ? `${d.date} · ${d.pages.length} pp.` : d.date}</span>
              {d.pages.some((p) => p.unreadable) && <span className="doc-warn" title="Some pages are unreadable"><Alert width={12} height={12} /></span>}
            </button>
          ))}
        </div>
        {!search.open && (
          <>
            <div className="doc-title">
              <strong>{doc.title}</strong>
              <span>{doc.meta}</span>
            </div>
            <div className="pages" aria-label="Pages">
              {doc.pages.map((p) => (
                <button
                  key={p.n}
                  className={'pg' + (p.n === viewer.page ? ' on' : '') + (p.unreadable ? ' scan' : '') + (cited.has(p.n) ? ' cited' : '') + (selected.has(p.n) ? ' selcited' : '')}
                  onClick={() => dispatch({ type: 'viewSource', doc: viewer.doc, page: p.n })}
                  title={p.unreadable ? `Page ${p.n}: scanned, unreadable` : cited.has(p.n) ? `Page ${p.n}: cited by item ${item.id}` : `Page ${p.n}`}
                  aria-label={`Page ${p.n}${p.unreadable ? ', unreadable scan' : ''}${cited.has(p.n) ? `, cited by item ${item.id}` : ''}`}
                >
                  {p.n}
                </button>
              ))}
            </div>
            <div className="legend">
              <span><i className="lg lg-cited" /> cited by item {item.id}</span>
              <span><i className="lg lg-scan" /> unreadable scan</span>
            </div>
          </>
        )}
      </div>
      {search.open ? <Results state={state} dispatch={dispatch} /> : <Paper state={state} dispatch={dispatch} />}
      <ClaimBar state={state} dispatch={dispatch} />
    </section>
  )
}
