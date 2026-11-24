import React, { useEffect, useRef, useState } from 'react';
import { PEOPLE, EXCLUDED, SETUP_STEPS, MANAGER, RESTAURANT } from './data.js';
import { fmt, pct } from './calc.js';
import { ARTICLES } from './articles.jsx';
import { Check, Close, Book, Logo, Chip, Alert, Lock, Arrow } from './ui.jsx';

/* ---------- Sidebar ---------- */
export function Sidebar({ view, setView, setupDone, todo }) {
  const items = [
    { id: 'payout', label: 'Weekly payout', badge: todo > 0 ? todo : null, badgeTone: 'amber' },
    { id: 'setup', label: 'Setup checklist', badge: `${setupDone}/9` },
    { id: 'help', label: 'Help articles' },
  ];
  return (
    <aside className="side">
      <div className="brand"><Logo /><span>Kittyline</span></div>
      <div className="venue">
        <span className="venue-name">{RESTAURANT.name}</span>
        <span className="venue-sub">{RESTAURANT.city}</span>
      </div>
      <nav aria-label="Main">
        {items.map((i) => (
          <button key={i.id} type="button" className={`nav-item ${view === i.id ? 'is-active' : ''}`} aria-current={view === i.id ? 'page' : undefined} onClick={() => setView(i.id)}>
            <span>{i.label}</span>
            {i.badge != null && <span className={`nav-badge ${i.badgeTone || ''}`}>{i.badge}</span>}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <span className="avatar" aria-hidden="true">GM</span>
        <span><b>{MANAGER.name}</b><br /><span className="side-role">{MANAGER.title}</span></span>
      </div>
    </aside>
  );
}

/* ---------- Payout preview ---------- */
export function Preview({ calc, base, previewing, previewLabel, flagged, approved }) {
  const rows = (group) => PEOPLE.filter((p) => p.group === group);
  const delta = (id) => (previewing ? calc.shares[id] - base.shares[id] : 0);
  const fullPct = calc.totalPool ? (calc.distributed / calc.totalPool) * 100 : 0;
  const Group = ({ g, label, total }) => (
    <>
      <tr className="grp"><th colSpan="3">{label}</th><th className="num">{fmt(total)}</th></tr>
      {rows(g).map((p) => {
        const d = delta(p.id);
        const flag = flagged && p.id === 'tomas';
        return (
          <tr key={p.id} className={`${flag ? 'flag' : ''} ${d ? 'changed' : ''}`}>
            <td className="nm">{p.name}{flag && <span className="flag-dot" title="Flagged: Kittyline’s suggested routing for Friday’s late checks would put back-of-house over its limit"><Alert /></span>}</td>
            <td className="rl">{p.role}</td>
            <td className="num hrs">{p.hours.toFixed(1)}</td>
            <td className="num amt">{d !== 0 && <span className={`dl ${d > 0 ? 'up' : 'down'}`}>{fmt(d, { sign: true })}</span>}{fmt(calc.shares[p.id])}</td>
          </tr>
        );
      })}
    </>
  );
  return (
    <aside className="preview" aria-label="Payout preview">
      <div className="preview-head">
        <h2>Payout preview</h2>
        {approved ? <Chip tone="ok"><Lock /> Locked</Chip> : previewing ? <Chip tone="brand">Previewing</Chip> : <Chip>Draft</Chip>}
      </div>
      {previewing && <p className="preview-note">{previewLabel}. Changes from the current draft are marked beside each amount.</p>}
      <div className="bal">
        <div className="bal-line"><span>Distributed</span><b>{fmt(calc.distributed)}</b><span className="muted">of {fmt(calc.totalPool)}</span></div>
        <div className="bal-bar" aria-hidden="true"><i style={{ width: `${fullPct}%` }} className={calc.unassigned ? 'short' : 'full'} /></div>
        {calc.unassigned > 0
          ? <p className="bal-note bad">{fmt(calc.unassigned)} unassigned. It balances once Friday is placed.</p>
          : <p className="bal-note good"><Check /> Balanced to the cent</p>}
      </div>
      <table className="ptable">
        <thead><tr><th>Name</th><th>Role</th><th className="num">Hrs</th><th className="num">Share</th></tr></thead>
        <tbody>
          <Group g="FOH" label="Front of house · 80%" total={calc.foh} />
          <Group g="BOH" label="Back of house · 20%" total={calc.boh} />
        </tbody>
      </table>
      <p className="excl"><b>Not in the pool:</b> {EXCLUDED.map((e) => `${e.name} (${e.role.toLowerCase()})`).join(', ')}</p>
    </aside>
  );
}

/* ---------- Article drawer ---------- */
export function Drawer({ id, onClose, onOpen, cashPooled }) {
  const art = ARTICLES.find((a) => a.id === id);
  const ref = useRef(null);
  useEffect(() => {
    if (!id) return undefined;
    const prev = document.activeElement;
    ref.current?.focus();
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [id, onClose]);
  if (!art) return null;
  const others = ARTICLES.filter((a) => a.id !== id);
  return (
    <div className="drawer-wrap">
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={art.title}>
        <div className="drawer-head">
          <span className="eyebrow">{art.kicker} · {art.minutes} min read</span>
          <button type="button" ref={ref} className="icon-btn" onClick={onClose} aria-label="Close article"><Close /></button>
        </div>
        <article className="article">
          <h2>{art.title}</h2>
          <art.Body cashPooled={cashPooled} />
        </article>
        <div className="drawer-more">
          <p className="eyebrow">More help</p>
          {others.map((o) => (
            <button key={o.id} type="button" onClick={() => onOpen(o.id)}><Book /> {o.title}</button>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ---------- Help view ---------- */
export function HelpView({ onOpen }) {
  const [q, setQ] = useState('');
  const hits = ARTICLES.filter((a) => `${a.title} ${a.summary} ${a.kicker}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="page narrow">
      <header className="page-head simple">
        <div>
          <p className="eyebrow">Help</p>
          <h1>Help articles</h1>
        </div>
      </header>
      <label className="search">
        <span className="sr">Search help articles</span>
        <input type="search" placeholder="Search, for example “shift lead” or “cash”" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="article-list">
        {hits.map((a) => (
          <button key={a.id} type="button" className="article-card" onClick={() => onOpen(a.id)}>
            <span className="eyebrow">{a.kicker} · {a.minutes} min</span>
            <span className="article-title">{a.title}</span>
            <span className="muted">{a.summary}</span>
          </button>
        ))}
        {hits.length === 0 && <p className="muted">No articles match “{q}”. Try “manager”, “late checks”, “cash” or “points”.</p>}
      </div>
    </div>
  );
}

/* ---------- Setup view ---------- */
export function SetupView({ stateOk, payrollOk, goPayoutStep }) {
  const status = (id) => (id === 'state' ? stateOk : id === 'payroll' ? payrollOk : true);
  const done = SETUP_STEPS.filter((s) => status(s.id)).length;
  return (
    <div className="page narrow">
      <header className="page-head simple">
        <div>
          <p className="eyebrow">Setup</p>
          <h1>Setup checklist</h1>
          <p className="muted">{done} of 9 steps complete. {done < 9 ? 'The open ones are finished from this week’s payout, where you can see why they matter.' : 'Nothing left to set up.'}</p>
        </div>
      </header>
      <div className="setup-bar" aria-hidden="true"><i style={{ width: `${(done / 9) * 100}%` }} /></div>
      <ol className="setup-list">
        {SETUP_STEPS.map((s, i) => {
          const ok = status(s.id);
          const target = s.id === 'state' ? 2 : s.id === 'payroll' ? 4 : null;
          return (
            <li key={s.id} className={ok ? 'ok' : 'todo'}>
              <span className="setup-mark">{ok ? <Check /> : i + 1}</span>
              <span className="setup-text"><b>{s.title}</b><span className="muted">{s.detail}</span></span>
              {!ok && target && <button type="button" className="btn small" onClick={() => goPayoutStep(target)}>Finish in weekly payout <Arrow /></button>}
              {ok && <Chip tone="ok">Done</Chip>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
