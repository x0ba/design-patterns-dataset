import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CASH_SEED, CARD_TOTAL, LATE_TOTAL, PEOPLE, SHIFTS, TIPPED_HOURS } from './data.js';
import { computeShares, fmt } from './calc.js';
import { Step, Step1, Step2, Step3, Step4, Step5 } from './steps.jsx';
import { Sidebar, Preview, Drawer, HelpView, SetupView } from './views.jsx';
import { Check, Download } from './ui.jsx';

const OPTION_LABELS = {
  week: 'Previewing “Add to the week’s pool”',
  friday: 'Previewing “Share among Friday’s crew only”',
};

export default function App() {
  const [view, setView] = useState('payout');
  const [openStep, setOpenStep] = useState(1);
  const [lateSel, setLateSel] = useState(null);
  const [lateApplied, setLateApplied] = useState(null);
  const [marco, setMarco] = useState({ q1: 'yes', q2: null, confirmed: false });
  const [stateOk, setStateOk] = useState(false);
  const [cash, setCash] = useState(CASH_SEED);
  const [cashOk, setCashOk] = useState(false);
  const [payroll, setPayroll] = useState({ provider: '', code: 'TIPS-POOL', saved: false });
  const [approved, setApproved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [article, setArticle] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [scrollTo, setScrollTo] = useState(null);
  const toastTimer = useRef();

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const cashPooled = cash.filter((c) => c.dest === 'pool').reduce((a, c) => a + c.amount, 0);
  const cashKept = cash.filter((c) => c.dest === 'kept').reduce((a, c) => a + c.amount, 0);

  const noneCalc = useMemo(() => computeShares('none', cashPooled), [cashPooled]);
  const optCalc = useMemo(() => ({
    week: computeShares('week', cashPooled),
    friday: computeShares('friday', cashPooled),
    closing: computeShares('closing', cashPooled),
  }), [cashPooled]);

  const base = lateApplied ? optCalc[lateApplied] : noneCalc;
  const previewing = !lateApplied && !!lateSel && lateSel !== 'closing';
  const calc = previewing ? optCalc[lateSel] : base;

  const done = [!!lateApplied, marco.confirmed && stateOk, cashOk, payroll.saved, approved];
  const doneCount = done.filter(Boolean).length;
  const canApprove = done.slice(0, 4).every(Boolean) && base.unassigned === 0;
  const setupDone = 7 + (stateOk ? 1 : 0) + (payroll.saved ? 1 : 0);

  useEffect(() => {
    if (scrollTo == null) return;
    const el = document.getElementById(`step-${scrollTo}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setScrollTo(null);
  }, [scrollTo, openStep, view]);

  const goStep = (n) => { setView('payout'); setOpenStep(n); setScrollTo(n); };
  const toggle = (n) => setOpenStep(openStep === n ? 0 : n);
  const advance = (from, flags) => {
    const order = [1, 2, 3, 4, 5];
    const next = order.find((n) => n > from && !flags[n - 1]) || order.find((n) => !flags[n - 1] && n !== from);
    setOpenStep(next || 5);
    if (next) setScrollTo(next);
  };

  const applyLate = () => {
    setLateApplied(lateSel);
    toast(`Friday placed. ${fmt(LATE_TOTAL)} is no longer unassigned.`);
    advance(1, [true, done[1], done[2], done[3], false]);
  };
  const confirmMarco = () => {
    setMarco({ ...marco, confirmed: true });
    toast('Marco Delacroix stays excluded from the pool');
    if (stateOk) advance(2, [done[0], true, done[2], done[3], false]);
  };
  const confirmCash = () => {
    setCashOk(true);
    toast('Cash tips marked as reviewed');
    advance(3, [done[0], done[1], true, done[3], false]);
  };
  const savePayroll = () => {
    setPayroll({ ...payroll, saved: true });
    toast(`Payroll export set up for ${payroll.provider}`);
    advance(4, [done[0], done[1], done[2], true, false]);
  };
  const setStateOkAndMaybeAdvance = (v) => {
    setStateOk(v);
    if (v) {
      toast('California rules confirmed');
      if (marco.confirmed) advance(2, [done[0], true, done[2], done[3], false]);
    }
  };

  const downloadCsv = () => {
    const lines = [['employee', 'role', 'tipped_hours', 'earnings_code', 'amount', 'period_start', 'period_end']];
    PEOPLE.forEach((p) => lines.push([p.name, p.role, p.hours.toFixed(1), payroll.code.trim(), (base.shares[p.id] / 100).toFixed(2), '2026-11-09', '2026-11-15']));
    const csv = lines.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'olive-ember-tips-2026-11-09_to_2026-11-15.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ctx = {
    lateSel, setLateSel, lateApplied, noneCalc, optCalc, closing: optCalc.closing,
    applyLate, undoLate: () => { setLateApplied(null); toast('Friday is unassigned again'); },
    locked: approved, openArticle: setArticle,
    marco, setMarco, stateOk, setStateOk: setStateOkAndMaybeAdvance, confirmMarco,
    cash, setCash, cashOk, setCashOk, confirmCash, toast,
    payroll, setPayroll, savePayroll,
    checks: [
      { n: 1, ok: done[0], label: `Friday’s late-closed checks are placed (${fmt(LATE_TOTAL)})` },
      { n: 2, ok: done[1], label: 'Marco’s role and California rules are confirmed' },
      { n: 3, ok: done[2], label: 'Declared cash tips are reviewed' },
      { n: 4, ok: done[3], label: 'Payroll export is set up' },
    ],
    calc: base, approved, canApprove, askApprove: () => setConfirming(true), downloadCsv, goStep,
  };

  const steps = [
    { n: 1, title: 'Fix Friday’s late-closed checks', sub: lateApplied ? 'Placed in the pool' : `${fmt(LATE_TOTAL)} unassigned from Fri Nov 13 · 1 warning`, status: done[0] ? { tone: 'ok', label: 'Done' } : { tone: 'danger', label: 'Needs you' }, C: Step1 },
    { n: 2, title: 'Confirm Marco’s role and the state rules', sub: 'Does a shift lead count as a manager? · California rules', status: done[1] ? { tone: 'ok', label: 'Done' } : { tone: 'warn', label: marco.confirmed || stateOk ? '1 of 2 done' : 'To confirm' }, C: Step2 },
    { n: 3, title: 'Check declared cash tips', sub: `${fmt(cashPooled)} pooled across ${cash.filter((c) => c.dest === 'pool').length} declarations${cashKept ? ` · ${fmt(cashKept)} kept` : ''}`, status: done[2] ? { tone: 'ok', label: 'Reviewed' } : { tone: 'warn', label: 'To review' }, C: Step3 },
    { n: 4, title: 'Set up payroll export', sub: payroll.saved ? `${payroll.provider} · code ${payroll.code}` : 'Needed to build your payout file', status: done[3] ? { tone: 'ok', label: 'Done' } : { tone: 'warn', label: 'Not set up' }, C: Step4 },
    { n: 5, title: 'Review and approve', sub: approved ? 'Approved · export ready' : 'Check the totals, then approve', status: approved ? { tone: 'ok', label: 'Approved' } : { tone: 'neutral', label: canApprove ? 'Ready' : 'Waiting' }, C: Step5 },
  ];

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} setupDone={setupDone} todo={4 - done.slice(0, 4).filter(Boolean).length} />
      <main className="main">
        {view === 'payout' && (
          <div className="page">
            <header className="page-head">
              <div>
                <p className="eyebrow">Weekly payout · your first run</p>
                <h1>Week of Nov 9–15</h1>
                <p className="deadline">Due at your payroll provider <b>Tue, Nov 17 at 12:00 PM</b>, about 22 hours from now</p>
              </div>
              <div className="head-actions">
                <div className="progress" aria-label={`${doneCount} of 5 steps done`}>
                  <span>{doneCount} of 5 steps done</span>
                  <div className="progress-bar" aria-hidden="true"><i style={{ width: `${(doneCount / 5) * 100}%` }} /></div>
                </div>
                {approved
                  ? <button type="button" className="btn primary" onClick={downloadCsv}><Download /> Download payroll file</button>
                  : <button type="button" className="btn primary" disabled={!canApprove} onClick={() => goStep(5)} title={canApprove ? '' : 'Finish steps 1 to 4 first'}>Review and approve</button>}
              </div>
            </header>

            <section className="tiles" aria-label="Pool totals">
              <div className="tile">
                <span className="tile-l">Card tips from POS</span>
                <span className="tile-v">{fmt(CARD_TOTAL)}</span>
                <span className="tile-s">{SHIFTS} shifts · {TIPPED_HOURS} tipped hours</span>
              </div>
              <div className="tile">
                <span className="tile-l">Cash tips declared</span>
                <span className="tile-v">{fmt(cashPooled)}</span>
                <span className="tile-s">{cash.filter((c) => c.dest === 'pool').length} declarations{cashKept ? ` · ${fmt(cashKept)} kept, not pooled` : ''}</span>
              </div>
              <div className="tile">
                <span className="tile-l">Pool total</span>
                <span className="tile-v">{fmt(noneCalc.totalPool)}</span>
                <span className="tile-s">Card tips + pooled cash</span>
              </div>
              <div className={`tile ${calc.unassigned ? 'tile-bad' : 'tile-good'}`}>
                <span className="tile-l">Unassigned</span>
                <span className="tile-v">{fmt(calc.unassigned)}</span>
                <span className="tile-s">{calc.unassigned ? '3 late-closed checks, Fri Nov 13' : <><Check /> Pool balances</>}</span>
              </div>
            </section>

            <div className="cols">
              <div className="steps">
                <div className="steps-head">
                  <h2>Close the week</h2>
                  <span className="muted small">5 steps, in any order. Step 1 is what’s holding up the balance.</span>
                </div>
                {steps.map(({ n, C, ...s }) => (
                  <Step key={n} n={n} {...s} open={openStep === n} onToggle={() => toggle(n)}>
                    <C ctx={ctx} />
                  </Step>
                ))}
              </div>
              <Preview
                calc={calc}
                base={base}
                previewing={previewing}
                previewLabel={OPTION_LABELS[lateSel]}
                flagged={!lateApplied && !previewing}
                approved={approved}
              />
            </div>
          </div>
        )}
        {view === 'setup' && <SetupView stateOk={stateOk} payrollOk={payroll.saved} goPayoutStep={goStep} />}
        {view === 'help' && <HelpView onOpen={setArticle} />}
      </main>

      <Drawer id={article} onClose={() => setArticle(null)} onOpen={setArticle} cashPooled={cashPooled} />

      {confirming && (
        <div className="modal-wrap" onClick={() => setConfirming(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ap-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="ap-title">Approve this week’s payout?</h2>
            <p>{fmt(base.distributed)} to 15 people for Nov 9–15. After approval the week is locked, and any change needs a corrected export.</p>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setConfirming(false)}>Not yet</button>
              <button
                type="button"
                className="btn primary"
                autoFocus
                onClick={() => { setApproved(true); setConfirming(false); setOpenStep(5); toast('Payout approved. Your export is ready to download.'); }}
              >Approve payout</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toastMsg ? 'show' : ''}`} role="status" aria-live="polite">{toastMsg && <><Check /> {toastMsg}</>}</div>
    </div>
  );
}
