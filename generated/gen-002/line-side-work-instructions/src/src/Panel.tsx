import { useMemo, useRef, useState } from 'react'
import type { Comment, Doc, LibraryEntry, Selection } from './types'
import { LIBRARY, RELATED_0377, ROSTER } from './data'
import type { Check } from './checks'
import * as op from './ops'
import { Roster } from './Roster'
import { IAlert, IArrowL, ICheck, IChat, ICopy, IBook, ILink, IPeople, ISearch, ISend, IFlag } from './icons'
import { nowLabel, uid } from './util'

export type Tab = 'comments' | 'review' | 'library'

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
  doc: Doc
  comments: Comment[]
  agreed: string[]
  locked: boolean
  sel: Selection
  setSel: (s: Selection) => void
  edit: (fn: (d: Doc) => Doc, key?: string) => void
  editComments: (fn: (c: Comment[]) => Comment[]) => void
  toggleAgree: (id: string) => void
  checks: Check[]
  ready: boolean
  onSend: () => void
  onRecall: () => void
  cleared: { seq: number; count: number } | null
  toast: (m: string) => void
  pulse: (stepId: string | null) => void
  speaker: string
  setSpeaker: (n: string) => void
  onReadThrough: () => void
}

export function Panel(p: Props) {
  const open = p.comments.filter((c) => !c.resolved).length
  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: string; warn?: boolean }[] = [
    { id: 'comments', label: 'Comments', icon: <IChat size={20} />, badge: open ? String(open) : undefined, warn: open > 0 },
    { id: 'review', label: 'Review', icon: <IPeople size={20} />, badge: `${p.agreed.length}/${ROSTER.length}` },
    { id: 'library', label: 'Library', icon: <IBook size={20} /> },
  ]
  return (
    <div className="panel">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={p.tab === t.id} className={`tab${p.tab === t.id ? ' on' : ''}`} onClick={() => p.setTab(t.id)}>
            {t.label}
            {t.badge && <span className={`badge${t.warn ? ' warn' : ''}`}>{t.badge}</span>}
          </button>
        ))}
      </div>
      <div className="tabbody" role="tabpanel">
        {p.tab === 'comments' && <Comments {...p} />}
        {p.tab === 'review' && <Review {...p} />}
        {p.tab === 'library' && <Library {...p} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Comments(p: Props) {
  const [text, setText] = useState('')
  const [about, setAbout] = useState<string>('auto')
  const [showResolved, setShowResolved] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const aboutId = about === 'auto' ? (p.sel.kind === 'step' ? p.sel.id : 'sheet') : about
  const stepLabel = (c: Comment) => (c.target.kind === 'step' ? `Step ${op.stepNo(p.doc, c.target.id) || '–'}` : 'Whole sheet')

  const openList = p.comments.filter((c) => !c.resolved)
  const done = p.comments.filter((c) => c.resolved)

  const submit = () => {
    const t = text.trim()
    if (!t) return
    p.editComments((cs) => [
      ...cs,
      {
        id: uid('cm'),
        author: p.speaker,
        time: nowLabel(),
        text: t,
        target: aboutId === 'sheet' ? { kind: 'sheet' } : { kind: 'step', id: aboutId },
        resolved: false,
      },
    ])
    setText('')
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }))
  }

  // wording the 500 ml sheet used, when a comment is about the lock nut
  const lockNutWording = RELATED_0377.steps!.find((s) => /loosen the lock nut/i.test(s))
  const adapted = lockNutWording ? op.adaptFrom500(lockNutWording) : null
  const lockNutNo = lockNutWording ? RELATED_0377.steps!.indexOf(lockNutWording) + 1 : 0

  return (
    <div className="comments">
      <div className="list" ref={listRef}>
        {openList.length === 0 && (
          <div className="empty-state">
            <ICheck size={28} />
            <b>No open comments</b>
            <span>Anything the huddle calls out that isn't fixed on the spot goes here.</span>
          </div>
        )}
        {openList.map((c) => {
          const step = c.target.kind === 'step' ? p.doc.steps.find((s) => s.id === (c.target as { id: string }).id) : null
          const suggest = adapted && step && /lock\s?nut/i.test(c.text) && step.text !== adapted.text
          return (
            <article key={c.id} className="comment">
              <header>
                <b>{c.author}</b>
                <span className="muted">{c.time}</span>
                <button
                  className="anchor"
                  onClick={() => {
                    if (c.target.kind === 'step') {
                      p.setSel({ kind: 'step', id: c.target.id })
                      p.pulse(c.target.id)
                    }
                  }}
                  disabled={c.target.kind !== 'step'}
                >
                  {stepLabel(c)}
                </button>
              </header>
              <p>“{c.text}”</p>
              {suggest && step && (
                <div className="suggest">
                  <div className="suggest-head">
                    <IBook size={18} /> {RELATED_0377.id} step {lockNutNo} words it like this
                  </div>
                  <div className="suggest-text">{adapted!.text}</div>
                  {adapted!.changes.length > 0 && <div className="suggest-note">Adjusted for 330 ml: {adapted!.changes.join(', ')}</div>}
                  <button
                    className="ibtn primary"
                    disabled={p.locked}
                    onClick={() => {
                      p.edit(op.editStep(step.id, adapted!.text))
                      p.editComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, resolved: true } : x)))
                      p.toast(`Step ${op.stepNo(p.doc, step.id)} reworded and comment resolved`)
                    }}
                  >
                    <ICheck size={20} /> Use this wording and resolve
                  </button>
                </div>
              )}
              <footer>
                <button
                  className="ibtn"
                  disabled={p.locked}
                  onClick={() => p.editComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, resolved: true } : x)))}
                >
                  <ICheck size={20} /> Mark resolved
                </button>
              </footer>
            </article>
          )
        })}
        {done.length > 0 && (
          <div className="resolved">
            <button className="linkish" onClick={() => setShowResolved(!showResolved)}>
              {showResolved ? 'Hide' : 'Show'} resolved ({done.length})
            </button>
            {showResolved &&
              done.map((c) => (
                <article key={c.id} className="comment done">
                  <header>
                    <b>{c.author}</b>
                    <span className="muted">{c.time}</span>
                    <span className="anchor static">{stepLabel(c)}</span>
                  </header>
                  <p>“{c.text}”</p>
                  <footer>
                    <button className="ibtn" disabled={p.locked} onClick={() => p.editComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, resolved: false } : x)))}>
                      Reopen
                    </button>
                  </footer>
                </article>
              ))}
          </div>
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="row2">
          <label>
            <span>Who is speaking</span>
            <select value={p.speaker} onChange={(e) => p.setSpeaker(e.target.value)}>
              {ROSTER.map((r) => (
                <option key={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>About</span>
            <select value={about} onChange={(e) => setAbout(e.target.value)}>
              <option value="auto">{p.sel.kind === 'step' ? `Step ${op.stepNo(p.doc, p.sel.id)} (selected)` : 'Whole sheet'}</option>
              {p.sel.kind === 'step' && <option value="sheet">Whole sheet</option>}
              {p.doc.steps.map((s, i) => (
                <option key={s.id} value={s.id}>
                  Step {i + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row-send">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="What needs to change?" aria-label="Comment" />
          <button className="ibtn primary" type="submit" disabled={!text.trim()}>
            <IFlag size={20} /> Add
          </button>
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Review(p: Props) {
  const left = p.checks.filter((c) => !c.ok).length
  return (
    <div className="review">
      <div className="review-scroll">
        {p.cleared && (
          <div className="hint warn" key={p.cleared.seq}>
            <IAlert size={20} />
            <span>
              The sheet changed, so the {p.cleared.count} earlier {p.cleared.count === 1 ? 'agreement was' : 'agreements were'} cleared. Read it through again.
            </span>
          </div>
        )}
        <div className="sect-head first">
          <h3>Does everyone agree it reads correctly?</h3>
          <button className="ibtn" onClick={p.onReadThrough}>
            Read it through
          </button>
        </div>
        <Roster agreed={p.agreed} onToggle={p.toggleAgree} locked={p.locked} />
        <p className="fine">Each person taps their own name once they agree. Any change to the sheet clears these.</p>

        <div className="sect-head">
          <h3>Before it goes to {p.doc.reviewer.name}</h3>
        </div>
        <ul className="checks">
          {p.checks
            .filter((c) => c.id !== 'agree')
            .sort((a, b) => Number(a.ok) - Number(b.ok))
            .map((c) => (
              <li key={c.id} className={c.ok ? 'ok' : 'todo'}>
                <span className="cico">{c.ok ? <ICheck size={18} strokeWidth={3} /> : <span className="cdot" />}</span>
                <span className="ctext">
                  <b>{c.label}</b>
                  {!c.ok && <small>{c.detail}</small>}
                </span>
              </li>
            ))}
        </ul>
      </div>

      <div className="review-foot">
        {p.locked ? (
          <>
            <div className="sent-note">
              <ISend size={20} /> With {p.doc.reviewer.name} for sign-off
            </div>
            <button className="ibtn wide" onClick={p.onRecall}>
              Recall to edit
            </button>
          </>
        ) : (
          <button className="send" disabled={!p.ready} onClick={p.onSend}>
            <ISend size={22} />
            {p.ready ? `Send to ${p.doc.reviewer.name} for sign-off` : `${left} ${left === 1 ? 'thing' : 'things'} left before sign-off`}
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Library(p: Props) {
  const [q, setQ] = useState('')
  const [line, setLine] = useState<number | 0>(0)
  const [openId, setOpenId] = useState<string | null>(null)

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return LIBRARY.filter(
      (e) => (line === 0 || e.line === line) && (!needle || `${e.id} ${e.title} ${e.machine}`.toLowerCase().includes(needle)),
    )
  }, [q, line])

  const entry: LibraryEntry | undefined = openId === RELATED_0377.id ? RELATED_0377 : LIBRARY.find((e) => e.id === openId)

  if (entry) return <LibraryDetail entry={entry} p={p} back={() => setOpenId(null)} />

  const row = (e: LibraryEntry, pinned?: boolean) => (
    <button key={e.id} className={`lib-row${pinned ? ' pinned' : ''}`} onClick={() => setOpenId(e.id)}>
      <span className="lib-title">{e.title}</span>
      <span className="lib-meta">
        <span className="mono">{e.id}</span> · {e.machine} · {e.category} · {e.approved}
      </span>
    </button>
  )

  const showRelated = (line === 0 || line === 3) && (!q.trim() || `${RELATED_0377.id} ${RELATED_0377.title}`.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="library">
      <div className="lib-search">
        <ISearch size={20} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 214 approved sheets" aria-label="Search the plant library" />
      </div>
      <div className="chips lines" role="group" aria-label="Filter by line">
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <button key={l} className={`chip${line === l ? ' on' : ''}`} onClick={() => setLine(l)}>
            {l === 0 ? 'All lines' : `Line ${l}`}
          </button>
        ))}
      </div>
      <div className="lib-list">
        {showRelated && (
          <>
            <div className="lib-sect">Closest match to this sheet</div>
            {row(RELATED_0377, true)}
          </>
        )}
        <div className="lib-sect">
          Plant library · {hits.length} {hits.length === 1 ? 'sheet' : 'sheets'}
        </div>
        {hits.slice(0, 80).map((e) => row(e))}
        {hits.length > 80 && <div className="fine pad">Showing the 80 newest. Narrow the search to see more.</div>}
        {hits.length === 0 && <div className="fine pad">Nothing matches “{q}”.</div>}
      </div>
    </div>
  )
}

function LibraryDetail({ entry, p, back }: { entry: LibraryEntry; p: Props; back: () => void }) {
  const linked = p.doc.related.includes(entry.id)
  const selStep = p.sel.kind === 'step' ? p.doc.steps.findIndex((s) => s.id === (p.sel as { id: string }).id) : -1
  return (
    <div className="lib-detail">
      <button className="ibtn back" onClick={back}>
        <IArrowL size={20} /> Back to library
      </button>
      <h3>{entry.title}</h3>
      <div className="lib-facts">
        <span className="mono">{entry.id}</span>
        <span>Line {entry.line} · {entry.machine}</span>
        <span>{entry.category}</span>
        <span>Approved {entry.approved} · rev {entry.rev}</span>
        <span>Author {entry.author}</span>
      </div>
      <button className={`ibtn wide${linked ? ' on' : ''}`} disabled={p.locked} onClick={() => p.edit(op.toggleRelated(entry.id))}>
        <ILink size={20} /> {linked ? 'Linked as “See also” – tap to unlink' : 'Link as “See also” on this sheet'}
      </button>
      {entry.steps ? (
        <>
          <div className="lib-sect">Its steps</div>
          <ol className="lib-steps">
            {entry.steps.map((s, i) => {
              const a = op.adaptFrom500(s)
              return (
                <li key={i}>
                  <span className="num">{i + 1}</span>
                  <div>
                    <div>{s}</div>
                    {selStep >= 0 && (
                      <>
                        {a.changes.length > 0 && <div className="suggest-note">Copied with: {a.changes.join(', ')}</div>}
                        <button
                          className="ibtn small"
                          disabled={p.locked}
                          onClick={() => {
                            p.edit(op.editStep(p.doc.steps[selStep].id, a.text))
                            p.toast(`Step ${selStep + 1} now uses wording from step ${i + 1}${a.changes.length ? ` (${a.changes.join(', ')})` : ''}`)
                          }}
                        >
                          <ICopy size={18} /> Use for step {selStep + 1}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
          {selStep < 0 && <p className="fine">Select a step on the sheet to copy wording into it.</p>}
        </>
      ) : (
        <p className="fine">Only the header details of this sheet are kept on the huddle screen. Link it to show it under “See also”.</p>
      )}
    </div>
  )
}
