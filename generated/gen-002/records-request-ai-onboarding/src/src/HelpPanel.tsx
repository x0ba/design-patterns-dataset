import { ReactNode, useEffect, useRef, useState } from 'react'
import { REDACTIONS, REQUEST, SUPERVISOR, Tab, TRAINER, WALK_STEPS } from './data'
import { ARTICLE_BY_ID, ARTICLES, searchArticles } from './help'
import { fmtTimeSec, summarize } from './store'
import { Ctx, Icon, useApp } from './ctx'
import { editedParas } from './Letter'

/* ---------- Canned, context-aware answers ---------- */
interface QA {
  id: string
  q: string
  article: string
  a: (c: Ctx) => ReactNode
}

const QAS: Record<string, QA> = {
  confidence: {
    id: 'confidence', q: 'What does “medium confidence” mean?', article: 'a6',
    a: ({ state, dispatch }) => {
      const meds = REDACTIONS.filter((r) => r.confidence === 'medium')
      return (
        <>
          <p>It means the text fits the exemption, but <b>there’s one specific fact the assistant couldn’t confirm</b>. Each medium item tells you what that fact is and how to check it.</p>
          <p><b>High</b> means the text clearly matches the exemption and nothing points the other way.</p>
          <p>Neither level predicts whether the redaction would hold up legally. That call is yours. For medium items, AP-07 § 4 asks for a one-sentence reason.</p>
          <div className="qa-jump">
            <span className="small muted">On this request:</span>
            {meds.map((m) => {
              const d = state.decisions[m.id]
              return (
                <button key={m.id} className="chip" onClick={() => { dispatch({ type: 'tab', tab: 'redactions' }); dispatch({ type: 'select', id: m.id }) }}>
                  {m.id} <span className="muted">· {d.status === 'pending' ? 'to review' : d.status}</span>
                </button>
              )
            })}
          </div>
        </>
      )
    },
  },
  saved: {
    id: 'saved', q: 'Are my edits saved?', article: 'a19',
    a: ({ state }) => {
      const sm = summarize(state)
      return (
        <>
          <p><b>Yes, automatically.</b> The last change saved at <b>{fmtTimeSec(state.lastSaved)}</b>. That includes {sm.decided} redaction decisions and {editedParas(state).length} letter edit{editedParas(state).length === 1 ? '' : 's'}.</p>
          <p>There’s no Save button to forget. You can switch to the walkthrough or close this window, and your work will be here when you return.</p>
          <p><b>Saved isn’t sent.</b> Nothing goes to {REQUEST.requester} until you press Send on the Sign-off tab.</p>
        </>
      )
    },
  },
  send: {
    id: 'send', q: 'Can I send a letter the assistant drafted?', article: 'a13',
    a: ({ state, dispatch }) => {
      const sm = summarize(state)
      return (
        <>
          <p><b>Yes.</b> County policy AP-07 § 2 allows it. When you sign, you become the letter’s author, the same as any letter you write yourself.</p>
          <p>Send unlocks when:</p>
          <ul className="mini-check">
            <li className={sm.decided === 14 ? 'ok' : ''}>Every redaction has your decision ({sm.decided}/14)</li>
            <li className={sm.mediumOk ? 'ok' : ''}>Medium items each have a reason (§ 4)</li>
            <li className={state.letterReviewed ? 'ok' : ''}>You’ve read the full letter (§ 5)</li>
          </ul>
          <p>Not sure? You can always send it to {SUPERVISOR.name} for review first.</p>
          <button className="link small" onClick={() => dispatch({ type: 'tab', tab: 'signoff' })}>Open Sign-off tab →</button>
        </>
      )
    },
  },
  bulk: {
    id: 'bulk', q: 'Why can’t I approve them all at once?', article: 'a11',
    a: () => (
      <>
        <p>AP-07 § 3 requires a named person to approve each redaction individually, so there’s no “approve all.”</p>
        <p>To go faster, press <kbd>A</kbd> to approve. It moves you to the next undecided item automatically.</p>
      </>
    ),
  },
  letterparts: {
    id: 'letterparts', q: 'Which parts did the assistant write?', article: 'a16',
    a: ({ state }) => (
      <>
        <p>Each paragraph is labeled. <span className="ptag ptag-ai">Assistant’s draft</span> is unchanged, <span className="ptag ptag-you">Edited by you</span> has your changes, and the redactions paragraph is written from your decisions.</p>
        <p>Right now {editedParas(state).length} paragraph(s) have your edits.</p>
      </>
    ),
  },
  author: {
    id: 'author', q: 'Whose letter is it once I sign it?', article: 'a14',
    a: () => <p>Yours. The draft is a starting point, like a template. Change anything you can’t stand behind. The audit trail shows which paragraphs you changed and which you kept.</p>,
  },
  second: {
    id: 'second', q: 'Should I ask for a second review?', article: 'a15',
    a: () => <p>Whenever you’re unsure, and especially for your first few responses with the assistant or a press request like this one. {SUPERVISOR.name} sees your decisions and notes and can send it back with comments. Nothing is released in the meantime.</p>,
  },
  audit: {
    id: 'audit', q: 'What gets logged with my name?', article: 'a20',
    a: () => <p>Every decision, undo, reason, letter edit, and sign-off, with the time. What the assistant suggested is logged too, so the record shows both what it proposed and what you decided.</p>,
  },
  public: {
    id: 'public', q: 'Can someone request the audit trail?', article: 'a20',
    a: () => <p>Yes. Under AP-07 § 7 it’s kept with the request file and is itself a public record. That’s why reasons on medium items should be short and factual.</p>,
  },
  deadline: {
    id: 'deadline', q: 'What if I can’t finish by the deadline?', article: 'a22',
    a: () => <p>The response is due {REQUEST.due}. PRA § 4(a) allows one extension of up to 10 business days if you send written notice <b>before</b> the deadline. Talk to {SUPERVISOR.name} first.</p>,
  },
  training: {
    id: 'training', q: 'Who can walk me through this in person?', article: 'a5',
    a: ({ openHelp }) => (
      <>
        <p>{TRAINER.name} ({TRAINER.role}) holds office hours {TRAINER.hours}. The next session is <b>tomorrow at 1:00 PM</b>, before this request is due.</p>
        <button className="link small" onClick={() => openHelp({ kind: 'book' })}>Reserve a 15-minute slot →</button>
      </>
    ),
  },
}

