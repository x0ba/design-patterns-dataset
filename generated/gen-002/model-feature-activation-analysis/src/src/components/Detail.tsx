import { useEffect, useMemo, useState } from 'react'
import { db, LAYERS, layerOf, idxOf, labelOf, featName, fmtFreq, examples, neighbors, lineage, humanText, HUMAN_NAMES, H_NONE, C_DEAD, TOKENS_TRAINED, type Example } from '../data/db'
import { useApp } from '../store'
import { Star, ScoreBar, HUMAN_COLORS, LAYER_COLORS, CLUSTER_COLOR, f2 } from '../ui'

function ExampleRow({ ex, n, showVals, max }: { ex: Example; n: number; showVals: boolean; max: number }) {
  const code = ex.lang !== undefined
  return (
    <li className="ex">
      <div className="ex-h">
        <span className="ex-n">{n}</span>
        <span>peak <b>{ex.peak.toFixed(1)}</b></span>
        <span className="ex-src">{ex.src}</span>
        <span className="ex-pos">doc {ex.doc.toLocaleString()} · pos {ex.pos.toLocaleString()}</span>
      </div>
      <div className={`ex-t ${code ? 'code' : ''}`}>
        {ex.cutL && <span className="ell">…</span>}
        {ex.toks.map((t, i) => {
          const rel = t.a / max
          if (t.a <= 0) return <span key={i}>{t.t === '\n' ? '\n' : t.t}</span>
          const ws = t.t.trim() === ''
          return (
            <span key={i} className={`tk ${rel > 0.55 ? 'hi' : ''}`} style={{ background: `rgba(245,158,11,${Math.min(0.9, 0.1 + rel * 0.8)})` }} title={`activation ${t.a.toFixed(2)}`}>
              {ws && t.t !== '\n' ? <span className="wsmark">{t.t.replace(/ /g, '·')}</span> : t.t === '\n' ? <><span className="wsmark">↵</span>{'\n'}</> : t.t}
              {showVals && rel > 0.25 && <sub>{t.a.toFixed(1)}</sub>}
            </span>
          )
        })}
        {ex.cutR && <span className="ell">…</span>}
      </div>
    </li>
  )
}

function Lineage({ g }: { g: number }) {
  const { select } = useApp()
  const chain = useMemo(() => lineage(g), [g])
  const maxF = Math.max(...chain.map((c) => db.freq[c.g]))
  return (
    <div className="lineage">
      <div className="lin-row">
        {LAYERS.map((l, li) => {
          const c = chain.find((x) => layerOf(x.g) === li)
          if (!c) return <div key={l} className="lin-cell empty"><span className="lin-l">L{l}</span><span className="muted">—</span></div>
          const cur = c.g === g
          const f = db.freq[c.g]
          return (
            <button key={l} className={`lin-cell ${cur ? 'cur' : ''}`} onClick={() => select(c.g)} title={`${featName(c.g)} · ${labelOf(c.g)}\nfreq ${fmtFreq(f)} · score ${f2(db.score[c.g])}${c.cos ? ` · cos ${c.cos.toFixed(2)} to its neighbour` : ''}`}>
              <span className="lin-l">L{l}</span>
              <span className="lin-bar"><i style={{ height: `${Math.max(6, (Math.log10(f) + 7) / 6.7 * 100)}%`, background: LAYER_COLORS[li] }} /></span>
              <span className="lin-s">{f2(db.score[c.g])}</span>
            </button>
          )
        })}
      </div>
      <div className="lin-cap">Follows each layer’s top decoder-cosine neighbour. Bar height = log frequency (max {fmtFreq(maxF)}); number = auto-interp score.</div>
    </div>
  )
}

function Neighbors({ g }: { g: number }) {
  const { select } = useApp()
  const li = layerOf(g)
  const prev = neighbors(g, -1), next = neighbors(g, 1)
  const col = (title: string, arr: ReturnType<typeof neighbors>) => (
    <div className="nb-col">
      <div className="nb-t">{title}</div>
      {arr.length === 0 && <div className="muted small">{db.alive[g] ? 'none (boundary layer)' : '—'}</div>}
      {arr.slice(0, 3).map((n) => (
        <button key={n.g} className="nb" onClick={() => select(n.g)}>
          <span className="nb-cos">{n.cos.toFixed(2)}</span>
          <span className="nb-id">#{idxOf(n.g)}</span>
          <span className="nb-lab">{labelOf(n.g)}</span>
          <span className="nb-f">{fmtFreq(db.freq[n.g])}</span>
        </button>
      ))}
    </div>
  )
  return (
    <div className="nbs">
      {col(li > 0 ? `← L${LAYERS[li - 1]} neighbours · cos` : '← none', prev)}
      {col(li < LAYERS.length - 1 ? `L${LAYERS[li + 1]} neighbours → · cos` : 'none →', next)}
    </div>
  )
}

