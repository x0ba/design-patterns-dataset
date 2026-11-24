import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DATA, FLAG_POLYGON, initialSavedRegions, SavedRegion, STATUS_COLORS, TEAM, ENVS, ACCENTS } from './data/model';
import { Polygon, simplify } from './data/geometry';
import { regionStats } from './data/stats';
import { ColorBy, COLOR_MODES, legendFor, ENV_COLORS, A_COLOR, B_COLOR, ramp } from './data/colors';
import { mulberry32 } from './data/rng';
import { MapHandle, MapRegion, MapView } from './components/MapView';
import { ComparePanel } from './components/ComparePanel';
import { ClipList, ClipSort } from './components/ClipList';
import { PlayerBar, synthFor } from './components/PlayerBar';
import { LeftRail } from './components/LeftRail';
import { resolveRegion } from './regions';
import { player } from './audio/synth';

const INITIAL_VIEW = { cx: 44, cy: 23.5, scale: 15.5 };

const INITIAL_CLIP = (() => {
  const s = regionStats(FLAG_POLYGON);
  const { ev } = DATA;
  let best = s.evalIdx[0];
  let bestScore = Infinity;
  for (const i of s.evalIdx) {
    if (ACCENTS[ev.accent[i]].code !== 'en-NG' || ev.env[i] !== 1) continue;
    if (ev.dur[i] < 3.6 || ev.dur[i] > 6.5) continue;
    const score = Math.abs(ev.wer42[i] - ev.wer41[i] - 0.24) + Math.abs(ev.wer41[i] - 0.11) + Math.abs(ev.snr[i] - 3.5) * 0.01;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
})();

const SESSION_START_ELAPSED = 24 * 60 + 10;

export default function App() {
  const [saved, setSaved] = useState<SavedRegion[]>(initialSavedRegions);
  const [draft, setDraft] = useState<Polygon | null>(null);
  const [draftName, setDraftName] = useState('');
  const [aKey, setAKey] = useState('flag');
  const [bKey, setBKey] = useState<string | null>('cluster:88');
  const [tab, setTab] = useState<'regions' | 'clusters'>('regions');
  const [colorBy, setColorBy] = useState<ColorBy>('delta');
  const [envFilter, setEnvFilter] = useState([true, true, true, true]);
  const [regressedOnly, setRegressedOnly] = useState(false);
  const [showTrain, setShowTrain] = useState(true);
  const [showSaved, setShowSaved] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [tool, setTool] = useState<'pan' | 'draw'>('pan');
  const [clipSource, setClipSource] = useState<'A' | 'B'>('A');
  const [clipSort, setClipSort] = useState<ClipSort>('regressed');
  const [sampleSeed, setSampleSeed] = useState(1);
  const [selected, setSelected] = useState<number>(INITIAL_CLIP);
  const [playing, setPlaying] = useState(false);
  const [seekPos, setSeekPos] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(SESSION_START_ELAPSED);
  const mapRef = useRef<MapHandle>(null);
  const nextIds = useRef({ region: 47, ticket: 1187 });

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  const A = resolveRegion(aKey, saved, draft, draftName) ?? resolveRegion('flag', saved, draft, draftName)!;
  const B = bKey ? resolveRegion(bKey, saved, draft, draftName) : null;
  const sA = useMemo(() => regionStats(A.polygon), [A.polygon]);
  const sB = useMemo(() => (B ? regionStats(B.polygon) : null), [B?.polygon]);
  const draftStats = useMemo(() => (draft ? regionStats(draft) : null), [draft]);

  const memberMask = useMemo(() => {
    if (mode !== '3d') return null;
    const m = new Uint8Array(DATA.ev.n);
    for (const i of sA.evalIdx) m[i] = 1;
    if (sB) for (const i of sB.evalIdx) m[i] = 2;
    return m;
  }, [mode, sA, sB]);

  // clip list
  const clipStats = clipSource === 'B' && sB ? sB : sA;
  const clips = useMemo(() => {
    const { ev } = DATA;
    const idx = Array.from(clipStats.evalIdx);
    if (clipSort === 'regressed') idx.sort((a, b) => ev.wer42[b] - ev.wer41[b] - (ev.wer42[a] - ev.wer41[a]));
    else if (clipSort === 'lowsnr') idx.sort((a, b) => ev.snr[a] - ev.snr[b]);
    else {
      const r = mulberry32(sampleSeed * 7919 + idx.length);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
    }
    return idx.slice(0, 40);
  }, [clipStats, clipSort, sampleSeed]);

  useEffect(() => {
    if (clipSource === 'B' && !sB) setClipSource('A');
  }, [sB, clipSource]);

  // ---------- playback ----------
  useEffect(() => {
    player.onEnded = () => {
      setPlaying(false);
      setSeekPos(0);
    };
  }, []);

  const playClip = useCallback(
    (i: number, from = 0) => {
      player.play('clip' + i, synthFor(i), from);
      setPlaying(true);
    },
    [],
  );

  const onListPlay = (i: number) => {
    if (i === selected) {
      togglePlay();
      return;
    }
    setSelected(i);
    setSeekPos(0);
    playClip(i);
  };

  const togglePlay = () => {
    if (playing) {
      player.pause();
      setSeekPos(player.offset);
      setPlaying(false);
    } else {
      const from = player.clipKey === 'clip' + selected ? player.offset : 0;
      playClip(selected, from >= DATA.ev.dur[selected] - 0.05 ? 0 : from);
    }
  };

  const seek = (t: number) => {
    if (playing) playClip(selected, t);
    else {
      player.clipKey = 'clip' + selected;
      player.offset = t;
      setSeekPos(t);
    }
  };

  const selectFromMap = (i: number) => {
    setSelected(i);
    setSeekPos(0);
    playClip(i);
  };

  const step = (dir: 1 | -1) => {
    if (!clips.length) return;
    const k = clips.indexOf(selected);
    const next = clips[(k + dir + clips.length) % clips.length] ?? clips[0];
    setSelected(next);
    setSeekPos(0);
    if (playing) playClip(next);
    else {
      player.pause();
      player.offset = 0;
    }
  };

  // ---------- regions ----------
  const flyTo = (key: string) => {
    const r = resolveRegion(key, saved, draft, draftName);
    if (r) mapRef.current?.flyToPolygon(r.polygon);
  };

  const setSlot = (slot: 'A' | 'B', key: string) => {
    if (slot === 'A') {
      if (key === aKey) return;
      if (key === bKey) setBKey(aKey);
      setAKey(key);
    } else {
      if (key === bKey) {
        setBKey(null);
        return;
      }
      if (key === aKey) {
        if (!bKey) return;
        setAKey(bKey);
      }
      setBKey(key);
    }
  };

  const onDraftChange = (p: Polygon, final: boolean) => {
    const first = !draft;
    setDraft(p);
    if (first && final) {
      if (aKey !== 'draft') {
        if (bKey === 'draft') setBKey(null);
        setAKey('draft');
      }
      setClipSource('A');
      setToast('Draft region is now A in the comparison. Name it on the left when the room agrees.');
    }
  };

  const startFromFlag = () => {
    const simp = simplify([...FLAG_POLYGON, FLAG_POLYGON[0]], 0.45).slice(0, -1) as Polygon;
    setDraft(simp);
    setAKey('draft');
    setClipSource('A');
    setTool('pan');
    setMode('2d');
    mapRef.current?.flyToPolygon(simp, 1.5);
    setToast('Copied the RF-0042 outline. Drag its handles to tighten or widen it.');
  };

  const discardDraft = () => {
    setDraft(null);
    setDraftName('');
    if (aKey === 'draft') setAKey('flag');
    if (bKey === 'draft') setBKey('cluster:88');
  };

  const saveDraft = (d: { name: string; owner: string; relabel: boolean; collect: boolean; note: string; relabelN: number; collectN: number }) => {
    if (!draft) return;
    const id = 'DR-' + String(nextIds.current.region++).padStart(4, '0');
    const ticket = 'DQ-' + nextIds.current.ticket++;
    const work = [
      d.relabel ? `relabel ${d.relabelN.toLocaleString('en-US')} training clips` : null,
      d.collect ? `collect ≈${d.collectN.toLocaleString('en-US')} new clips` : null,
    ]
      .filter(Boolean)
      .join(' and ');
    const status = d.relabel ? 'Queued' : 'In collection';
    const region: SavedRegion = {
      id,
      name: d.name,
      owner: d.owner,
      status,
      created: '17 Nov 2026',
      updated: '17 Nov 2026',
      note: `Agreed in the weekly review: ${work}.${d.note ? ' ' + d.note : ''}`,
      polygon: draft,
      ticket,
      isNew: true,
    };
    setSaved((s) => [region, ...s]);
    if (aKey === 'draft') setAKey('saved:' + id);
    if (bKey === 'draft') setBKey('saved:' + id);
    setDraft(null);
    setDraftName('');
    setToast(`Saved “${d.name}” as ${id}. ${ticket} is assigned to ${d.owner}.`);
  };

  const onRegionClick = (key: string) => {
    flyTo(key);
    if (key !== aKey && key !== bKey && key !== 'draft') {
      setBKey(key);
      const r = resolveRegion(key, saved, draft, draftName);
      if (r) setToast(`Comparing A against ${r.name}`);
    }
  };

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'n' || e.key === 'N') step(e.shiftKey ? -1 : 1);
      else if (e.key === 'd' || e.key === 'D') {
        setMode('2d');
        setTool('draw');
      } else if (e.key === 'v' || e.key === 'V' || e.key === 'Escape') setTool('pan');
      else if (e.key === 'f' || e.key === 'F') flyTo('flag');
      else if (e.key === 'a' || e.key === 'A') flyTo(aKey);
      else if (e.key === 'b' || e.key === 'B') bKey && flyTo(bKey);
      else if (e.key === '0') mapRef.current?.resetView();
      else if (e.key === '3') setMode((m) => (m === '2d' ? '3d' : '2d'));
      else if (e.key === '+' || e.key === '=') mapRef.current?.zoomBy(1.5);
      else if (e.key === '-') mapRef.current?.zoomBy(1 / 1.5);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- map regions ----------
  const mapRegions = useMemo(() => {
    const out: MapRegion[] = [];
    const badges = (k: string) => {
      const b: ('A' | 'B')[] = [];
      if (aKey === k) b.push('A');
      if (bKey === k) b.push('B');
      return b;
    };
    out.push({ key: 'flag', name: 'RF-0042 · flagged', polygon: FLAG_POLYGON, kind: 'flag', color: '#f0883e', dashed: true, badges: badges('flag') });
    for (const r of saved) {
      const k = 'saved:' + r.id;
      const inCmp = aKey === k || bKey === k;
      if (!showSaved && !inCmp) continue;
      out.push({
        key: k,
        name: r.name,
        polygon: r.polygon,
        kind: 'saved',
        color: STATUS_COLORS[r.status],
        dashed: r.status === 'Closed',
        faint: r.status === 'Closed' && !inCmp,
        badges: badges(k),
      });
    }
    for (const k of [aKey, bKey]) {
      if (k && k.startsWith('cluster:')) {
        const r = resolveRegion(k, saved, draft, draftName)!;
        out.push({ key: k, name: r.name, polygon: r.polygon, kind: 'cluster', color: k === aKey ? A_COLOR : B_COLOR, badges: badges(k) });
      }
    }
    if (draft) out.push({ key: 'draft', name: draftName.trim() || 'Draft region', polygon: draft, kind: 'draft', color: '#ffe08a', badges: badges('draft') });
    return out;
  }, [saved, aKey, bKey, showSaved, draft, draftName]);

  const steps = [
    { label: 'Locate', done: true },
    { label: 'Compare', done: !!bKey && (!!draft || saved.some((s) => s.isNew)) },
    { label: 'Bound', done: !!draft || saved.some((s) => s.isNew) },
    { label: 'Name & send', done: saved.some((s) => s.isNew) },
  ];
  const current = steps.findIndex((s) => !s.done);

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const remaining = Math.max(0, 60 * 60 - elapsed);

  const changed =
    envFilter.filter((v) => !v).length + Number(regressedOnly) + Number(!showTrain) + Number(!showSaved) + Number(!showGrid);
  const mode0 = COLOR_MODES.find((m) => m.key === colorBy)!;
  const legend = legendFor(colorBy);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#162027" />
            <circle cx="11" cy="13" r="3" fill="#5f86a8" />
            <circle cx="20" cy="19" r="4" fill="#f0883e" />
            <circle cx="22" cy="9" r="2" fill="#37b3a4" />
            <circle cx="9" cy="23" r="1.6" fill="#5f86a8" />
          </svg>
          <span>Driftfield</span>
        </div>
        <div className="session">
          <div className="session-title">v42 regression: accented English in noise</div>
          <div className="session-sub">
            Weekly data review · Tue 17 Nov · Room 3 · v42 shipped Thu 12 Nov · 1.8M training · 64k eval clips · 212 clusters
          </div>
        </div>
        <ol className="steps">
          {steps.map((s, k) => (
            <li key={s.label} className={s.done ? 'done' : k === current ? 'now' : ''}>
              <span className="step-n">{s.done ? '✓' : k + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>
        <div className="clock" title="Time left in this review">
          <div className="clock-big mono">{mmss(remaining)}</div>
          <div className="clock-sub">left of 60 min</div>
        </div>
        <div className="people" title={TEAM.map((t) => `${t.name} (${t.role})`).join('\n')}>
          {TEAM.map((t, k) => (
            <span key={t.name} className={`avatar${k === 0 ? ' lead' : ''}`} style={{ zIndex: 10 - k }}>
              {t.initials}
            </span>
          ))}
        </div>
      </header>

      <LeftRail
        tab={tab}
        setTab={setTab}
        saved={saved}
        aKey={aKey}
        bKey={bKey}
        setSlot={setSlot}
        onFly={flyTo}
        draft={draft}
        draftStats={draftStats}
        bStats={bKey === 'draft' ? null : sB}
        bName={B ? B.short : null}
        draftName={draftName}
        setDraftName={setDraftName}
        onStartDraw={() => {
          setMode('2d');
          setTool('draw');
        }}
        onStartFromFlag={startFromFlag}
        onDiscardDraft={discardDraft}
        onSaveDraft={saveDraft}
      />

      <main className="center">
        <div className="map-area">
          <MapView
            ref={mapRef}
            colorBy={colorBy}
            envFilter={envFilter}
            regressedOnly={regressedOnly}
            showTrain={showTrain}
            showGrid={showGrid}
            mode={mode}
            tool={tool}
            regions={mapRegions}
            draft={draft}
            onDraftChange={onDraftChange}
            onDrawDone={() => setTool('pan')}
            selectedClip={selected}
            playing={playing}
            memberMask={memberMask}
            onSelectClip={selectFromMap}
            onRegionClick={onRegionClick}
            initialView={INITIAL_VIEW}
          />

          <div className="map-toolbar">
            <div className="seg">
              <button className={tool === 'pan' ? 'on' : ''} onClick={() => setTool('pan')} title="Pan and select (V)">
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                  <path d="M3 2l9.5 5.2-4.3 1.1 2.6 4.7-1.8 1-2.6-4.7L3 12.5z" fill="currentColor" />
                </svg>
                Select
              </button>
              <button
                className={tool === 'draw' ? 'on draw' : ''}
                onClick={() => {
                  setMode('2d');
                  setTool(tool === 'draw' ? 'pan' : 'draw');
                }}
                title="Draw a region (D)"
              >
                ✎ Draw region
              </button>
            </div>
            <div className="seg">
              <button className={mode === '2d' ? 'on' : ''} onClick={() => setMode('2d')} title="2D projection">
                2D
              </button>
              <button
                className={mode === '3d' ? 'on' : ''}
                onClick={() => {
                  setMode('3d');
                  setTool('pan');
                }}
                title="3D projection: check that neighbors are real (3)"
              >
                3D
              </button>
            </div>
            <div className="spacer" />
            <div className="seg">
              <button onClick={() => flyTo('flag')} title="Fly to the flagged area (F)">
                ⚑ RF-0042
              </button>
              <button onClick={() => mapRef.current?.resetView()} title="Show the whole space (0)">
                ⤢ All
              </button>
              <button onClick={() => mapRef.current?.zoomBy(1.5)} title="Zoom in (+)" className="sq">
                +
              </button>
              <button onClick={() => mapRef.current?.zoomBy(1 / 1.5)} title="Zoom out (−)" className="sq">
                −
              </button>
            </div>
          </div>

          {tool === 'draw' && (
            <div className="map-banner draw">
              Drag around the clips to include. Release to close the outline. <kbd>Esc</kbd> cancels.
            </div>
          )}
          {mode === '3d' && (
            <div className="map-banner">
              3D projection: drag to orbit. Clips outside <b style={{ color: A_COLOR }}>A</b> and <b style={{ color: B_COLOR }}>B</b> are dimmed,
              so you can check whether neighbors in 2D are really close.
            </div>
          )}

          <div className="legend">
            <div className="legend-head">
              <span className="legend-label">Color</span>
              <select value={colorBy} onChange={(e) => setColorBy(e.target.value as ColorBy)}>
                {COLOR_MODES.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="legend-hint">
              {mode0.hint}
              <button className={`filters-toggle${showFilters ? ' on' : ''}`} onClick={() => setShowFilters((v) => !v)}>
                Filters & layers{changed > 0 ? ` · ${changed}` : ''} {showFilters ? '▴' : '▾'}
              </button>
            </div>
            {legend.kind === 'ramp' ? (
              <RampLegend stops={legend.stops} ticks={legend.ticks} lo={legend.lo} hi={legend.hi} />
            ) : (
              <div className={`cat-legend${legend.items.length > 6 ? ' many' : ''}`}>
                {legend.items.map((it) => (
                  <span key={it.label}>
                    <i style={{ background: it.color }} />
                    {it.label}
                  </span>
                ))}
              </div>
            )}
            {showFilters && (
            <>
            <div className="legend-filters">
              {ENVS.map((e, i) => (
                <button
                  key={e}
                  className={`fchip${envFilter[i] ? ' on' : ''}`}
                  onClick={() => setEnvFilter((f) => f.map((v, k) => (k === i ? !v : v)))}
                  title={`Show ${e.toLowerCase()} clips`}
                >
                  <i style={{ background: ENV_COLORS[i] }} />
                  {e}
                </button>
              ))}
            </div>
            <div className="legend-filters">
              <button className={`fchip${regressedOnly ? ' on' : ''}`} onClick={() => setRegressedOnly((v) => !v)}>
                Regressed ≥ 5 pts only
              </button>
              <button className={`fchip${showTrain ? ' on' : ''}`} onClick={() => setShowTrain((v) => !v)}>
                Training density
              </button>
              <button className={`fchip${showSaved ? ' on' : ''}`} onClick={() => setShowSaved((v) => !v)}>
                Saved regions
              </button>
              <button className={`fchip${showGrid ? ' on' : ''}`} onClick={() => setShowGrid((v) => !v)}>
                Grid
              </button>
            </div>
            </>
            )}
          </div>
        </div>
        <PlayerBar
          clip={selected}
          playing={playing}
          onToggle={togglePlay}
          onSeek={seek}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onLocate={() => mapRef.current?.flyTo(DATA.ev.x[selected], DATA.ev.y[selected], 30)}
          position={seekPos}
        />
      </main>

      <aside className="rightpanel">
        <ComparePanel
          A={A}
          B={B}
          sA={sA}
          sB={sB}
          onSwap={() => {
            if (!bKey) return;
            setAKey(bKey);
            setBKey(aKey);
          }}
          onFly={flyTo}
          onClearB={() => setBKey(null)}
        />
        <ClipList
          clips={clips}
          total={clipStats.evalCount}
          source={clipSource}
          hasB={!!sB}
          setSource={setClipSource}
          sort={clipSort}
          setSort={setClipSort}
          selected={selected}
          playing={playing}
          onPlay={onListPlay}
          onReshuffle={() => setSampleSeed((s) => s + 1)}
        />
      </aside>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function RampLegend({ stops, ticks, lo, hi }: { stops: [number, string][]; ticks: { v: number; label: string }[]; lo: string; hi: string }) {
  const min = stops[0][0];
  const max = stops[stops.length - 1][0];
  const grad = Array.from({ length: 24 }, (_, k) => {
    const v = min + ((max - min) * k) / 23;
    const [r, g, b] = ramp(stops, v);
    return `rgb(${r | 0},${g | 0},${b | 0}) ${(k / 23) * 100}%`;
  }).join(',');
  return (
    <div className="ramp">
      <div className="ramp-bar" style={{ background: `linear-gradient(90deg, ${grad})` }} />
      <div className="ramp-ticks">
        {ticks.map((t) => (
          <span key={t.label} style={{ left: `${((t.v - min) / (max - min)) * 100}%` }}>
            {t.label}
          </span>
        ))}
      </div>
      <div className="ramp-ends">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}
