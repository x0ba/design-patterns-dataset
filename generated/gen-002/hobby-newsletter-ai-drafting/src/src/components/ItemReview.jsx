import { useEffect, useRef, useState } from 'react'
import { ISSUE } from '../data/draft.js'
import { DOC_BY_ID } from '../data/sources.js'
import { activeClaims, canApprove, claimProgress, itemWords } from '../lib/selectors.js'
import { wordCount } from '../lib/text.js'
import { Alert, ArrowLeft, Arrow, Check, Cross, Link, Pencil, Redo, Search, Spinner, Trash, Undo } from './Icons.jsx'

export const sourceLabel = (s) => `${DOC_BY_ID[s.doc].short} ${DOC_BY_ID[s.doc].date} · p. ${s.page}`

function StatusMark({ claim, n }) {
  const unsourced = claim.sources.length === 0
  let cls = 'unchecked'
  let content = n
  if (claim.state === 'verified') { cls = 'verified'; content = <Check width={14} height={14} /> }
  else if (claim.state === 'flagged') { cls = 'flagged'; content = <Alert width={14} height={14} /> }
  else if (unsourced) { cls = 'unsourced'; content = '?' }
  return <span className={'claim-mark ' + cls}>{content}</span>
}

function ClaimEditor({ claim, onSave, onCancel }) {
  const [text, setText] = useState(claim.text)
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.setSelectionRange(text.length, text.length)
  }, [])
  return (
    <div className="editor">
      <textarea
        ref={ref}
        value={text}
        rows={3}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) onSave(text.trim())
        }}
        aria-label="Edit claim text"
      />
      <div className="editor-foot">
        <span className="muted">{wordCount(text)} words in this sentence</span>
        <span className="spacer" />
        <button className="btn btn-quiet" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={() => onSave(text.trim())}>Save wording</button>
      </div>
    </div>
  )
}

