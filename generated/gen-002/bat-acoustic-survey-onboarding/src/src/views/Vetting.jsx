import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FILES, FILE_BY_ID, LABELS, REASONS, QA_IDS, SPOT_IDS, fmtClock, fmtDay, nf } from '../data.js';
import { drawSpectrogram } from '../spectrogram.js';
import { Icon } from '../ui.jsx';

const KEYS = ['myotis', 'redbat', 'hoary', 'bbsh', 'unclass', 'noise'];

const QUEUES = [
  { key: 'qa', name: 'QA sample (classified)', sort: 'time' },
  { key: 'spot', name: 'Spot-check of rejected noise', sort: 'time' },
  { key: 'borderline', name: 'Borderline noise', sort: 'snr' },
  { key: 'r:calls', name: 'Rejected: too few calls', sort: 'snr' },
  { key: 'r:sub', name: 'Rejected: low signal', sort: 'snr' },
  { key: 'r:lowfreq', name: 'Rejected: under freq. floor', sort: 'snr' },
  { key: 'r:insect', name: 'Rejected: insects', sort: 'time' },
  { key: 'r:other', name: 'Rejected: clipped', sort: 'time' },
  { key: 'lowconf', name: 'Low confidence (under 70%)', sort: 'conf' },
  { key: 'unclass', name: 'Unclassified', sort: 'conf' },
];

function buildList(queue, custom, info) {
  const by = (fn) => FILES.filter((f) => fn(f, info[f.i]));
  if (queue === 'custom') return (custom || []).map((id) => FILE_BY_ID[id]).filter(Boolean);
  if (queue === 'qa') return QA_IDS.map((id) => FILE_BY_ID[id]);
  if (queue === 'spot') return SPOT_IDS.map((id) => FILE_BY_ID[id]);
  if (queue === 'borderline') return by((f, i) => ['sub', 'calls', 'lowfreq'].includes(i.reason));
  if (queue.startsWith('r:')) return by((f, i) => i.reason === queue.slice(2));
  if (queue === 'lowconf') return by((f, i) => !i.reason && f.conf != null && f.conf < 0.7 && i.auto !== 'unclass');
  if (queue === 'unclass') return by((f, i) => i.auto === 'unclass');
  return [];
}

