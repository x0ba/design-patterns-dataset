import { useEffect, useMemo, useRef, useState } from 'react';
import { Attempt, Encoding, PS4_DUE, countdown, fmtDayTime, nowMs, relTime, useNow, useStore, wordCount } from '../store';
import { Icon } from '../components/Icon';
import { Heatmap, LineChart, SmallMultiples, StackedArea, indexSeries, sliceYears } from '../components/charts';
import { CORE_IDS, monthlySeries, monthsFor, versionCounters, versionMonthCount } from '../data/bike';

const ENCODINGS: { id: Encoding; label: string; strategy: 'superimpose' | 'juxtapose' | 'explicit' }[] = [
  { id: 'lines', label: 'Lines, one frame', strategy: 'superimpose' },
  { id: 'stacked', label: 'Stacked area', strategy: 'superimpose' },
  { id: 'multiples', label: 'Small multiples', strategy: 'juxtapose' },
  { id: 'heatmap', label: 'Heatmap', strategy: 'juxtapose' },
  { id: 'indexed', label: 'Indexed (2019 = 100)', strategy: 'explicit' },
];
const strategyOf = (e: Encoding) => ENCODINGS.find((x) => x.id === e)!.strategy;

export function AttemptChart({ a, version, width }: { a: Attempt; version: number; width: number }) {
  const all = monthlySeries(version, a.counters);
  const { series, months } = sliceYears(all, monthsFor(versionMonthCount(version)), a.from, a.to);
  if (!series.length) return <div className="chart-empty">Pick at least one counter.</div>;
  switch (a.encoding) {
    case 'lines': return <LineChart series={series} months={months} width={width} height={330} markGap={a.markGap} />;
    case 'indexed': return <LineChart series={indexSeries(series, months)} months={months} width={width} height={330} markGap={a.markGap} indexed />;
    case 'multiples': return <SmallMultiples series={series} months={months} width={width} height={340} sharedY={a.sharedY} markGap={a.markGap} />;
    case 'heatmap': return <Heatmap series={series} months={months} width={width} markGap={a.markGap} />;
    case 'stacked': return <StackedArea series={series} months={months} width={width} height={330} />;
  }
}

