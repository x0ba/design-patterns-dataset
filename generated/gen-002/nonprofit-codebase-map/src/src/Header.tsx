import { useEffect, useMemo, useRef, useState } from 'react';
import { mods, issues, people, repo, services, serviceAvgCov, fmtNum, fmtDate, edges, modsBy, lastActivity, type Mod } from './data';
import { Cairn, Icon, ServiceDot, ServiceTag } from './ui';

export type SearchHit =
  | { kind: 'module'; m: Mod }
  | { kind: 'issue'; n: number; title: string; module: number; path: string }
  | { kind: 'person'; name: string; count: number };

function Hilite({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export default function Header({ onPick, onOpenRepo, repoOpen }: { onPick: (h: SearchHit) => void; onOpenRepo: (v: boolean) => void; repoOpen: boolean }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const hits = useMemo<SearchHit[]>(() => {
    const s = q.trim().toLowerCase().replace(/^#/, '');
    if (!s) return [];
    const out: SearchHit[] = [];
    const ms = mods.filter((m) => m.path.toLowerCase().includes(s))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(s)) - Number(a.name.toLowerCase().startsWith(s)) || Number(b.name.toLowerCase().includes(s)) - Number(a.name.toLowerCase().includes(s)) || a.path.length - b.path.length);
    const is = issues.filter((i) => String(i.n).includes(s) || i.title.toLowerCase().includes(s));
    const ps = people.filter((p) => p.name.toLowerCase().includes(s) || p.full.toLowerCase().includes(s));
    is.slice(0, 3).forEach((i) => out.push({ kind: 'issue', n: i.n, title: i.title, module: i.module, path: i.path }));
    ps.slice(0, 2).forEach((p) => out.push({ kind: 'person', name: p.name, count: modsBy(p.name).length }));
    ms.slice(0, 7).forEach((m) => out.push({ kind: 'module', m }));
    return out;
  }, [q]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); inputRef.current?.focus(); }
    };
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDoc);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDoc); };
  }, []);

  const choose = (h: SearchHit) => { onPick(h); setOpen(false); setQ(''); inputRef.current?.blur(); };

  const totalLines = mods.reduce((a, m) => a + m.lines, 0);
  return (
    <header className="topbar">
      <div className="brand">
        <Cairn />
        <span className="wordmark">Codecairn</span>
      </div>
      <div className="repo-wrap">
        <button className={'repo-btn' + (repoOpen ? ' on' : '')} onClick={() => onOpenRepo(!repoOpen)} aria-expanded={repoOpen} aria-haspopup="dialog">
          <span className="repo-name">{repo.name}</span>
          <span className="repo-meta">{mods.length} modules · {edges.length} links</span>
          {Icon.chevron}
        </button>
        {repoOpen && (
          <div className="popover repo-pop" role="dialog" aria-label="Repository overview">
            <div className="pop-head"><strong>{repo.org}</strong><span className="muted">Map built from main · {fmtDate(repo.snapshot)}</span></div>
            <div className="svc-rows">
              {services.map((s) => {
                const ms = mods.filter((m) => m.service === s.id);
                const lines = ms.reduce((a, m) => a + m.lines, 0);
                return (
                  <div className="svc-row" key={s.id}>
                    <ServiceTag id={s.id} />
                    <span className="svc-row-blurb">{s.blurb}</span>
                    <span className="svc-row-stats">{ms.length} modules · {fmtNum(lines)} lines · {serviceAvgCov(s.id)}% avg coverage</span>
                  </div>
                );
              })}
            </div>
            <dl className="repo-facts">
              <div><dt>Open issues pinned to code</dt><dd>{issues.length}</dd></div>
              <div><dt>Active volunteers</dt><dd>{repo.activeVolunteers}</dd></div>
              <div><dt>Total size</dt><dd>{fmtNum(totalLines)} lines</dd></div>
              <div><dt>Hosting</dt><dd>{repo.hosting}</dd></div>
            </dl>
          </div>
        )}
      </div>

      <div className="search" ref={boxRef}>
        <span className="search-icon">{Icon.search}</span>
        <input ref={inputRef} value={q} placeholder="Find a module, issue (#212) or volunteer" aria-label="Search the map"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(hits.length - 1, i + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
            else if (e.key === 'Enter' && hits[idx]) choose(hits[idx]);
            else if (e.key === 'Escape') { setOpen(false); setQ(''); inputRef.current?.blur(); }
          }} />
        <kbd className="kbd">/</kbd>
        {open && q.trim() && (
          <div className="popover results" role="listbox">
            {hits.length === 0 && <div className="no-hit">Nothing matches “{q}”. Try a file name like <code>tz</code> or a volunteer’s first name.</div>}
            {hits.map((h, i) => (
              <button key={i} role="option" aria-selected={i === idx} className={'hit' + (i === idx ? ' on' : '')} onMouseEnter={() => setIdx(i)} onClick={() => choose(h)}>
                {h.kind === 'module' && <>
                  <ServiceDot id={h.m.service} />
                  <span className="hit-main"><span className="mono"><Hilite text={h.m.path} q={q.trim()} /></span></span>
                  <span className="hit-side">{h.m.cov}% tested</span>
                </>}
                {h.kind === 'issue' && <>
                  <span className="hit-ico">{Icon.pin}</span>
                  <span className="hit-main"><b>#{h.n}</b> {h.title}<span className="hit-sub mono">{h.path}</span></span>
                  <span className="hit-side">issue</span>
                </>}
                {h.kind === 'person' && <>
                  <span className="hit-ico hit-person">{h.name[0]}</span>
                  <span className="hit-main">{h.name}<span className="hit-sub">last touched {h.count} modules</span></span>
                  <span className="hit-side">volunteer</span>
                </>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="who">
        <div className="who-text"><b>Wen Liu</b><span>Week 2 · volunteer dev</span></div>
        <span className="avatar who-av" style={{ background: '#56B4E9', color: '#fff' }}>W</span>
      </div>
    </header>
  );
}
