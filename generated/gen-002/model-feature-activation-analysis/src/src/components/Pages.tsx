import { useMemo, useState } from 'react'
import { db, N, LAYERS, NF, layerOf, idxOf, labelOf, fmtFreq, featName, TOKENS_TRAINED, L0_TARGET, RECON_NMSE, CE_RECOVERED, H_INTERP, H_PARTIAL, H_NONE } from '../data/db'
import { layerStats, median, pct, fmtInt, calibration } from '../data/analytics'
import { useApp } from '../store'
import { STATUSES, type HypId, type Status, type Stance } from '../data/seed'
import { Star, Icon, ScoreBar, LAYER_COLORS, HUMAN_COLORS, CLUSTER_COLOR, f2 } from '../ui'
import { exportCsv } from './FeatureTable'

const STANCE_LABEL: Record<Stance, string> = { supports: 'supports', contradicts: 'contradicts', neutral: 'inconclusive' }

function EvidenceList({ hyp }: { hyp: HypId }) {
  const { ws, select, selected, setPage } = useApp()
  const items = Object.entries(ws.bookmarks).filter(([, b]) => b.hyp === hyp).map(([g, b]) => ({ g: +g, b }))
  const order: Stance[] = ['supports', 'contradicts', 'neutral']
  items.sort((a, c) => order.indexOf(a.b.stance) - order.indexOf(c.b.stance) || db.freq[c.g] - db.freq[a.g])
  const counts = order.map((s) => items.filter((i) => i.b.stance === s).length)
  return (
    <div className="evid">
      <div className="evid-h">Pinned evidence <span className="muted">· {counts[0]} supports · {counts[1]} contradicts · {counts[2]} inconclusive</span></div>
      <ul>
        {items.map(({ g, b }) => (
          <li key={g} className={g === selected ? 'sel' : ''}>
            <button onClick={() => select(g)}>
              <span className={`stance ${b.stance}`}>{STANCE_LABEL[b.stance]}</span>
              <span className="mono ev-id"><i style={{ background: LAYER_COLORS[layerOf(g)] }} />L{LAYERS[layerOf(g)]} #{idxOf(g)}</span>
              <span className="ev-lab">{labelOf(g)}</span>
              <span className="mono ev-f">{fmtFreq(db.freq[g])}</span>
              <span className="mono ev-s">{f2(db.score[g])}</span>
            </button>
            {b.note && <div className="ev-note">{b.note}</div>}
          </li>
        ))}
        {items.length === 0 && <li className="muted small">Nothing pinned yet. Bookmark a feature and choose “Evidence for”.</li>}
      </ul>
      <button className="linkbtn" onClick={() => setPage('bookmarks')}>Manage in Bookmarks →</button>
    </div>
  )
}

