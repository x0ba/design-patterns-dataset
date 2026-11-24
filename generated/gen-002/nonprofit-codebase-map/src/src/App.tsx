import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapView, { type MapHandle } from './MapView';
import Header, { type SearchHit } from './Header';
import { TrailTab, IssuesTab, PeopleTab, type Tab } from './LeftPanel';
import Inspector from './Inspector';
import { Icon } from './ui';
import {
  mods, issues, people, mod, findTrail, dependents, hopsFrom, BUCKETS, fmtShort, fmtDate, ago, issueByModule, repo,
  type Lens,
} from './data';

const LENSES: { id: Lens; label: string; title: string }[] = [
  { id: 'coverage', label: 'Coverage', title: 'Test coverage' },
  { id: 'fresh', label: 'Last changed', title: 'Last changed' },
  { id: 'person', label: 'Volunteer', title: 'Last touched by' },
  { id: 'service', label: 'Service', title: 'Service' },
];
type Filter = { kind: 'bucket'; lens: Lens; key: string } | { kind: 'person'; name: string } | null;

const START = mod('sms/reminders/compose.js').i;
const WINDOWS = mod('dispatch/scheduling/windows.py').i;

export default function App() {
  const mapRef = useRef<MapHandle>(null);
  const [selected, setSelected] = useState<number | null>(WINDOWS);
  const [from, setFrom] = useState<number | null>(START);
  const [to, setTo] = useState<number | null>(WINDOWS);
  const [lens, setLens] = useState<Lens>('coverage');
  const [blastOn, setBlastOn] = useState(true);
  const [depth, setDepth] = useState(2);
  const [tab, setTab] = useState<Tab>('trail');
  const [filter, setFilter] = useState<Filter>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [repoOpen, setRepoOpen] = useState(false);
  const [hover, setHover] = useState<{ id: number; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const trail = useMemo(() => (from !== null && to !== null ? findTrail(from, to) : null), [from, to]);
  const blast = useMemo(() => (blastOn && selected !== null ? dependents(selected, depth) : null), [blastOn, selected, depth]);
  const callees = useMemo(() => new Set(selected !== null ? mods[selected].out : []), [selected]);
  const litFilter = useMemo(() => {
    if (!filter) return null;
    if (filter.kind === 'person') return new Set(mods.filter((m) => m.by === filter.name).map((m) => m.i));
    const b = BUCKETS[filter.lens].find((x) => x.key === filter.key);
    return b ? new Set(mods.filter(b.test).map((m) => m.i)) : null;
  }, [filter]);

  const insets = useMemo(() => ({ left: leftOpen ? 380 : 28, right: rightOpen ? 404 : 28, top: 84, bottom: 150 }), [leftOpen, rightOpen]);

  const notify = useCallback((msg: string) => {
    setToast(msg); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  // opening view: frame the trail and the modules around the selected one
  useEffect(() => {
    const ids = new Set<number>(trail?.ids ?? []);
    if (selected !== null) { const near = hopsFrom(selected, 1); issues.forEach((is) => { if (near.has(is.module)) ids.add(is.module); }); ids.add(selected); }
    const t = window.setTimeout(() => mapRef.current?.fitIds([...ids], { maxScale: 1.4, animate: false }), 30);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusModule = useCallback((id: number) => { setSelected(id); mapRef.current?.centerOn(id); }, []);
  const fitTrail = useCallback((t = trail) => { if (t) mapRef.current?.fitIds(t.ids, { maxScale: 1.6 }); }, [trail]);

  const setEnds = (nf: number | null, nt: number | null) => {
    setFrom(nf); setTo(nt); setTab('trail');
    if (nf !== null && nt !== null) {
      const t = findTrail(nf, nt);
      if (t) setTimeout(() => mapRef.current?.fitIds(t.ids, { maxScale: 1.6 }), 0);
    }
  };

  const onPick = (h: SearchHit) => {
    if (h.kind === 'module') focusModule(h.m.i);
    else if (h.kind === 'issue') { focusModule(h.module); setTab('issues'); setLeftOpen(true); }
    else { setFilter({ kind: 'person', name: h.name }); setTab('people'); setLeftOpen(true); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(document.activeElement instanceof HTMLInputElement)) { setSelected(null); setRepoOpen(false); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!repoOpen) return;
    const f = (e: MouseEvent) => { if (!(e.target as Element).closest('.repo-wrap')) setRepoOpen(false); };
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f);
  }, [repoOpen]);

  const bucketFilter = filter?.kind === 'bucket' && filter.lens === lens ? filter.key : null;
  const hm = hover ? mods[hover.id] : null;
  const hoverIssue = hm ? issueByModule.get(hm.i) : undefined;

  return (
    <div className="app">
      <Header onPick={onPick} repoOpen={repoOpen} onOpenRepo={setRepoOpen} />
      <main className="stage">
        <MapView ref={mapRef} lens={lens} selected={selected} hovered={hover?.id ?? null} trail={trail} blast={blast} litFilter={litFilter} callees={callees} insets={insets}
          onSelect={setSelected} onHover={(id, x, y) => setHover(id === null ? null : { id, x: x ?? 0, y: y ?? 0 })} />

        {/* left: trail / issues / people */}
        {leftOpen ? (
          <aside className="panel left" aria-label="Trail, issues and people">
            <div className="tabs" role="tablist">
              {([['trail', 'Trail'], ['issues', `Issues ${issues.length}`], ['people', `People ${repo.activeVolunteers}`]] as [Tab, string][]).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>{label}</button>
              ))}
              <button className="icon-btn tabs-hide" onClick={() => setLeftOpen(false)} aria-label="Hide this panel" title="Hide panel">{Icon.panelL}</button>
            </div>
            <div className="panel-scroll">
              {tab === 'trail' && <TrailTab from={from} to={to} trail={trail} selected={selected}
                setFrom={(i) => setEnds(i, to)} setTo={(i) => setEnds(from, i)} swap={() => setEnds(to, from)} clear={() => setEnds(null, null)} fit={() => fitTrail()} choose={focusModule} />}
              {tab === 'issues' && <IssuesTab selected={selected} choose={focusModule} />}
              {tab === 'people' && <PeopleTab filter={filter?.kind === 'person' ? filter.name : null} setFilter={(n) => setFilter(n ? { kind: 'person', name: n } : null)} choose={focusModule} />}
            </div>
          </aside>
        ) : (
          <button className="panel-reopen left" onClick={() => setLeftOpen(true)} aria-label="Show trail panel">{Icon.panelL}<span>Trail</span></button>
        )}

        {/* right: inspector */}
        {rightOpen ? (
          <aside className="panel right" aria-label="Selected module">
            <button className={'icon-btn insp-hide' + (selected !== null ? ' shifted' : '')} onClick={() => setRightOpen(false)} aria-label="Hide this panel" title="Hide panel">{Icon.panelR}</button>
            <div className="panel-scroll">
              <Inspector selected={selected} trailFrom={from} trailTo={to} blastOn={blastOn} depth={depth}
                onSelect={(id) => (id === null ? setSelected(null) : focusModule(id))}
                setFrom={(i) => setEnds(i, to)} setTo={(i) => setEnds(from, i)} setBlastOn={setBlastOn} setDepth={setDepth} askPerson={() => {}} notify={notify} />
            </div>
          </aside>
        ) : (
          <button className="panel-reopen right" onClick={() => setRightOpen(true)} aria-label="Show module details">{Icon.panelR}<span>Details</span></button>
        )}

        {/* bottom: legend + controls */}
        <div className="dock" style={{ left: insets.left - 12, right: insets.right - 12 }}>
          <div className="legend" role="group" aria-label={`Colour key: ${LENSES.find((l) => l.id === lens)!.title}`}>
            <span className="legend-t">{LENSES.find((l) => l.id === lens)!.title}</span>
            <div className="legend-items">
              {BUCKETS[lens].map((b) => {
                const n = mods.filter(b.test).length;
                return (
                  <button key={b.key} className={'lg' + (bucketFilter === b.key ? ' on' : '')} aria-pressed={bucketFilter === b.key} title={`Highlight the ${n} modules in this group`}
                    onClick={() => setFilter(bucketFilter === b.key ? null : { kind: 'bucket', lens, key: b.key })}>
                    <i style={{ background: b.color }} />{b.label}<em>{n}</em>
                  </button>
                );
              })}
            </div>
            <span className="legend-note">Bigger dot = more lines · closer = call each other more</span>
          </div>
          <div className="toolbar">
            <div className="seg-group" role="group" aria-label="Colour modules by">
              {LENSES.map((l) => <button key={l.id} className={'seg' + (lens === l.id ? ' on' : '')} aria-pressed={lens === l.id} onClick={() => { setLens(l.id); setFilter((f) => (f?.kind === 'bucket' ? null : f)); }}>{l.label}</button>)}
            </div>
            <span className="tb-sep" />
            <label className="switch tb-blast" title={selected === null ? 'Select a module to see what would feel a change to it' : 'Rings the modules that would feel a change to the selected one'}>
              <input type="checkbox" checked={blastOn} onChange={(e) => setBlastOn(e.target.checked)} /><span className="switch-ui" /><span className="switch-t">Blast radius</span>
            </label>
            <div className="seg-group small" role="group" aria-label="Hops of blast radius">
              {[1, 2, 3].map((d) => <button key={d} className={'seg' + (depth === d ? ' on' : '')} aria-pressed={depth === d} onClick={() => setDepth(d)}>{d}</button>)}
            </div>
            <span className="tb-sep" />
            <div className="zoom-group">
              <button className="icon-btn" onClick={() => mapRef.current?.zoomBy(1.4)} aria-label="Zoom in" title="Zoom in">{Icon.plus}</button>
              <button className="icon-btn" onClick={() => mapRef.current?.zoomBy(1 / 1.4)} aria-label="Zoom out" title="Zoom out">{Icon.minus}</button>
              <button className="icon-btn" onClick={() => mapRef.current?.fitAll()} aria-label="Show the whole codebase" title="Show everything">{Icon.fit}</button>
            </div>
          </div>
        </div>

        {filter && litFilter && (
          <div className="filter-chip" role="status" style={{ left: insets.left + (window.innerWidth - insets.left - insets.right) / 2 }}>
            <span>Highlighting <b>{filter.kind === 'person' ? filter.name : BUCKETS[filter.lens].find((b) => b.key === filter.key)?.label}</b> · {litFilter.size} modules</span>
            <button className="icon-btn" onClick={() => setFilter(null)} aria-label="Clear highlight">{Icon.close}</button>
          </div>
        )}
        {hm && hover && (
          <div className="tip" style={{ left: hover.x + 296 > window.innerWidth - (rightOpen ? 392 : 16) ? hover.x - 296 : hover.x + 16, top: Math.min(hover.y + 14, window.innerHeight - 130) }} role="tooltip">
            <div className="tip-name mono">{hm.path}</div>
            <div className="tip-row"><span>{hm.lines.toLocaleString()} lines</span><span>{hm.cov}% tested</span></div>
            <div className="tip-row dim"><span>{hm.by}</span><span>{fmtShort(hm.mod)}, {hm.mod.slice(0, 4)}</span></div>
            {hoverIssue && <div className="tip-issue">#{hoverIssue[0].n} {hoverIssue[0].title}</div>}
          </div>
        )}
        {toast && <div className="toast" role="status">{Icon.check}{toast}</div>}
      </main>
    </div>
  );
}