export default function Vetting({ ctx }) {
  const { info, vetted, decide, undo, history, vet, setVet, applied, go } = ctx;
  const { queue, custom } = vet;
  const qdef = QUEUES.find((q) => q.key === queue);
  const sort = vet.sort || qdef?.sort || 'time';

  const list = useMemo(() => {
    const l = buildList(queue, custom, info).slice();
    if (sort === 'snr') l.sort((a, b) => b.snr - a.snr);
    else if (sort === 'conf') l.sort((a, b) => (a.conf ?? 2) - (b.conf ?? 2));
    else l.sort((a, b) => a.ts - b.ts);
    return l;
  }, [queue, custom, info, sort]);

  const counts = useMemo(() => Object.fromEntries(QUEUES.map((q) => [q.key, buildList(q.key, null, info).length])), [info]);

  let idx = vet.cur ? list.findIndex((f) => f.id === vet.cur) : -1;
  if (idx < 0) { idx = list.findIndex((f) => !vetted[f.id]); if (idx < 0) idx = 0; }
  const f = list[idx];
  const inf = f ? info[f.i] : null;
  const v = f ? vetted[f.id] : null;
  const doneInQueue = list.reduce((n, x) => n + (vetted[x.id] ? 1 : 0), 0);

  const canvasRef = useRef(null);
  useEffect(() => {
    if (f && canvasRef.current) drawSpectrogram(canvasRef.current, f, applied);
  }, [f, applied]);

  const setCur = useCallback((id) => setVet((s) => ({ ...s, cur: id })), [setVet]);
  const step = useCallback((d) => { if (list.length) setCur(list[(idx + d + list.length) % list.length].id); }, [list, idx, setCur]);

  const choose = useCallback((label) => {
    if (!f) return;
    decide(f.id, label);
    // advance to the next unvetted file after this one
    for (let k = 1; k < list.length; k++) {
      const c = list[(idx + k) % list.length];
      if (!vetted[c.id]) { setCur(c.id); return; }
    }
  }, [f, list, idx, vetted, decide, setCur]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (!f) return;
      if (e.key >= '1' && e.key <= '6') { e.preventDefault(); choose(KEYS[+e.key - 1]); }
      else if (e.key === 'Enter' && !e.target.closest('.decide, .vm-nav, .vq-list')) { e.preventDefault(); choose(inf.auto); }
      else if (e.key === 's' || e.key === 'S') step(1);
      else if (e.key === 'b' || e.key === 'B') step(-1);
      else if (e.key === 'z' || e.key === 'Z') undo();
      else if (e.key === 'r' || e.key === 'R') { if (inf.reason && f.latent !== 'noise') choose(f.latent); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [f, inf, choose, step, undo]);

  // agreement across everything vetted
  const all = Object.entries(vetted);
  const agree = all.filter(([id, x]) => x.label === info[FILE_BY_ID[id].i].auto).length;

  const qOptions = queue === 'custom' ? [{ key: 'custom', name: `From Recordings (${nf(list.length)} files)` }, ...QUEUES] : QUEUES;
  const windowStart = Math.max(0, idx - 3);
  const windowList = list.slice(windowStart, windowStart + 60);

  const margin = !f ? null : inf.reason === 'calls'
    ? `${f.calls} call${f.calls === 1 ? '' : 's'} detected, ${applied.minCalls} required`
    : inf.reason === 'sub'
      ? `Signal ${f.snr.toFixed(1)} dB, ${applied.thr} dB required (${(applied.thr - f.snr).toFixed(1)} dB short)`
      : inf.reason === 'lowfreq'
        ? `Peak energy ${f.fpk.toFixed(1)} kHz, floor ${applied.minFreq} kHz`
        : null;

  return (
    <div className="vet">
      <aside className="vq">
        <label className="fld">Queue
          <select value={queue} onChange={(e) => setVet((s) => ({ ...s, queue: e.target.value, sort: null, cur: null, custom: null }))}>
            {qOptions.map((q) => <option key={q.key} value={q.key}>{q.name}{q.key !== 'custom' ? ` (${nf(counts[q.key])})` : ''}</option>)}
          </select>
        </label>
        <label className="fld">Order
          <select value={sort} onChange={(e) => setVet((s) => ({ ...s, sort: e.target.value }))}>
            <option value="snr">Strongest signal first</option>
            <option value="conf">Lowest confidence first</option>
            <option value="time">Time recorded</option>
          </select>
        </label>
        <div className="vq-prog">
          <div className="bar"><i style={{ width: `${list.length ? (doneInQueue / list.length) * 100 : 0}%` }} /></div>
          <span><b>{nf(doneInQueue)}</b> of {nf(list.length)} vetted</span>
        </div>
        <ol className="vq-list" aria-label="Files in queue">
          {windowList.map((x, k) => {
            const i = windowStart + k;
            const vv = vetted[x.id];
            const lab = vv ? vv.label : info[x.i].auto;
            return (
              <li key={x.id}>
                <button className={x.id === f?.id ? 'on' : ''} onClick={() => setCur(x.id)}>
                  <i style={{ background: LABELS[lab].color }} />
                  <span className="mono">{x.name.replace('.wav', '')}</span>
                  {vv ? <Icon name="check" size={14} className="okc" /> : <small>{i + 1}</small>}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="vq-foot muted small">
          {all.length ? <>Agreement with Echolog so far: <b>{Math.round((agree / all.length) * 100)}%</b> ({agree} of {all.length} vetted)</> : 'Agreement with Echolog will show here once you have vetted some files.'}
        </div>
      </aside>

      {!f ? (
        <section className="vm empty-q">
          <h1>Nothing in this queue</h1>
          <p className="muted">With the current settings no files match “{qdef?.name || 'this queue'}”. Pick another queue.</p>
          <button className="btn" onClick={() => go('guide', { step: 6 })}>Back to the setup guide</button>
        </section>
      ) : (
        <section className="vm">
          <div className="vm-h">
            <div>
              <h1 className="mono">{f.name}</h1>
              <p className="muted">{f.det} · {fmtDay(f.ts)}, {fmtClock(f.ts)} · {f.sr} kHz · {f.dur.toFixed(1)} s · file {idx + 1} of {nf(list.length)}</p>
            </div>
            <div className="vm-nav">
              <button className="btn small" onClick={() => step(-1)}><Icon name="back" size={14} /> Back <kbd>B</kbd></button>
              <button className="btn small" onClick={() => step(1)}>Skip <kbd>S</kbd> <Icon name="skip" size={14} /></button>
              <button className="btn small" disabled={!history.length} onClick={undo}><Icon name="undo" size={14} /> Undo <kbd>Z</kbd></button>
            </div>
          </div>
          <div className="canvas-wrap">
            <canvas ref={canvasRef} className="spec" aria-label={`Spectrogram of ${f.name}, 0.4 second excerpt, 0 to 100 kilohertz`} role="img" />
          </div>
          <div className="vm-grid">
            <div className="card facts">
              <h2>What Echolog decided</h2>
              {inf.reason ? (
                <>
                  <div className="verdict rej"><LabelDot k="noise" /> Rejected as noise before classification</div>
                  <p className="why"><b>{REASONS[inf.reason].title(applied)}.</b> {margin ? <span>{margin}.</span> : <span className="muted">{REASONS[inf.reason].desc(applied)}</span>}</p>
                  {f.latent !== 'noise' && (
                    <p className="muted small">If it had passed the filter: <b>{LABELS[f.latent].name}</b>{f.conf != null ? ` at ${Math.round(f.conf * 100)}% confidence` : ''}.</p>
                  )}
                </>
              ) : (
                <>
                  <div className="verdict"><LabelDot k={inf.auto} /> {LABELS[inf.auto].name} <b>{Math.round(f.conf * 100)}%</b> confidence</div>
                  <p className="why muted small">Passed the noise filter with {f.calls} calls at {f.snr.toFixed(1)} dB. Pack: Eastern US v4.2.</p>
                </>
              )}
              <dl className="meas">
                <div><dt>Calls detected</dt><dd>{f.calls}</dd></div>
                <div><dt>Peak frequency</dt><dd>{f.fpk.toFixed(1)} kHz</dd></div>
                <div><dt>Signal</dt><dd>{f.snr.toFixed(1)} dB</dd></div>
                <div><dt>Length</dt><dd>{f.dur.toFixed(1)} s</dd></div>
              </dl>
            </div>
            <div className="card decide">
              <div className="card-h"><h2>Your call</h2>{v && <span className={`chip ${v.label === inf.auto ? 'ok' : 'amber'}`}>{v.label === inf.auto ? 'Agrees with Echolog' : 'Differs from Echolog'}</span>}</div>
              <div className="lbtns">
                {KEYS.map((k, i) => (
                  <button key={k} className={`lbtn${v?.label === k ? ' on' : ''}`} onClick={() => choose(k)}>
                    <i style={{ background: LABELS[k].color }} /><span>{LABELS[k].name}</span><kbd>{i + 1}</kbd>
                  </button>
                ))}
              </div>
              <div className="dec-act">
                <button className="btn primary" onClick={() => choose(inf.auto)}>Accept: {LABELS[inf.auto].name} <kbd>Enter</kbd></button>
                {inf.reason && f.latent !== 'noise' && (
                  <button className="btn" onClick={() => choose(f.latent)}>Recover as {LABELS[f.latent].name} <kbd>R</kbd></button>
                )}
              </div>
              {v && <p className="muted small">Vetted as <b>{LABELS[v.label].name}</b>. Choosing again replaces it.</p>}
            </div>
          </div>
          {doneInQueue === list.length && list.length > 0 && (
            <div className="callout ok"><Icon name="check" size={16} /><p>Queue complete. {Math.round((list.filter((x) => vetted[x.id]?.label === info[x.i].auto).length / list.length) * 100)}% of these labels matched Echolog. Pick another queue, or review results.
              {' '}<button className="link" onClick={() => go('results')}>Open Results</button></p></div>
          )}
        </section>
      )}
    </div>
  );
}

function LabelDot({ k }) {
  return <i className="dot" style={{ background: LABELS[k].color }} />;
}