function Metric({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return <div className="metric"><label>{k}</label><b className="mono">{v}</b>{sub && <span>{sub}</span>}</div>
}

export function Notebook() {
  const { ws, updateHyp, openHypothesis, view, activeHyp } = useApp()
  const stats = useMemo(() => layerStats(view.denseT, view.interpT), [view.denseT, view.interpT])
  const cal = useMemo(() => calibration(LAYERS.map(() => true), view.denseT), [view.denseT])
  const h3 = useMemo(() => {
    const cl: number[] = [], l12d: number[] = []
    let hum = 0, humOk = 0
    for (let g = 0; g < N; g++) {
      if (!db.alive[g]) continue
      if (db.cluster[g]) { cl.push(g); if (db.human[g]) { hum++; if (db.human[g] === H_INTERP || db.human[g] === H_PARTIAL) humOk++ } }
      else if (layerOf(g) === 5 && db.freq[g] >= view.denseT) l12d.push(g)
    }
    return {
      n: cl.length, nDense: cl.filter((g) => db.freq[g] >= view.denseT).length,
      med: median(cl.map((g) => db.score[g])), ciW: median(cl.map((g) => db.hi[g] - db.lo[g])),
      medOther: median(l12d.map((g) => db.score[g])), nOther: l12d.length, hum, humOk,
    }
  }, [view.denseT])

  const lowD = cal.dense[0], lowD2 = cal.dense[1]
  const dn = lowD.n + lowD2.n, dk = lowD.interp + lowD.partial + lowD2.interp + lowD2.partial
  const wideD = median(stats.map((s) => s.ciDense)), wideS = median(stats.map((s) => s.ciSparse))
  const holds = stats.filter((s) => s.verdict === 'holds').map((s) => LAYERS[s.li])
  const fails = stats.filter((s) => s.verdict === 'fails').map((s) => LAYERS[s.li])
  const unclear = stats.filter((s) => s.verdict === 'unclear').map((s) => LAYERS[s.li])
  const rng = (a: number[]) => (a.length ? a.map((x) => `L${x}`).join(', ') : 'none')

  return (
    <div className="page notebook">
      <header className="page-h">
        <div>
          <h1>Working notes</h1>
          <p className="lede">Workshop paper · §4.2 “Dense features”. Draft claim under review:</p>
        </div>
      </header>
      <blockquote className="draft">
        “Features with activation frequency above 0.1 are predominantly dense, uninterpretable features that contribute little to the SAE’s dictionary.”
        <footer><b>Advisor comment on draft:</b> Is this true at every layer or only the later ones? And is the auto-interp score measuring interpretability, or just how noisy the scoring is for dense features? What about the L12 code cluster?</footer>
      </blockquote>

      {ws.hyps.map((h) => (
        <article key={h.id} className={`hyp ${activeHyp === h.id ? 'active' : ''}`}>
          <div className="hyp-h">
            <span className="hid">{h.id}</span>
            <div className="hyp-t">
              <h3>{h.title}</h3>
              <p>{h.statement}</p>
            </div>
            <div className="hyp-ctl">
              <select value={h.status} onChange={(e) => updateHyp(h.id, { status: e.target.value as Status })} className={`status s-${h.status.replace(' ', '-')}`} aria-label={`${h.id} status`}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className="btn primary" onClick={() => openHypothesis(h.id)}>Open in Explorer <Icon n="arrow" size={13} /></button>
            </div>
          </div>
          <div className="hyp-body">
            <div className="hyp-live">
              <div className="evid-h">Live from the data <span className="muted">· dense ≥ {view.denseT}, interpretable ≥ {view.interpT.toFixed(1)}</span></div>
              {h.id === 'H1' && (
                <>
                  <div className="mini-bars">
                    {stats.map((s) => (
                      <div key={s.li} title={`L${LAYERS[s.li]}: ${s.nDense - s.nInterp} of ${s.nDense} dense features below threshold`}>
                        <span className="mb-v mono">{pct(s.junk)}</span>
                        <span className="mb-b"><i style={{ height: `${(s.junk || 0) * 100}%`, background: LAYER_COLORS[s.li] }} /></span>
                        <span className="mb-l">L{LAYERS[s.li]}</span>
                      </div>
                    ))}
                  </div>
                  <p className="read">Share of dense features that are <i>not</i> interpretable. Claim holds at <b>{rng(holds)}</b>; does not hold at <b>{rng(fails)}</b>{unclear.length ? <>; unclear at <b>{rng(unclear)}</b></> : null}.</p>
                </>
              )}
              {h.id === 'H2' && (
                <>
                  <div className="metrics">
                    <Metric k="Score, dense" v={f2(median(stats.map((s) => s.medDense)))} sub={`sparse ${f2(median(stats.map((s) => s.medSparse)))}`} />
                    <Metric k="CI width, dense" v={f2(wideD)} sub={`sparse ${f2(wideS)}`} />
                    <Metric k="Human, low score" v={dn ? pct(dk / dn) : '—'} sub={`dense · ≥ partly interp. · n=${dn}`} />
                  </div>
                  <p className="read">Dense features score lower <i>and</i> carry CIs about {(wideD / wideS).toFixed(1)}× wider. Among human-reviewed dense features with a low score, {dn ? pct(dk / dn) : '—'} were still judged at least partly interpretable, so a low score is not proof of junk.</p>
                </>
              )}
              {h.id === 'H3' && (
                <>
                  <div className="metrics">
                    <Metric k="Cluster size" v={`${h3.n}`} sub={`${h3.nDense} dense (≥ ${view.denseT})`} />
                    <Metric k="Median score" v={f2(h3.med)} sub={`other L12 dense: ${f2(h3.medOther)}`} />
                    <Metric k="Human-reviewed" v={`${h3.humOk} / ${h3.hum}`} sub="interpretable or partial" />
                  </div>
                  <p className="read">All {h3.n} features fire on code tokens. {h3.nDense} of them exceed the density cut-off while scoring about {f2(h3.med)}, versus {f2(h3.medOther)} for the other {h3.nOther} dense L12 features, so the cluster does break the pattern at this layer.</p>
                </>
              )}
            </div>
            <EvidenceList hyp={h.id} />
            <div className="hyp-notes">
              <div className="evid-h">Notes</div>
              <textarea value={h.notes} onChange={(e) => updateHyp(h.id, { notes: e.target.value })} rows={7} spellCheck />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export function Bookmarks() {
  const { ws, select, selected, toggleBookmark, updateBookmark } = useApp()
  const [f, setF] = useState<HypId | 'all' | 'none'>('all')
  const rows = Object.entries(ws.bookmarks).map(([g, b]) => ({ g: +g, b }))
    .filter((r) => f === 'all' || (f === 'none' ? !r.b.hyp : r.b.hyp === f))
    .sort((a, b) => LAYERS[layerOf(a.g)] - LAYERS[layerOf(b.g)] || db.freq[b.g] - db.freq[a.g])
  const total = Object.keys(ws.bookmarks).length
  const cnt = (h: HypId) => Object.values(ws.bookmarks).filter((b) => b.hyp === h).length
  return (
    <div className="page bookmarks">
      <header className="page-h">
        <div>
          <h1>Bookmarked features <span className="count">{total}</span></h1>
          <p className="lede">Features you flagged while exploring. Notes and hypothesis tags are saved in this browser.</p>
        </div>
        <button className="btn" onClick={() => exportCsv(Object.keys(ws.bookmarks).map(Number), 'featurescope-bookmarks.csv')}><Icon n="download" size={13} /> Export CSV</button>
      </header>
      <div className="chips bm-filter">
        {([['all', `All ${total}`], ['H1', `H1 · ${cnt('H1')}`], ['H2', `H2 · ${cnt('H2')}`], ['H3', `H3 · ${cnt('H3')}`], ['none', `Untagged · ${Object.values(ws.bookmarks).filter((b) => !b.hyp).length}`]] as const).map(([k, l]) => (
          <button key={k} className={`chip ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>{l}</button>
        ))}
      </div>
      <div className="bm-table">
        <div className="bm-th">
          <span /><span>Feature</span><span>Auto label</span><span>Freq</span><span>Score</span><span>Human</span><span>Evidence</span><span>Note</span>
        </div>
        {rows.map(({ g, b }) => (
          <div key={g} className={`bm-tr ${g === selected ? 'sel' : ''}`} onClick={() => select(g)}>
            <button className="c-star" onClick={(e) => { e.stopPropagation(); toggleBookmark(g) }} aria-label="Remove bookmark"><Star on size={14} /></button>
            <span className="mono c-feat"><i style={{ background: LAYER_COLORS[layerOf(g)] }} />L{LAYERS[layerOf(g)]} <em>#{idxOf(g)}</em></span>
            <span className="c-label" title={labelOf(g)}>{labelOf(g)}{db.cluster[g] ? <span className="pill cl sm">code</span> : null}</span>
            <span className="mono">{fmtFreq(db.freq[g])}</span>
            <span className="c-score"><span className="mono">{f2(db.score[g])}</span><ScoreBar s={db.score[g]} lo={db.lo[g]} hi={db.hi[g]} w={44} /></span>
            <span className="c-human">{db.human[g] !== H_NONE ? <><i style={{ background: HUMAN_COLORS[db.human[g]] }} />{['', 'Interp.', 'Partial', 'Not'][db.human[g]]}</> : <span className="muted">—</span>}</span>
            <span onClick={(e) => e.stopPropagation()} className="bm-hyp">
              <select value={b.hyp ?? ''} onChange={(e) => updateBookmark(g, { hyp: (e.target.value || null) as HypId | null })} aria-label="Hypothesis">
                <option value="">—</option><option>H1</option><option>H2</option><option>H3</option>
              </select>
              {b.hyp && <span className={`stance ${b.stance}`} title={STANCE_LABEL[b.stance]}>{b.stance === 'neutral' ? '~' : b.stance === 'supports' ? '+' : '−'}</span>}
            </span>
            <input className="bm-note" title={`Added ${b.added}`} value={b.note} placeholder="Add note…" onClick={(e) => e.stopPropagation()} onChange={(e) => updateBookmark(g, { note: e.target.value })} />
          </div>
        ))}
        {rows.length === 0 && <div className="empty">No bookmarks in this group.</div>}
      </div>
    </div>
  )
}

export function Runs() {
  const { view } = useApp()
  const stats = useMemo(() => layerStats(view.denseT, view.interpT), [view.denseT, view.interpT])
  const maxN = Math.max(...RECON_NMSE)
  return (
    <div className="page runs">
      <header className="page-h">
        <div>
          <h1>Training runs</h1>
          <p className="lede">8 sparse autoencoders on OLMo-1B residual-stream activations, one per sampled layer.</p>
        </div>
      </header>
      <div className="run-cards">
        <div className="rc"><label>Base model</label><b>OLMo-1B</b><span>16 layers · d_model 2,048</span></div>
        <div className="rc"><label>Dictionary</label><b>16,384 features</b><span>8× expansion · ReLU + L1 penalty</span></div>
        <div className="rc"><label>Training data</label><b>{(TOKENS_TRAINED / 1e9).toFixed(0)}B tokens</b><span>context 1,024 · batch 4,096 tokens</span></div>
        <div className="rc"><label>Optimiser</label><b>Adam, lr 2e-4</b><span>cosine decay · L1 warm-up 5%</span></div>
        <div className="rc"><label>Total features</label><b>{fmtInt(N)}</b><span>{fmtInt(db.alive.reduce((a, v) => a + (v ? 0 : 1), 0))} dead ({pct(db.alive.reduce((a, v) => a + (v ? 0 : 1), 0) / N, 1)})</span></div>
      </div>
      <div className="run-table">
        <div className="rt-th">
          <span>Layer</span><span>Hook point</span><span>L0 (target)</span><span>Reconstruction loss (normalised MSE)</span><span>Variance explained</span><span>CE loss recovered</span><span>Dead</span><span>Dense ≥ {view.denseT}</span><span>L0 used by dense</span><span>Human-reviewed</span>
        </div>
        {LAYERS.map((l, li) => {
          let dead = 0, hum = 0
          for (let i = 0; i < NF; i++) { const g = li * NF + i; if (!db.alive[g]) dead++; if (db.human[g]) hum++ }
          const s = stats[li]
          return (
            <div key={l} className="rt-tr">
              <span className="lt-l"><i style={{ background: LAYER_COLORS[li] }} />L{l}</span>
              <span className="mono small">blocks.{l - 1}.resid_post</span>
              <span className="mono">{s.l0.toFixed(1)} <em className="muted">({L0_TARGET[li]})</em></span>
              <span className="rt-bar"><i style={{ width: `${(RECON_NMSE[li] / maxN) * 100}%`, background: LAYER_COLORS[li] }} /><b className="mono">{RECON_NMSE[li].toFixed(3)}</b></span>
              <span className="mono">{pct(1 - RECON_NMSE[li], 1)}</span>
              <span className="mono">{pct(CE_RECOVERED[li], 1)}</span>
              <span className="mono">{pct(dead / NF, 1)}</span>
              <span className="mono">{s.nDense}</span>
              <span className="mono">{pct(s.l0Share)}</span>
              <span className="mono">{hum}</span>
            </div>
          )
        })}
      </div>
      <p className="runs-note">L0 is measured as the sum of activation frequencies over alive features, so the share of L0 consumed by dense features shows how much of each layer’s sparsity budget they take: a larger share means fewer features are available to describe any single token.</p>
    </div>
  )
}

export { featName, CLUSTER_COLOR }
