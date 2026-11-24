import { useLayoutEffect, useRef } from 'react'
import { LETTER_PARAS, REQUEST, USER } from './data'
import { exemptionParagraph, State, summarize } from './store'
import { Icon, useApp } from './ctx'

export const AI_FOOTER = 'This response was prepared with the help of county drafting software and was reviewed and approved by the staff member named above. (Marren County AP-07 § 6)'

export function editedParas(s: State) {
  return LETTER_PARAS.filter((p) => !p.generated && s.letter[p.id] !== p.text)
}

function AutoText({ value, onChange, onFocus, onBlur, disabled, label }: { value: string; onChange: (v: string) => void; onFocus: () => void; onBlur: () => void; disabled: boolean; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return <textarea ref={ref} className="para-text" value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={disabled} aria-label={`Letter paragraph: ${label}`} rows={1} />
}

export function LetterView() {
  const { state, dispatch, openHelp, saving } = useApp()
  const sm = summarize(state)
  const edited = editedParas(state)
  const snapshot = useRef<Record<string, string>>({})
  const locked = !!state.sent
  const kept = LETTER_PARAS.filter((p) => !p.generated).length - edited.length

  return (
    <div className="letter-view">
      <div className="letter-scroll">
        <article className="letter">
          <header className="lh">
            <div className="lh-seal" aria-hidden="true">MC</div>
            <div>
              <div className="lh-org">Office of the Marren County Clerk-Recorder</div>
              <div className="lh-sub">Denise Albright, County Clerk-Recorder · 200 Courthouse Square, Linden Falls, OR 97391</div>
            </div>
          </header>
          <div className="letter-date">{state.sent ? new Date(state.sent.t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'November 16, 2026'}</div>
          <address className="letter-addr">
            {REQUEST.requester}
            {REQUEST.requesterAddress.map((l) => <div key={l}>{l}</div>)}
            <div>By email: {REQUEST.requesterEmail}</div>
          </address>
          <div className="letter-re"><b>Re: Public Records Request {REQUEST.id}</b></div>

          {LETTER_PARAS.map((p) => {
            if (p.generated) {
              return (
                <div key={p.id} className="para para-gen">
                  <div className="para-tag">
                    <span className="ptag ptag-gen"><Icon name="list" size={12} /> Written from your redaction decisions</span>
                    {sm.decided < 14 && <span className="ptag ptag-warn">{14 - sm.decided} still undecided</span>}
                  </div>
                  <p className="para-static">{exemptionParagraph(state)}</p>
                </div>
              )
            }
            const isEdited = state.letter[p.id] !== p.text
            return (
              <div key={p.id} className={`para ${isEdited ? 'para-edited' : ''}`} data-spot={p.id === 'opening' ? 'letter-badge' : undefined}>
                <div className="para-tag">
                  {isEdited ? (
                    <span className="ptag ptag-you"><Icon name="pen" size={12} /> Edited by you</span>
                  ) : (
                    <span className="ptag ptag-ai"><Icon name="spark" size={12} /> Assistant’s draft</span>
                  )}
                  {isEdited && !locked && (
                    <button
                      className="link small"
                      onClick={() => {
                        dispatch({ type: 'letter', pid: p.id, text: p.text })
                        dispatch({ type: 'letterCommit', pid: p.id, label: p.label, restored: true })
                      }}
                    >
                      Restore draft
                    </button>
                  )}
                </div>
                <AutoText
                  label={p.label}
                  value={state.letter[p.id]}
                  disabled={locked}
                  onChange={(v) => dispatch({ type: 'letter', pid: p.id, text: v })}
                  onFocus={() => (snapshot.current[p.id] = state.letter[p.id])}
                  onBlur={() => {
                    if (snapshot.current[p.id] !== undefined && snapshot.current[p.id] !== state.letter[p.id]) dispatch({ type: 'letterCommit', pid: p.id, label: p.label })
                  }}
                />
              </div>
            )
          })}

          <div className="letter-sign">
            <div>Sincerely,</div>
            <div className="sig-space">{state.sent?.mode === 'requester' ? <span className="sig">Renata Bálint</span> : <span className="sig-pending">Signature added at sign-off</span>}</div>
            <div><b>{USER.name}</b></div>
            <div>{USER.title}, Office of the Marren County Clerk-Recorder</div>
          </div>
          <div className="letter-portal">Records portal: records.marrencounty.gov/r/{REQUEST.id}</div>
          <footer className="letter-foot">
            <Icon name="lock" size={12} /> {AI_FOOTER}
          </footer>
        </article>
      </div>

      <aside className="letter-side">
        <div className="card">
          <div className="eyebrow">This draft</div>
          <ul className="facts">
            <li><span className="ptag ptag-you"><Icon name="pen" size={12} /> {edited.length}</span> paragraph{edited.length === 1 ? '' : 's'} edited by you</li>
            <li><span className="ptag ptag-ai"><Icon name="spark" size={12} /> {kept}</span> still in the assistant’s wording</li>
            <li><span className="ptag ptag-gen"><Icon name="list" size={12} /> 1</span> written from your decisions</li>
          </ul>
          <p className="small muted">Click any paragraph to edit it. Changes save as you type{saving ? ' (saving…)' : ''}.</p>
          <button className="link small" onClick={() => openHelp({ kind: 'article', id: 'a14' })}>Who is the author of this letter?</button>
        </div>

        <div className={`card read-card ${state.letterReviewed ? 'ok' : ''}`}>
          <div className="eyebrow">AP-07 § 5</div>
          <label className="check">
            <input type="checkbox" checked={state.letterReviewed} disabled={locked} onChange={(e) => dispatch({ type: 'letterReviewed', on: e.target.checked })} />
            <span>I’ve read the full letter, including the parts the assistant wrote.</span>
          </label>
          {!state.letterReviewed && edited.length > 0 && <p className="small muted">If you edit the letter after checking this, you’ll be asked to confirm again.</p>}
        </div>

        <div className="card">
          <div className="eyebrow">Footer</div>
          <p className="small">AP-07 § 6 adds a fixed footer to every letter drafted with the assistant. It can’t be removed.</p>
          <button className="link small" onClick={() => openHelp({ kind: 'article', id: 'a18' })}>About the footer</button>
        </div>
      </aside>
    </div>
  )
}
