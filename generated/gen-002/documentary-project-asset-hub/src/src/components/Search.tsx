import { useEffect, useMemo, useRef, useState } from 'react';
import { DATA, PROJECTS } from '../data';
import { L, go } from '../lib/router';
import { useStore } from '../lib/store';
import { Icon, Kbd } from './ui';
import { tc } from '../lib/util';

interface Entry { group: string; label: string; sub: string; href: string; pid: string; hay: string; icon: string; w: number; id?: string }

let INDEX: Entry[] | null = null;
function buildIndex() {
  if (INDEX) return INDEX;
  const out: Entry[] = [];
  for (const p of PROJECTS) {
    const d = DATA[p.id];
    d.reels.forEach((r) => out.push({ group: 'Scenes & reels', label: `${p.unit} ${r.n} · ${r.title}`, sub: `${r.sceneNums.length} scenes`, href: L.reel(p.id, r.n), pid: p.id, hay: `${p.unit} ${r.n} ${r.title}`.toLowerCase(), icon: 'reel', w: 3 }));
    d.scenes.forEach((s) => out.push({ group: 'Scenes & reels', label: `Scene ${s.n} · ${s.title}`, sub: `${p.unit} ${s.reel}`, href: L.scene(p.id, s.n), pid: p.id, hay: `scene ${s.n} ${s.title} ${p.unit} ${s.reel}`.toLowerCase(), icon: 'scene', w: 3 }));
    d.items.forEach((i) => {
      const src = d.sources.find((x) => x.id === i.sourceId)!;
      out.push({ group: 'Archival items', label: i.id, sub: `${i.title} · ${src.name}`, href: L.item(p.id, i.id), pid: p.id, hay: `${i.id} ${i.title} ${src.name} ${i.year} ${i.clearance.status.replace(/-/g, ' ')}`.toLowerCase(), icon: 'archive', w: 3, id: i.id.toLowerCase() });
    });
    d.sources.forEach((s) => out.push({ group: 'Archival items', label: s.name, sub: 'Archive source', href: L.archive(p.id, { source: s.id }), pid: p.id, hay: `${s.name} ${s.prefix} ${s.kind}`.toLowerCase(), icon: 'archive', w: 2 }));
    d.transcripts.forEach((t) => out.push({ group: 'Transcripts', label: t.name, sub: t.role, href: L.transcript(p.id, t.id), pid: p.id, hay: `${t.name} ${t.role} interview transcript`.toLowerCase(), icon: 'mic', w: 3 }));
    d.clips.forEach((c) => out.push({ group: 'Clips', label: c.id, sub: c.desc, href: L.clip(p.id, c.id), pid: p.id, hay: `${c.id} ${c.desc} ${c.type}`.toLowerCase(), icon: 'clip', w: 1 }));
  }
  INDEX = out;
  return out;
}

export function SearchBox() {
  const { view } = useStore();
  const cur = view.t === 'notfound' ? 'salt-road' : view.pid;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return [];
    const toks = qq.split(/\s+/);
    const idx = buildIndex();
    const hits: (Entry & { s: number })[] = [];
    for (const e of idx) {
      if (!toks.every((t) => e.hay.includes(t))) continue;
      let s = e.w * 10 + (e.pid === cur ? 25 : 0);
      if (e.id === qq) s += 200;
      else if (e.id && e.id.startsWith(qq)) s += 80;
      if (e.hay.startsWith(qq)) s += 40;
      if (e.label.toLowerCase().startsWith(qq)) s += 30;
      hits.push({ ...e, s });
    }
    hits.sort((a, b) => b.s - a.s);
    const groups = ['Scenes & reels', 'Archival items', 'Transcripts', 'Clips'];
    const out: Entry[] = [];
    for (const g of groups) out.push(...hits.filter((h) => h.group === g).slice(0, g === 'Clips' ? 3 : 5));
    return out;
  }, [q, cur]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); ref.current?.focus(); setOpen(true); }
    };
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey); window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, []);

  const choose = (e: Entry) => { go(e.href); setOpen(false); setQ(''); ref.current?.blur(); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && results[active]) choose(results[active]);
    else if (e.key === 'Escape') { setOpen(false); ref.current?.blur(); }
  };

  let lastGroup = '';
  const multi = new Set(results.map((r) => r.pid)).size > 1 || results.some((r) => r.pid !== cur);
  return (
    <div className="search" ref={box} role="search">
      <Icon name="search" size={15} className="search-ic" />
      <input
        ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
        placeholder="Search scenes, archival IDs, sources, interviewees, clips…" aria-label="Search all projects" role="combobox" aria-expanded={open && !!q} aria-controls="search-list" autoComplete="off" spellCheck={false}
      />
      <Kbd>/</Kbd>
      {open && (
        <div className="search-pop" id="search-list" role="listbox">
          {!q.trim() && <div className="search-hint">Searches all three projects. Results from the project you’re in come first.</div>}
          {q.trim() && results.length === 0 && <div className="search-hint">No matches for “{q}”. Try a scene number, an archive ID like HNL-1974-…, or a surname.</div>}
          {results.map((r, i) => {
            const head = r.group !== lastGroup ? <div className="search-group">{r.group}</div> : null;
            lastGroup = r.group;
            const p = DATA[r.pid].project;
            return (
              <div key={r.href + i}>
                {head}
                <button role="option" aria-selected={i === active} className={`search-row ${i === active ? 'on' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => choose(r)}>
                  <Icon name={r.icon} size={15} />
                  <span className="sr-main"><span className="sr-label">{r.label}</span><span className="sr-sub">{r.sub}</span></span>
                  {multi && <span className="proj-tag" style={{ ['--c' as string]: p.accent }}><i />{p.title}</span>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
void tc;
