import { ISSUE } from '../data/draft.js'
import { DOC_BY_ID } from '../data/sources.js'
import { activeClaims, budget, claimProgress, itemWords, readiness } from '../lib/selectors.js'
import { Alert, Check, Cross } from './Icons.jsx'

function Budget({ state, dispatch }) {
  const b = budget(state.items)
  const items = Object.values(state.items).filter((i) => i.decision !== 'rejected')
  const scale = Math.max(b.words, b.limit)
  const over = b.over > 0
  return (
    <section className={'card budget' + (over ? ' is-over' : ' is-ok')} aria-label="Word budget">
      <div className="budget-head">
        <div className="budget-num">
          <span className="big">{b.words}</span>
          <span className="of"> / {b.limit} words</span>
        </div>
        <div className="budget-verdict">
          {over ? `${b.over} over your house limit` : b.over === 0 ? 'Right at the limit' : `${-b.over} words to spare`}
        </div>
      </div>
      <div className="bar" role="img" aria-label={`${b.words} words in the section, house limit ${b.limit}`}>
        {items.map((it) => (
          <button
            key={it.id}
            className={'seg' + (it.id === state.selectedItem ? ' sel' : '') + (it.decision === 'approved' ? ' approved' : '')}
            style={{ width: `${(itemWords(it) / scale) * 100}%` }}
            onClick={() => dispatch({ type: 'selectItem', id: it.id })}
            title={`Item ${it.id}: ${itemWords(it)} words`}
          >
            {it.id}
          </button>
        ))}
        <span className="limit-line" style={{ left: `${(b.limit / scale) * 100}%` }}>
          <span className="limit-tag">{b.limit}</span>
        </span>
      </div>
      <p className="budget-foot">House limit from your past issues. Rejected items drop out.</p>
    </section>
  )
}

function Row({ ok, label, detail, children }) {
  return (
    <li className={'check-row ' + (ok ? 'ok' : 'todo')}>
      <span className="check-ico" aria-hidden="true">{ok ? <Check width={12} height={12} /> : <span className="dot" />}</span>
      <div className="check-body">
        <div className="check-label">{label}</div>
        {detail && <div className="check-detail">{detail}</div>}
        {children}
      </div>
    </li>
  )
}

function Checklist({ state, dispatch }) {
  const r = readiness(state)
  return (
    <section className="card checklist" aria-label="Before this can go out">
      <h2 className="card-title">Before this can go out</h2>
      <ul>
        <Row ok={r.budget.over <= 0} label={r.budget.over > 0 ? `Cut ${r.budget.over} words` : 'Within the word limit'} />
        <Row
          ok={r.unsourced === 0}
          label={r.unsourced === 0 ? 'Every claim has a source' : `${r.unsourced} ${r.unsourced === 1 ? 'claim has' : 'claims have'} no source`}
        />
        <Row
          ok={r.unreadAcknowledged}
          label={r.unreadAcknowledged ? 'Pages 6–8 checked on paper' : 'Council pp. 6–8 never read (scan)'}
        >
          {!r.unreadAcknowledged && (
            <button className="link-btn" onClick={() => dispatch({ type: 'viewSource', doc: 'council', page: 6 })}>Open page 6</button>
          )}
        </Row>
        <Row
          ok={r.undecided === 0 && r.flagged === 0}
          label={r.undecided === 0 ? 'Every item decided' : `${r.decided} of ${r.total} items decided`}
          detail={r.flagged ? `${r.flagged} flagged ${r.flagged === 1 ? 'claim needs' : 'claims need'} a fix.` : null}
        />
      </ul>
    </section>
  )
}

function ItemList({ state, dispatch }) {
  return (
    <ol className="items">
      {Object.values(state.items).map((it) => {
        const p = claimProgress(it)
        const sel = it.id === state.selectedItem
        const conflicts = activeClaims(it).filter((c) => c.conflict).length
        return (
          <li key={it.id}>
            <button className={'item-row' + (sel ? ' sel' : '') + (it.decision === 'rejected' ? ' rejected' : '')} onClick={() => dispatch({ type: 'selectItem', id: it.id })} aria-current={sel ? 'true' : undefined}>
              <span className={'item-n d-' + it.decision}>
                {it.decision === 'approved' ? <Check width={14} height={14} /> : it.decision === 'rejected' ? <Cross width={13} height={13} /> : it.id}
              </span>
              <span className="item-main">
                <span className="item-label">{it.label}</span>
                <span className="item-meta">
                  <span>{itemWords(it)} words</span>
                  <span className="sep">·</span>
                  <span>{p.verified}/{p.total} checked</span>
                  {it.busy && <span className="tag tag-busy">Redrafting…</span>}
                  {it.version > 1 && <span className="tag tag-new">v{it.version}</span>}
                </span>
                {(p.unsourced > 0 || conflicts > 0 || p.flagged > 0) && it.decision !== 'rejected' && (
                  <span className="item-flags">
                    {p.unsourced > 0 && <span className="flag"><Alert width={12} height={12} /> {p.unsourced} no source</span>}
                    {conflicts > 0 && <span className="flag"><Alert width={12} height={12} /> sources disagree</span>}
                    {p.flagged > 0 && <span className="flag"><Alert width={12} height={12} /> {p.flagged} flagged</span>}
                  </span>
                )}
              </span>
              <span className={'conf conf-' + it.confidence}>{it.confidence === 'low' ? 'Low' : 'High'}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function WorkLog({ state, dispatch }) {
  return (
    <div className="worklog">
      <p className="log-intro">What the assistant did, in order. It read {Object.keys(DOC_BY_ID).length} documents.</p>
      <ol>
        {state.log.map((e) => (
          <li key={e.n} className={'log-row' + (e.warn ? ' warn' : '') + (e.user ? ' user' : '')}>
            <span className="log-n">{e.n}</span>
            <div>
              <div className="log-time">{e.time}{e.user ? ' · You' : ''}</div>
              <div className="log-text">{e.text}</div>
              {e.jump && (
                <button className="link-btn" onClick={() => dispatch({ type: 'viewSource', doc: e.jump.doc, page: e.jump.page })}>
                  Open page {e.jump.page}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function LeftRail({ state, dispatch }) {
  const tab = state.leftTab
  return (
    <aside className="rail">
      <div className="rail-scroll">
        <Budget state={state} dispatch={dispatch} />
        <Checklist state={state} dispatch={dispatch} />
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'items'} className={tab === 'items' ? 'on' : ''} onClick={() => dispatch({ type: 'setTab', tab: 'items' })}>
            Draft items <span className="count">7</span>
          </button>
          <button role="tab" aria-selected={tab === 'log'} className={tab === 'log' ? 'on' : ''} onClick={() => dispatch({ type: 'setTab', tab: 'log' })}>
            Work log <span className="count">{state.log.length}</span>
          </button>
        </div>
        {tab === 'items' ? <ItemList state={state} dispatch={dispatch} /> : <WorkLog state={state} dispatch={dispatch} />}
      </div>
    </aside>
  )
}
