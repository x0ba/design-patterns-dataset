import { useEffect, useMemo, useRef, useState } from 'react';
import { COURSE, DATASETS, MODULES, READINGS, STUDENT, WEEKS, PEER_DRAFTS, DECKS, LECTURE5, BIKE_VERSIONS } from '../data/course';
import { AppState, CRITIQUE_DUE, Route, countdown, critiqueProgress, fmtClock, navigate, useNow, useStore } from '../store';
import { Icon } from './Icon';

export function week5Items(state: AppState) {
  return [
    { id: 'lecture-5', label: 'Lecture 5 recording', sub: '74 min · PS4 walkthrough at 58:05', path: '/lecture/5', kind: 'Recording' },
    { id: 'deck-5b', label: 'Slides: PS4 walkthrough — bike counts v3', sub: '12 slides · 2.1 MB', path: '/slides/b', kind: 'Slides' },
    { id: 'deck-5a', label: 'Slides: L5 — Comparison by design', sub: '20 slides · 6.2 MB', path: '/slides/a', kind: 'Slides' },
    { id: 'r13', label: 'Javed, McDonnel & Elmqvist (2010)', sub: 'Graphical Perception of Multiple Time Series · required for PS4', path: '/readings/r13', kind: 'Reading' },
    { id: 'r14', label: 'Talbot, Setlur & Anand (2014)', sub: 'Four Experiments on the Perception of Bar Charts · required', path: '/readings/r14', kind: 'Reading' },
    { id: 'sd-bike-counts@3', label: 'San Diego bike counts — v3', sub: 'Dataset introduced this week · the PS4 version', path: '/datasets/sd-bike-counts?v=3', kind: 'Dataset' },
    { id: 'section-5', label: 'Section B04 notes, week 5', sub: 'Priya’s worksheet and notes from Thu Nov 12', path: '/section?week=5', kind: 'Section' },
    { id: 'r15', label: 'Kosara & Skau (2016)', sub: 'Judgment Error in Pie Chart Variations · optional', path: '/readings/r15', kind: 'Reading', optional: true },
  ].map((it) => ({ ...it, done: !!state.opened[it.id] }));
}

export function labelFor(r: Route): string {
  const [a, b] = r.parts;
  switch (a) {
    case 'week': return 'This week';
    case 'weeks': return b ? `Week ${b}` : 'Weeks & modules';
    case 'readings': {
      const rd = READINGS.find((x) => x.id === b);
      return rd ? `${rd.authors.split(',')[0]} ${rd.year}` : 'Readings';
    }
    case 'datasets': {
      const d = DATASETS.find((x) => x.id === b);
      if (!d) return 'Datasets';
      const v = r.query.get('v');
      return d.id === 'sd-bike-counts' ? `Bike counts${v ? ' v' + v : ''}` : d.name.split(',')[0];
    }
    case 'ps': return b ? `PS${b} brief` : 'Problem sets';
    case 'draft': return 'My PS4 draft';
    case 'critique': return b ? `Critique #${b}` : 'Critique Round 3';
    case 'lecture': return `Lecture ${b}`;
    case 'slides': return b === 'b' ? 'PS4 walkthrough slides' : 'L5 slides';
    case 'section': return 'Section B04';
    default: return 'Plotyard';
  }
}

function NavItem({ to, active, icon, label, badge, badgeTone }: { to: string; active: boolean; icon: string; label: string; badge?: string | number; badgeTone?: 'alert' | 'muted' | 'warn' }) {
  return (
    <a href={'#' + to} className={'nav-item' + (active ? ' active' : '')}>
      <Icon name={icon} />
      <span>{label}</span>
      {badge !== undefined && <span className={'nav-badge ' + (badgeTone || 'muted')}>{badge}</span>}
    </a>
  );
}

