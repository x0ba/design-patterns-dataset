import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FILES, PROJECT, DEFAULT_SETTINGS, reasonOf, nf } from './data.js';
import { summarize, sameSettings } from './stats.js';
import { Icon, Toast } from './ui.jsx';
import Guide from './views/Guide.jsx';
import Recordings from './views/Recordings.jsx';
import Vetting from './views/Vetting.jsx';
import Results from './views/Results.jsx';
import Settings from './views/Settings.jsx';
import Help from './views/Help.jsx';

const NAV = [
  { id: 'guide', label: 'Setup guide', icon: 'guide' },
  { id: 'recordings', label: 'Recordings', icon: 'table' },
  { id: 'vetting', label: 'Vetting', icon: 'wave' },
  { id: 'results', label: 'Results', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
  { id: 'help', label: 'Help and terms', icon: 'help' },
];

export default function App() {
  const [view, setView] = useState('guide');
  const [done, setDone] = useState(4);
  const [step, setStep] = useState(5);
  const [applied, setApplied] = useState(DEFAULT_SETTINGS);
  const [pending, setPending] = useState(DEFAULT_SETTINGS);
  const [reprocessing, setReprocessing] = useState(false);
  const [vetted, setVetted] = useState({});
  const [history, setHistory] = useState([]);
  const [vet, setVet] = useState({ queue: 'borderline', sort: null, cur: null, custom: null });
  const [toast, setToast] = useState(null);
  const [helpOpen, setHelpOpen] = useState({ tab: 'terms', topic: null });
  const toastTimer = useRef(null);
  const mainRef = useRef(null);

  const say = useCallback((text, action) => {
    setToast({ text, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  const info = useMemo(
    () => FILES.map((f) => {
      const reason = reasonOf(f, applied);
      return { reason, auto: reason ? 'noise' : f.latent };
    }),
    [applied],
  );
  const summary = useMemo(() => summarize(applied), [applied]);
  const dirty = !sameSettings(applied, pending);
  const preview = useMemo(() => (dirty ? summarize(pending, applied) : null), [pending, applied, dirty]);

  const go = useCallback((v, opts = {}) => {
    if (opts.vet) setVet((s) => ({ ...s, sort: null, cur: null, custom: null, ...opts.vet }));
    if (opts.help) setHelpOpen(opts.help);
    if (opts.step) setStep(opts.step);
    setView(v);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const apply = useCallback(() => {
    if (!dirty || reprocessing) return;
    const before = applied;
    const beforeNoise = summary.noise;
    setReprocessing(true);
    setTimeout(() => {
      setApplied(pending);
      setReprocessing(false);
      const after = summarize(pending).noise;
      say(`Re-ran the classifier on ${nf(FILES.length)} files. Noise ${((beforeNoise / FILES.length) * 100).toFixed(1)}% → ${((after / FILES.length) * 100).toFixed(1)}%. Your vetted labels were kept.`, {
        label: 'Undo',
        run: () => { setApplied(before); setPending(before); setToast(null); },
      });
    }, 1100);
  }, [dirty, reprocessing, applied, pending, summary, say]);

  const vettedCount = Object.keys(vetted).length;

  const decide = useCallback((id, label) => {
    setHistory((h) => [...h, { id, prev: vetted[id] || null }]);
    setVetted((v) => ({ ...v, [id]: { label, at: Date.now() } }));
  }, [vetted]);

  const undo = useCallback(() => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setVetted((v) => {
      const n = { ...v };
      if (last.prev) n[last.id] = last.prev; else delete n[last.id];
      return n;
    });
    setVet((s) => ({ ...s, cur: last.id }));
  }, [history]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const ctx = {
    view, go, done, setDone, step, setStep, applied, pending, setPending, dirty, preview, apply, reprocessing,
    info, summary, vetted, decide, undo, history, vet, setVet, say, helpOpen, setHelpOpen,
  };

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#f2be5c" /><path d="M6 20c4-10 6-10 10 0s6 10 10 0" fill="none" stroke="#173f3e" strokeWidth="3" strokeLinecap="round" /></svg>
          <span>Echolog</span>
        </div>
        <button className="project" onClick={() => go('guide', { step: 5 })} title="Hollins Ridge Wind">
          <span className="project-k">Project</span>
          <span className="project-n">Hollins Ridge Wind</span>
          <span className="project-s">Pre-construction, Autumn 2026</span>
        </button>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} className={`nav${view === n.id ? ' on' : ''}`} onClick={() => go(n.id)} aria-current={view === n.id ? 'page' : undefined}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.id === 'vetting' && vettedCount > 0 ? <em className="badge">{vettedCount}</em> : null}
              {n.id === 'settings' && dirty ? <em className="badge amber">!</em> : null}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="progress-card" onClick={() => go('guide')}>
            <div className="pc-top"><span>Setup</span><b>{done} of 9 steps</b></div>
            <div className="bar"><i style={{ width: `${(done / 9) * 100}%` }} /></div>
            <span className="pc-next">{done < 9 ? `Next: ${['', 'Create project', 'Add detectors', 'Import recordings', 'Classifier pack', 'Check the noise filter', 'Vet a sample', 'Compare detectors', 'Methods and notes', 'Export interim report'][done + 1]}` : 'All steps complete'}</span>
          </button>
          <div className="user">
            <span className="avatar" aria-hidden="true">IM</span>
            <span><b>Dr. Ines Marchetti</b><small>Independent bat ecologist</small></span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <div className="crumb">
            <b>{PROJECT.name}</b>
            <span>Client: {PROJECT.client}</span>
          </div>
          <div className="top-right">
            {dirty ? <button className="chip amber" onClick={() => go('guide', { step: 5 })}>Unapplied filter changes</button> : null}
            <span className="chip due" title="Interim report">Interim report due {PROJECT.dueLabel}</span>
            <button className="btn ghost" onClick={() => go('help', { help: { tab: 'topics', topic: 'nf-1' } })}><Icon name="help" size={16} /> Help</button>
          </div>
        </header>
        <main ref={mainRef} className="content" id="main">
          {view === 'guide' && <Guide ctx={ctx} />}
          {view === 'recordings' && <Recordings ctx={ctx} />}
          {view === 'vetting' && <Vetting ctx={ctx} />}
          {view === 'results' && <Results ctx={ctx} />}
          {view === 'settings' && <Settings ctx={ctx} />}
          {view === 'help' && <Help ctx={ctx} />}
        </main>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