const BY_TAB: Record<Tab, string[]> = {
  redactions: ['confidence', 'saved', 'send', 'bulk'],
  letter: ['saved', 'letterparts', 'send', 'author'],
  signoff: ['send', 'second', 'author', 'audit'],
  audit: ['audit', 'public', 'saved'],
}
const TAB_NAME: Record<Tab, string> = { redactions: 'Redactions', letter: 'Response letter', signoff: 'Sign-off', audit: 'Audit trail' }

const MATCHERS: [RegExp, string][] = [
  [/confiden|medium|high|how sure|certain/i, 'confidence'],
  [/approve all|bulk|all at once|faster/i, 'bulk'],
  [/sav|lose|lost|disappear/i, 'saved'],
  [/second|supervisor|gail/i, 'second'],
  [/send|allowed|permit|policy|ap-?07|ok to use/i, 'send'],
  [/author|responsib|my name|sign/i, 'author'],
  [/public.*audit|audit.*public/i, 'public'],
  [/audit|log/i, 'audit'],
  [/deadline|due|extension|late|extend/i, 'deadline'],
  [/luis|training|office hours|in person|someone|talk to/i, 'training'],
  [/which part|who wrote|assistant wrote/i, 'letterparts'],
]

export function HelpPanel() {
  const ctx = useApp()
  const { help, openHelp, setHelpOpen } = ctx
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [help])
  const isHome = help.kind === 'home'
  return (
    <aside className="help" aria-label="Help and guidance">
      <div className="help-head">
        {isHome ? (
          <div className="help-title">
            <Icon name="help" size={18} />
            <div>
              <b>Help</b>
              <span>Your request stays open while you read.</span>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => openHelp({ kind: 'home' })}>
            <Icon name="back" size={14} /> Help home
          </button>
        )}
        <button className="icon-btn" onClick={() => setHelpOpen(false)} aria-label="Close help panel" title="Close help">
          <Icon name="x" />
        </button>
      </div>
      <div className="help-body" ref={bodyRef}>
        {help.kind !== 'book' && help.kind !== 'step' && <AskBox initial={help.kind === 'ask' ? help.q : ''} key={help.kind === 'ask' ? help.q : 'home'} />}
        {help.kind === 'home' && <Home expand={help.expand} />}
        {help.kind === 'ask' && <AskResult q={help.q} />}
        {help.kind === 'article' && <ArticleView id={help.id} />}
        {help.kind === 'all' && <AllArticles />}
        {help.kind === 'step' && <StepView id={help.id} />}
        {help.kind === 'book' && <BookView />}
      </div>
    </aside>
  )
}

