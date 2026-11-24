import React, { useState } from 'react';
import { PEOPLE, LATE_CHECKS, LATE_TOTAL, CARD_TOTAL, SERVICES, PROVIDERS, RESTAURANT } from './data.js';
import { fmt, pct } from './calc.js';
import { Check, Chevron, Callout, Chip, LinkButton, Lock, Download } from './ui.jsx';

/* ---------- Step shell ---------- */
export function Step({ n, title, sub, status, open, onToggle, children }) {
  return (
    <section id={`step-${n}`} className={`step ${open ? 'is-open' : ''} ${status.tone === 'ok' ? 'is-done' : ''}`}>
      <button type="button" className="step-head" aria-expanded={open} aria-controls={`step-body-${n}`} onClick={onToggle}>
        <span className="step-num" aria-hidden="true">{status.tone === 'ok' ? <Check /> : n}</span>
        <span className="step-titles">
          <span className="step-title">{title}</span>
          <span className="step-sub">{sub}</span>
        </span>
        <Chip tone={status.tone}>{status.label}</Chip>
        <Chevron className="step-chev" />
      </button>
      {open && <div className="step-body" id={`step-body-${n}`}>{children}</div>}
    </section>
  );
}

/* ---------- Step 1: Friday's late-closed checks ---------- */
const TL_START = 22.5 * 60; // 10:30 PM in minutes
const TL_SPAN = 120;
const at = (h, m) => ((h < 12 ? h + 24 : h) * 60 + m - TL_START);
const pctOf = (min) => `${(min / TL_SPAN) * 100}%`;

function Timeline() {
  const lanes = [
    { label: 'Servers', end: at(23, 15), note: 'out 11:15 PM' },
    { label: 'Bar, bussers, host', end: at(23, 35), note: 'out 11:35 PM' },
    { label: 'Tomás H. · dishwasher', end: at(24, 15) , note: 'out 12:15 AM', hot: true },
    { label: 'Marco D. · shift lead', end: at(24, 30), note: 'out 12:30 AM', mgr: true },
  ];
  const checks = [at(23, 42), at(23, 51), at(24, 8)];
  const ticks = [['10:30 PM', 0], ['11:00', 30], ['11:30', 60], ['12:00 AM', 90], ['12:30', 120]];
  return (
    <figure className="timeline" aria-label="Friday night clock-outs and late check times">
      <div className="tl-grid">
        <div className="tl-labels">
          {lanes.map((l) => <div key={l.label} className="tl-label">{l.label}</div>)}
          <div className="tl-label tl-label-checks">Late checks closed</div>
        </div>
        <div className="tl-tracks">
          <div className="tl-after" style={{ left: pctOf(at(23, 15)) }}><span>after the last server left</span></div>
          {lanes.map((l) => (
            <div key={l.label} className="tl-lane">
              <div className={`tl-bar ${l.hot ? 'hot' : ''} ${l.mgr ? 'mgr' : ''}`} style={{ width: pctOf(l.end) }}>
                <span>{l.note}</span>
              </div>
            </div>
          ))}
          <div className="tl-lane tl-lane-checks">
            {checks.map((m, i) => <span key={i} className="tl-check" style={{ left: pctOf(m) }} title="Late-closed check" />)}
          </div>
          <div className="tl-axis">
            {ticks.map(([t, m]) => <span key={t} style={{ left: pctOf(m) }}>{t}</span>)}
          </div>
        </div>
      </div>
    </figure>
  );
}

