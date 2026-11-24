import { useEffect, useRef, useState } from 'react'
import { DOCS } from '../data/sources.js'
import { ISSUE } from '../data/draft.js'
import { activeClaims, budget, itemText, itemWords } from '../lib/selectors.js'
import { Check, Cross, Doc, Redo } from './Icons.jsx'

function Modal({ title, sub, onClose, children, wide }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Cross /></button>
        </header>
        {children}
      </div>
    </div>
  )
}

export function RedoModal({ state, dispatch, itemId, onSend }) {
  const item = state.items[itemId]
  const planningOnly = itemId === 5
  const [instruction, setInstruction] = useState(
    planningOnly
      ? 'Redo item 5 using only the planning commission minutes (Nov. 13). Leave out anything you can’t link to a page.'
      : `Redo item ${itemId}. Link every claim to a page, and leave out anything you can’t.`,
  )
  const [picked, setPicked] = useState(() => new Set(planningOnly ? ['planning'] : DOCS.map((d) => d.id)))
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const close = () => dispatch({ type: 'modal', modal: null })
  return (
    <Modal title={`Ask the assistant to redo item ${itemId}`} sub={item.label} onClose={close}>
      <div className="modal-body">
        <label className="field-label" htmlFor="redo-text">What should it do differently?</label>
        <textarea id="redo-text" rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
        <fieldset className="srcpick">
          <legend className="field-label">Which documents may it use?</legend>
          {DOCS.map((d) => (
            <label key={d.id} className={'srcpick-row' + (picked.has(d.id) ? ' on' : '')}>
              <input type="checkbox" checked={picked.has(d.id)} onChange={() => toggle(d.id)} />
              <span className="srcpick-name">{d.title}</span>
              <span className="srcpick-sub">{d.meta} · {d.pages.length} {d.pages.length === 1 ? 'page' : 'pages'}{d.pages.some((p) => p.unreadable) ? ' · pp. 6–8 unreadable' : ''}</span>
            </label>
          ))}
        </fieldset>
        <p className="modal-hint">The current wording is kept. You can restore it from the item if the new version is worse. Everything it writes comes back unchecked.</p>
      </div>
      <footer className="modal-foot">
        <button className="btn btn-quiet" onClick={close}>Cancel</button>
        <button className="btn btn-primary" disabled={!instruction.trim() || picked.size === 0} onClick={() => onSend(itemId, instruction.trim(), [...picked])}>
          <Redo /> Send to the assistant
        </button>
      </footer>
    </Modal>
  )
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
  return Promise.resolve()
}

export function PreviewModal({ state, dispatch }) {
  const items = Object.values(state.items)
  const approved = items.filter((i) => i.decision === 'approved')
  const waiting = items.filter((i) => i.decision === 'pending')
  const b = budget(state.items)
  const words = b.approvedWords
  const [copied, setCopied] = useState(false)
  const close = () => dispatch({ type: 'modal', modal: null })
  const asText = `${ISSUE.section}\n\n` + approved.map((i) => itemText(i)).join('\n\n')
  return (
    <Modal wide title="Assembled section" sub={`${ISSUE.section} · approved items only`} onClose={close}>
      <div className="modal-body preview">
        <div className={'preview-count' + (words > ISSUE.houseLimit ? ' over' : '')}>
          <strong>{words}</strong> of {ISSUE.houseLimit} words
          {words > ISSUE.houseLimit && <span> — {words - ISSUE.houseLimit} over</span>}
        </div>
        {approved.length === 0 ? (
          <p className="preview-empty">Nothing is approved yet. Items you approve appear here in order, exactly as they will read in the email.</p>
        ) : (
          <div className="preview-paper">
            <h3>{ISSUE.section}</h3>
            {approved.map((i) => (
              <p key={i.id}><span className="preview-n">{i.id}</span>{itemText(i)}</p>
            ))}
          </div>
        )}
        {waiting.length > 0 && (
          <p className="preview-wait">
            Still to decide: {waiting.map((i) => `item ${i.id}`).join(', ')}.
          </p>
        )}
      </div>
      <footer className="modal-foot">
        <button className="btn btn-quiet" onClick={close}>Close</button>
        <button
          className="btn btn-primary"
          disabled={approved.length === 0}
          onClick={() => copyText(asText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200) })}
        >
          {copied ? <><Check /> Copied</> : <><Doc /> Copy as plain text</>}
        </button>
      </footer>
    </Modal>
  )
}

export function Toast({ toast, dispatch }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => dispatch({ type: 'clearToast' }), 7000)
    return () => clearTimeout(t)
  }, [toast, dispatch])
  if (!toast) return null
  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.undo && (
        <button className="link-btn" onClick={() => dispatch(toast.undo)}>Undo</button>
      )}
    </div>
  )
}