export function Glyph({ e }: { e: Encoding }) {
  const s = '#5b564c';
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" className="glyph">
      {e === 'lines' && <><path d="M2 18 L10 12 L18 15 L26 6 L32 9" stroke="#4269d0" fill="none" strokeWidth="1.6" /><path d="M2 20 L10 17 L18 19 L26 14 L32 16" stroke="#ff725c" fill="none" strokeWidth="1.6" /></>}
      {e === 'multiples' && <>{[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(${(i % 2) * 17},${Math.floor(i / 2) * 12})`}><rect width="15" height="10" fill="none" stroke="#cfc8ba" /><path d="M1 8 L5 5 L9 6 L14 2" stroke={s} fill="none" /></g>)}</>}
      {e === 'heatmap' && <>{Array.from({ length: 24 }, (_, i) => <rect key={i} x={(i % 8) * 4 + 1} y={Math.floor(i / 8) * 7 + 2} width="3.6" height="6" fill={`rgba(22,74,92,${0.2 + ((i * 37) % 10) / 13})`} />)}</>}
      {e === 'indexed' && <><line x1="2" x2="32" y1="12" y2="12" stroke="#cfc8ba" strokeDasharray="2 2" /><path d="M2 12 L10 16 L18 11 L26 6 L32 4" stroke="#2f9c86" fill="none" strokeWidth="1.6" /><path d="M2 12 L10 18 L18 15 L26 13 L32 12" stroke="#e0a100" fill="none" strokeWidth="1.6" /></>}
      {e === 'stacked' && <><path d="M2 22 L2 16 L12 13 L22 15 L32 10 L32 22Z" fill="#4269d0" opacity=".7" /><path d="M2 16 L12 13 L22 15 L32 10 L32 5 L22 9 L12 7 L2 10Z" fill="#2f9c86" opacity=".7" /></>}
    </svg>
  );
}

export function DraftPage() {
  const { state, update, toast } = useStore();
  const now = useNow();
  const d = state.draft;
  const active = d.attempts.find((a) => a.id === d.active) || d.attempts[0];
  const activeIdx = d.attempts.indexOf(active);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const writeRef = useRef<HTMLTextAreaElement>(null);

  // Autosave: any content change bumps savedAt after a short pause.
  const sig = JSON.stringify({ a: d.attempts, w: d.writeup, v: d.version });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaving(true);
    const t = setTimeout(() => {
      update((s) => ({ ...s, draft: { ...s.draft, savedAt: new Date(nowMs()).toISOString() } }));
      setSaving(false);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Remember where she left off.
  useEffect(() => {
    update((s) => ({ ...s, draft: { ...s.draft, leftOff: `Attempt ${activeIdx + 1} · ${active.title}` } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id, active.title]);

  const setDraft = (fn: (dd: typeof d) => typeof d) => update((s) => ({ ...s, draft: fn(s.draft) }));
  const patch = (p: Partial<Attempt>) => setDraft((dd) => ({ ...dd, attempts: dd.attempts.map((a) => (a.id === active.id ? { ...a, ...p } : a)) }));
  const counters = versionCounters(d.version);

  const checks = useMemo(() => {
    const strategies = new Set(d.attempts.map((a) => strategyOf(a.encoding)));
    const missing = (['juxtapose', 'superimpose', 'explicit'] as const).filter((x) => !strategies.has(x));
    const coreOk = d.attempts.every((a) => a.counters.length === 4 && CORE_IDS.every((c) => a.counters.includes(c)));
    const rangeOk = d.attempts.every((a) => a.from === 2019 && a.to === 2025);
    const gapOk = d.version < 5 && d.attempts.every((a) => a.markGap);
    const stackedHidesGap = d.attempts.some((a) => a.encoding === 'stacked');
    const words = wordCount(d.writeup);
    return [
      { ok: missing.length === 0 && d.attempts.length >= 3, label: 'Juxtapose, superimpose and explicitly encode', detail: missing.length ? `Missing: ${missing.join(', ')}${missing.includes('explicit') ? ' — try “Indexed (2019 = 100)”' : ''}` : 'All three strategies covered', crit: 'Encoding choices' },
      { ok: d.version === 3, label: 'Built on bike counts v3', detail: d.version === 3 ? 'Correct version' : `Currently v${d.version}`, crit: 'Data handling' },
      { ok: coreOk && rangeOk, label: 'Four core counters, Jan 2019 – Sep 2025', detail: coreOk && rangeOk ? 'All attempts match' : 'Some attempts use other counters or years', crit: 'Data handling' },
      { ok: gapOk && !stackedHidesGap, label: 'Outage shown as missing and labelled', detail: d.version >= 5 ? `v${d.version} imputes the gap — nothing to show` : stackedHidesGap ? 'Stacked area hides missing values' : gapOk ? 'Labelled on every chart' : 'Turn on “Label the outage” for each attempt', crit: 'Data handling' },
      { ok: words >= 300 && words <= 400, label: 'Write-up is 300–400 words', detail: `${words} words`, crit: 'Justification' },
      { ok: /javed/i.test(d.writeup), label: 'Cites Javed et al. (2010)', detail: /javed/i.test(d.writeup) ? 'Cited' : 'Not cited yet', crit: 'Justification' },
      { ok: /lecture\s*5/i.test(d.writeup), label: 'Cites Lecture 5', detail: /lecture\s*5/i.test(d.writeup) ? 'Cited' : 'Not cited yet', crit: 'Justification' },
    ];
  }, [d]);
  const okCount = checks.filter((c) => c.ok).length;

  const insert = (text: string) => {
    const el = writeRef.current;
    if (!el) return;
    const s = el.selectionStart ?? d.writeup.length;
    const e = el.selectionEnd ?? s;
    const before = d.writeup.slice(0, s);
    const pad = before && !/\s$/.test(before) ? ' ' : '';
    const next = before + pad + text + d.writeup.slice(e);
    setDraft((dd) => ({ ...dd, writeup: next }));
    setTimeout(() => { el.focus(); const p = s + pad.length + text.length; el.setSelectionRange(p, p); }, 0);
  };

  const addAttempt = () => {
    const id = 'att-' + Math.round(nowMs() % 1e7);
    const a: Attempt = { id, title: 'Indexed to 2019 average', encoding: 'indexed', counters: CORE_IDS, from: 2019, to: 2025, sharedY: true, markGap: true, notes: '', status: 'started' };
    setDraft((dd) => ({ ...dd, attempts: [...dd.attempts, a], active: id }));
  };
  const dup = () => {
    const id = 'att-' + Math.round(nowMs() % 1e7);
    setDraft((dd) => ({ ...dd, attempts: [...dd.attempts, { ...active, id, title: active.title + ' (copy)', status: 'started' }], active: id }));
  };
  const del = () => {
    if (d.attempts.length <= 1) return;
    if (!window.confirm(`Delete “${active.title}”? This can’t be undone.`)) return;
    setDraft((dd) => {
      const rest = dd.attempts.filter((a) => a.id !== active.id);
      return { ...dd, attempts: rest, active: rest[Math.max(0, activeIdx - 1)].id };
    });
  };

  const savedMs = new Date(d.savedAt).getTime();
  const words = wordCount(d.writeup);

  return (
    <div className="draft">
      <div className="draft-head">
        <div>
          <div className="crumbs"><a href="#/ps">Problem sets</a><span>›</span><a href="#/ps/4">PS4</a><span>›</span><span>My draft</span></div>
          <h1 className="page-title">My PS4 draft · Encoding comparisons</h1>
        </div>
        <div className="draft-actions">
          <span className={'save-state' + (saving ? ' saving' : '')}>
            {saving ? 'Saving…' : <>Saved {relTime(savedMs, now)} <span className="muted">· {fmtDayTime(savedMs)}</span></>}
          </span>
          <a className="btn" href="#/ps/4"><Icon name="doc" /> Brief</a>
          <button className="btn primary" onClick={() => setConfirm(true)}><Icon name="send" /> {d.submittedAt ? 'Resubmit' : 'Submit PS4'}</button>
        </div>
      </div>

      {d.version !== 3 && (
        <div className="callout warn">
          <div className="callout-icon"><Icon name="alert" size={18} /></div>
          <div className="callout-body">
            <b>Your charts are built on bike counts v{d.version}{d.version === 6 ? ' (latest)' : ''}. PS4 requires v3.</b> {d.version >= 5 ? 'This version fills the University Ave outage with imputed values, so your charts can’t show the gap the rubric asks about.' : ''}{d.version === 6 ? ' It also adds four counters and October 2025.' : ''}
            <div className="callout-actions">
              <button className="btn primary sm" onClick={() => { setDraft((dd) => ({ ...dd, version: 3, attempts: dd.attempts.map((a) => ({ ...a, counters: a.counters.filter((c) => versionCounters(3).some((x) => x.id === c)) })) })); toast('Draft switched to v3 — charts redrawn'); }}>Switch my draft to v3</button>
              <a className="btn sm" href="#/datasets/sd-bike-counts?v=3">Compare versions</a>
            </div>
          </div>
        </div>
      )}
      {d.submittedAt && <div className="callout ok"><div className="callout-icon"><Icon name="check" size={18} /></div><div className="callout-body"><b>Submitted {fmtDayTime(d.submittedAt)}.</b> You can keep editing and resubmit until Thu Nov 19, 11:59pm ({countdown(PS4_DUE, now)} left).</div></div>}

      <div className="draft-grid">
        <aside className="draft-left">
          <div className="dl-head">Chart attempts</div>
          <ul className="attempts">
            {d.attempts.map((a, i) => (
              <li key={a.id}>
                <button className={'attempt' + (a.id === active.id ? ' on' : '')} onClick={() => setDraft((dd) => ({ ...dd, active: a.id }))}>
                  <Glyph e={a.encoding} />
                  <span className="att-body">
                    <span className="att-title">{i + 1}. {a.title}</span>
                    <span className="att-sub"><span className={'strat ' + strategyOf(a.encoding)}>{strategyOf(a.encoding)}</span> · {a.status}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button className="btn sm block" onClick={addAttempt} disabled={d.attempts.length >= 6}><Icon name="plus" /> New attempt</button>

          <div className="dl-head" style={{ marginTop: 22 }}>Rubric check <span className="muted">{okCount}/{checks.length}</span></div>
          <ul className="checks">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? 'ok' : ''}>
                <span className="ck">{c.ok ? <Icon name="check" size={12} /> : null}</span>
                <span><span className="ck-l">{c.label}</span><span className="ck-d">{c.detail}</span></span>
              </li>
            ))}
          </ul>
          <div className="muted small">Automatic checks only — the rubric also grades readability and reasoning.</div>
        </aside>

        <div className="draft-center">
          <div className="card">
            <div className="att-head">
              <input className="att-title-input" value={active.title} onChange={(e) => patch({ title: e.target.value })} aria-label="Attempt title" />
              <select value={active.status} onChange={(e) => patch({ status: e.target.value as Attempt['status'] })}>
                <option value="started">started</option><option value="in progress">in progress</option><option value="done">done</option>
              </select>
              <button className="icon-btn" title="Duplicate attempt" onClick={dup}><Icon name="dup" /></button>
              <button className="icon-btn" title="Delete attempt" onClick={del} disabled={d.attempts.length <= 1}><Icon name="trash" /></button>
            </div>
            <div className="enc-row">
              {ENCODINGS.map((e) => (
                <button key={e.id} className={'enc' + (active.encoding === e.id ? ' on' : '')} onClick={() => patch({ encoding: e.id })}>
                  <Glyph e={e.id} />
                  <span>{e.label}</span>
                  <span className={'strat ' + e.strategy}>{e.strategy}</span>
                </button>
              ))}
            </div>
            <div className="chart-frame">
              <div className="chart-caption">Monthly bike counts · {active.from}–{active.to === 2025 ? (d.version === 6 ? 'Oct 2025' : 'Sep 2025') : active.to} · source: San Diego bike counts <b className={d.version === 3 ? '' : 'bad-text'}>v{d.version}</b></div>
              <AttemptChart a={active} version={d.version} width={820} />
            </div>
            <div className="controls">
              <div className="ctl">
                <div className="ctl-l">Counters</div>
                <div className="chips">
                  {counters.map((c) => (
                    <label key={c.id} className={'chip' + (active.counters.includes(c.id) ? ' on' : '')} style={active.counters.includes(c.id) ? { borderColor: c.color } : undefined}>
                      <input type="checkbox" checked={active.counters.includes(c.id)} onChange={(e) => patch({ counters: e.target.checked ? [...active.counters, c.id] : active.counters.filter((x) => x !== c.id) })} />
                      <span className="swatch" style={{ background: c.color }} />{c.short}{c.core && <span className="core-dot" title="PS4 core counter">•</span>}
                    </label>
                  ))}
                </div>
              </div>
              <div className="ctl-row">
                <label className="ctl inline">
                  <span className="ctl-l">Years</span>
                  <select value={active.from} onChange={(e) => patch({ from: +e.target.value })}>{[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) => <option key={y}>{y}</option>)}</select>
                  <span>to</span>
                  <select value={active.to} onChange={(e) => patch({ to: +e.target.value })}>{[2019, 2020, 2021, 2022, 2023, 2024, 2025].filter((y) => y >= active.from).map((y) => <option key={y}>{y}</option>)}</select>
                </label>
                {active.encoding === 'multiples' && (
                  <label className="ctl inline toggle"><input type="checkbox" checked={active.sharedY} onChange={(e) => patch({ sharedY: e.target.checked })} /> Shared y-scale</label>
                )}
                <label className="ctl inline toggle"><input type="checkbox" checked={active.markGap} onChange={(e) => patch({ markGap: e.target.checked })} /> Label the University Ave outage</label>
              </div>
            </div>
          </div>

          <div className="card">
            <label className="field-l" htmlFor="notes">Notes on this attempt <span className="muted">(private, not submitted)</span></label>
            <textarea id="notes" className="notes" value={active.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="What works, what doesn’t, what to try next…" rows={3} />
          </div>

          <div className="card">
            <div className="wu-head">
              <label className="field-l" htmlFor="writeup">Write-up</label>
              <span className={'wc ' + (words >= 300 && words <= 400 ? 'ok' : '')}>{words} / 300–400 words</span>
            </div>
            <div className="cite-row">
              <span className="muted small">Insert:</span>
              <button className="chip-btn" onClick={() => insert('(Javed et al., 2010)')}>Javed et al., 2010</button>
              <button className="chip-btn" onClick={() => insert('(Lecture 5, Nov 10)')}>Lecture 5</button>
              <button className="chip-btn" onClick={() => insert('(Gleicher et al., 2011)')}>Gleicher et al., 2011</button>
              <button className="chip-btn" onClick={() => insert('(Talbot et al., 2014)')}>Talbot et al., 2014</button>
            </div>
            <textarea id="writeup" ref={writeRef} className="writeup" value={d.writeup} onChange={(e) => setDraft((dd) => ({ ...dd, writeup: e.target.value }))} rows={14} />
          </div>
        </div>
      </div>

      {confirm && (
        <div className="modal-backdrop" onMouseDown={() => setConfirm(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>Submit PS4?</h2>
            <p className="muted">You can resubmit any time before Thu Nov 19, 11:59pm. The latest submission is graded.</p>
            <ul className="checks compact">
              {checks.map((c) => (
                <li key={c.label} className={c.ok ? 'ok' : ''}><span className="ck">{c.ok ? <Icon name="check" size={12} /> : null}</span><span><span className="ck-l">{c.label}</span><span className="ck-d">{c.detail}</span></span></li>
              ))}
            </ul>
            {okCount < checks.length && <div className="inline-warn"><Icon name="alert" /> {checks.length - okCount} check{checks.length - okCount > 1 ? 's' : ''} not met yet. You can still submit and revise later.</div>}
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirm(false)}>Keep working</button>
              <button className="btn primary" onClick={() => { setDraft((dd) => ({ ...dd, submittedAt: nowMs() })); setConfirm(false); toast('PS4 submitted — you can resubmit until Thursday'); }}>Submit {d.attempts.length} charts + write-up</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
