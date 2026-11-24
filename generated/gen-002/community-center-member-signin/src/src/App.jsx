import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CENTER, VOLUNTEER, START_TIME, PROGRAMS, MATCH, NEXT_NEW_MEMBER_ID, DOREEN_START, QUEUE_START, ACTIVITY_START,
  MERGE_REASONS, DIRECTORY,
} from './data.js';
import { STEPS, stepIssues, clockLabel, minutesUntil, relMinutes, timeLabel } from './logic.js';
import { NameStep, ContactStep, EmergencyStep, QuestionsStep, ReviewStep, programAvailability } from './Steps.jsx';
import Desk from './Desk.jsx';
import { Icon } from './ui.jsx';

function useKioskClock() {
  const [now, setNow] = useState(START_TIME);
  useEffect(() => {
    const realStart = Date.now();
    const t = setInterval(() => setNow(new Date(START_TIME.getTime() + (Date.now() - realStart))), 5000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const BLANK_FORM = {
  firstName: '', lastName: '', preferredName: '', previousNames: [], street: '', unit: '', city: 'Portland', state: 'OR', zip: '',
  phone: '', email: '', dobMonth: '', dobDay: '', dobYear: '', ecName: '', ecRelationship: '', ecRelationshipOther: '', ecPhone: '',
  access: [], accessNote: '', photo: null, heard: '', heardOther: '',
};

const initialCounts = Object.fromEntries(PROGRAMS.map((p) => [p.id, p.signedIn]));
const progName = (id) => PROGRAMS.find((p) => p.id === id).name;

export default function App() {
  const now = useKioskClock();
  const today = useMemo(() => new Date(2026, 10, 17), []);

  // Kiosk screen
  const [screen, setScreen] = useState('form'); // form | done | home

  // Form state — opened on Doreen, partway through
  const [f, setF] = useState(DOREEN_START);
  const [step, setStep] = useState(1);
  const [visited, setVisited] = useState(new Set([0, 1]));
  const [touched, setTouched] = useState({ phone: true, firstName: true, lastName: true, street: true });
  const [forced, setForced] = useState({}); // steps where Continue was pressed with issues
  const [match, setMatchState] = useState(null); // null | confirming | merged | new
  const [hasMatch, setHasMatch] = useState(true);
  const [mergeReason, setMergeReason] = useState(null);
  const [mergeNote, setMergeNote] = useState('');
  const [mergeRecord, setMergeRecord] = useState(null);
  const [showMergeError, setShowMergeError] = useState(false);
  const [chosen, setChosen] = useState(['knit']);
  const [joiningFor, setJoiningFor] = useState('knit');
  const [result, setResult] = useState(null);

  // Desk state
  const [counts, setCounts] = useState(initialCounts);
  const [queue, setQueue] = useState(QUEUE_START);
  const [activity, setActivity] = useState(ACTIVITY_START);
  const [stats, setStats] = useState({ active: CENTER.activeMembers, lapsed: CENTER.lapsedRecords });
  const [lunchSent, setLunchSent] = useState(null);
  const [toast, setToast] = useState(null);

  const mainRef = useRef(null);
  const headingRef = useRef(null);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  const touch = (k) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const stepId = STEPS[step].id;
  const show = (field) => !!(touched[field] || forced[stepId]);
  const ctx = { match: hasMatch ? match : 'new', today };
  const issues = stepIssues(stepId, f, ctx);
  const memberId = match === 'merged' ? MATCH.id : NEXT_NEW_MEMBER_ID;

  const log = (text) => setActivity((a) => [{ time: clockLabel(now), text }, ...a]);
  const flash = (msg, undo) => {
    setToast({ msg, undo, key: Date.now() });
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const goTo = (i) => {
    setStep(i);
    setVisited((v) => new Set([...v, i]));
    requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: 0 });
      headingRef.current?.focus({ preventScroll: true });
    });
  };

  const focusField = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => el.focus({ preventScroll: true }), 250);
  };

  const onContinue = () => {
    if (issues.length) {
      setForced((s) => ({ ...s, [stepId]: true }));
      if (match === 'confirming' && stepId === 'contact') setShowMergeError(true);
      focusField(issues[0].field);
      return;
    }
    if (step < STEPS.length - 1) goTo(step + 1);
    else finish();
  };

  const setMatch = (m) => {
    setMatchState(m);
    setShowMergeError(false);
    if (m === 'confirming') {
      setMergeReason('name-change');
      setMergeNote(MERGE_REASONS[0].note);
      setTimeout(() => document.getElementById('merge-confirm')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50);
    }
  };

  const confirmMerge = () => {
    if (!mergeReason || !mergeNote.trim()) { setShowMergeError(true); return; }
    const reason = MERGE_REASONS.find((r) => r.id === mergeReason);
    const rec = { by: VOLUNTEER.name, time: clockLabel(now), reasonLabel: reason.label.toLowerCase(), note: mergeNote.trim() };
    setMergeRecord(rec);
    setMatchState('merged');
    setF((prev) => prev.previousNames.some((p) => p.name === MATCH.lastName)
      ? { ...prev, previousNames: prev.previousNames.map((p) => (p.name === MATCH.lastName ? { ...p, source: 'merge' } : p)) }
      : { ...prev, previousNames: [...prev.previousNames, { name: MATCH.lastName, source: 'merge' }] });
    log(`${VOLUNTEER.name} linked today's form to record #${MATCH.id} (Kowalski → ${f.lastName})`);
  };

  const undoMatch = () => {
    if (match === 'merged') {
      setF((prev) => ({ ...prev, previousNames: prev.previousNames.filter((p) => p.source !== 'merge') }));
      log(`${VOLUNTEER.name} undid the link to record #${MATCH.id}`);
      setMergeRecord(null);
    }
    setMatchState(null);
  };

  const finish = () => {
    const progs = chosen;
    setCounts((c) => {
      const n = { ...c };
      progs.forEach((p) => { n[p] += 1; });
      return n;
    });
    setStats((s) => (match === 'merged' ? { active: s.active + 1, lapsed: s.lapsed - 1 } : { ...s, active: s.active + 1 }));
    const name = `${f.preferredName || f.firstName} ${f.lastName}`;
    log(match === 'merged'
      ? `${name} rejoined (#${MATCH.id})${progs.length ? ` · signed in to ${progs.map(progName).join(', ')}` : ''}`
      : `${name} joined (#${memberId})${progs.length ? ` · signed in to ${progs.map(progName).join(', ')}` : ''}`);
    setResult({ name: f.preferredName || f.firstName, full: name, memberId, merged: match === 'merged', programs: progs, photo: f.photo });
    setScreen('done');
  };

  const quickSignIn = (q) => {
    setQueue((qs) => qs.filter((x) => x.id !== q.id));
    setCounts((c) => {
      const n = { ...c };
      q.programs.forEach((p) => { n[p] += 1; });
      return n;
    });
    const entry = { time: clockLabel(now), text: `${q.name} signed in · ${q.programs.map(progName).join(', ')}` };
    setActivity((a) => [entry, ...a]);
    flash(`${q.name} is signed in to ${q.programs.map(progName).join(' and ')}.`, () => {
      setQueue((qs) => [q, ...qs].sort((a, b) => a.id.localeCompare(b.id)));
      setCounts((c) => {
        const n = { ...c };
        q.programs.forEach((p) => { n[p] -= 1; });
        return n;
      });
      setActivity((a) => a.filter((x) => x !== entry));
      setToast(null);
    });
  };

  const sendLunch = () => {
    setLunchSent(clockLabel(now));
    log(`${VOLUNTEER.name} sent the lunch count to the kitchen (${counts.lunch} meals)`);
  };

  const startNewForm = (programId) => {
    setF(BLANK_FORM);
    setStep(0);
    setVisited(new Set([0]));
    setTouched({});
    setForced({});
    setMatchState(null);
    setHasMatch(false);
    setMergeRecord(null);
    setChosen(programId ? [programId] : []);
    setJoiningFor(programId);
    setScreen('form');
  };

  const memberSignIn = (person, progs) => {
    setCounts((c) => {
      const n = { ...c };
      progs.forEach((p) => { n[p] += 1; });
      return n;
    });
    setQueue((qs) => qs.filter((q) => q.name !== person.name));
    log(`${person.name} signed in · ${progs.map(progName).join(', ')}`);
  };

  const joinProgram = PROGRAMS.find((p) => p.id === joiningFor);
  const joinMins = joinProgram ? minutesUntil(now, joinProgram.start) : null;
  const stepIssueCounts = STEPS.map((s) => stepIssues(s.id, f, ctx).length);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true"><Icon name="home" size={20} /></span>
          <span className="brand-name">Commonroom Check-in</span>
          <span className="brand-sep" aria-hidden="true">·</span>
          <span className="brand-center">{CENTER.name}</span>
        </div>
        <div className="topbar-right">
          <span className="date">Tuesday, November 17</span>
          <span className="clock"><Icon name="clock" size={18} /> {clockLabel(now)}</span>
        </div>
      </header>

      <div className={`layout ${screen !== 'form' ? 'no-rail' : ''}`}>
        {screen === 'form' && (
          <nav className="rail" aria-label="Form progress">
            <p className="rail-kicker">{hasMatch && match === 'merged' ? `Rejoining · #${MATCH.id}` : 'New member form'}</p>
            <ol className="steps">
              {STEPS.map((s, i) => {
                const done = visited.has(i) && i !== step && stepIssueCounts[i] === 0 && i < STEPS.length - 1;
                const attention = visited.has(i) && i !== step && stepIssueCounts[i] > 0 && i < step;
                const state = i === step ? 'current' : done ? 'done' : attention ? 'attention' : 'upcoming';
                return (
                  <li key={s.id}>
                    <button type="button" className={`step-link is-${state}`} onClick={() => goTo(i)} aria-current={i === step ? 'step' : undefined}>
                      <span className="step-num">{state === 'done' ? <Icon name="check" size={16} /> : state === 'attention' ? '!' : i + 1}</span>
                      <span className="step-text">{s.short}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="rail-help">
              <p><strong>Need a hand?</strong> {VOLUNTEER.name.split(' ')[0]} at the desk is happy to help.</p>
              <p className="muted">Your details stay with the center. We don't share them.</p>
            </div>
          </nav>
        )}

        <main className="main" ref={mainRef}>
          {screen === 'form' && (
            <div className="form-wrap">
              <div className="form-head">
                <div className="head-row">
                  <p className="step-count">Step {step + 1} of {STEPS.length}</p>
                  {joinProgram && (
                    <p className="joining">
                      <Icon name="clock" size={18} /> Joining for <strong>{joinProgram.name}</strong> at {timeLabel(joinProgram.start)}
                      {joinMins > 0 && <span className="joining-soon"> · starts {relMinutes(joinMins)}</span>}
                    </p>
                  )}
                </div>
                <h1 tabIndex={-1} ref={headingRef}>{STEPS[step].title}</h1>
              </div>

              {stepId === 'name' && <NameStep f={f} set={set} show={show} touch={touch} match={hasMatch ? match : 'new'} />}
              {stepId === 'contact' && (
                <ContactStep
                  f={f} set={set} show={show} touch={touch}
                  matchProps={hasMatch ? { match, setMatch, mergeReason, setMergeReason, mergeNote, setMergeNote, mergeRecord, confirmMerge, undoMatch, showMergeError } : null}
                />
              )}
              {stepId === 'emergency' && <EmergencyStep f={f} set={set} show={show} touch={touch} today={today} />}
              {stepId === 'questions' && <QuestionsStep f={f} set={set} show={show} touch={touch} />}
              {stepId === 'review' && (
                <ReviewStep f={f} goTo={goTo} match={hasMatch ? match : 'new'} memberId={memberId} today={today} now={now} counts={counts} chosen={chosen} setChosen={setChosen} />
              )}

              <div className="form-foot">
                <button type="button" className="btn secondary big" onClick={() => goTo(step - 1)} disabled={step === 0}>
                  <Icon name="arrow-left" size={20} /> Back
                </button>
                <div className="foot-status" aria-live="polite">
                  {forced[stepId] && issues.length > 0 && (
                    <p className="foot-issue">
                      <Icon name="alert" size={18} />
                      <span>
                        {issues.length === 1 ? 'One thing left: ' : `${issues.length} things left. First: `}
                        <button type="button" className="btn link small" onClick={() => focusField(issues[0].field)}>{issues[0].msg}</button>
                      </span>
                    </p>
                  )}
                </div>
                <button type="button" className="btn primary big" onClick={onContinue}>
                  {step < STEPS.length - 1 ? (
                    <>Continue <Icon name="arrow-right" size={20} /></>
                  ) : chosen.length ? (
                    <>Finish and sign in <Icon name="arrow-right" size={20} /></>
                  ) : (
                    <>Finish joining <Icon name="arrow-right" size={20} /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {screen === 'done' && result && <DoneScreen result={result} onNext={() => setScreen('home')} />}
          {screen === 'home' && <HomeScreen now={now} counts={counts} onJoin={startNewForm} onSignIn={memberSignIn} />}
        </main>

        <Desk now={now} counts={counts} queue={queue} onQuickSignIn={quickSignIn} activity={activity} stats={stats} lunchSent={lunchSent} onSendLunch={sendLunch} />
      </div>

      {toast && (
        <div className="toast" role="status" key={toast.key}>
          <Icon name="check" size={18} /> <span>{toast.msg}</span>
          {toast.undo && <button type="button" className="btn link light" onClick={toast.undo}>Undo</button>}
        </div>
      )}
    </div>
  );
}

function DoneScreen({ result, onNext }) {
  const progs = result.programs.map((id) => PROGRAMS.find((p) => p.id === id));
  const first = progs[0];
  return (
    <div className="done">
      <div className="done-mark"><Icon name="check" size={44} /></div>
      <h1>{progs.length ? `You're signed in, ${result.name}.` : `You're all set, ${result.name}.`}</h1>
      <p className="done-lead">
        {result.merged
          ? `Welcome back to Hawthorne Commons. Your membership #${result.memberId} is active again.`
          : `Welcome to Hawthorne Commons. Your member number is #${result.memberId}.`}
      </p>
      {progs.length > 0 && (
        <ul className="done-programs">
          {progs.map((p) => (
            <li key={p.id}>
              <span className="dp-name">{p.name}</span>
              <span className="dp-meta">{timeLabel(p.start)}–{timeLabel(p.end)} · {p.room}, {p.directions}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="done-note">
        {first ? `${first.name === 'Knitting Circle' ? 'Spare needles and yarn are on the shelf by the window if you need them. ' : ''}` : ''}
        Next time, just type your name or the last 4 digits of your phone to sign in.
      </p>
      <button type="button" className="btn primary big" onClick={onNext}>Done, next person <Icon name="arrow-right" size={20} /></button>
    </div>
  );
}

function HomeScreen({ now, counts, onJoin, onSignIn }) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const [progs, setProgs] = useState([]);
  const [signedIn, setSignedIn] = useState(null);
  const term = q.trim().toLowerCase();
  const results = term.length >= 2
    ? DIRECTORY.filter((m) => m.name.toLowerCase().split(' ').some((w) => w.startsWith(term)) || m.name.toLowerCase().startsWith(term) || (term.length === 4 && m.phoneLast4 === term))
    : [];
  const open = PROGRAMS.filter((p) => programAvailability(p, { now, age: 70, counts }).ok);

  if (signedIn) {
    return (
      <div className="done">
        <div className="done-mark"><Icon name="check" size={44} /></div>
        <h1>Thanks, {signedIn.name.split(' ')[0]}. You're signed in.</h1>
        <ul className="done-programs">
          {signedIn.progs.map((id) => {
            const p = PROGRAMS.find((x) => x.id === id);
            return <li key={id}><span className="dp-name">{p.name}</span><span className="dp-meta">{timeLabel(p.start)} · {p.room}, {p.directions}</span></li>;
          })}
        </ul>
        <button type="button" className="btn primary big" onClick={() => { setSignedIn(null); setPicked(null); setQ(''); setProgs([]); }}>Done, next person <Icon name="arrow-right" size={20} /></button>
      </div>
    );
  }

  return (
    <div className="home">
      <h1>Welcome to Hawthorne Commons</h1>
      <p className="home-lead">Sign in for today's programs, or join if it's your first time.</p>
      <div className="home-grid">
        <section className="home-card">
          <h2>I'm a member</h2>
          <label htmlFor="member-search" className="field-label">Type your last name or the last 4 digits of your phone</label>
          <div className="search">
            <Icon name="search" size={20} />
            <input id="member-search" className="input" value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} autoComplete="off" />
          </div>
          {term.length >= 2 && !picked && (
            <ul className="results">
              {results.length === 0 && <li className="muted">No one found. Check the spelling, or ask at the desk.</li>}
              {results.map((m) => (
                <li key={m.memberId}>
                  <button type="button" className="result" onClick={() => { setPicked(m); setProgs([]); }}>
                    <span>{m.name}</span><span className="muted">#{m.memberId} · phone ends {m.phoneLast4}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picked && (
            <div className="picked">
              <p>Hello, <strong>{picked.name}</strong>. What are you here for?</p>
              <div className="chips">
                {open.map((p) => (
                  <button key={p.id} type="button" role="checkbox" aria-checked={progs.includes(p.id)} className={`chip ${progs.includes(p.id) ? 'selected' : ''}`}
                    onClick={() => setProgs(progs.includes(p.id) ? progs.filter((x) => x !== p.id) : [...progs, p.id])}>
                    {progs.includes(p.id) && <Icon name="check" size={18} />}{p.name} · {timeLabel(p.start)}
                  </button>
                ))}
              </div>
              <button type="button" className="btn primary big" disabled={!progs.length} onClick={() => { onSignIn(picked, progs); setSignedIn({ name: picked.name, progs }); }}>
                Sign me in
              </button>
            </div>
          )}
        </section>
        <section className="home-card join">
          <h2>First time here?</h2>
          <p>Joining is free and takes about 5 minutes. Choose what you're here for today:</p>
          <div className="join-list">
            {open.filter((p) => !p.isMeal).map((p) => (
              <button key={p.id} type="button" className="btn secondary big wide" onClick={() => onJoin(p.id)}>
                Join and sign in to {p.name}
              </button>
            ))}
            <button type="button" className="btn link" onClick={() => onJoin(null)}>Just join for now</button>
          </div>
        </section>
      </div>
    </div>
  );
}
