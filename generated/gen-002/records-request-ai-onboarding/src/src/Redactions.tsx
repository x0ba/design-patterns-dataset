import { useEffect, useRef, useState } from 'react'
import { Confidence, DOC_BY_ID, EXEMPTIONS, ExemptionCode, Redaction, REDACTIONS } from './data'
import { fmtTime } from './store'
import { ConfBadge, Icon, Popover, useApp } from './ctx'

type Filter = 'all' | 'todo' | 'medium'

export function RedactionsView() {
  const { state, dispatch } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const sel = REDACTIONS.find((r) => r.id === state.selected) ?? REDACTIONS[0]
  const todo = REDACTIONS.filter((r) => state.decisions[r.id].status === 'pending').length
  const medium = REDACTIONS.filter((r) => r.confidence === 'medium').length
  const shown = REDACTIONS.filter((r) => (filter === 'all' ? true : filter === 'todo' ? state.decisions[r.id].status === 'pending' : r.confidence === 'medium'))
  const groups = (Object.keys(EXEMPTIONS) as ExemptionCode[]).map((c) => ({ c, items: shown.filter((r) => r.exemption === c) })).filter((g) => g.items.length)

  return (
    <div className="red-view">
      <aside className="red-list" aria-label="Suggested redactions">
        <div className="red-list-head">
          <div className="seg" role="group" aria-label="Filter">
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All <b>14</b></button>
            <button className={filter === 'todo' ? 'on' : ''} onClick={() => setFilter('todo')}>To review <b>{todo}</b></button>
            <button className={filter === 'medium' ? 'on' : ''} onClick={() => setFilter('medium')}>Medium <b>{medium}</b></button>
          </div>
        </div>
        <div className="red-list-scroll">
          {groups.length === 0 && <div className="empty">Nothing left to review in this view.</div>}
          {groups.map((g) => (
            <div key={g.c} className="red-group">
              <div className="red-group-head">
                <span className="code">{g.c}</span> {EXEMPTIONS[g.c].label}
                <span className="red-group-n">{REDACTIONS.filter((r) => r.exemption === g.c).length}</span>
              </div>
              {g.items.map((r) => {
                const d = state.decisions[r.id]
                return (
                  <button key={r.id} className={`red-row ${r.id === sel.id ? 'sel' : ''} st-${d.status}`} onClick={() => dispatch({ type: 'select', id: r.id })} aria-current={r.id === sel.id}>
                    <StatusDot s={d.status} />
                    <span className="red-row-main">
                      <span className="red-row-top">
                        <b>{r.id}</b>
                        <span className="muted">{r.docId} · p. {r.page}</span>
                        {d.exemption !== r.exemption && <span className="tag tag-warn">→ {d.exemption}</span>}
                      </span>
                      <span className="red-row-snip">{r.span}</span>
                    </span>
                    {r.confidence === 'medium' ? <ConfBadge c="medium" /> : <span className="conf-mini" title="High confidence">High</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="red-list-foot">
          <Icon name="keyboard" size={14} /> <kbd>J</kbd><kbd>K</kbd> move · <kbd>A</kbd> approve · <kbd>D</kbd> decline
        </div>
      </aside>
      <DocumentPane r={sel} />
      <DecisionCard r={sel} key={sel.id} />
    </div>
  )
}

function StatusDot({ s }: { s: string }) {
  if (s === 'approved') return <span className="sdot sdot-ok" title="Approved"><Icon name="check" size={11} /></span>
  if (s === 'declined') return <span className="sdot sdot-no" title="Won’t be redacted"><Icon name="x" size={10} /></span>
  return <span className="sdot" title="Needs your decision" />
}

function DocumentPane({ r }: { r: Redaction }) {
  const { state, dispatch } = useApp()
  const doc = DOC_BY_ID[r.docId]
  const d = state.decisions[r.id]
  const preview = state.previewRequester
  const markRef = useRef<HTMLElement>(null)
  useEffect(() => {
    markRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [r.id])
  const markCls = preview ? (d.status === 'approved' ? 'mk-black' : 'mk-none') : `mk mk-${d.status} mk-${r.confidence}`
  return (
    <section className="doc-pane" aria-label="Document">
      <div className="doc-bar">
        <div className="doc-bar-title">
          <Icon name="doc" size={15} />
          <b>{doc.id}</b>
          <span className="muted">page {r.page} of {doc.pages}</span>
        </div>
        <label className="toggle" data-spot="preview">
          <input type="checkbox" checked={preview} onChange={(e) => dispatch({ type: 'preview', on: e.target.checked })} />
          <span className="toggle-track"><span /></span>
          <Icon name="eye" size={14} /> As requester will see
        </label>
      </div>
      <div className="doc-scroll">
        <article className="page">
          <div className="page-num">{doc.id} · {r.page}/{doc.pages}</div>
          <dl className="email-head">
            <dt>From</dt><dd>{doc.from}</dd>
            <dt>To</dt><dd>{doc.to}</dd>
            {doc.cc && (<><dt>Cc</dt><dd className={r.id === 'R12' && !preview ? 'hl-cc' : ''}>{doc.cc}</dd></>)}
            <dt>Date</dt><dd>{doc.date}</dd>
            <dt>Subject</dt><dd><b>{doc.subject}</b></dd>
          </dl>
          <div className="email-body">
            {r.before}
            <mark ref={markRef} className={markCls}>
              {!preview && <span className="mk-tag">{r.id} · {d.exemption}</span>}
              {preview && d.status === 'approved' ? (
                <span className="black-bar" aria-label={`Redacted under ${d.exemption}`}>
                  <span className="black-code">{d.exemption}</span>
                  <span className="black-fill">{r.span}</span>
                </span>
              ) : (
                r.span
              )}
            </mark>
            {r.after}
          </div>
        </article>
        {preview && (
          <p className="preview-note">
            <Icon name="eye" size={14} />
            {d.status === 'approved' ? 'This is how the passage will look in the released record.' : d.status === 'declined' ? 'You chose not to redact this. It will be released as shown.' : 'Not decided yet. If you send now this would be released unredacted, so Send stays locked until you decide.'}
          </p>
        )}
      </div>
    </section>
  )
}

function ConfidenceExplainer({ c, onClose }: { c: Confidence; onClose: () => void }) {
  const { dispatch, openHelp, state } = useApp()
  const mediums = REDACTIONS.filter((r) => r.confidence === 'medium')
  return (
    <div className="pop-pad conf-pop">
      <div className="eyebrow">What “{c === 'high' ? 'High' : 'Medium'} confidence” means</div>
      {c === 'medium' ? (
        <p>The text fits the exemption, but <b>there’s one specific fact the assistant couldn’t confirm</b>, and that fact could change the answer. It tells you below what the fact is and how to check it.</p>
      ) : (
        <p>The text clearly matches the exemption and the assistant found <b>nothing pointing the other way</b>. It still needs your approval.</p>
      )}
      <p className="muted small">Confidence shows how much checking a suggestion needs. It’s <b>not</b> a prediction of whether the redaction would hold up legally. That decision is yours.</p>
      {c === 'medium' && (
        <>
          <p className="small">AP-07 § 4: write a one-sentence reason when you decide a medium item.</p>
          <div className="pop-chips">
            <span className="small muted">Medium on this request:</span>
            {mediums.map((m) => (
              <button key={m.id} className={`chip ${state.selected === m.id ? 'on' : ''}`} onClick={() => { dispatch({ type: 'select', id: m.id }); onClose() }}>
                {m.id}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="pop-actions">
        <button className="link" onClick={() => { openHelp({ kind: 'article', id: 'a6' }); onClose() }}>Read: What confidence levels mean →</button>
      </div>
    </div>
  )
}

function DecisionCard({ r }: { r: Redaction }) {
  const { state, dispatch, openHelp } = useApp()
  const d = state.decisions[r.id]
  const ex = EXEMPTIONS[d.exemption]
  const needsNote = r.confidence === 'medium'
  const noteMissing = needsNote && !d.note.trim()
  const locked = !!state.sent
  const idx = REDACTIONS.indexOf(r)
  const [showEx, setShowEx] = useState(false)

  const advance = () => {
    for (let j = 1; j <= REDACTIONS.length; j++) {
      const nx = REDACTIONS[(idx + j) % REDACTIONS.length]
      if (nx.id !== r.id && state.decisions[nx.id].status === 'pending') return dispatch({ type: 'select', id: nx.id })
    }
  }
  const decide = (status: 'approved' | 'declined') => {
    dispatch({ type: 'decide', id: r.id, status })
    advance()
  }

  return (
    <section className="decide" aria-label="Your decision">
      <div className="decide-scroll">
        <div className="decide-head">
          <div className="decide-title">
            <span className="muted small">Suggested redaction</span>
            <h2>{r.id} <span className="of">of 14</span></h2>
          </div>
          <span data-spot="confidence">
            <Popover
              width={340}
              align="right"
              trigger={(_, toggle) => <ConfBadge c={r.confidence} onClick={toggle} />}
            >
              {(close) => <ConfidenceExplainer c={r.confidence} onClose={close} />}
            </Popover>
          </span>
        </div>

        <div className="ex-box">
          <div className="ex-line">
            <span className="code code-lg">{d.exemption}</span>
            <span><b>{ex.label}</b><br /><span className="muted small">{ex.citation}</span></span>
          </div>
          <button className="link small" onClick={() => openHelp({ kind: 'article', id: ex.articleId })}>About this exemption</button>
        </div>

        <div className="why">
          <div className="eyebrow"><Icon name="spark" size={13} /> Why the assistant suggested it</div>
          <p>{r.rationale}</p>
        </div>

        {r.uncertainty && (
          <div className="unsure">
            <div className="eyebrow eyebrow-warn"><Icon name="flag" size={13} /> What it couldn’t confirm</div>
            <p>{r.uncertainty}</p>
            <div className="eyebrow">How to check</div>
            <ol>{r.check!.map((c, i) => <li key={i}>{c}</li>)}</ol>
          </div>
        )}

      </div>
      <div className="decide-dock">
        {d.status === 'pending' && !locked ? (
          <div className="decide-form" data-spot="decision">
            <label className="field">
              <span className="field-label">
                Reason for your decision{' '}
                {needsNote ? <span className="req">Required · AP-07 § 4</span> : <span className="opt">Optional</span>}
              </span>
              <textarea
                id={'note-' + r.id}
                rows={2}
                value={d.note}
                placeholder={needsNote ? (r.id === 'R3' ? 'e.g. “Checked IT device list: not a county phone.”' : r.id === 'R12' ? 'e.g. “Confirmed with P. Raman: Halvorsen retained by Counsel.”' : 'e.g. “Matches final staff report §3, already public.”') : 'Add a note for the file (optional)'}
                onChange={(e) => dispatch({ type: 'note', id: r.id, note: e.target.value })}
                onBlur={() => dispatch({ type: 'noteCommit', id: r.id })}
              />
            </label>
            {showEx || d.exemption !== r.exemption ? (
            <label className="field field-inline">
              <span className="field-label">Exemption to cite</span>
              <select value={d.exemption} onChange={(e) => dispatch({ type: 'setExemption', id: r.id, code: e.target.value as ExemptionCode })}>
                {(Object.keys(EXEMPTIONS) as ExemptionCode[]).map((c) => (
                  <option key={c} value={c}>{c} · {EXEMPTIONS[c].label}{c === r.exemption ? ' (suggested)' : ''}</option>
                ))}
              </select>
            </label>
            ) : null}
            <div className="decide-btns">
              <button className="btn btn-primary" disabled={noteMissing} onClick={() => decide('approved')} title="Shortcut: A">
                <Icon name="check" /> Approve redaction
              </button>
              <button className="btn" disabled={noteMissing} onClick={() => decide('declined')} title="Shortcut: D · the text will be released">
                <Icon name="eye" /> Don’t redact
              </button>
            </div>
            <p className="small muted decide-foot">
              {noteMissing ? 'Write a short reason first. Then approve or decline.' : 'Logged with your name and the time. You can undo it until you send.'}
              {!showEx && d.exemption === r.exemption && (
                <>
                  {' '}
                  <button className="link small" onClick={() => setShowEx(true)}>Cite a different exemption</button>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className={`decided decided-${d.status}`}>
            <div className="decided-line">
              <StatusDot s={d.status} />
              <div>
                <b>{d.status === 'approved' ? <>Approved · redacted as <span className="nw">{d.exemption}</span></> : d.status === 'declined' ? 'Not redacted · will be released' : 'No decision'}</b>
                {d.by && <div className="small muted">{d.by} · {fmtTime(d.at!)} · logged in audit trail</div>}
              </div>
            </div>
            {d.note && <p className="decided-note">“{d.note}”</p>}
            {!locked && (
              <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'undo', id: r.id })}>
                <Icon name="undo" size={14} /> Undo decision
              </button>
            )}
          </div>
        )}
      </div>
      <div className="decide-nav">
        <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => dispatch({ type: 'select', id: REDACTIONS[idx - 1].id })}>
          <Icon name="back" size={14} /> {idx > 0 ? REDACTIONS[idx - 1].id : 'Prev'}
        </button>
        <span className="small muted">{idx + 1} / 14</span>
        <button className="btn btn-ghost btn-sm" disabled={idx === 13} onClick={() => dispatch({ type: 'select', id: REDACTIONS[idx + 1].id })}>
          {idx < 13 ? REDACTIONS[idx + 1].id : 'Next'} <Icon name="chev" size={14} />
        </button>
      </div>
    </section>
  )
}
