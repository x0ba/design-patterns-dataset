import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DATA, PROJECTS } from '../data';
import { COMPANY } from '../data/specs';
import { L, go, type View } from '../lib/router';
import { useStore } from '../lib/store';
import { Icon } from './ui';
import { SearchBox } from './Search';

function ProjectSwitcher() {
  const { view, lastByProject, desc } = useStore();
  const pid = view.t === 'notfound' ? 'salt-road' : view.pid;
  const p = DATA[pid].project;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', d); window.addEventListener('keydown', k);
    return () => { window.removeEventListener('mousedown', d); window.removeEventListener('keydown', k); };
  }, []);
  void desc;
  return (
    <div className="switcher" ref={ref}>
      <button className="switcher-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Current project: ${p.title}. Switch project`}>
        <span className="switcher-dot" />
        <span className="switcher-txt"><span className="switcher-eyebrow">Project</span><span className="switcher-name">{p.title}</span></span>
        <Icon name="chev-down" size={14} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">{COMPANY} · {PROJECTS.length} active projects</div>
          {PROJECTS.map((x) => {
            const last = lastByProject[x.id];
            return (
              <button key={x.id} role="menuitem" className={`menu-row ${x.id === pid ? 'on' : ''}`} style={{ ['--c' as string]: x.accent }} onClick={() => { go(last || L.overview(x.id)); setOpen(false); }}>
                <span className="menu-dot" />
                <span className="menu-main">
                  <span className="menu-name">{x.title}{x.id === pid && <em>You are here</em>}</span>
                  <span className="menu-sub">{x.format} · {x.stage}</span>
                  <span className="menu-sub">{last ? 'Resume where you left off' : 'Open project home'}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { view } = useStore();
  const pid = view.t === 'notfound' ? 'salt-road' : view.pid;
  return (
    <header className="topbar">
      <a className="brand" href={L.overview(pid)} aria-label="Reelhouse, project home">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="currentColor" /><circle cx="16" cy="16" r="8" fill="none" stroke="#fff" strokeWidth="2.5" /><circle cx="16" cy="16" r="2.5" fill="#fff" /></svg>
        <span className="brand-txt"><b>Reelhouse</b><small>{COMPANY}</small></span>
      </a>
      <ProjectSwitcher />
      <SearchBox />
      <div className="me" title="Ama Boateng · Assistant editor">
        <span className="avatar" aria-hidden="true">AB</span>
        <span className="me-txt"><b>Ama Boateng</b><small>Assistant editor</small></span>
      </div>
    </header>
  );
}

export function Sidebar() {
  const { view, recents, shortcuts, removeShortcut, desc } = useStore();
  const pid = view.t === 'notfound' ? 'salt-road' : view.pid;
  const d = DATA[pid];
  const p = d.project;
  const pending = d.items.filter((i) => i.clearance.status === 'pending').length;
  const section = view.t === 'notfound' ? '' : view.t;
  const is = (...ts: string[]) => ts.includes(section);
  const nav: { label: string; href: string; icon: string; on: boolean; count?: string; warn?: string }[] = [
    { label: 'Overview', href: L.overview(pid), icon: 'home', on: is('overview') },
    { label: `${p.unit}s & scenes`, href: L.reels(pid), icon: 'reel', on: is('reels', 'reel', 'scene'), count: `${d.reels.length}` },
    { label: 'Clips', href: L.clips(pid), icon: 'clip', on: is('clips', 'clip'), count: d.clips.length.toLocaleString('en-US') },
    { label: 'Archive & clearances', href: L.archive(pid), icon: 'archive', on: is('archive', 'item'), count: `${d.items.length}`, warn: pending ? `${pending} pending` : undefined },
    { label: 'Transcripts', href: L.transcripts(pid), icon: 'mic', on: is('transcripts', 'transcript'), count: `${d.transcripts.length}` },
  ];
  return (
    <nav className="sidebar" aria-label="Project navigation">
      <div className="side-project">
        <span className="side-badge" aria-hidden="true">{p.title[0]}</span>
        <div><b>{p.title}</b><small>{p.format.split(' · ')[0].replace(' documentary', '')} · {p.stage}</small></div>
      </div>
      <ul className="side-nav">
        {nav.map((n) => (
          <li key={n.label}>
            <a href={n.href} className={n.on ? 'on' : ''} aria-current={n.on ? 'page' : undefined}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.warn ? <span className="count warn" title={`${n.warn} clearances`}>{pending}</span> : n.count ? <span className="count">{n.count}</span> : null}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="side-h"><Icon name="star" size={13} /> Shortcuts</h2>
      <ul className="side-list">
        {shortcuts.map((s) => (
          <li key={s.key} className="side-item">
            <a href={s.href} className={desc?.key === s.key ? 'on' : ''}>
              <span className="proj-dot" style={{ background: DATA[s.pid].project.accent }} title={DATA[s.pid].project.title} />
              <span className="si-main"><span className="si-label">{s.label}</span><span className="si-sub">{DATA[s.pid].project.title}</span></span>
            </a>
            <button className="si-x" aria-label={`Remove shortcut ${s.label}`} onClick={() => removeShortcut(s.key)}><Icon name="x" size={12} /></button>
          </li>
        ))}
        {shortcuts.length === 0 && <li className="side-empty">Use “Save shortcut” on any page to pin it here.</li>}
      </ul>

      <h2 className="side-h"><Icon name="history" size={13} /> Recent</h2>
      <ul className="side-list">
        {recents.map((r) => {
          const here = desc?.key === r.key;
          return (
            <li key={r.key} className="side-item">
              <a href={r.href} className={here ? 'on' : ''} aria-current={here ? 'location' : undefined}>
                <span className="proj-dot" style={{ background: DATA[r.pid].project.accent }} title={DATA[r.pid].project.title} />
                <span className="si-main">
                  <span className="si-label">{r.label}</span>
                  <span className="si-sub">{DATA[r.pid].project.title} · {here ? 'You are here' : r.when}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function crumbs(view: View): { label: string; href?: string }[] {
  if (view.t === 'notfound') return [];
  const d = DATA[view.pid];
  if (!d) return [];
  const p = d.project;
  const root = { label: p.title, href: L.overview(view.pid) };
  switch (view.t) {
    case 'overview': return [{ label: p.title }];
    case 'reels': return [root, { label: `${p.unit}s & scenes` }];
    case 'reel': return [root, { label: `${p.unit}s & scenes`, href: L.reels(view.pid) }, { label: `${p.unit} ${view.n} · ${d.reels[view.n - 1]?.title ?? ''}` }];
    case 'scene': {
      const s = d.scenes.find((x) => x.n === view.n);
      return [root, { label: `${p.unit} ${s?.reel} · ${d.reels[(s?.reel ?? 1) - 1]?.title}`, href: s ? L.reel(view.pid, s.reel) : undefined }, { label: `Scene ${view.n}` }];
    }
    case 'archive': {
      const src = d.sources.find((x) => x.id === view.q.get('source'));
      return src ? [root, { label: 'Archive & clearances', href: L.archive(view.pid) }, { label: src.name }] : [root, { label: 'Archive & clearances' }];
    }
    case 'item': {
      const it = d.items.find((x) => x.id === view.id);
      const src = d.sources.find((x) => x.id === it?.sourceId);
      return [root, { label: 'Archive & clearances', href: L.archive(view.pid) }, ...(src ? [{ label: src.name, href: L.archive(view.pid, { source: src.id }) }] : []), { label: view.id }];
    }
    case 'clips': return [root, { label: 'Clips' }];
    case 'clip': return [root, { label: 'Clips', href: L.clips(view.pid) }, { label: view.id }];
    case 'transcripts': return [root, { label: 'Transcripts' }];
    case 'transcript': return [root, { label: 'Transcripts', href: L.transcripts(view.pid) }, { label: d.transcripts.find((x) => x.id === view.id)?.name ?? view.id }];
  }
}

export function Crumbs() {
  const { view, isPinned, togglePin, desc } = useStore();
  const cs = crumbs(view);
  const p = view.t === 'notfound' ? null : DATA[view.pid]?.project;
  return (
    <div className="crumbbar">
      <nav aria-label="Where you are" className="crumbs">
        {cs.map((c, i) => (
          <span key={i} className="crumb">
            {i > 0 && <Icon name="chev-right" size={12} className="crumb-sep" />}
            {i === 0 && p && <span className="crumb-dot" style={{ background: p.accent }} />}
            {c.href && i < cs.length - 1 ? <a href={c.href}>{c.label}</a> : <span aria-current={i === cs.length - 1 ? 'page' : undefined} className={i === cs.length - 1 ? 'cur' : ''}>{c.label}</span>}
          </span>
        ))}
      </nav>
      {desc ? (
        <button className={`pin ${isPinned ? 'on' : ''}`} onClick={togglePin} aria-pressed={isPinned}>
          <Icon name={isPinned ? 'star-fill' : 'star'} size={14} /> {isPinned ? 'Saved to shortcuts' : 'Save shortcut'}
        </button>
      ) : null}
    </div>
  );
}

export function PathBar() {
  const { trail, desc } = useStore();
  if (trail.length < 2 || !desc) return null;
  const prev = trail[trail.length - 2];
  const multi = new Set(trail.map((t) => t.pid)).size > 1;
  const pname = (pid: string) => DATA[pid].project.title;
  return (
    <div className="pathbar" aria-label="Your path through the project">
      <a className="path-back" href={prev.href}><Icon name="arrow-left" size={14} /> Back to <b>{prev.short}</b>{prev.pid !== desc.pid && <span className="path-proj"> in {pname(prev.pid)}</span>}</a>
      <span className="path-sep" />
      <span className="path-label">Your path</span>
      <ol className="path-list">
        {trail.map((t, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={t.key}>
              {multi && <span className="proj-dot path-dot" style={{ background: DATA[t.pid].project.accent }} title={pname(t.pid)} />}
              {last ? <span className="path-cur" aria-current="location">{t.short}</span> : <a href={t.href}>{t.short}</a>}
              {!last && <Icon name="chev-right" size={11} className="path-arrow" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Toast() {
  const { toast } = useStore();
  return <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>;
}

export function Main({ children }: { children: ReactNode }) {
  const { hash } = useStore();
  const ref = useRef<HTMLElement>(null);
  const path = hash.split('?')[0];
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [path]);
  return (
    <main className="main" ref={ref} id="main" tabIndex={-1}>
      <div className="locbar"><Crumbs /><PathBar /></div>
      <div className="page" key={path}>{children}</div>
    </main>
  );
}
