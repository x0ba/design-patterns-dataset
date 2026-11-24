import { ReactNode, useMemo } from 'react'
import { AlertTriangle, ArrowRight, Check, CircleAlert, Clock, Info, Send, Undo2, UserCheck, XCircle, CalendarClock } from 'lucide-react'
import { useStore, NAMES } from './store'
import { AUDIENCES, AudienceId, EFFECTIVE_2024, MEMOS, TODAY } from './data'
import { audienceChanged, audienceRows, bundleFit, changedMemoIds, countChangedAudiences, summaryGrades } from './logic'

type Level = 'block' | 'warn' | 'info'
interface Check { level: Level; title: string; body: ReactNode; action?: { label: string; run: () => void } }

export default function Review() {
  const { s, d } = useStore()
  const changedAud = countChangedAudiences(s.published, s.draft)
  const decCount = changedMemoIds(s.decisions, s.pubDecisions).length
  const histChanged = s.historicalPublic !== s.pubHistoricalPublic
  const memoChanged = decCount > 0 || histChanged
  const hasChanges = changedAud > 0 || memoChanged
  const retireIds = Object.entries(s.decisions).filter(([, v]) => v === 'retire').map(([k]) => k)
  const histIds = Object.entries(s.decisions).filter(([, v]) => v === 'historical').map(([k]) => k)
  const keepIds = Object.entries(s.decisions).filter(([, v]) => v === 'keep').map(([k]) => k)
  const need = MEMOS.filter((m) => m.changed || m.flagged)
  const undecided = need.filter((m) => !s.decisions[m.id])

  const checks = useMemo<Check[]>(() => {
    const out: Check[] = []
    const ins = s.draft.inspectors
    const miss = ins.editionRule === 'permit-date' ? (['2021', '2024'] as const).filter((e) => !ins.bundle.includes(e)) : ins.editionRule === 'fixed' && !ins.bundle.includes(ins.fixedEdition) ? [ins.fixedEdition] : []
    if (miss.length) out.push({ level: 'block', title: `Inspectors’ bundle is missing ${miss.join(' and ')}`, body: 'Their default edition would not exist on the tablet when offline.', action: { label: 'Fix in bundle', run: () => { d({ type: 'audience', id: 'inspectors' }) } } })
    const fit = bundleFit(ins.bundle)
    if (fit.short.length) out.push({ level: 'warn', title: `${fit.short.length} tablets lack the space for a ${fit.size.toFixed(1)} GB bundle`, body: `${fit.short.map((t) => t.inspector).join(', ')}. Each needs ${fit.need.toFixed(1)} GB free. They would stay on the Nov 3 bundle until space is cleared.`, action: { label: 'See tablets', run: () => d({ type: 'audience', id: 'inspectors' }) } })
    const c = s.draft.counter
    if (c.editionRule === 'fixed' && c.fixedEdition === '2021') out.push({ level: 'warn', title: 'Counter staff still open 2021 after Jan 1', body: 'New applications filed from Jan 1, 2027 fall under 2024. Nine counter staff would start from the wrong edition.', action: { label: 'Open counter staff', run: () => d({ type: 'audience', id: 'counter' }) } })
    const pu = s.draft.public
    if (pu.editionRule === 'fixed' && pu.fixedEdition === '2024' && TODAY < EFFECTIVE_2024) {
      if (!pu.notice) out.push({ level: 'warn', title: 'The public opens 2024 with no transition notice', body: 'Anyone applying before Jan 1 could read the wrong edition without being told.', action: { label: 'Open public', run: () => d({ type: 'audience', id: 'public' }) } })
      else if (s.timing === 'now') out.push({ level: 'info', title: 'The public sees 2024 before it takes effect', body: 'On publish, the public site opens 2024 about 6 weeks early. The notice tells people that applications filed before Jan 1, 2027 still use 2021. To switch on Jan 1 instead, choose “Go live Jan 1” on the right.' })
    }
    const g = summaryGrades()
    AUDIENCES.forEach((a) => {
      const x = s.draft[a.id]
      if (!x.summaries) return
      const over = g.filter((r) => r.grade > x.grade).length
      if (over) out.push({ level: 'warn', title: `${a.name}: ${over} of ${g.length} previewed summaries read above grade ${x.grade}`, body: 'Raise the target or ask the writers to simplify those summaries.', action: { label: 'Open', run: () => d({ type: 'audience', id: a.id }) } })
    })
    if (AUDIENCES.some((a) => s.draft[a.id].summaries && s.draft[a.id].vi)) out.push({ level: 'info', title: 'Vietnamese summaries are 40% written', body: 'Readers who choose Vietnamese will see the English summary where a translation is missing.' })
    if (undecided.length) out.push({ level: 'info', title: `${undecided.length} of ${need.length} affected memos have no decision`, body: 'They stay active and unlabelled for now. You can decide later.', action: { label: 'Open memos', run: () => d({ type: 'tab', tab: 'memos' }) } })
    const rr = MEMOS.filter((m) => retireIds.includes(m.id) && m.openPermits > 0)
    if (rr.length) out.push({ level: 'warn', title: `${rr.length} retired memos are cited in open 2021 reviews`, body: `${rr.map((m) => m.id).join(', ')}. Reviewers would lose them mid-review. Historical keeps them visible.`, action: { label: 'Open memos', run: () => d({ type: 'tab', tab: 'memos' }) } })
    return out
  }, [s.draft, s.decisions, s.timing])

  const blockers = checks.filter((c) => c.level === 'block')
  const suggested = () => {
    const parts: string[] = []
    const r = s.draft.reviewers, i = s.draft.inspectors, p = s.draft.public
    if (audienceChanged(s.published.reviewers, r, 'reviewers')) parts.push('Plan reviewers open the edition matching the permit’s application date')
    if (audienceChanged(s.published.inspectors, i, 'inspectors')) parts.push(`field inspectors get a ${bundleFit(i.bundle).size.toFixed(1)} GB bundle with ${i.bundle.join(' and ')}`)
    if (audienceChanged(s.published.public, p, 'public')) parts.push(`the public opens ${p.fixedEdition} with ${p.notice ? 'a transition notice' : 'no notice'}`)
    if (decCount) parts.push(`${retireIds.length} memos retired, ${histIds.length} marked historical`)
    return (parts.join('; ') || 'Settings update') + '.'
  }

  const who = NAMES[s.user]
  const canEdit = s.user === 'priya'

  return (
    <div className="page">
      <div className="review-grid">
        <div className="review-main">
          <h1 className="page-h">Review before publishing</h1>
          <p className="page-sub">{hasChanges ? `${changedAud} of 4 audiences change${memoChanged ? `, plus ${decCount} memo decision${decCount === 1 ? '' : 's'}` : ''}. Compare what each gets, then send it to Marcus Bell.` : 'The draft matches what is live. Nothing to publish.'}</p>

          <h2 className="sec-h">What each audience will get</h2>
          <div className="aud-cards">
            {AUDIENCES.map((a) => {
              const rows = audienceRows(s.published[a.id], s.draft[a.id], a.id)
              const ch = rows.filter((r) => r.changed)
              return (
                <article key={a.id} className={`rv-card ${ch.length ? 'is-changed' : ''}`}>
                  <header>
                    <div><h3>{a.name}</h3><span>{a.size}</span></div>
                    {ch.length ? <span className="tag tag-chg">{ch.length} change{ch.length > 1 ? 's' : ''}</span> : <span className="tag tag-none">No change</span>}
                  </header>
                  {ch.length === 0 ? (
                    <p className="rv-same">{rows[0].to}. {rows.filter(r => r.key === 'summ')[0].to === 'Off' ? 'Summaries off.' : 'Summaries on.'}</p>
                  ) : (
                    <dl>
                      {ch.map((r) => (
                        <div key={r.key} className="rv-row">
                          <dt>{r.label}</dt>
                          <dd><span className="from">{r.from}</span><ArrowRight size={12} /><span className="to">{r.to}</span></dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <button className="linklike" onClick={() => d({ type: 'audience', id: a.id as AudienceId })}>Preview as {a.name.toLowerCase()}</button>
                </article>
              )
            })}
          </div>

          <h2 className="sec-h">Interpretation memos</h2>
          <div className="rv-memos">
            <div className="stat"><b>{retireIds.length}</b><span>to retire</span></div>
            <div className="stat"><b>{histIds.length}</b><span>marked Historical</span></div>
            <div className="stat"><b>{keepIds.length}</b><span>kept active</span></div>
            <div className="stat muted-stat"><b>{undecided.length}</b><span>undecided, stay active</span></div>
            <div className="stat-note">Historical memos {s.historicalPublic ? 'are' : 'are not'} shown to the public.
              <button className="linklike" onClick={() => d({ type: 'tab', tab: 'memos' })}>Edit decisions</button></div>
          </div>

          <h2 className="sec-h">Checks <span className="count">{checks.length}</span></h2>
          {checks.length === 0 ? <p className="rv-same">No issues found.</p> : (
            <ul className="checks-list">
              {checks.map((c, i) => (
                <li key={i} className={`chk chk-${c.level}`}>
                  <span className="chk-ic">{c.level === 'block' ? <XCircle size={16} /> : c.level === 'warn' ? <AlertTriangle size={16} /> : <Info size={16} />}</span>
                  <div><b>{c.title}</b><p>{c.body}</p></div>
                  {c.action && <button className="btn btn-sm" onClick={c.action.run}>{c.action.label}</button>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="approval" aria-label="Approval">
          <div className="ap-card">
            <h2 className="col-h">Approval</h2>
            <p className="ap-sub">Settings changes need a second approver: <b>Marcus Bell</b>, Deputy Building Official.</p>
            <ol className="steps">
              <Step n={1} label="Draft" state={s.status === 'draft' || s.status === 'changes' ? 'cur' : 'done'} />
              <Step n={2} label="Marcus Bell approves" state={s.status === 'pending' ? 'cur' : s.status === 'approved' || s.status === 'scheduled' ? 'done' : 'todo'} />
              <Step n={3} label={s.timing === 'effective' ? 'Goes live Jan 1' : 'Publish'} state={s.status === 'scheduled' ? 'cur' : 'todo'} />
            </ol>

            {(s.status === 'draft' || s.status === 'changes') && canEdit && (
              <>
                {s.status === 'changes' && <div className="callout callout-warn"><CircleAlert size={15} /><span><b>Marcus asked for changes.</b> {s.log[0]?.text.replace(/^Asked for changes: ?/, '')}</span></div>}
                <fieldset className="timing">
                  <legend>When to go live</legend>
                  <label><input type="radio" name="timing" checked={s.timing === 'now'} onChange={() => d({ type: 'timing', value: 'now' })} /><span><b>As soon as approved</b><em>Tablets can start syncing the larger bundle right away.</em></span></label>
                  <label><input type="radio" name="timing" checked={s.timing === 'effective'} onChange={() => d({ type: 'timing', value: 'effective' })} /><span><b>Go live Jan 1, 2027</b><em>Everything switches at 12:00 AM. Tablets would not have the 2024 edition beforehand.</em></span></label>
                </fieldset>
                <div className="note-f">
                  <div className="note-h"><label htmlFor="note">Note for Marcus</label><button className="linklike" onClick={() => d({ type: 'note', value: suggested() })}>Suggest from changes</button></div>
                  <textarea id="note" rows={4} value={s.note} placeholder="What changed and why" onChange={(e) => d({ type: 'note', value: e.target.value })} />
                </div>
                <button className="btn btn-primary btn-block" disabled={!hasChanges || blockers.length > 0 || !s.note.trim()} onClick={() => d({ type: 'submit' })}>
                  <Send size={14} /> Submit to Marcus Bell
                </button>
                <p className="ap-why">
                  {!hasChanges ? 'No changes to submit.' : blockers.length ? `Fix ${blockers.length} blocking check first.` : !s.note.trim() ? 'Add a note so the approver knows what to look for.' : `${checks.filter((c) => c.level === 'warn').length} warnings do not block submission.`}
                </p>
              </>
            )}

            {s.status === 'pending' && (
              <>
                <div className="pending"><Clock size={16} /><div><b>Waiting on Marcus Bell</b><span>{s.note}</span></div></div>
                {canEdit ? (
                  <button className="btn btn-block" onClick={() => d({ type: 'withdraw' })}><Undo2 size={14} /> Withdraw to keep editing</button>
                ) : (
                  <div className="approver">
                    <label htmlFor="cmt">Comment (optional)</label>
                    <textarea id="cmt" rows={3} value={s.comment} onChange={(e) => d({ type: 'comment', value: e.target.value })} placeholder="Anything Priya should know" />
                    <div className="approver-btns">
                      <button className="btn btn-primary" onClick={() => d({ type: 'approve' })}><UserCheck size={14} /> Approve</button>
                      <button className="btn" onClick={() => d({ type: 'requestChanges' })}>Request changes</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {s.status === 'approved' && (
              <>
                <div className="pending ok"><Check size={16} /><div><b>Approved by Marcus Bell</b><span>{s.timing === 'effective' ? 'Ready to schedule for Jan 1, 2027.' : 'Ready to publish.'}</span></div></div>
                {canEdit ? (
                  <button className="btn btn-primary btn-block" onClick={() => d({ type: 'publish' })}>
                    {s.timing === 'effective' ? <><CalendarClock size={14} /> Schedule for Jan 1, 2027</> : <>Publish now</>}
                  </button>
                ) : <p className="ap-why">Priya can now publish.</p>}
              </>
            )}

            {s.status === 'scheduled' && (
              <>
                <div className="pending ok"><CalendarClock size={16} /><div><b>Scheduled for Jan 1, 2027, 12:00 AM</b><span>Approved by Marcus Bell. Live settings stay as they are until then.</span></div></div>
                {canEdit && (
                  <div className="approver-btns">
                    <button className="btn btn-primary" onClick={() => { d({ type: 'cancelSchedule' }); d({ type: 'timing', value: 'now' }); d({ type: 'publish' }) }}>Publish now instead</button>
                    <button className="btn" onClick={() => d({ type: 'cancelSchedule' })}>Cancel schedule</button>
                  </div>
                )}
              </>
            )}

            {s.status === 'changes' && !canEdit && <p className="ap-why">Waiting for Priya to revise.</p>}
            {s.status === 'draft' && !canEdit && <p className="ap-why">Priya has not submitted this draft yet. Nothing to approve.</p>}
          </div>

          <div className="ap-card">
            <h3 className="mini-h">Activity</h3>
            <ul className="log">
              {s.log.map((l, i) => (
                <li key={i} className={l.tone}>
                  <span className="log-when">{l.when}</span>
                  <span><b>{l.who}</b> {l.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Step({ n, label, state }: { n: number; label: string; state: 'done' | 'cur' | 'todo' }) {
  return <li className={`step ${state}`}><span>{state === 'done' ? <Check size={12} /> : n}</span>{label}</li>
}