function Claim({ item, claim, n, selected, dispatch }) {
  const [editing, setEditing] = useState(false)
  const unsourced = claim.sources.length === 0
  const rejected = item.decision === 'rejected'

  if (claim.removed) {
    return (
      <li className="claim removed">
        <span className="claim-mark removed-mark"><Trash width={13} height={13} /></span>
        <div className="claim-body">
          <p className="claim-text struck">{claim.text}</p>
          <button className="link-btn" onClick={() => dispatch({ type: 'restoreClaim', itemId: item.id, claimId: claim.id })}>
            <Undo width={13} height={13} /> Put it back
          </button>
        </div>
      </li>
    )
  }

  const select = () => !selected && dispatch({ type: 'selectClaim', id: claim.id })
  const setState = (value) => dispatch({ type: 'setClaimState', itemId: item.id, claimId: claim.id, value })

  return (
    <li className={'claim' + (selected ? ' sel' : '') + ' st-' + claim.state + (unsourced ? ' nosrc' : '')} aria-current={selected ? 'true' : undefined}>
      <StatusMark claim={claim} n={n} />
      <div className="claim-body">
        {editing ? (
          <ClaimEditor
            claim={claim}
            onCancel={() => setEditing(false)}
            onSave={(text) => { dispatch({ type: 'editClaim', itemId: item.id, claimId: claim.id, text }); setEditing(false) }}
          />
        ) : (
          <p className="claim-text" onClick={select} tabIndex={selected ? -1 : 0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select())} role="button" aria-label={`Claim ${n}: ${claim.text}`}>
            {claim.text}
          </p>
        )}

        {!editing && (
          <div className="src-row">
            {unsourced ? (
              <span className="chip chip-none"><Alert width={12} height={12} /> No source linked</span>
            ) : (
              claim.sources.map((s, i) => (
                claim.sources.findIndex((o) => o.doc === s.doc && o.page === s.page && !o.label && !s.label) < i ? null : <button
                  key={i}
                  className={'chip chip-src' + (selected && i === 0 ? '' : '')}
                  onClick={() => dispatch({ type: 'viewSource', doc: s.doc, page: s.page, active: i, claimSelect: claim.id })}
                  title={s.label || 'Open this page'}
                >
                  <span className="chip-doc">{DOC_BY_ID[s.doc].short} {DOC_BY_ID[s.doc].date}</span>
                  <span className="chip-pg">p. {s.page}</span>
                  {s.label && <span className="chip-lab">{s.label}</span>}
                </button>
              ))
            )}
            {claim.conflict && <span className="chip chip-conflict"><Alert width={12} height={12} /> Sources disagree</span>}
            {claim.edited && <span className="chip chip-edited"><Pencil width={11} height={11} /> Edited by you</span>}
          </div>
        )}

        {selected && !editing && !rejected && (
          <div className="claim-actions">
            {claim.conflict && (
              <p className="claim-warn">
                <Alert width={14} height={14} /> One page gives two different counts. Compare both highlighted passages in the source panel before you decide.
              </p>
            )}
            {unsourced && (
              <p className="claim-warn">
                <Alert width={14} height={14} /> The assistant couldn’t point to a page for this. Search the documents for it, rewrite it, or take it out.
              </p>
            )}
            <div className="btn-row">
              <button
                className={'btn btn-ok' + (claim.state === 'verified' ? ' on' : '')}
                disabled={unsourced}
                onClick={() => setState('verified')}
                title={unsourced ? 'Link a source first' : undefined}
              >
                <Check /> Source says this
              </button>
              <button className={'btn btn-bad' + (claim.state === 'flagged' ? ' on' : '')} onClick={() => setState('flagged')}>
                <Cross /> Doesn’t match
              </button>
              {unsourced && (
                <button className="btn" onClick={() => dispatch({ type: 'search', patch: { open: true, query: claim.searchHint || '' } })}>
                  <Search /> Find a source
                </button>
              )}
            </div>
            <div className="btn-row secondary">
              <button className="btn btn-quiet" onClick={() => setEditing(true)}><Pencil /> Edit wording</button>
              <button className="btn btn-quiet" onClick={() => dispatch({ type: 'removeClaim', itemId: item.id, claimId: claim.id })}><Trash /> Remove claim</button>
            </div>
            {claim.state === 'flagged' && (
              <p className="claim-note">Flagged. Edit or remove this sentence, or ask the assistant to redo the item. The item can’t be approved until this is resolved.</p>
            )}
            {(claim.suggestions || []).map((s, i) => (
              <button key={i} className="suggest" onClick={() => dispatch({ type: 'applySuggestion', itemId: item.id, claimId: claim.id, suggestion: s })}>
                <span className="suggest-label">{s.label}</span>
                <span className="suggest-text">“{s.text}”</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

export default function ItemReview({ state, dispatch }) {
  const item = state.items[state.selectedItem]
  const scroller = useRef(null)
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }) }, [state.selectedItem])
  const claims = item.claims
  const words = itemWords(item)
  const prog = claimProgress(item)
  const approvable = canApprove(item)
  const rejected = item.decision === 'rejected'
  const approved = item.decision === 'approved'
  const nextId = state.selectedItem < Object.keys(state.items).length ? state.selectedItem + 1 : null
  const prevId = state.selectedItem > 1 ? state.selectedItem - 1 : null
  let n = 0

  const remaining = prog.total - prog.verified
  let blocker = null
  if (!approvable && !approved && !rejected) {
    if (prog.total === 0) blocker = 'Every claim has been removed. Reject the item instead.'
    else if (prog.unsourced) blocker = `${prog.unsourced} ${prog.unsourced === 1 ? 'claim has' : 'claims have'} no source.`
    else if (prog.flagged) blocker = `${prog.flagged} flagged ${prog.flagged === 1 ? 'claim needs' : 'claims need'} a fix.`
    else blocker = `${remaining} of ${prog.total} claims still unchecked.`
  }

  return (
    <main className="review" aria-label={`Item ${item.id}`}>
      <div className="review-scroll" ref={scroller}>
        <div className="review-head">
          <div className="crumb-line">
            <span>Item {item.id} of {Object.keys(state.items).length}</span>
            <span className={'conf conf-' + item.confidence}>{item.confidence === 'low' ? 'Low confidence' : 'High confidence'}</span>
            {item.version > 1 && <span className="tag tag-new">Version {item.version}</span>}
            <span className="spacer" />
            <button className="btn btn-quiet btn-sm" disabled={!prevId} onClick={() => dispatch({ type: 'selectItem', id: prevId })}><ArrowLeft width={14} height={14} /> Previous</button>
            <button className="btn btn-quiet btn-sm" disabled={!nextId} onClick={() => dispatch({ type: 'selectItem', id: nextId })}>Next <Arrow width={14} height={14} /></button>
          </div>
          <h1>{item.label}</h1>
          <div className="head-meta">
            <span className={words >= ISSUE.perItemLimit ? 'over' : ''}>{words} of {ISSUE.perItemLimit} words</span>
            <span className="sep">·</span>
            <span>{prog.verified} of {prog.total} claims checked</span>
            {item.version > 1 && (
              <>
                <span className="sep">·</span>
                <button className="link-btn" onClick={() => dispatch({ type: 'restoreVersion', itemId: item.id })}>Restore the earlier version</button>
              </>
            )}
          </div>
        </div>

        <div className={'note note-' + item.confidence}>
          <div className="note-tag">Assistant’s note</div>
          <p>{item.note}</p>
        </div>

        {item.reply && (
          <div className="note note-reply">
            <div className="note-tag">Assistant’s reply</div>
            <p>{item.reply}</p>
          </div>
        )}

        {item.busy && (
          <div className="busy" role="status">
            <Spinner /> The assistant is rereading the sources and redrafting this item…
          </div>
        )}

        {rejected && (
          <div className="rejected-banner">
            This item is rejected and not counted toward your {ISSUE.houseLimit} words.
            <button className="link-btn" onClick={() => dispatch({ type: 'decide', itemId: item.id, decision: 'pending' })}>Bring it back</button>
          </div>
        )}

        <ol className={'claims' + (rejected || item.busy ? ' dim' : '')}>
          {claims.map((c) => {
            if (!c.removed) n += 1
            return <Claim key={c.id} item={item} claim={c} n={n} selected={c.id === state.selectedClaim && !rejected && !item.busy} dispatch={dispatch} />
          })}
        </ol>
      </div>

      <footer className="decide">
        <div className="decide-status">
          {blocker && <span className="blocker">{blocker}</span>}
          {approved && <span className="blocker ok"><Check width={14} height={14} /> Approved for the issue</span>}
          {rejected && <span className="blocker">Rejected. Not in the issue.</span>}
          {!blocker && !approved && !rejected && <span className="blocker ok"><Check width={14} height={14} /> All claims checked. Ready to approve.</span>}
        </div>
        <div className="decide-main">
          <button className="btn" disabled={item.busy} onClick={() => dispatch({ type: 'modal', modal: { type: 'redo', itemId: item.id } })}>
            <Redo /> Ask the assistant to redo
          </button>
          {!rejected && (
            <button className="btn btn-danger" disabled={item.busy} onClick={() => dispatch({ type: 'decide', itemId: item.id, decision: 'rejected' })}>
              <Cross /> Reject item
            </button>
          )}
          {approved ? (
            <button className="btn" onClick={() => dispatch({ type: 'decide', itemId: item.id, decision: 'pending' })}>Reopen</button>
          ) : (
            !rejected && (
              <button className="btn btn-primary" disabled={!approvable || item.busy} onClick={() => dispatch({ type: 'decide', itemId: item.id, decision: 'approved' })}>
                <Check /> Approve item
              </button>
            )
          )}
        </div>
      </footer>
    </main>
  )
}