function AskBox({ initial }: { initial: string }) {
  const { openHelp } = useApp()
  const [q, setQ] = useState(initial)
  return (
    <form
      className="ask"
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim()) openHelp({ kind: 'ask', q: q.trim() })
      }}
    >
      <Icon name="search" size={16} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question or search 22 help articles" aria-label="Ask a question or search help" />
      {q && <button type="submit" className="btn btn-sm btn-primary">Ask</button>}
    </form>
  )
}

function QAItem({ qa, open, onToggle }: { qa: QA; open: boolean; onToggle: () => void }) {
  const ctx = useApp()
  return (
    <div className={`qa ${open ? 'open' : ''}`}>
      <button className="qa-q" onClick={onToggle} aria-expanded={open}>
        <span>{qa.q}</span>
        <Icon name="chevDown" size={14} />
      </button>
      {open && (
        <div className="qa-a">
          {qa.a(ctx)}
          <button className="link small qa-more" onClick={() => ctx.openHelp({ kind: 'article', id: qa.article })}>
            <Icon name="book" size={12} /> Full article: {ARTICLE_BY_ID[qa.article].title}
          </button>
        </div>
      )}
    </div>
  )
}

function Home({ expand }: { expand?: string }) {
  const { state, openHelp } = useApp()
  const ids = BY_TAB[state.tab]
  const [open, setOpen] = useState<string | null>(expand ?? null)
  useEffect(() => {
    if (expand) setOpen(expand)
  }, [expand])
  return (
    <>
      <section className="help-sec">
        <div className="help-sec-title">Questions at this step <span className="muted">· {TAB_NAME[state.tab]}</span></div>
        {ids.map((id) => (
          <QAItem key={id} qa={QAS[id]} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />
        ))}
      </section>
      <WalkCard />
      <TrainerCard />
      <button className="browse" onClick={() => openHelp({ kind: 'all' })}>
        <Icon name="book" size={16} /> Browse all {ARTICLES.length} help articles <Icon name="chev" size={14} />
      </button>
      <p className="help-disclaimer">Help articles explain how Clerkwise and AP-07 work. They aren’t legal advice. Exemption questions still go to County Counsel.</p>
    </>
  )
}

