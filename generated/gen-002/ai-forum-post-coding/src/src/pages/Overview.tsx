import { ArrowRight, ChevronRight, Lock, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react'
import { CODES, CODE_BY_ID, type CodeId } from '../data/codes'
import { CODED_TOTAL, COST_PER_POST, CORPUS_TOTAL, DISAGREEMENTS, GOLD_TOTAL, MODEL_ID, RUN_START } from '../data/corpus'
import { HUMAN_STATS, THRESHOLD, V3_PAIRS, V3_STATS, confusionCounts, failing, fmtK } from '../lib/stats'
import { fmtDateTime, fmtInt, fmtUSD } from '../lib/format'
import { navigate } from '../lib/router'
import { useStore } from '../store'
import { CodeChip } from '../components/ui'

function RunCard() {
  const s = useStore()
  const run2 = s.runs.find((r) => r.id === 2)
  const v4Done = run2?.done ?? 0
  const gold = GOLD_TOTAL
  const other = CODED_TOTAL - GOLD_TOTAL
  const remaining = CORPUS_TOTAL - CODED_TOTAL - v4Done
  const pctOf = (n: number) => `${(n / CORPUS_TOTAL) * 100}%`
  const estRemaining = (CORPUS_TOTAL - CODED_TOTAL) * COST_PER_POST
  const restarted = s.runMode === 'restarted'
  const status = s.runMode === 'running' ? 'Running' : s.runMode === 'paused' ? 'Paused' : 'Run 2 running'
  return (
    <section className="card runcard" aria-label="Current run">
      <div className="runcard-main">
        <div className="runcard-head">
          <div>
            <div className="eyebrow">
              {restarted ? `Run 2 · started ${fmtDateTime(run2!.startedAt)}` : `Run 1 · started ${fmtDateTime(RUN_START)}`}
            </div>
            <h1>{restarted ? 'Applying codebook v4 to the remaining 2,560 posts' : 'Applying codebook v3 to 3,800 posts'}</h1>
            {restarted && <p className="small muted">Run 1 stopped at post #1,240 with codebook v3 (started {fmtDateTime(RUN_START)}).</p>}
          </div>
          <span className={`status-pill ${s.runMode}`}>
            <i aria-hidden />{status}
          </span>
        </div>
        <div className="bar" role="img" aria-label={`${fmtInt(CODED_TOTAL)} of ${fmtInt(CORPUS_TOTAL)} posts coded: ${gold} gold sample, ${other} other, ${fmtInt(remaining)} remaining`}>
          <i className="seg-gold" style={{ width: pctOf(gold) }} />
          <i className="seg-other" style={{ width: pctOf(other) }} />
          {v4Done > 0 && <i className="seg-v4" style={{ width: pctOf(v4Done) }} />}
        </div>
        <div className="bar-legend">
          <span><i className="seg-gold" /> <b className="num">{gold}</b> gold sample (v3)</span>
          <span><i className="seg-other" /> <b className="num">{fmtInt(other)}</b> other coded (v3)</span>
          {restarted && <span><i className="seg-v4" /> <b className="num">{fmtInt(v4Done)}</b> coded with v4</span>}
          <span><i className="seg-rest" /> <b className="num">{fmtInt(remaining)}</b> not yet coded</span>
        </div>
      </div>
      <dl className="runcard-stats">
        <div><dt>Coded</dt><dd className="num big">{fmtInt(CODED_TOTAL)}<small> / {fmtInt(CORPUS_TOTAL)}</small></dd></div>
        <div><dt>Cost so far</dt><dd className="num big">{fmtUSD(18.4)}</dd><small className="muted">≈ {fmtUSD(estRemaining)} more to finish</small></div>
        <div><dt>Model</dt><dd className="mono">{MODEL_ID}</dd><small className="muted">Codebook {restarted ? 'v4 from #1,241' : 'v3'} · 4 forums, 2021–24</small></div>
      </dl>
    </section>
  )
}

function AgreementCard() {
  const s = useStore()
  const rows = [...CODES].sort((a, b) => V3_STATS[a.id].kappa - V3_STATS[b.id].kappa)
  const v4 = s.score?.stats
  return (
    <section className="card agree" aria-labelledby="agree-h">
      <header className="card-head">
        <div>
          <h2 id="agree-h">Agreement with the gold sample</h2>
          <p className="muted small">Model labels (codebook v3) vs. {GOLD_TOTAL} posts double-coded by Priya Ramaswamy and Marcus Bell. Cohen’s κ, one code against the rest.</p>
        </div>
      </header>
      <table className="agree-table">
        <colgroup>
          <col style={{ width: 176 }} /><col style={{ width: 44 }} /><col />
          <col style={{ width: 52 }} /><col style={{ width: 98 }} /><col style={{ width: 66 }} />
          {v4 && <col style={{ width: 92 }} />}<col style={{ width: 128 }} /><col style={{ width: 28 }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Code</th>
            <th scope="col" className="r" title="Posts with this gold label"><span className="k">n</span></th>
            <th scope="col" className="track-h">
              <span className="thr-label" style={{ left: `${THRESHOLD * 100}%` }}>0.75 minimum</span>
            </th>
            <th scope="col" className="r"><span className="k">κ</span></th>
            <th scope="col" className="r" title="95% bootstrap interval">95% interval</th>
            <th scope="col" className="r" title="Agreement between the two human coders, first pass">Human <span className="k">κ</span></th>
            {v4 && <th scope="col" className="r v4col">Draft v4</th>}
            <th scope="col">Policy</th>
            <th scope="col" aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const st = V3_STATS[c.id]
            const ok = st.kappa >= THRESHOLD
            const wide = ok && st.ci[0] < 0.7
            const dis = st.fn + st.fp
            const v = v4?.[c.id]
            return (
              <tr key={c.id} className={ok ? '' : 'fail'} onClick={() => navigate(`disagreements?code=${c.id}`)} tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`disagreements?code=${c.id}`) }}
                  title={`${dis} disagreements with gold (${st.fp} false, ${st.fn} missed)`}>
                <td><CodeChip id={c.id} /></td>
                <td className="r num">{st.n}</td>
                <td className="track-c">
                  <div className="track">
                    <i className="track-fill" style={{ width: `${Math.max(0, st.kappa) * 100}%`, background: ok ? 'var(--accent)' : 'var(--fail)' }} />
                    <i className="track-ci" style={{ left: `${st.ci[0] * 100}%`, width: `${(st.ci[1] - st.ci[0]) * 100}%` }} />
                    <i className="track-thr" style={{ left: `${THRESHOLD * 100}%` }} />
                  </div>
                </td>
                <td className="r num kappa">{fmtK(st.kappa)}</td>
                <td className="r num muted">{st.ci[0].toFixed(2)}–{st.ci[1].toFixed(2)}</td>
                <td className="r num muted">{fmtK(HUMAN_STATS[c.id].kappa)}</td>
                {v4 && (
                  <td className={`r num v4col ${v!.kappa >= THRESHOLD ? 'pass-text' : 'fail-text'}`}>
                    {fmtK(v!.kappa)}
                    <small className={Math.abs(v!.kappa - st.kappa) < 0.005 ? 'muted' : v!.kappa > st.kappa ? 'up' : 'down'}>{Math.abs(v!.kappa - st.kappa) < 0.005 ? '·' : (v!.kappa > st.kappa ? '+' : '−') + Math.abs(v!.kappa - st.kappa).toFixed(2)}</small>
                  </td>
                )}
                <td>
                  {ok ? (
                    <span className={`policy ok ${wide ? 'wide' : ''}`}>{wide ? 'Meets · wide CI' : 'Meets'}</span>
                  ) : (
                    <span className="policy bad"><TriangleAlert size={13} /> Below 0.75</span>
                  )}
                </td>
                <td className="chev"><ChevronRight size={16} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <footer className="card-foot muted small">
        Bar shows κ; the thin line beneath is the 95% bootstrap interval, the vertical tick is the lab’s 0.75 minimum. Amber means the point estimate meets 0.75 but the interval reaches below 0.70, usually because few gold posts carry that code. Click a row to read its disagreements.
      </footer>
    </section>
  )
}

function GateCard() {
  const s = useStore()
  const fails = failing(V3_STATS)
  const v4 = s.score
  const v4Min = v4 ? Math.min(...CODES.map((c) => v4.stats[c.id].kappa)) : null
  const v4Pass = v4Min !== null && v4Min >= THRESHOLD
  return (
    <section className="card gate" aria-labelledby="gate-h">
      <header className="gate-head">
        <ShieldAlert size={20} />
        <div>
          <h2 id="gate-h">Nothing can be accepted yet</h2>
          <p className="small">Lab policy (Dr. Elena Voss): no AI labels go into analysis unless agreement on <b>every</b> code is at least 0.75.</p>
        </div>
      </header>
      <ul className="gate-list">
        {fails.map((f) => (
          <li key={f.code}>
            <CodeChip id={f.code} size="sm" />
            <span className="num"><b>{f.kappa.toFixed(2)}</b> <span className="muted">needs +{(THRESHOLD - f.kappa).toFixed(2)}</span></span>
          </li>
        ))}
        <li className="muted small gate-ok">The other {9 - fails.length} codes meet the minimum.</li>
      </ul>
      {v4 && (
        <div className={`gate-v4 ${v4Pass ? 'pass' : 'fail'}`}>
          {v4Pass ? <ShieldCheck size={16} /> : <TriangleAlert size={16} />}
          <span>
            Draft v4 on gold: lowest κ <b className="num">{v4Min!.toFixed(2)}</b>.{' '}
            {v4Pass ? 'Meets the minimum on this sample. It only counts for v4 labels, once published and re-measured.' : 'Still below the minimum.'}
          </span>
        </div>
      )}
      <div className="gate-accept">
        <button className="btn btn-secondary" disabled aria-describedby="gate-why"><Lock size={14} /> Accept into dataset</button>
        <span id="gate-why" className="small muted">0 of {fmtInt(CODED_TOTAL)} labels accepted. Blocked by the policy above.</span>
      </div>
    </section>
  )
}

function ConfusionCard() {
  const pairs = confusionCounts(V3_PAIRS).slice(0, 6)
  const max = pairs[0].n
  return (
    <section className="card confuse" aria-labelledby="conf-h">
      <header className="card-head tight">
        <div>
          <h2 id="conf-h">Where the model disagrees</h2>
          <p className="muted small">{DISAGREEMENTS.length} posts, grouped by gold → model label</p>
        </div>
      </header>
      <ul className="confuse-list">
        {pairs.map((p) => (
          <li key={p.gold + p.model}>
            <button onClick={() => navigate(`disagreements?gold=${p.gold}&model=${p.model}`)}
                    aria-label={`${p.n} posts: gold ${CODE_BY_ID[p.gold].name}, model ${CODE_BY_ID[p.model].name}`}>
              <span className="pair">
                <CodeChip id={p.gold} size="sm" /><ArrowRight size={13} aria-hidden /><CodeChip id={p.model} size="sm" />
              </span>
              <span className="pair-bar"><i style={{ width: `${(p.n / max) * 100}%`, background: p.model === 'request' || p.gold === 'request' ? 'var(--fail)' : 'var(--ink-3)' }} /></span>
              <b className="num">{p.n}</b>
            </button>
          </li>
        ))}
      </ul>
      <button className="link-btn" onClick={() => navigate('disagreements')}>Read all {DISAGREEMENTS.length} disagreements <ArrowRight size={14} /></button>
    </section>
  )
}

export default function Overview() {
  const ventReq = DISAGREEMENTS.filter((p) => p.gold === 'venting' && p.model.code === 'request')
  const ventReqQ = ventReq.filter((p) => p.endsQ).length
  const reqInvolved = DISAGREEMENTS.filter((p) => p.gold === 'request' || p.model.code === 'request')
  const falseReq = reqInvolved.filter((p) => p.model.code === 'request')
  return (
    <div className="page overview">
      <RunCard />
      <section className="callout" aria-label="Finding">
        <TriangleAlert size={18} />
        <p>
          <b>Request for help is the only code under the line (κ {V3_STATS.request.kappa.toFixed(2)}).</b>{' '}
          {reqInvolved.length} of the {DISAGREEMENTS.length} disagreements involve it, and {falseReq.length} of those are posts the model called a request that the gold coders did not.{' '}
          {ventReq.length} are venting posts, and {ventReqQ === ventReq.length ? 'every one' : `${ventReqQ} of them`} ends in a question.
        </p>
        <button className="btn btn-secondary" onClick={() => navigate('disagreements?gold=venting&model=request')}>
          Read those {ventReq.length} <ArrowRight size={14} />
        </button>
      </section>
      <div className="overview-grid">
        <AgreementCard />
        <div className="overview-side">
          <GateCard />
          <ConfusionCard />
        </div>
      </div>
    </div>
  )
}