export function Detail() {
  const { selected: g, ws, toggleBookmark, updateBookmark } = useApp()
  const [vals, setVals] = useState(false)
  const [count, setCount] = useState(8)
  useEffect(() => setCount(8), [g])
  const exs = useMemo(() => examples(g), [g])
  const bm = ws.bookmarks[g]
  const li = layerOf(g)
  const alive = db.alive[g] === 1
  const human = db.human[g]
  const max = exs.length ? exs[0].peak : 1
  const dense = db.freq[g] >= 0.1

  return (
    <aside className="detail" aria-label="Feature detail">
      <div className="d-head">
        <div className="d-id">
          <span className="layerdot" style={{ background: LAYER_COLORS[li] }} />
          <span className="mono idtxt">L{LAYERS[li]} · #{idxOf(g)}</span>
          {db.cluster[g] ? <span className="pill cl">L12 code cluster</span> : null}
          {alive && dense && <span className="pill dn">dense</span>}
          {!alive && <span className="pill">dead</span>}
          <button className={`iconbtn star ${bm ? 'on' : ''}`} onClick={() => toggleBookmark(g)} title={bm ? 'Remove bookmark (b)' : 'Bookmark (b)'} aria-pressed={!!bm}><Star on={!!bm} size={18} /></button>
        </div>
        <h2 className="d-label">{alive ? labelOf(g) : 'No activations in the 2B-token evaluation set'}</h2>
        <div className="d-sub">auto-generated label</div>
      </div>

      <div className="d-scroll">
        {alive ? (
          <section className="d-stats">
            <div className="stat"><label>Activation frequency</label><b className="mono">{fmtFreq(db.freq[g])}</b><span>1 in {Math.round(1 / db.freq[g]).toLocaleString()} tokens · ≈{Math.round(db.freq[g] * TOKENS_TRAINED).toLocaleString()} hits</span></div>
            <div className="stat"><label>Mean / max activation</label><b className="mono">{db.meanAct[g].toFixed(1)} / {db.maxAct[g].toFixed(1)}</b><span>over active tokens</span></div>
            <div className="stat wide">
              <label>Auto-interp score</label>
              <div className="sc-row"><b className="mono big">{f2(db.score[g])}</b><span className="mono muted">95% CI [{f2(db.lo[g])}, {f2(db.hi[g])}] · width {f2(db.hi[g] - db.lo[g])}</span></div>
              <div className="sc-axis"><ScoreBar s={db.score[g]} lo={db.lo[g]} hi={db.hi[g]} w={372} /><div className="sc-ticks"><span>0</span><span>0.5</span><span>1</span></div></div>
            </div>
          </section>
        ) : (
          <section className="d-dead">Dead feature: it never activated on the 2B-token evaluation set, so there are no examples, statistics or score. It still occupies a slot in the dictionary and counts toward the roughly 9% of dead features.</section>
        )}

        {human !== H_NONE && (
          <section className="d-human">
            <div className="d-sec-t">Human review <span className="muted">(1 of 600 hand-reviewed)</span></div>
            <div className="hrow">
              <span className="hdot" style={{ background: HUMAN_COLORS[human] }} />
              <b>{HUMAN_NAMES[human]}</b>
            </div>
            <div className="hlabel">“{humanText(g)}”</div>
            {alive && (
              <div className="agree">
                {(db.score[g] >= 0.5) === (human === 1)
                  ? 'Auto score and human review agree.'
                  : human === 1 ? 'Human rates this more interpretable than the auto score suggests.' : db.score[g] >= 0.5 ? 'Auto score is higher than the human review supports.' : 'Partly consistent with the auto score.'}
              </div>
            )}
          </section>
        )}

        {db.cls[g] !== C_DEAD && (
          <section>
            <div className="d-sec-t">Bookmark &amp; evidence</div>
            {bm ? (
              <div className="bm-edit">
                <div className="bm-row">
                  <label>Evidence for</label>
                  <div className="chips">
                    {(['H1', 'H2', 'H3'] as const).map((h) => (
                      <button key={h} className={`chip ${bm.hyp === h ? 'on' : ''}`} onClick={() => updateBookmark(g, { hyp: bm.hyp === h ? null : h })}>{h}</button>
                    ))}
                  </div>
                  <select value={bm.stance} onChange={(e) => updateBookmark(g, { stance: e.target.value as any })} disabled={!bm.hyp} aria-label="Stance">
                    <option value="supports">supports</option>
                    <option value="contradicts">contradicts</option>
                    <option value="neutral">inconclusive</option>
                  </select>
                </div>
                <textarea value={bm.note} placeholder="Note on this feature…" rows={2} onChange={(e) => updateBookmark(g, { note: e.target.value })} />
              </div>
            ) : (
              <button className="btn ghost" onClick={() => toggleBookmark(g)}><Star on={false} size={14} /> Bookmark to attach a note or hypothesis</button>
            )}
          </section>
        )}

        {alive && <section>
          <div className="d-sec-t">Across layers</div>
          <Lineage g={g} />
          <Neighbors g={g} />
        </section>}

        {alive && (
          <section>
            <div className="d-sec-t">
              Top activating examples <span className="muted">(top {exs.length})</span>
              <label className="toggle"><input type="checkbox" checked={vals} onChange={(e) => setVals(e.target.checked)} /> values</label>
            </div>
            <ol className="exs">
              {exs.slice(0, count).map((e, i) => <ExampleRow key={i} ex={e} n={i + 1} showVals={vals} max={max} />)}
            </ol>
            {count < exs.length && <button className="btn ghost wide" onClick={() => setCount(20)}>Show all {exs.length}</button>}
          </section>
        )}
      </div>
    </aside>
  )
}

export { CLUSTER_COLOR }