function WalkCard() {
  const { state, openHelp } = useApp()
  const done = state.walkDone.length
  return (
    <section className="help-sec walk">
      <div className="walk-head">
        <div className="help-sec-title">Getting-started walkthrough</div>
        <span className="small"><b>{done} of 5</b> done</span>
      </div>
      <div className="walk-bar"><span style={{ width: `${(done / 5) * 100}%` }} /></div>
      <p className="small muted walk-note">Paused when you opened this request. Your place is saved. Steps open here, next to your work.</p>
      <ol className="walk-steps">
        {WALK_STEPS.map((w) => {
          const isDone = state.walkDone.includes(w.id)
          const isNext = !isDone && WALK_STEPS.find((x) => !state.walkDone.includes(x.id))?.id === w.id
          return (
            <li key={w.id}>
              <button className={`ws ${isDone ? 'done' : ''} ${isNext ? 'next' : ''}`} onClick={() => openHelp({ kind: 'step', id: w.id })}>
                <span className="ws-n">{isDone ? <Icon name="check" size={11} /> : w.n}</span>
                <span className="ws-t">{w.title}</span>
                {isNext && <span className="ws-badge">{w.id === 'w3' && state.tab === 'redactions' ? 'You’re here' : 'Next'}</span>}
                <Icon name="chev" size={13} />
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function TrainerCard() {
  const { state, openHelp } = useApp()
  return (
    <section className="help-sec trainer">
      <div className="trainer-row">
        <span className="trainer-av" aria-hidden="true">LO</span>
        <div>
          <b>{TRAINER.name}</b>
          <div className="small muted">{TRAINER.role} · your training contact</div>
        </div>
      </div>
      <div className="trainer-hours">
        <Icon name="calendar" size={14} />
        <div>
          <div className="small">Office hours {TRAINER.hours}</div>
          <div className="small"><b>Next: {TRAINER.next}</b> <span className="tag tag-ok">before your deadline</span></div>
        </div>
      </div>
      {state.booking ? (
        <div className="booked small">
          <Icon name="check" size={14} /> You’re booked tomorrow at <b>{state.booking.slot} PM</b>{state.booking.attach ? ` · ${REQUEST.id} shared` : ''}.{' '}
          <button className="link small" onClick={() => openHelp({ kind: 'book' })}>Details</button>
        </div>
      ) : (
        <div className="trainer-actions">
          <button className="btn btn-sm" onClick={() => openHelp({ kind: 'book' })}><Icon name="calendar" size={14} /> Reserve a slot</button>
          <a className="btn btn-sm btn-ghost" href={`mailto:${TRAINER.email}?subject=${encodeURIComponent('Clerkwise question – ' + REQUEST.id)}`}><Icon name="mail" size={14} /> Email</a>
          <span className="small muted">{TRAINER.ext}</span>
        </div>
      )}
    </section>
  )
}

function AskResult({ q }: { q: string }) {
  const ctx = useApp()
  const hit = MATCHERS.find(([re]) => re.test(q))?.[1]
  const qa = hit ? QAS[hit] : null
  const related = searchArticles(q).filter((a) => a.id !== qa?.article).slice(0, 4)
  return (
    <section className="help-sec">
      {qa ? (
        <div className="answer">
          <div className="eyebrow"><Icon name="book" size={12} /> Answer from help article</div>
          <h3>{qa.q}</h3>
          {qa.a(ctx)}
          <button className="link small qa-more" onClick={() => ctx.openHelp({ kind: 'article', id: qa.article })}>Full article: {ARTICLE_BY_ID[qa.article].title}</button>
        </div>
      ) : related.length === 0 ? (
        <div className="answer">
          <h3>No help article covers that yet</h3>
          <p>Try different words, or ask {TRAINER.name} directly. Office hours are tomorrow, 1:00–3:00 PM. If it’s about whether an exemption applies, ask County Counsel.</p>
          <button className="btn btn-sm" onClick={() => ctx.openHelp({ kind: 'book' })}><Icon name="calendar" size={14} /> Reserve a slot with {TRAINER.name}</button>
        </div>
      ) : null}
      {related.length > 0 && (
        <>
          <div className="help-sec-title">{qa ? 'Related articles' : `Articles matching “${q}”`}</div>
          <ul className="art-list">
            {related.map((a) => (
              <li key={a.id}><button onClick={() => ctx.openHelp({ kind: 'article', id: a.id })}><span className="art-cat">{a.cat}</span>{a.title}</button></li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function renderBody(lines: string[]) {
  const out: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) out.push(<ul key={'u' + out.length}>{list.map((l, i) => <li key={i}>{l}</li>)}</ul>)
    list = []
  }
  lines.forEach((l) => {
    if (l.startsWith('- ')) list.push(l.slice(2))
    else {
      flush()
      if (l.startsWith('## ')) out.push(<h4 key={out.length}>{l.slice(3)}</h4>)
      else out.push(<p key={out.length}>{l}</p>)
    }
  })
  flush()
  return out
}

function ArticleView({ id }: { id: string }) {
  const { openHelp } = useApp()
  const a = ARTICLE_BY_ID[id]
  const [fb, setFb] = useState<null | 'yes' | 'no'>(null)
  const siblings = ARTICLES.filter((x) => x.cat === a.cat && x.id !== a.id)
  return (
    <article className="help-sec article">
      <div className="art-cat">{a.cat} · updated {a.updated}</div>
      <h3>{a.title}</h3>
      <div className="art-body">{renderBody(a.body)}</div>
      <div className="feedback">
        {fb ? (
          <span className="small muted">{fb === 'yes' ? 'Thanks. Glad it helped.' : `Thanks. ${TRAINER.name} reviews this feedback weekly. You can also bring the question to office hours.`}</span>
        ) : (
          <>
            <span className="small">Did this answer your question?</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setFb('yes')}>Yes</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setFb('no')}>Not really</button>
          </>
        )}
      </div>
      {siblings.length > 0 && (
        <>
          <div className="help-sec-title">More in {a.cat}</div>
          <ul className="art-list">
            {siblings.map((s) => <li key={s.id}><button onClick={() => openHelp({ kind: 'article', id: s.id })}>{s.title}</button></li>)}
          </ul>
        </>
      )}
    </article>
  )
}

function AllArticles() {
  const { openHelp } = useApp()
  const cats = Array.from(new Set(ARTICLES.map((a) => a.cat)))
  return (
    <section className="help-sec">
      <div className="help-sec-title">All {ARTICLES.length} help articles</div>
      {cats.map((c) => (
        <div key={c} className="art-group">
          <div className="art-group-h">{c}</div>
          <ul className="art-list">
            {ARTICLES.filter((a) => a.cat === c).map((a) => <li key={a.id}><button onClick={() => openHelp({ kind: 'article', id: a.id })}>{a.title}</button></li>)}
          </ul>
        </div>
      ))}
    </section>
  )
}

function StepView({ id }: { id: string }) {
  const { state, dispatch, showMe, openHelp } = useApp()
  const w = WALK_STEPS.find((x) => x.id === id)!
  const done = state.walkDone.includes(id)
  const i = WALK_STEPS.indexOf(w)
  return (
    <section className="help-sec step">
      <div className="step-top">
        <span className="small muted">Walkthrough · step {w.n} of 5</span>
        {done && <span className="tag tag-ok"><Icon name="check" size={11} /> Done</span>}
      </div>
      <h3>{w.title}</h3>
      <p className="step-sum">{w.summary}</p>
      {w.id === 'w3' && (
        <div className="callout">
          You don’t need to leave {REQUEST.id} for this step. It uses the redactions in front of you, and your decisions count toward the real response.
        </div>
      )}
      <ul className="step-points">{w.points.map((p, k) => <li key={k}>{p}</li>)}</ul>
      {w.showMe && (
        <div className="showme">
          <div className="help-sec-title">Show me on screen</div>
          {w.showMe.map((s) => (
            <button key={s.target} className="showme-btn" onClick={() => showMe(s.target, s.tab)}>
              <Icon name="eye" size={14} /> {s.label}
            </button>
          ))}
        </div>
      )}
      <div className="step-actions">
        <button className={`btn btn-sm ${done ? 'btn-ghost' : 'btn-primary'}`} onClick={() => dispatch({ type: 'walkDone', id, done: !done })}>
          {done ? 'Mark as not done' : <><Icon name="check" size={14} /> Mark step done</>}
        </button>
        <div className="step-nav">
          <button className="icon-btn" disabled={i === 0} onClick={() => openHelp({ kind: 'step', id: WALK_STEPS[i - 1].id })} aria-label="Previous step"><Icon name="back" size={14} /></button>
          <button className="icon-btn" disabled={i === 4} onClick={() => openHelp({ kind: 'step', id: WALK_STEPS[i + 1].id })} aria-label="Next step"><Icon name="chev" size={14} /></button>
        </div>
      </div>
    </section>
  )
}

function BookView() {
  const { state, dispatch } = useApp()
  const [slot, setSlot] = useState<string | null>(null)
  const [attach, setAttach] = useState(true)
  const [topic, setTopic] = useState(`Medium-confidence redactions on ${REQUEST.id} (R3, R12, R14). Response due Wed.`)
  if (state.booking) {
    return (
      <section className="help-sec">
        <div className="booked-big">
          <Icon name="check" size={20} />
          <div>
            <b>Booked with {TRAINER.name}</b>
            <div>Tomorrow, Tue Nov 17 at {state.booking.slot} PM · 15 min</div>
            <div className="small muted">{TRAINER.where}</div>
          </div>
        </div>
        <p className="small"><b>Topic:</b> {state.booking.topic}</p>
        {state.booking.attach && <p className="small muted">{REQUEST.id} is shared with {TRAINER.name} as read-only. It can be viewed together, but no one else can change decisions or send anything.</p>}
        <button className="btn btn-sm btn-ghost" onClick={() => dispatch({ type: 'unbook' })}>Cancel booking</button>
      </section>
    )
  }
  return (
    <section className="help-sec">
      <h3>Reserve time with {TRAINER.name}</h3>
      <p className="small muted">{TRAINER.role} · {TRAINER.where}</p>
      <div className="help-sec-title">Tomorrow, Tue Nov 17 · 15-minute slots</div>
      <div className="slots">
        {TRAINER.slots.map((s) => {
          const taken = TRAINER.taken.includes(s)
          return (
            <button key={s} className={`slot ${slot === s ? 'on' : ''}`} disabled={taken} onClick={() => setSlot(s)}>
              {s} PM{taken && <span>taken</span>}
            </button>
          )
        })}
      </div>
      <label className="field">
        <span className="field-label">What do you want help with?</span>
        <textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </label>
      <label className="check small">
        <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
        <span>Share {REQUEST.id} with {TRAINER.name} (read-only) so you can look at it together</span>
      </label>
      <button className="btn btn-primary" disabled={!slot} onClick={() => slot && dispatch({ type: 'book', slot, attach, topic })}>
        <Icon name="calendar" size={14} /> {slot ? `Reserve ${slot} PM` : 'Pick a time'}
      </button>
      <p className="small muted">Can’t wait until tomorrow? Call {TRAINER.ext} or email {TRAINER.email}.</p>
    </section>
  )
}
