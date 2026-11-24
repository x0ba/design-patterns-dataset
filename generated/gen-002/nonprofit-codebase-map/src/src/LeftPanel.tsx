import { useEffect, useMemo, useRef, useState } from 'react';
import {
  mods, issues, people, modsBy, lastActivity, fmtDate, fmtMonth, fmtShort, ago, daysAgo, edgeBetween, hopsFrom, serviceById, personByName, mod,
  type Trail, type Mod,
} from './data';
import { Avatar, CovBar, Icon, PathText, ServiceDot } from './ui';

export type Tab = 'trail' | 'issues' | 'people';

function ModuleCombo({ label, value, onChange, placeholder }: { label: string; value: number | null; onChange: (id: number) => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? mods.filter((m) => m.path.toLowerCase().includes(s)) : []).sort((a, b) => a.path.length - b.path.length).slice(0, 6);
  }, [q]);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setEditing(false); setQ(''); } };
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f);
  }, []);
  const m = value !== null ? mods[value] : null;
  return (
    <div className="combo" ref={ref}>
      <label className="combo-label">{label}</label>
      {!editing && m ? (
        <button className="combo-val" onClick={() => { setEditing(true); setOpen(true); }} title="Change">
          <ServiceDot id={m.service} /><span className="combo-text"><b className="mono">{m.name}</b><span className="mono dim">{m.dir}/</span></span>
        </button>
      ) : (
        <input autoFocus={editing} className="combo-input" placeholder={placeholder} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) { onChange(hits[0].i); setEditing(false); setOpen(false); setQ(''); } if (e.key === 'Escape') { setEditing(false); setOpen(false); setQ(''); } }} />
      )}
      {open && hits.length > 0 && (
        <div className="popover combo-pop">
          {hits.map((h) => (
            <button key={h.i} className="hit" onClick={() => { onChange(h.i); setEditing(false); setOpen(false); setQ(''); }}>
              <ServiceDot id={h.service} /><span className="hit-main mono">{h.path}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TrailTab(p: {
  from: number | null; to: number | null; trail: Trail | null; selected: number | null;
  setFrom: (i: number) => void; setTo: (i: number) => void; swap: () => void; clear: () => void; fit: () => void; choose: (i: number) => void;
}) {
  const { trail } = p;
  const noPath = p.from !== null && p.to !== null && !trail;
  const svcs = trail ? trail.ids.map((i) => mods[i].service).filter((s, k, a) => k === 0 || a[k - 1] !== s) : [];
  return (
    <div className="tab-body">
      <p className="hint">Follow calls from one module to another. Pick two, or use “Trace from/to here” on any module.</p>
      <div className="trail-ends">
        <div className="trail-fields">
          <ModuleCombo label="From" value={p.from} onChange={p.setFrom} placeholder="Type a file name…" />
          <ModuleCombo label="To" value={p.to} onChange={p.setTo} placeholder="Type a file name…" />
        </div>
        <button className="icon-btn swap" onClick={p.swap} aria-label="Swap start and end" title="Swap start and end">{Icon.swap}</button>
      </div>

      {!trail && !noPath && <div className="empty-note">No trail yet. Choose a start and an end above.</div>}
      {noPath && <div className="empty-note">These two modules aren’t connected through any chain of calls.</div>}
      {trail && (
        <>
          <div className="trail-summary">
            <b>{trail.ids.length - 1} hops</b>
            <span>{svcs.length > 1 ? 'crossing ' + svcs.map((s) => serviceById[s].name).join(' → ') : 'inside ' + serviceById[svcs[0]].name}</span>
            {!trail.forward && <span className="warn-note">No call runs this direction; showing the nearest link in either direction.</span>}
          </div>
          <ol className="steps">
            {trail.ids.map((id, k) => {
              const m = mods[id];
              const e = k > 0 ? trail.edges[k - 1] : null;
              const real = e ? edgeBetween(e.s, e.t) : null;
              const isEnd = k === 0 || k === trail.ids.length - 1;
              return (
                <li key={id}>
                  {e && real && (
                    <div className={'connector' + (real.http ? ' http' : '')}>
                      <span className="conn-line" />
                      <span className="conn-text">{e.forward ? '' : 'called by · '}{real.http ? 'HTTP request' : 'imports'} · {real.w} call site{real.w === 1 ? '' : 's'}</span>
                    </div>
                  )}
                  <button className={'step' + (p.selected === id ? ' on' : '')} onClick={() => p.choose(id)}>
                    <span className={'step-n' + (isEnd ? ' end' : '')}>{k + 1}</span>
                    <span className="step-main">
                      <span className="step-name mono">{m.name}</span>
                      <span className="step-dir mono">{m.dir}/</span>
                      <span className="step-who"><span className={'who-name'}>{m.by}</span> · {fmtMonth(m.mod)}</span>
                    </span>
                    <span className="step-side"><CovBar value={m.cov} /><span className="step-lines">{m.lines.toLocaleString()} lines</span></span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="row-actions">
            <button className="btn" onClick={p.fit}>Fit trail on map</button>
            <button className="btn ghost" onClick={p.clear}>Clear trail</button>
          </div>
        </>
      )}
    </div>
  );
}

export function IssuesTab({ selected, choose }: { selected: number | null; choose: (module: number) => void }) {
  const near = useMemo(() => (selected !== null ? hopsFrom(selected, 2) : null), [selected]);
  return (
    <div className="tab-body">
      <p className="hint">Each open issue is pinned to the module a volunteer thought it belongs to.</p>
      <ul className="issue-list">
        {issues.map((is) => {
          const m = mods[is.module];
          const h = near?.get(is.module);
          return (
            <li key={is.n}>
              <button className={'issue' + (selected === is.module ? ' on' : '')} onClick={() => choose(is.module)}>
                <span className="issue-top"><b className="issue-n">#{is.n}</b><span className="issue-title">{is.title}</span></span>
                <span className="issue-sub"><span className="mono">{m.dir}/<b>{m.name}</b></span></span>
                <span className="issue-meta">
                  Opened {fmtShort(is.opened)}{is.opened.slice(0, 4) !== '2026' ? ', ' + is.opened.slice(0, 4) : ''} · {ago(is.opened)}
                  {h !== undefined && h > 0 && selected !== null && <span className="near-chip">{h === 1 ? 'next to' : '2 hops from'} {mods[selected].name}</span>}
                  {h === 0 && <span className="near-chip">pinned here</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PeopleTab({ filter, setFilter, choose }: { filter: string | null; setFilter: (n: string | null) => void; choose: (id: number) => void }) {
  const [openFormer, setOpenFormer] = useState(false);
  const act = people.filter((p) => p.active);
  const former = people.filter((p) => !p.active);
  const row = (name: string) => {
    const p = personByName[name];
    const ms = modsBy(name);
    const last = lastActivity(name);
    const on = filter === name;
    return (
      <li key={name}>
        <button className={'person' + (on ? ' on' : '')} onClick={() => setFilter(on ? null : name)} aria-pressed={on}>
          <Avatar name={name} size={32} />
          <span className="person-main">
            <span className="person-name">{p.full}{name === 'Wen L.' && <span className="you">you</span>}{p.role && name !== 'Wen L.' && <span className="role">{p.role}</span>}</span>
            <span className="person-sub">
              {ms.length > 0 ? `Last touched ${ms.length} modules · most recent ${fmtShort(last!)}${last!.slice(0, 4) !== '2026' ? ', ' + last!.slice(0, 4) : ''}` : `Joined ${fmtShort(p.joined)} · hasn’t changed code yet`}
            </span>
          </span>
        </button>
      </li>
    );
  };
  return (
    <div className="tab-body">
      <p className="hint">Pick a volunteer to light up the modules they changed most recently.</p>
      <h4 className="list-h">Active · {act.length}</h4>
      <ul className="people">{act.map((p) => row(p.name))}</ul>
      <button className="list-h toggle" onClick={() => setOpenFormer((v) => !v)} aria-expanded={openFormer}>Former volunteers · {former.length}<span className={'chev' + (openFormer ? ' open' : '')}>{Icon.chevron}</span></button>
      {openFormer && <ul className="people">{former.map((p) => row(p.name))}</ul>}
    </div>
  );
}
