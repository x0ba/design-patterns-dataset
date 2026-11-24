import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, Circle, Pause, Play, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { CODED_TOTAL, COST_PER_POST, CORPUS_TOTAL, GOLD_TOTAL, MODEL_ID, NON_GOLD } from '../data/corpus'
import { V3_STATS } from '../lib/stats'
import { fmtDateTime, fmtInt, fmtUSD, pct } from '../lib/format'
import { navigate } from '../lib/router'
import { changedCodes } from '../lib/draft'
import { useStore, type RunRec } from '../store'
import { Dialog } from '../components/ui'
import { DISAGREEMENTS } from '../data/corpus'

const STATUS_LABEL: Record<RunRec['status'], string> = {
  running: 'Running', paused: 'Paused', stopped: 'Stopped', queued: 'Queued', cancelled: 'Cancelled',
}

function RunsTable() {
  const s = useStore()
  return (
    <section className="card runs-card" aria-labelledby="runs-h">
      <header className="card-head tight"><h2 id="runs-h">Runs</h2></header>
      <table className="runs-table">
        <thead>
          <tr><th>Run</th><th>Codebook</th><th>Posts</th><th>Progress</th><th>Status</th><th className="r">Cost</th></tr>
        </thead>
        <tbody>
          {s.runs.map((r) => {
            const total = r.id === 3 ? NON_GOLD.length : r.to - r.from + 1
            const n = r.id === 3 ? r.cost / COST_PER_POST : r.id === 1 ? r.done : r.done
            const target = r.id === 1 ? CORPUS_TOTAL : r.id === 3 ? Math.round(n) : total
            const prog = r.id === 3 ? 0 : r.done / target
            return (
              <tr key={r.id}>
                <td>
                  <b>Run {r.id}</b> <span className="muted">{r.name}</span>
                  {r.note && <div className="small muted">{r.note}</div>}
                </td>
                <td><span className="ver">{r.version}</span></td>
                <td className="num">
                  {r.id === 3 ? `${fmtInt(Math.round(n))} posts`
                    : r.id === 1 ? `#1–${fmtInt(r.to)}` : `#${fmtInt(r.from)}–${fmtInt(r.to)}`}
                </td>
                <td>
                  <div className="mini-bar"><i style={{ width: `${Math.min(100, prog * 100)}%` }} /></div>
                  <span className="small muted num">
                    {r.id === 1 ? `${fmtInt(r.done)} of ${fmtInt(CORPUS_TOTAL)}` : r.id === 3 ? 'not started' : `${fmtInt(r.done)} of ${fmtInt(total)}`}
                  </span>
                </td>
                <td><span className={`status-pill sm ${r.status}`}><i aria-hidden />{STATUS_LABEL[r.status]}</span></td>
                <td className="r num">{r.id === 3 ? `≈ ${fmtUSD(r.cost)}` : fmtUSD(r.cost)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <footer className="card-foot small muted">
        {MODEL_ID} · queue: gold sample first, then random order (seed 4117) · started {fmtDateTime(s.runs[0].startedAt)}
      </footer>
    </section>
  )
}

type StepState = 'done' | 'todo' | 'now'
function Step({ state, title, children, action }: { state: StepState; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <li className={`step ${state}`}>
      <span className="step-mark" aria-hidden>{state === 'done' ? <Check size={13} /> : <Circle size={9} />}</span>
      <div className="step-body">
        <b>{title}</b>
        {children && <p className="small muted">{children}</p>}
      </div>
      {action}
    </li>
  )
}

function RestartCard() {
  const s = useStore()
  const tagged = Object.values(s.tags).filter((t) => t.cause).length
  const changed = s.draft ? changedCodes(s.draft).length : 0
  const paused = s.runMode !== 'running'
  const restarted = s.runMode === 'restarted'
  const canRestart = s.runMode === 'paused' && !!s.published
  const remaining = CORPUS_TOTAL - CODED_TOTAL
  const stale = !!s.score && s.draft && s.score.sig !== JSON.stringify(s.draft)
  return (
    <section className="card" aria-labelledby="restart-h">
      <header className="card-head tight">
        <div>
          <h2 id="restart-h">Restart with the new definition</h2>
          <p className="small muted">The restart point is the next post in the queue. Nothing already labeled changes here.</p>
        </div>
      </header>
      <ol className="steps">
        <Step state={tagged > 0 ? 'done' : 'todo'} title="Read the disagreements"
          action={<button className="link-btn" onClick={() => navigate('disagreements')}>{tagged} of {DISAGREEMENTS.length} tagged <ArrowRight size={13} /></button>} />
        <Step state={changed > 0 || s.published ? 'done' : 'todo'} title="Tighten “request for help” in a v4 draft"
          action={<button className="link-btn" onClick={() => navigate('codebook/request')}>{s.published ? 'Published' : s.draft ? 'Open draft' : 'Start draft'} <ArrowRight size={13} /></button>} />
        <Step state={s.score && !stale ? 'done' : 'todo'} title="Check the draft on the gold sample (optional)">
          {s.score ? `Scored: request for help κ ${s.score.stats.request.kappa.toFixed(2)}${stale ? ' (draft has changed since)' : ''}` : 'Not scored yet'}
        </Step>
        <Step state={s.published ? 'done' : 'todo'} title="Publish v4"
          action={!s.published ? <button className="link-btn" onClick={() => navigate('codebook')}>Codebook <ArrowRight size={13} /></button> : undefined} />
        <Step state={paused ? 'done' : 'now'} title="Pause run 1"
          action={!paused ? <button className="btn btn-secondary sm" onClick={s.pause}><Pause size={13} /> Pause</button>
            : !restarted ? <button className="link-btn" onClick={s.resume}><Play size={13} /> Resume instead</button> : undefined} />
        <Step state={restarted ? 'done' : canRestart ? 'now' : 'todo'} title="Restart from post #1,241 with v4">
          {restarted ? 'Run 2 is running.' : `${fmtInt(remaining)} posts remain · est. ${fmtUSD(remaining * COST_PER_POST)} · same model, same queue order.`}
        </Step>
      </ol>
      <div className="restart-foot">
        <button className="btn btn-primary" disabled={!canRestart} onClick={s.restart}>
          <RotateCcw size={15} /> Restart from post #1,241 with v4
        </button>
        {!restarted && (
          <span className="small muted">
            {!paused ? 'Pause the run first.' : !s.published ? 'Publish v4 first: a run can only use a published version.' : 'Ready.'}
          </span>
        )}
      </div>
    </section>
  )
}

type Choice = 'keep' | 'rerun' | 'discard'
function Opt({ id, choice, setChoice, locked, title, cost, children }: {
  id: Choice; choice: Choice; setChoice: (c: Choice) => void; locked: boolean; title: string; cost: string; children: ReactNode
}) {
  return (
    <label className={`opt ${choice === id ? 'on' : ''} ${locked ? 'locked' : ''}`}>
      <input type="radio" name="decision" checked={choice === id} disabled={locked} onChange={() => setChoice(id)} />
      <div className="opt-body">
        <div className="opt-head"><b>{title}</b><span className="num opt-cost">{cost}</span></div>
        {children}
      </div>
    </label>
  )
}

function DecisionCard() {
  const s = useStore()
  const [choice, setChoice] = useState<Choice>('rerun')
  const [scope, setScope] = useState<'targeted' | 'all'>('targeted')
  const [confirming, setConfirming] = useState(false)
  const prec = V3_STATS.request.tp / V3_STATS.request.predicted
  const reqOutside = NON_GOLD.filter((p) => p.model.code === 'request').length
  const likelyWrong = Math.round(reqOutside * (1 - prec))
  const d = s.decision
  const costT = s.affected.targeted * COST_PER_POST
  const costA = s.affected.all * COST_PER_POST
  const nonReq = s.affected.targeted - reqOutside

  const apply = () => {
    if (choice === 'discard') setConfirming(true)
    else s.decide(choice, choice === 'rerun' ? scope : undefined)
  }

  return (
    <section className="card decision" aria-labelledby="dec-h">
      <header className="card-head tight">
        <div>
          <h2 id="dec-h">What to do with the first 1,240 labels</h2>
          <p className="small muted">
            Made with codebook v3, run 1. <b className="num">{GOLD_TOTAL}</b> are the model’s labels on the gold sample: they’re the evidence behind the 0.61 and stay on file as evaluation records whatever you choose. The other <b className="num">{NON_GOLD.length}</b> are dataset labels.
          </p>
        </div>
      </header>

      <div className="evidence">
        <TriangleAlert size={16} />
        <p className="small">
          Outside the gold sample the model made <b className="num">{reqOutside}</b> “request for help” labels. On the gold sample, only <b className="num">{pct(prec)}</b> of its request labels were right, so roughly <b className="num">{likelyWrong}</b> of those are probably wrong. That is an estimate from the gold rate, not a count; no one has checked them.
        </p>
      </div>

      {d && (
        <div className="decided" role="status">
          <Check size={16} />
          <div>
            <b>
              {d.choice === 'keep' && 'Decision: keep all 1,240 as v3'}
              {d.choice === 'rerun' && `Decision: re-run ${fmtInt(d.affected)} posts with v4`}
              {d.choice === 'discard' && `Decision: discard ${fmtInt(d.affected)} labels`}
            </b>
            <span className="small muted"> · {fmtDateTime(d.at)}</span>
            <p className="small">
              {d.choice === 'keep' && 'Labels stay tagged “codebook v3 · run 1” and out of the analysis dataset.'}
              {d.choice === 'rerun' && 'Queued after run 2. v3 labels will be marked superseded, not deleted.'}
              {d.choice === 'discard' && 'Excluded from the working dataset and export, archived with provenance. Gold-sample evaluation records are kept.'}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={s.clearDecision}>Change decision</button>
        </div>
      )}

      <div className="opts">
        <Opt id="keep" choice={choice} setChoice={setChoice} locked={!!d} title="Keep as v3" cost="$0.00">
          <p className="small">All 1,240 labels stay exactly as they are, tagged codebook v3.</p>
          <ul className="small">
            <li>They still can’t enter analysis: v3 fails the policy gate on request for help (κ {V3_STATS.request.kappa.toFixed(2)}).</li>
            <li>Good as a documented v3 baseline, or if you plan to hand-check the suspect ones.</li>
          </ul>
        </Opt>
        <Opt id="rerun" choice={choice} setChoice={setChoice} locked={!!d} title="Re-run with v4" cost={scope === 'all' ? `≈ ${fmtUSD(costA)}` : `≈ ${fmtUSD(costT)}`}>
          <p className="small">New labels are written beside the v3 ones; v3 labels are marked superseded, never overwritten.</p>
          <div className="scope" role="radiogroup" aria-label="Re-run scope">
            <label className={scope === 'targeted' ? 'on' : ''}>
              <input type="radio" name="scope" checked={scope === 'targeted'} disabled={!!d} onChange={() => { setChoice('rerun'); setScope('targeted') }} />
              <span><b>Only labels the change can touch</b> <span className="num">· {s.affected.targeted} posts · ≈ {fmtUSD(costT)}</span>
                <small>The {reqOutside} v3 request labels plus {nonReq} other posts that end in a question. v4 differs from v3 only in this code, so other labels are unaffected.</small></span>
            </label>
            <label className={scope === 'all' ? 'on' : ''}>
              <input type="radio" name="scope" checked={scope === 'all'} disabled={!!d} onChange={() => { setChoice('rerun'); setScope('all') }} />
              <span><b>Every dataset label</b> <span className="num">· {s.affected.all} posts · ≈ {fmtUSD(costA)}</span>
                <small>Everything outside the gold sample, so the whole dataset carries one version.</small></span>
            </label>
          </div>
        </Opt>
        <Opt id="discard" choice={choice} setChoice={setChoice} locked={!!d} title="Throw out" cost={`recode later ≈ ${fmtUSD(costA)}`}>
          <p className="small">Removes {s.affected.all} dataset labels from the working dataset and from exports.</p>
          <ul className="small">
            <li>Archived with their provenance, not deleted. The activity log keeps the record.</li>
            <li>Posts go back to “not coded” and need another run to get labels.</li>
          </ul>
        </Opt>
      </div>

      {!d && (
        <div className="decision-foot">
          <span className="small muted">
            {choice !== 'keep' && !s.published ? 'You can decide now and publish v4 later; a re-run only starts once v4 exists.' : 'You can change this until a re-run starts.'}
          </span>
          <button className={`btn ${choice === 'discard' ? 'btn-danger' : 'btn-primary'}`} onClick={apply}>
            {choice === 'keep' && 'Keep all 1,240'}
            {choice === 'rerun' && `Queue re-run of ${scope === 'all' ? s.affected.all : s.affected.targeted}`}
            {choice === 'discard' && <><Trash2 size={14} /> Discard {s.affected.all} labels…</>}
          </button>
        </div>
      )}

      {confirming && (
        <Dialog title={`Discard ${s.affected.all} labels?`} sub="This takes them out of the working dataset." onClose={() => setConfirming(false)} width={480}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => { s.decide('discard'); setConfirming(false) }}>Discard {s.affected.all} labels</button>
          </>}>
          <ul className="pub-sum">
            <li>{s.affected.all} v3 labels leave the dataset and exports. They are archived with provenance.</li>
            <li>The {GOLD_TOTAL} gold-sample labels stay as evaluation records. Your κ figures still trace back to them.</li>
            <li>Re-coding these posts will cost about {fmtUSD(costA)}.</li>
          </ul>
        </Dialog>
      )}
    </section>
  )
}

export default function Runs() {
  return (
    <div className="page runs">
      <header className="page-head">
        <div>
          <h1>Runs</h1>
          <p className="muted small">Pause, restart from the point of the change, and decide what happens to labels made under the old definition.</p>
        </div>
      </header>
      <div className="runs-grid">
        <RestartCard />
        <DecisionCard />
      </div>
      <RunsTable />
    </div>
  )
}
