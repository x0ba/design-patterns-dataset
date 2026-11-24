import React, { useMemo } from 'react';
import { DETECTORS, FILES, LABELS, LABEL_ORDER, PROJECT, REASONS, REASON_ORDER, QA_IDS, SPOT_IDS, DEFAULT_SETTINGS, SETTING_DEFAULTS_NOTE, nf, pct } from '../data.js';
import { REASON_COLORS } from '../stats.js';
import { Icon, Slider } from '../ui.jsx';

const STEPS = [
  { n: 1, title: 'Create project', short: 'Create project' },
  { n: 2, title: 'Add detectors and sites', short: 'Add detectors' },
  { n: 3, title: 'Import recordings', short: 'Import recordings' },
  { n: 4, title: 'Choose a classifier pack', short: 'Classifier pack' },
  { n: 5, title: 'Check the noise filter', short: 'Check noise filter' },
  { n: 6, title: 'Vet a sample by hand', short: 'Vet a sample' },
  { n: 7, title: 'Compare detectors and nights', short: 'Compare detectors' },
  { n: 8, title: 'Record methods and notes', short: 'Methods and notes' },
  { n: 9, title: 'Export the interim report', short: 'Export report' },
];

export default function Guide({ ctx }) {
  const { step, setStep, done } = ctx;
  return (
    <div className="page guide">
      <ol className="stepper" aria-label="Setup steps">
        {STEPS.map((s) => {
          const state = s.n <= done ? 'done' : s.n === done + 1 ? 'current' : 'todo';
          return (
            <li key={s.n}>
              <button className={`st ${state}${step === s.n ? ' sel' : ''}`} onClick={() => setStep(s.n)} aria-current={step === s.n ? 'step' : undefined}>
                <span className="st-dot">{state === 'done' ? <Icon name="check" size={14} /> : s.n}</span>
                <span className="st-t">{s.short}</span>
                <span className="st-s">{state === 'done' ? 'Done' : state === 'current' ? 'In progress' : 'To do'}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {step === 5 && <NoiseStep ctx={ctx} />}
      {step === 6 && <VetStep ctx={ctx} />}
      {step <= 4 && <DoneStep n={step} ctx={ctx} />}
      {step >= 7 && <LaterStep n={step} ctx={ctx} />}
    </div>
  );
}

/* ---------------- Step 5 ---------------- */

function NoiseStep({ ctx }) {
  const { summary, applied, go, done, setDone, setStep } = ctx;
  const S = applied;
  const n = summary.n;
  const noiseRate = summary.noise / n;
  const detRows = DETECTORS.map((d) => ({ d, s: summary.det[d.id], rate: summary.det[d.id].noise / summary.det[d.id].n }));
  const top = [...detRows].sort((a, b) => b.rate - a.rate)[0];
  const topShare = top.s.noise / summary.noise;
  const adjustable = summary.reasons.calls + summary.reasons.sub + summary.reasons.lowfreq;
  const fixed = summary.reasons.insect + summary.reasons.other;
  const srRows = Object.entries(summary.bySr).sort((a, b) => b[0] - a[0]);
  const rates384 = detRows.filter((r) => r.d.sr === 384).map((r) => r.rate);

  return (
    <>
      <section className="card lede">
        <div className="lede-text">
          <p className="eyebrow">Step 5 of 9 · Check the noise filter</p>
          <h1>{pct(summary.noise, n)} of your files are labeled noise. {pct(top.s.noise, summary.noise)} of those came from {top.d.id}, the {top.d.name.toLowerCase()}.</h1>
          <p>
            Here is what explains it. <b>Sample rate is not one of them.</b> {top.d.id} is {pct(top.s.noise, top.s.n)} noise, {pct(top.s.reasons.insect, top.s.noise)} of it insect or broadband, and it drags the project average up
            (without {top.d.id} the rate is {pct(summary.noise - top.s.noise, n - top.s.n)}). Separately, <b>{nf(adjustable)} files</b> ({pct(adjustable, summary.noise)} of the noise) were rejected by one of your own sensitivity settings. Those are the ones to look at before you bill.
          </p>
          <div className="finds">
            <div className="find ok"><Icon name="check" size={16} /><span><b>Sample rate</b> ruled out</span></div>
            <div className="find warn"><Icon name="alert" size={16} /><span><b>{nf(adjustable)}</b> files failed a setting</span></div>
            <div className="find info"><Icon name="info" size={16} /><span><b>{nf(summary.reasons.insect)}</b> insect rejections</span></div>
          </div>
        </div>
        <div className="lede-side">
          <div className="outcomes-top"><b>{nf(summary.noise)}</b><span> of {nf(n)} files are noise</span></div>
          <div className="stack" role="img" aria-label="Share of files by label">
            {LABEL_ORDER.slice().reverse().map((k) => (
              <i key={k} style={{ width: `${(summary.labels[k] / n) * 100}%`, background: LABELS[k].color }} title={`${LABELS[k].name}: ${nf(summary.labels[k])}`} />
            ))}
          </div>
          <ul className="legend">
            {LABEL_ORDER.map((k) => (
              <li key={k}><i style={{ background: LABELS[k].color }} /><span>{LABELS[k].name}</span><b>{nf(summary.labels[k])}</b></li>
            ))}
          </ul>
        </div>
      </section>

      <div className="two">
        <section className="card">
          <div className="card-h"><h2>Noise share by detector</h2><span className="muted">Project average {pct(summary.noise, n)}</span></div>
          <div className="detbars">
            {detRows.map(({ d, s, rate }) => (
              <div className="detbar" key={d.id}>
                <div className="detbar-h">
                  <span><b>{d.id}</b> {d.name}</span>
                  <span className="muted">{d.place.split(',')[1]?.trim()} · {d.sr} kHz</span>
                </div>
                <div className="track">
                  <div className="fill">
                    {REASON_ORDER.map((r) => s.reasons[r] > 0 && (
                      <i key={r} style={{ width: `${(s.reasons[r] / s.n) * 100}%`, background: REASON_COLORS[r] }} title={`${REASONS[r].short}: ${s.reasons[r]}`} />
                    ))}
                  </div>
                  <span className="avg" style={{ left: `${noiseRate * 100}%` }} title="Project average" />
                </div>
                <div className="detbar-f"><b>{Math.round(rate * 100)}%</b><span className="muted">{nf(s.noise)} of {nf(s.n)} files</span></div>
              </div>
            ))}
          </div>
          <ul className="legend inline">
            {REASON_ORDER.map((r) => <li key={r}><i style={{ background: REASON_COLORS[r] }} /><span>{REASONS[r].short}</span></li>)}
          </ul>
        </section>

        <section className="card">
          <div className="card-h"><h2>Sample-rate check</h2><span className="chip ok">Ruled out</span></div>
          <table className="mini">
            <thead><tr><th>Rate</th><th>Detectors</th><th className="r">Files</th><th className="r">Noise</th></tr></thead>
            <tbody>
              {srRows.map(([sr, v]) => (
                <tr key={sr}><td><b>{sr} kHz</b></td><td>{[...v.dets].sort().join(', ')}</td><td className="r">{nf(v.n)}</td><td className="r"><b>{pct(v.noise, v.n, 1)}</b></td></tr>
              ))}
            </tbody>
          </table>
          <ul className="checks">
            <li><Icon name="check" size={15} /> Both rates give similar noise ({srRows.map(([, v]) => pct(v.noise, v.n)).join(' vs ')}).</li>
            <li><Icon name="check" size={15} /> At 384 kHz alone, noise runs from {Math.round(Math.min(...rates384) * 100)}% to {Math.round(Math.max(...rates384) * 100)}%, so rate cannot be the driver.</li>
            <li><Icon name="check" size={15} /> Header rate matches the detector profile in {nf(n)} of {nf(n)} files.</li>
            <li><Icon name="check" size={15} /> Time-expansion is ×1 on all three detectors.</li>
          </ul>
          <button className="link" onClick={() => go('help', { help: { tab: 'topics', topic: 'im-1' } })}>Importing from other detectors <Icon name="arrow" size={14} /></button>
        </section>
      </div>

      <section className="card">
        <div className="card-h">
          <h2>Why files were rejected</h2>
          <span className="muted">{nf(summary.noise)} noise files · each file is counted under the first rule it failed</span>
        </div>
        <table className="reasons">
          <thead>
            <tr><th>Rule that rejected the file</th>{DETECTORS.map((d) => <th key={d.id} className="r">{d.id}</th>)}<th className="r">Total</th><th>Look at it?</th><th /></tr>
          </thead>
          <tbody>
            {REASON_ORDER.map((r) => {
              const tot = summary.reasons[r];
              return (
                <tr key={r}>
                  <td>
                    <div className="rname"><i style={{ background: REASON_COLORS[r] }} /><b>{REASONS[r].title(S)}</b></div>
                    <p>{REASONS[r].desc(S)}</p>
                  </td>
                  {DETECTORS.map((d) => <td key={d.id} className="r num">{summary.det[d.id].reasons[r] || <span className="muted">0</span>}</td>)}
                  <td className="r num"><b>{nf(tot)}</b><small>{pct(tot, summary.noise)}</small></td>
                  <td>{REASONS[r].adjustable ? <span className="chip amber">Check by eye</span> : <span className="chip ok">Mostly correct</span>}</td>
                  <td className="r"><button className="btn small" disabled={!tot} onClick={() => go('vetting', { vet: { queue: `r:${r}` } })}>Review</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="callout">
          <Icon name="info" size={16} />
          <p>
            Only {nf(fixed)} files ({pct(fixed, summary.noise)} of noise) were rejected by rules your settings do not control. To confirm those are right without checking all {nf(fixed)},{' '}
            <button className="link" onClick={() => go('vetting', { vet: { queue: 'spot' } })}>spot-check 40 random rejects</button>.
            Classifier confidence plays no part in noise labels; it is a separate gate (
            <button className="link" onClick={() => go('help', { help: { tab: 'topics', topic: 'nf-1' } })}>Noise filter vs. classifier confidence</button>).
          </p>
        </div>
      </section>

      <WhatIf ctx={ctx} />

      <section className="card next">
        <div>
          <h2>{done >= 5 ? 'Step 5 is complete' : 'Finished with the noise filter?'}</h2>
          <p>{done >= 5 ? 'You can still change settings later. Re-running keeps your vetted labels.' : 'Marking this step done does not change any labels. Next you will vet a sample by hand.'}</p>
        </div>
        {done >= 5
          ? <button className="btn primary" onClick={() => setStep(6)}>Go to step 6 <Icon name="arrow" size={16} /></button>
          : <button className="btn primary" onClick={() => { setDone(5); setStep(6); }}>Mark step 5 done <Icon name="arrow" size={16} /></button>}
      </section>
    </>
  );
}

export function WhatIf({ ctx, compact }) {
  const { applied, pending, setPending, dirty, preview, apply, reprocessing, summary } = ctx;
  const set = (k) => (v) => setPending({ ...pending, [k]: v });
  const cur = summary;
  const nxt = preview;
  const hoaryLost = nxt?.lostByLabel?.hoary || 0;
  return (
    <section className="card whatif" aria-busy={reprocessing}>
      <div className="card-h">
        <h2>{compact ? 'Noise filter settings' : 'Try different settings'}</h2>
        <span className="muted">Preview counts update as you move the sliders. Nothing changes until you apply.</span>
      </div>
      <div className="wi-grid">
        <div className="sliders">
          <Slider id="sl-thr" label="Signal threshold" unit="dB" min={6} max={30} value={pending.thr} onChange={set('thr')} def={applied.thr}
            hint={<>dB above background. Echolog default {SETTING_DEFAULTS_NOTE.thr}. </>} />
          <Slider id="sl-calls" label="Minimum calls per sequence" unit="calls" min={1} max={6} value={pending.minCalls} onChange={set('minCalls')} def={applied.minCalls}
            hint={<>Fewer calls than this and the sequence is dropped. </>} />
          <Slider id="sl-freq" label="Minimum call frequency" unit="kHz" min={8} max={25} value={pending.minFreq} onChange={set('minFreq')} def={applied.minFreq}
            hint={<>Peak energy below this is ignored. </>} />
        </div>
        <div className="preview">
          {!dirty ? (
            <div className="pv-empty">
              <b>No change yet</b>
              <p>Currently {pct(cur.noise, cur.n, 1)} noise ({nf(cur.noise)} files). Try {applied.thr - 3} dB and {Math.max(1, applied.minCalls - 1)} calls to see how many borderline files return.</p>
              <button className="btn small" onClick={() => setPending({ thr: Math.max(6, applied.thr - 3), minCalls: Math.max(1, applied.minCalls - 1), minFreq: applied.minFreq })}>Preview {applied.thr - 3} dB, {Math.max(1, applied.minCalls - 1)} calls</button>
            </div>
          ) : (
            <>
              <div className="pv-big"><span>{pct(cur.noise, cur.n, 1)}</span><Icon name="arrow" size={20} /><span>{pct(nxt.noise, nxt.n, 1)}</span><small>noise</small></div>
              <ul className="pv-list">
                {nxt.recovered > 0 && <li><b className="pos">+{nf(nxt.recovered)}</b> files leave Noise and get an Echolog label</li>}
                {nxt.newlyRejected > 0 && <li><b className="neg">−{nf(nxt.newlyRejected)}</b> classified files would become Noise</li>}
                {nxt.recovered === 0 && nxt.newlyRejected === 0 && <li>No file changes at these values.</li>}
              </ul>
              <table className="mini pv-det">
                <tbody>
                  {DETECTORS.map((d) => (
                    <tr key={d.id}><td>{d.id}</td><td className="r">{Math.round((cur.det[d.id].noise / cur.det[d.id].n) * 100)}%</td><td className="arr">→</td><td className="r"><b>{Math.round((nxt.det[d.id].noise / nxt.det[d.id].n) * 100)}%</b></td></tr>
                  ))}
                </tbody>
              </table>
              {hoaryLost > 0 && <p className="warn-line"><Icon name="alert" size={15} /> A {pending.minFreq} kHz floor would reject {hoaryLost} hoary bat (LACI) files, whose calls sit near 18–25 kHz.</p>}
              {nxt.recovered > 0 && <p className="muted small">Returned files are the weakest calls in the project. Check them in Vetting; confidence will be lower.</p>}
            </>
          )}
          <div className="pv-actions">
            <button className="btn primary" disabled={!dirty || reprocessing} onClick={apply}>{reprocessing ? 'Re-running…' : 'Apply and re-run classifier'}</button>
            <button className="btn" disabled={!dirty || reprocessing} onClick={() => setPending(applied)}>Discard</button>
            {JSON.stringify(applied) !== JSON.stringify(DEFAULT_SETTINGS) && !dirty && <button className="link" onClick={() => setPending(DEFAULT_SETTINGS)}>Back to initial values</button>}
          </div>
        </div>
      </div>
      {reprocessing && (
        <div className="reproc"><div><b>Re-running the noise filter and classifier on {nf(FILES.length)} files…</b><div className="bar indet"><i /></div><span className="muted">Vetted labels are kept.</span></div></div>
      )}
    </section>
  );
}

/* ---------------- Step 6 ---------------- */

function VetStep({ ctx }) {
  const { vetted, info, go, done, setDone, setStep } = ctx;
  const borderline = useMemo(() => FILES.filter((f) => ['sub', 'calls', 'lowfreq'].includes(info[f.i].reason)).map((f) => f.id), [info]);
  const count = (ids) => ids.filter((id) => vetted[id]).length;
  const plan = [
    {
      key: 'qa', title: 'QA sample of classified files', ids: QA_IDS,
      text: 'Twenty random classified files per detector. Your agreement rate here is the figure to quote next to the counts in the report.',
    },
    {
      key: 'spot', title: 'Spot-check of rejected noise', ids: SPOT_IDS,
      text: 'Forty random files Echolog rejected, from every rule. If you find bats here, the rejection rules need loosening; if not, the noise rate is sound.',
    },
    {
      key: 'borderline', title: 'Borderline noise, strongest signal first', ids: borderline,
      text: 'Files that failed the signal threshold, minimum calls or frequency floor. Sorted so the likeliest bats come first; stop when they run out.',
    },
  ];
  return (
    <>
      <section className="card lede single">
        <div className="lede-text">
          <p className="eyebrow">Step 6 of 9 · Vet a sample by hand</p>
          <h1>Check the calls yourself before the numbers go to the client.</h1>
          <p>Vetting shows each file as a spectrogram next to what Echolog decided and why. Your label overrides the automatic one in results, and the original is kept for the export. Work through the three queues in order, or only the ones you need for the interim report.</p>
        </div>
      </section>
      <div className="plan">
        {plan.map((p, i) => {
          const c = count(p.ids);
          return (
            <section className="card plan-i" key={p.key}>
              <span className="plan-n">{i + 1}</span>
              <h2>{p.title}</h2>
              <p>{p.text}</p>
              <div className="plan-f">
                <div><div className="bar"><i style={{ width: `${(c / p.ids.length) * 100}%` }} /></div><span className="muted small">{c} of {nf(p.ids.length)} vetted</span></div>
                <button className="btn primary" onClick={() => go('vetting', { vet: { queue: p.key } })}>{c ? 'Continue' : 'Start'} <Icon name="arrow" size={16} /></button>
              </div>
            </section>
          );
        })}
      </div>
      <section className="card howto">
        <h2>What to look at</h2>
        <div className="howto-g">
          <div><b>The excerpt</b><p>0.4 s of the recording, 0–100 kHz. The dashed amber line is your minimum call frequency.</p></div>
          <div><b>The verdict</b><p>For rejected files, the exact rule and the margin: for example “2 calls vs 3 required”.</p></div>
          <div><b>Your call</b><p>Press 1–5 for a species or group, 6 for noise, or Enter to accept Echolog. Z undoes.</p></div>
        </div>
      </section>
      <section className="card next">
        <div><h2>{done >= 6 ? 'Step 6 is complete' : 'Done vetting?'}</h2><p>{Object.keys(vetted).length} files vetted so far. You can come back at any time.</p></div>
        {done >= 6
          ? <button className="btn primary" onClick={() => setStep(7)}>Go to step 7 <Icon name="arrow" size={16} /></button>
          : <button className="btn primary" disabled={done < 5} onClick={() => { setDone(6); setStep(7); }}>{done < 5 ? 'Finish step 5 first' : <>Mark step 6 done <Icon name="arrow" size={16} /></>}</button>}
      </section>
    </>
  );
}

/* ---------------- Steps 1-4 (done) ---------------- */

function DoneStep({ n, ctx }) {
  const { go } = ctx;
  const content = {
    1: { t: 'Project created', body: <><p><b>{PROJECT.name}</b></p><p>Client: {PROJECT.client}. Survey nights: Nov 9, Nov 10 and Nov 11, 2026.</p></>, action: ['Open project settings', () => go('settings')] },
    2: {
      t: 'Detectors and sites added',
      body: <table className="mini"><tbody>{DETECTORS.map((d) => <tr key={d.id}><td><b>{d.id}</b></td><td>{d.place}</td><td className="r">{d.sr} kHz</td></tr>)}</tbody></table>,
      action: ['Review detector profiles', () => go('settings')],
    },
    3: { t: 'Recordings imported', body: <><p><b>{nf(FILES.length)} WAV files</b> at 256 kHz and 384 kHz, 3–15 s each, across three detectors and three nights.</p><p>Skipped on import: 0 files.</p></>, action: ['Browse recordings', () => go('recordings')] },
    4: { t: 'Classifier pack chosen', body: <><p><b>{PROJECT.pack}</b> outputs Myotis spp., Eastern red bat, hoary bat and a big brown / silver-haired group.</p></>, action: ['See pack details', () => go('settings')] },
  }[n];
  return (
    <section className="card donecard">
      <p className="eyebrow">Step {n} of 9</p>
      <h1><Icon name="check" size={22} className="okc" /> {content.t}</h1>
      <div className="done-body">{content.body}</div>
      <button className="btn" onClick={content.action[1]}>{content.action[0]}</button>
    </section>
  );
}

/* ---------------- Steps 7-9 ---------------- */

function LaterStep({ n, ctx }) {
  const { go, done, setDone, setStep, vetted } = ctx;
  const content = {
    7: { t: 'Compare detectors and nights', body: 'See species counts per detector and per night, using your vetted labels wherever you have them. Check that the pattern makes sense for each site before you describe it.', cta: 'Open Results', run: () => go('results') },
    8: { t: 'Record methods and notes', body: 'The interim report needs the software version, classifier pack, filter settings and how you vetted. Echolog fills these in from the project; add your own notes.', cta: 'Open Settings', run: () => go('settings') },
    9: { t: 'Export the interim report', body: `Export a species-by-detector table and a CSV of every file with its automatic, vetted and final label. ${Object.keys(vetted).length} files are vetted so far; the rest keep their automatic label.`, cta: 'Open Results', run: () => go('results') },
  }[n];
  const locked = done < n - 1;
  return (
    <section className="card donecard">
      <p className="eyebrow">Step {n} of 9</p>
      <h1>{content.t}</h1>
      <div className="done-body"><p>{content.body}</p>{locked && <p className="muted"><Icon name="lock" size={14} /> Finish step {done + 1} first. You can still look around.</p>}</div>
      <div className="row">
        <button className="btn primary" onClick={content.run}>{content.cta}</button>
        {!locked && n > done && <button className="btn" onClick={() => { setDone(n); setStep(Math.min(9, n + 1)); }}>Mark step {n} done</button>}
      </div>
    </section>
  );
}