export function Step1({ ctx }) {
  const { lateSel, setLateSel, lateApplied, applyLate, undoLate, locked, closing, optCalc, openArticle } = ctx;
  const options = [
    {
      id: 'week',
      title: 'Add to the week’s pool',
      tag: 'Recommended',
      body: 'Treat the three tips like every other card tip: split by points × hours, 80% front of house and 20% back of house.',
      r: optCalc.week,
    },
    {
      id: 'friday',
      title: 'Share among Friday’s crew only',
      body: 'Split the $214.00 by points × Friday hours among the 13 people who worked Friday dinner, still 80/20. Pick this if you’ve always pooled night by night.',
      r: optCalc.friday,
    },
    {
      id: 'closing',
      title: 'Give to whoever was still clocked in',
      tag: 'Kittyline’s suggestion',
      body: 'Marco is excluded as a manager, so the whole amount would go to Tomás Herrera.',
      r: optCalc.closing,
      blocked: true,
    },
  ];
  const tomasBase = ctx.noneCalc.shares.tomas;

  if (lateApplied) {
    const o = options.find((x) => x.id === lateApplied);
    return (
      <>
        <Callout tone="ok" title="Friday is placed, and the pool balances">
          <p>{o.title}. The {fmt(LATE_TOTAL)} is now part of the payout, back-of-house is at {pct(o.r.bohPct)} (your limit is 20%), and nothing is unassigned.</p>
        </Callout>
        <div className="row-actions">
          <button type="button" className="btn ghost" onClick={undoLate} disabled={locked}>Change this</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Callout tone="danger" title="What the warning means">
        <p>Kittyline’s automatic suggestion for late checks is to give the tip to <b>whoever is still clocked in</b> when the check closes. On Friday that was only Marco and Tomás. Marco’s shift-lead role is manager-designated, so he can’t receive tips. That would leave <b>Tomás Herrera, the dishwasher, with all {fmt(LATE_TOTAL)}</b> on top of his regular share.</p>
        <p>Back-of-house would end up with {fmt(closing.boh)}, which is {pct(closing.bohPct)} of the pool. Your rule caps it at 20% ({fmt(closing.allowed)}), so it would be {fmt(closing.bohOver)} over. Nothing has been paid or changed; this is a suggestion you haven’t accepted.</p>
        <LinkButton onClick={() => openArticle('late')}>Read “Late-closed checks”</LinkButton>
      </Callout>

      <h4 className="sub-h">What happened Friday</h4>
      <p className="muted">These three checks were closed after your last server clocked out, so Kittyline couldn’t match them to a shift. They’re in the {fmt(CARD_TOTAL)} from your POS, but not in anyone’s share yet.</p>
      <Timeline />
      <table className="mini-table">
        <thead><tr><th>Check</th><th>Table</th><th>Opened by</th><th>Closed</th><th className="num">Tip</th></tr></thead>
        <tbody>
          {LATE_CHECKS.map((c) => (
            <tr key={c.no}><td>#{c.no}</td><td>{c.table}</td><td>{c.by}</td><td>{c.closed}</td><td className="num">{fmt(c.tip)}</td></tr>
          ))}
          <tr className="total"><td colSpan="4">Unassigned</td><td className="num">{fmt(LATE_TOTAL)}</td></tr>
        </tbody>
      </table>

      <fieldset className="options" disabled={locked}>
        <legend className="sub-h">Where should these tips go?</legend>
        {options.map((o) => {
          const selected = lateSel === o.id;
          const tomasDelta = o.r.shares.tomas - tomasBase;
          return (
            <label key={o.id} className={`option ${selected ? 'is-selected' : ''} ${o.blocked ? 'is-blocked' : ''}`}>
              <input type="radio" name="late" value={o.id} checked={selected} disabled={o.blocked} onChange={() => setLateSel(o.id)} />
              <span className="option-main">
                <span className="option-title">{o.title}{o.tag && <Chip tone={o.blocked ? 'danger' : 'brand'}>{o.blocked ? 'Blocked by your pool rules' : o.tag}</Chip>}</span>
                <span className="option-body">{o.body}</span>
                <span className="option-facts">
                  <span>Back of house: <b>{pct(o.r.bohPct)}</b>{o.r.bohOver > 0 ? <em className="bad"> · {fmt(o.r.bohOver)} over the 20% limit</em> : <em className="good"> · within the limit</em>}</span>
                  <span>Tomás Herrera: <b>{fmt(tomasDelta, { sign: true })}</b></span>
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="row-actions">
        <button type="button" className="btn primary" disabled={!lateSel || locked} onClick={applyLate}>Place Friday’s {fmt(LATE_TOTAL)}</button>
        <span className="muted small">{lateSel ? 'The payout preview on the right shows the effect.' : 'Pick an option to preview it in the payout table.'}</span>
      </div>
    </>
  );
}

/* ---------- Step 2: manager designation + state rules ---------- */
function YesNo({ value, onChange, disabled, label }) {
  return (
    <div className="yesno" role="group" aria-label={label}>
      {['yes', 'no'].map((v) => (
        <button key={v} type="button" disabled={disabled} className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(value === v ? null : v)}>
          {v === 'yes' ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

export function Step2({ ctx }) {
  const { marco, setMarco, stateOk, setStateOk, locked, openArticle, confirmMarco } = ctx;
  const { q1, q2 } = marco;
  const result = q1 === 'yes' || q2 === 'yes' ? 'manager' : q1 === 'no' && q2 === 'no' ? 'staff' : 'open';

  return (
    <>
      <div className="split-block">
        <h4 className="sub-h">A · Does a shift lead count as a manager?</h4>
        <p className="answer"><b>In California, yes, if the shift lead directs other employees.</b> The state looks at what Marco is allowed to do, not at his title. Anyone who can hire or fire, or supervise, direct or control other employees’ work, is treated like the employer and can’t take from the pool. Federal law uses a narrower test; California’s broader one decides it for you.</p>
        <LinkButton onClick={() => openArticle('manager')}>Read “Who counts as a manager?”</LinkButton>

        <div className="qa">
          <div className="qa-row">
            <div>
              <p className="qa-q">On the shifts he covers floor management, does Marco assign sections, call breaks or send people home?</p>
              <p className="muted small">Prefilled from the schedule: floor manager on Wed, Fri and Sat this week. Change it if that’s wrong.</p>
            </div>
            <YesNo value={q1} disabled={locked || marco.confirmed} label="Marco directs other employees" onChange={(v) => setMarco({ ...marco, q1: v })} />
          </div>
          <div className="qa-row">
            <div>
              <p className="qa-q">Can Marco hire or fire, or does an owner act on his recommendations?</p>
            </div>
            <YesNo value={q2} disabled={locked || marco.confirmed} label="Marco has hire or fire authority" onChange={(v) => setMarco({ ...marco, q2: v })} />
          </div>
        </div>

        {result === 'manager' && (
          <Callout tone="info" title="Result: Marco counts as a manager under California’s rule">
            <p>He stays out of the pool and Kittyline skips him when routing tips. This week’s numbers don’t change, because Marco already has no points.</p>
          </Callout>
        )}
        {result === 'staff' && (
          <Callout tone="warn" title="Result: Marco would not count as a manager on these answers">
            <p>He could be eligible, but your pool has no points for a shift-lead role, so adding him means changing your rules. That’s better done after this payout than before Tuesday’s deadline. He stays excluded this week.</p>
          </Callout>
        )}
        {result === 'open' && <p className="muted small">Answer both questions to see a result.</p>}

        <div className="row-actions">
          {marco.confirmed ? (
            <>
              <span className="done-note"><Check /> Marco is excluded from the pool</span>
              <button type="button" className="btn ghost" disabled={locked} onClick={() => setMarco({ ...marco, confirmed: false })}>Change</button>
            </>
          ) : (
            <button type="button" className="btn primary" disabled={result === 'open' || locked} onClick={confirmMarco}>Keep Marco excluded from the pool</button>
          )}
        </div>
      </div>

      <div className="split-block">
        <h4 className="sub-h">B · Confirm the state rules Kittyline applies</h4>
        <p className="muted">State: <b>{RESTAURANT.state}</b>, from your restaurant’s address in {RESTAURANT.city}. On every payout Kittyline checks:</p>
        <ul className="rules-list">
          <li><Check /><span><b>No tips to employers or their agents.</b> Owners, managers and anyone with authority to hire, fire or direct staff are excluded (Labor Code §350, §351).</span></li>
          <li><Check /><span><b>Back of house can share.</b> Your 80/20 split is allowed because California doesn’t permit a tip credit; federal rules (FLSA) apply alongside.</span></li>
          <li><Check /><span><b>Every tip is accounted for.</b> A week can’t be approved while any tip is unassigned.</span></li>
        </ul>
        <p className="fineprint">A plain-language summary, not legal advice. If your restaurant isn’t in California, don’t confirm; contact Kittyline support.</p>
        <div className="row-actions">
          {stateOk ? (
            <>
              <span className="done-note"><Check /> California rules confirmed</span>
              <button type="button" className="btn ghost" disabled={locked} onClick={() => setStateOk(false)}>Change</button>
            </>
          ) : (
            <button type="button" className="btn primary" disabled={locked} onClick={() => setStateOk(true)}>Confirm California rules</button>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- Step 3: cash tips ---------- */
const FOH_PEOPLE = PEOPLE.filter((p) => p.group === 'FOH');

export function Step3({ ctx }) {
  const { cash, setCash, cashOk, setCashOk, locked, toast, openArticle } = ctx;
  const [openSvc, setOpenSvc] = useState('fri-d');
  const [svc, setSvc] = useState('fri-d');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [dest, setDest] = useState('pool');
  const [err, setErr] = useState('');

  const bySvc = SERVICES.map((s) => {
    const lines = cash.filter((c) => c.service === s.id);
    return { ...s, lines, pooled: lines.filter((l) => l.dest === 'pool').reduce((a, l) => a + l.amount, 0), kept: lines.filter((l) => l.dest === 'kept').reduce((a, l) => a + l.amount, 0) };
  });
  const personName = (id) => PEOPLE.find((p) => p.id === id)?.name;

  const add = (e) => {
    e.preventDefault();
    const clean = amount.replace(/[$,\s]/g, '');
    if (!person) return setErr('Choose who declared the cash.');
    if (!/^\d+(\.\d{1,2})?$/.test(clean) || Number(clean) <= 0) return setErr('Enter the amount as dollars and cents, like 64.00.');
    if (Number(clean) > 2000) return setErr('That’s more than one person would declare on one shift. Check the amount.');
    const existing = cash.find((c) => c.service === svc && c.personId === person);
    if (existing) {
      const label = SERVICES.find((s) => s.id === svc).label;
      return setErr(`${personName(person)} already has ${fmt(existing.amount)} declared for ${label}. Each person gets one line per shift. To change an imported amount, correct it in the POS.`);
    }
    const cents = Math.round(Number(clean) * 100);
    setCash([...cash, { id: `${svc}-${person}-${cash.length}`, service: svc, personId: person, amount: cents, dest, added: true }]);
    setCashOk(false);
    setOpenSvc(svc);
    setAmount('');
    setPerson('');
    setErr('');
    toast(`Added ${fmt(cents)} for ${personName(person)}`);
  };

  const remove = (id) => { setCash(cash.filter((c) => c.id !== id)); setCashOk(false); };

  return (
    <>
      <div className="howto">
        <p className="howto-title">How to enter cash declared at the end of a shift</p>
        <ol>
          <li><b>On the shift it was earned,</b> not on payout day.</li>
          <li><b>One line per person,</b> exactly as written on their declaration slip. Friday’s lines below show the pattern.</li>
          <li><b>Pooled or kept.</b> Pooled cash is added to the weekly pool; kept cash is recorded for payroll taxes but isn’t shared.</li>
        </ol>
        <LinkButton onClick={() => openArticle('cash')}>Read “Entering declared cash tips”</LinkButton>
      </div>

      <div className="svc-list">
        {bySvc.map((s) => {
          const open = openSvc === s.id;
          return (
            <div key={s.id} className={`svc ${open ? 'is-open' : ''}`}>
              <button type="button" className="svc-head" aria-expanded={open} onClick={() => setOpenSvc(open ? null : s.id)}>
                <Chevron className="svc-chev" />
                <span className="svc-name">{s.label}</span>
                <span className="muted small">{s.lines.length} declaration{s.lines.length === 1 ? '' : 's'}{s.kept ? ` · ${fmt(s.kept)} kept` : ''}</span>
                <span className="svc-total num">{fmt(s.pooled)}</span>
              </button>
              {open && (
                <ul className="svc-lines">
                  {s.lines.map((l) => {
                    const p = PEOPLE.find((x) => x.id === l.personId);
                    return (
                      <li key={l.id}>
                        <span className="svc-person">{p.name}<span className="muted small"> · {p.role}</span></span>
                        {l.added && <Chip tone="brand">Added by you</Chip>}
                        {l.dest === 'kept' && <Chip>Kept by employee</Chip>}
                        <span className="num">{fmt(l.amount)}</span>
                        {l.added ? <button type="button" className="icon-link" disabled={locked} onClick={() => remove(l.id)}>Remove</button> : <span className="icon-link-spacer" />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <form className="cash-form" onSubmit={add} noValidate>
        <p className="sub-h">Add a declaration that’s missing</p>
        <div className="form-row">
          <label>Shift
            <select value={svc} onChange={(e) => setSvc(e.target.value)} disabled={locked}>
              {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label>Declared by
            <select value={person} onChange={(e) => setPerson(e.target.value)} disabled={locked}>
              <option value="">Choose a person</option>
              {FOH_PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
            </select>
          </label>
          <label>Amount
            <span className="money"><i>$</i><input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={locked} /></span>
          </label>
        </div>
        <div className="form-row form-row-end">
          <div className="seg" role="radiogroup" aria-label="Where the cash goes">
            <button type="button" role="radio" aria-checked={dest === 'pool'} className={dest === 'pool' ? 'on' : ''} onClick={() => setDest('pool')}>Into the pool</button>
            <button type="button" role="radio" aria-checked={dest === 'kept'} className={dest === 'kept' ? 'on' : ''} onClick={() => setDest('kept')}>Kept by employee</button>
          </div>
          <button type="submit" className="btn" disabled={locked}>Add declaration</button>
        </div>
        {err && <p className="field-err" role="alert">{err}</p>}
      </form>

      <div className="row-actions">
        {cashOk ? (
          <>
            <span className="done-note"><Check /> Cash tips reviewed</span>
            <button type="button" className="btn ghost" disabled={locked} onClick={() => setCashOk(false)}>Change</button>
          </>
        ) : (
          <button type="button" className="btn primary" disabled={locked} onClick={ctx.confirmCash}>These match my declaration slips</button>
        )}
      </div>
    </>
  );
}

/* ---------- Step 4: payroll export ---------- */
export function Step4({ ctx }) {
  const { payroll, setPayroll, savePayroll, locked } = ctx;
  const [err, setErr] = useState('');
  const save = (e) => {
    e.preventDefault();
    if (!payroll.provider) return setErr('Choose your payroll provider so Kittyline knows which file layout to use.');
    if (!payroll.code.trim()) return setErr('Enter the earnings code your payroll provider uses for pooled tips.');
    setErr('');
    savePayroll();
  };
  return (
    <form onSubmit={save} noValidate>
      <p className="muted">Kittyline builds one file with each person’s pooled tips for the week. You’ll download it when you approve and upload it to your payroll provider before the Tuesday noon cutoff.</p>
      <div className="form-row form-row-2">
        <label>Payroll provider
          <select value={payroll.provider} disabled={locked} onChange={(e) => setPayroll({ ...payroll, provider: e.target.value, saved: false })}>
            <option value="">Choose a provider</option>
            {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Earnings code for pooled tips
          <input value={payroll.code} disabled={locked} onChange={(e) => setPayroll({ ...payroll, code: e.target.value, saved: false })} />
          <span className="hint">The name of the “tips” pay type in your payroll account.</span>
        </label>
      </div>
      <dl className="kv">
        <div><dt>File format</dt><dd>CSV, one row per person</dd></div>
        <div><dt>Pay period</dt><dd>Mon Nov 9 – Sun Nov 15</dd></div>
        <div><dt>People included</dt><dd>15 (managers excluded)</dd></div>
      </dl>
      {err && <p className="field-err" role="alert">{err}</p>}
      <div className="row-actions">
        {payroll.saved ? (
          <span className="done-note"><Check /> Export set up for {payroll.provider}</span>
        ) : (
          <button type="submit" className="btn primary" disabled={locked}>Save payroll export</button>
        )}
      </div>
    </form>
  );
}

/* ---------- Step 5: review and approve ---------- */
export function Step5({ ctx }) {
  const { checks, calc, approved, canApprove, askApprove, downloadCsv, payroll, goStep } = ctx;
  return (
    <>
      <ul className="review-list">
        {checks.map((c) => (
          <li key={c.n} className={c.ok ? 'ok' : 'todo'}>
            <span className="rv-mark">{c.ok ? <Check /> : c.n}</span>
            <span>{c.label}</span>
            {!c.ok && <button type="button" className="link-btn" onClick={() => goStep(c.n)}>Go to step {c.n}</button>}
          </li>
        ))}
      </ul>
      <dl className="kv kv-4">
        <div><dt>Pool total</dt><dd>{fmt(calc.totalPool)}</dd></div>
        <div><dt>Front of house</dt><dd>{fmt(calc.foh)}</dd></div>
        <div><dt>Back of house</dt><dd>{fmt(calc.boh)} · {pct(calc.bohPct)}</dd></div>
        <div><dt>Unassigned</dt><dd className={calc.unassigned ? 'bad' : 'good'}>{fmt(calc.unassigned)}</dd></div>
      </dl>
      {approved ? (
        <Callout tone="ok" icon={Lock} title="Approved. This week is locked.">
          <p>Your export for {payroll.provider} is ready. Upload it before Tuesday, Nov 17 at 12:00 PM.</p>
        </Callout>
      ) : null}
      <div className="row-actions">
        {approved ? (
          <button type="button" className="btn primary" onClick={downloadCsv}><Download /> Download payroll file</button>
        ) : (
          <>
            <button type="button" className="btn primary" disabled={!canApprove} onClick={askApprove}>Approve payout</button>
            {!canApprove && <span className="muted small">Finish the steps above first.</span>}
          </>
        )}
      </div>
    </>
  );
}