export function Sidebar({ route }: { route: Route }) {
  const { state, reset } = useStore();
  const a = route.parts[0];
  const pendingCritiques = PEER_DRAFTS.filter((d) => !state.critiques[d.id]?.submittedAt).length;
  const w5left = week5Items(state).filter((i) => !i.done && !i.optional).length;
  const [weeksOpen, setWeeksOpen] = useState(true);
  return (
    <aside className="sidebar">
      <a className="brand" href="#/week">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="7" fill="#1f5f5b" /><rect x="7" y="17" width="4" height="8" fill="#fff" /><rect x="14" y="11" width="4" height="14" fill="#fff" /><circle cx="23" cy="9" r="3" fill="#f2b84b" /></svg>
        <span>Plotyard</span>
      </a>
      <div className="course-chip">
        <div className="course-code">{COURSE.code} · {COURSE.term}</div>
        <div className="course-title">{COURSE.title}</div>
      </div>
      <nav>
        <NavItem to="/week" active={a === 'week'} icon="home" label="This week" badge="Wk 6" />
        <NavItem to="/ps" active={a === 'ps' || a === 'draft'} icon="clipboard" label="Problem sets" badge="PS4 Thu" badgeTone="warn" />
        <NavItem to="/critique" active={a === 'critique'} icon="chat" label="Critique rounds" badge={pendingCritiques ? `${pendingCritiques} tonight` : '✓'} badgeTone={pendingCritiques ? 'alert' : 'muted'} />
        <NavItem to="/readings" active={a === 'readings'} icon="book" label="Readings" badge={READINGS.length} />
        <NavItem to="/datasets" active={a === 'datasets'} icon="table" label="Datasets" badge={DATASETS.length} />
        <NavItem to="/section" active={a === 'section'} icon="users" label="Section B04" />
      </nav>
      <div className="nav-group">
        <button className="nav-group-head" onClick={() => setWeeksOpen(!weeksOpen)}>
          <span>Weeks</span>
          <a href="#/weeks" onClick={(e) => e.stopPropagation()} className="nav-group-link">All modules</a>
          <Icon name={weeksOpen ? 'chev-up' : 'chev-down'} />
        </button>
        {weeksOpen && MODULES.map((mod) => (
          <div key={mod.id} className="nav-module">
            <div className="nav-module-name"><span className="dot" style={{ background: mod.color }} />{mod.name}</div>
            {mod.weeks.map((n) => {
              const w = WEEKS[n - 1];
              const activeW = (a === 'weeks' && route.parts[1] === String(n)) || (n === 5 && (a === 'lecture' || a === 'slides'));
              return (
                <a key={n} href={`#/weeks/${n}`} className={'nav-week' + (activeW ? ' active' : '') + (w.status === 'current' ? ' current' : '') + (w.status === 'future' ? ' future' : '')}>
                  <span className="wk-n">{n}</span>
                  <span className="wk-t">{w.title}</span>
                  {w.missed && w5left > 0 && <span className="nav-badge warn" title={`${w5left} items you haven’t opened`}>{w5left} new</span>}
                  {w.status === 'current' && <span className="now-pip">now</span>}
                </a>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <div className="avatar">{STUDENT.initials}</div>
        <div>
          <div className="who">{STUDENT.name}</div>
          <div className="who-sub">Section {STUDENT.section} · Priya V.</div>
        </div>
        <button className="reset-link" onClick={reset} title="Reset this demo to its starting state">Reset</button>
      </div>
    </aside>
  );
}

export function Topbar({ onSearch }: { onSearch: () => void }) {
  const now = useNow(5000);
  const { state } = useStore();
  const prog = PEER_DRAFTS.map((d) => critiqueProgress(state.critiques[d.id]));
  const allSubmitted = PEER_DRAFTS.every((d) => state.critiques[d.id]?.submittedAt);
  const crit = prog.reduce((a, p) => a + p.done, 0);
  return (
    <header className="topbar">
      <button className="search-btn" onClick={onSearch}>
        <Icon name="search" />
        <span>Search readings, datasets, weeks…</span>
        <kbd>⌘K</kbd>
      </button>
      <div className="topbar-right">
        <a href="#/critique" className={'due-chip ' + (allSubmitted ? 'ok' : 'urgent')}>
          <Icon name={allSubmitted ? 'check' : 'clock'} />
          <span><b>Critique Round 3</b> {allSubmitted ? 'submitted' : <>· due tonight · <b>{countdown(CRITIQUE_DUE, now)}</b> left · {crit}/8 done</>}</span>
        </a>
        <a href="#/ps/4" className="due-chip">
          <Icon name="calendar" />
          <span><b>PS4</b> · due Thu 11:59pm</span>
        </a>
        <div className="clock" title="Pacific Time">
          <div className="clock-day">Tue Nov 17 · Wk 6</div>
          <div className="clock-time mono">{fmtClock(now)}</div>
        </div>
      </div>
    </header>
  );
}

export function TrailBar({ route }: { route: Route }) {
  const { state } = useStore();
  const here = route.path + (route.query.toString() ? '?' + route.query.toString() : '');
  const onDraft = route.parts[0] === 'draft';
  const trail = state.trail.slice(-6);
  const d = state.draft;
  const active = d.attempts.find((x) => x.id === d.active);
  return (
    <div className="trailbar">
      <span className="trail-label"><Icon name="route" /> Your path</span>
      <ol className="trail">
        {trail.map((t, i) => {
          const cur = t.path === here;
          return (
            <li key={t.path + i} className={cur ? 'cur' : ''}>
              {i > 0 && <span className="sep">›</span>}
              {cur ? <span>{t.label}</span> : <a href={'#' + t.path}>{t.label}</a>}
            </li>
          );
        })}
      </ol>
      {!onDraft && (
        <a className="resume" href="#/draft/ps4">
          <Icon name="bookmark" />
          <span>
            <b>Back to my PS4 draft</b>
            <small>{active ? `${active.title}` : d.leftOff}</small>
          </span>
          <Icon name="arrow-right" />
        </a>
      )}
      {onDraft && <a className="resume ghost" href="#/ps/4"><Icon name="doc" /><span><b>PS4 brief</b><small>Tasks, rubric, materials</small></span></a>}
    </div>
  );
}

// -------------- Command palette ---------------
interface Hit { label: string; sub: string; path: string; group: string; kw: string }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { state } = useStore();
  const index = useMemo<Hit[]>(() => {
    const out: Hit[] = [];
    WEEKS.forEach((w) => out.push({ group: 'Weeks', label: `Week ${w.n} · ${w.title}`, sub: `${MODULES.find((m) => m.id === w.module)!.name} module · ${w.dates}${w.missed ? ' · you were out' : ''}`, path: `/weeks/${w.n}`, kw: `week ${w.n} wk${w.n} ${w.module} ${w.title}` }));
    out.push({ group: 'Week 5', label: 'Lecture 5 recording — Comparison by design', sub: '74 min · Tue Nov 10 · PS4 walkthrough at 58:05', path: '/lecture/5', kw: 'lecture 5 recording video comparison week 5 ps4 walkthrough' });
    LECTURE5.chapters.forEach((c) => out.push({ group: 'Week 5', label: `Lecture 5 @ ${Math.floor(c.t / 60)}:${String(c.t % 60).padStart(2, '0')} — ${c.title}`, sub: 'Jump into the recording', path: `/lecture/5?t=${c.t}`, kw: `lecture 5 ${c.title} chapter` }));
    Object.entries(DECKS).forEach(([k, d]) => out.push({ group: 'Week 5', label: `Slides: ${d.title}`, sub: `${d.slides.length} slides · ${d.file}`, path: `/slides/${k}`, kw: `slides deck week 5 ${d.title}` }));
    READINGS.forEach((r) => out.push({ group: 'Readings', label: `${r.authors.split(',')[0]} (${r.year}) — ${r.title}`, sub: `Week ${r.week} · ${r.required ? 'required' : 'optional'}${r.usedIn ? ' · used in ' + r.usedIn : ''}${state.opened[r.id] ? '' : ' · not opened'}`, path: `/readings/${r.id}`, kw: `${r.authors} ${r.title} ${r.year} week ${r.week} reading ${r.usedIn || ''}` }));
    DATASETS.forEach((d) => out.push({ group: 'Datasets', label: d.name, sub: `Introduced week ${d.week} · ${d.grain}${d.usedIn ? ' · ' + d.usedIn.join(', ') : ''}`, path: `/datasets/${d.id}`, kw: `${d.name} dataset data ${d.usedIn?.join(' ') || ''} week ${d.week}` }));
    BIKE_VERSIONS.forEach((v) => out.push({ group: 'Datasets', label: `San Diego bike counts — v${v.v}${v.v === 3 ? '  (PS4 version)' : v.v === 6 ? '  (latest)' : ''}`, sub: `${v.date} · ${v.range} · ${v.rows} rows`, path: `/datasets/sd-bike-counts?v=${v.v}`, kw: `bike counts v${v.v} version ${v.v} ${v.v === 3 ? 'ps4' : ''}` }));
    out.push({ group: 'Work', label: 'PS4 brief — Encoding comparisons', sub: 'Due Thu Nov 19, 11:59pm', path: '/ps/4', kw: 'ps4 problem set 4 brief encoding comparisons rubric' });
    out.push({ group: 'Work', label: 'My PS4 draft', sub: `${state.draft.attempts.length} chart attempts`, path: '/draft/ps4', kw: 'ps4 draft my chart attempts writeup' });
    out.push({ group: 'Work', label: 'Critique Round 3', sub: 'Due tonight 11:59pm', path: '/critique', kw: 'critique round 3 peer review' });
    PEER_DRAFTS.forEach((p) => out.push({ group: 'Work', label: `Critique draft #${p.id} by ${p.author}`, sub: 'Round 3 · due tonight', path: `/critique/${p.id}`, kw: `critique ${p.id} ${p.author} peer draft` }));
    out.push({ group: 'People', label: 'Section B04 — Priya Venkataraman', sub: 'Thu 2:00–2:50pm · Center Hall 216', path: '/section', kw: 'section b04 ta priya office hours' });
    return out;
  }, [state]);

  const hits = useMemo(() => {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) {
      return index.filter((h) => ['/weeks/5', '/lecture/5', '/readings/r13', '/datasets/sd-bike-counts?v=3', '/critique/A-0817', '/critique/A-0952', '/draft/ps4'].includes(h.path));
    }
    return index.filter((h) => {
      const hay = (h.label + ' ' + h.sub + ' ' + h.kw).toLowerCase();
      return toks.every((t) => hay.includes(t));
    }).slice(0, 14);
  }, [q, index]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);
  if (!open) return null;
  const go = (h: Hit) => {
    navigate(h.path);
    onClose();
  };
  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" />
          <input ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “week 5”, “javed”, “bike v3”, “A-0952”"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
              if (e.key === 'Escape') onClose();
            }} />
          <kbd>esc</kbd>
        </div>
        {!q && <div className="palette-hint">Suggested for PS4 and tonight’s critique</div>}
        <ul className="palette-list">
          {hits.map((h, i) => (
            <li key={h.path + h.label} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => go(h)}>
              <span className="pg">{h.group}</span>
              <span className="pl">{h.label}</span>
              <span className="ps">{h.sub}</span>
            </li>
          ))}
          {!hits.length && <li className="empty">No matches. Try a week number, author, or dataset name.</li>}
        </ul>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className="toast"><Icon name="check" />{t.msg}</div>)}
    </div>
  );
}

export function LivesIn({ week, kind }: { week: number; kind: string }) {
  const w = WEEKS[week - 1];
  const mod = MODULES.find((m) => m.id === w.module)!;
  return (
    <span className="lives-in">
      <span className="dot" style={{ background: mod.color }} />
      <a href={`#/weeks`}>{mod.name}</a><span className="sep">›</span>
      <a href={`#/weeks/${week}`}>Week {week}</a><span className="sep">›</span>
      <span>{kind}</span>
    </span>
  );
}
