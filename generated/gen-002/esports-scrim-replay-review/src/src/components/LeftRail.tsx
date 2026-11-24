import { useEffect, useRef, useState } from 'react';
import { MAP_RESULTS, ROUND_BY_ID, SCRIM, roundsOf } from '../data/scrim';
import type { Marker, Round } from '../data/types';
import { MAP_LABEL, fmt, useApp, type RoundFilter } from '../store';
import { matchesFilter } from './nav';

const END_LABEL = (r: Round) =>
  r.end === 'elim' ? 'Elimination' : r.end === 'time' ? 'Time' : r.objDetail === 'defused' ? 'Defused' : 'Detonated';

export function LeftRail() {
  return (
    <aside className="rail left">
      <ScrimCard />
      <MapTabs />
      <RoundList />
      <MarkerList />
    </aside>
  );
}

function ScrimCard() {
  return (
    <div className="scrim-card">
      <div className="eyebrow">Scrim block · {SCRIM.date}</div>
      <div className="scrim-title">
        <span>vs {SCRIM.opponent}</span>
        <span className="chip loss">L 1–2</span>
      </div>
      <div className="muted small">3 maps · 79 rounds · 5 POVs + free cam + comms</div>
    </div>
  );
}

function MapTabs() {
  const mapId = useApp((s) => s.mapId);
  const openMap = useApp((s) => s.openMap);
  return (
    <div className="maps">
      {MAP_RESULTS.map((m) => {
        const rs = roundsOf(m.id);
        const lostDef = rs.filter((r) => r.side === 'def' && !r.won && !r.extra).length;
        const won = m.us > m.them;
        return (
          <button key={m.id} className={`map-tab ${mapId === m.id ? 'on' : ''}`} onClick={() => openMap(m.id)}>
            <span className="map-ord">{m.order}</span>
            <span className="map-main">
              <span className="map-name">{MAP_LABEL[m.id]}</span>
              <span className="muted tiny">{rs.length} rounds · {lostDef} lost on D</span>
            </span>
            <span className={`map-score ${won ? 'win' : 'loss'}`}>{m.us}–{m.them}</span>
          </button>
        );
      })}
    </div>
  );
}

const FILTERS: { id: RoundFilter; label: string }[] = [
  { id: 'lostdef', label: 'Lost on D' },
  { id: 'def', label: 'Defense' },
  { id: 'att', label: 'Attack' },
  { id: 'all', label: 'All' },
];

function RoundList() {
  const mapId = useApp((s) => s.mapId);
  const roundId = useApp((s) => s.roundId);
  const filter = useApp((s) => s.filter);
  const setFilter = useApp((s) => s.setFilter);
  const openRound = useApp((s) => s.openRound);
  const markers = useApp((s) => s.markers);
  const clips = useApp((s) => s.clips);
  const rs = roundsOf(mapId);
  const shown = rs.filter((r) => matchesFilter(r, filter));
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest' }); }, [roundId, filter]);

  let lastHalf = '';
  return (
    <div className="rounds">
      <div className="seg small-seg" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
            {f.label}
            <span className="cnt">{rs.filter((r) => matchesFilter(r, f.id)).length}</span>
          </button>
        ))}
      </div>
      <div className="round-list">
        {shown.map((r) => {
          const half = r.extra ? 'Extra rounds · not scored' : r.n <= 12 ? 'First half' : 'Second half';
          const showHalf = half !== lastHalf;
          lastHalf = half;
          const mk = markers.filter((m) => m.roundId === r.id).length;
          const cl = clips.filter((c) => c.roundId === r.id).length;
          const on = r.id === roundId;
          return (
            <div key={r.id}>
              {showHalf && filter !== 'lostdef' && <div className="half">{half} · {r.side === 'att' ? 'Attack' : 'Defense'}</div>}
              <button
                ref={on ? activeRef : undefined}
                className={`round-row ${on ? 'on' : ''} ${r.won ? 'won' : 'lost'}`}
                onClick={() => openRound(r.id, r.plantT && r.side === 'def' && !r.won ? Math.max(0, r.plantT - 6) : 0)}
                title={`Round ${r.n}: ${r.side === 'def' ? 'Defense' : 'Attack'}, ${r.won ? 'won' : 'lost'} — ${END_LABEL(r)}`}
              >
                <span className="rn">R{r.n}</span>
                <span className={`side ${r.side}`} title={r.side === 'def' ? 'Defense' : 'Attack'}>{r.side === 'def' ? 'D' : 'A'}</span>
                <span className={`res ${r.won ? 'w' : 'l'}`}>{r.won ? 'W' : 'L'}</span>
                <span className="rr-main">
                  <span className="muted">{END_LABEL(r)}</span>
                  {r.retake && <span className="tag-rt" title="Retake: lost after the plant">⟲</span>}
                  {r.extra && <span className="tag ghost">Extra</span>}
                </span>
                <span className="rr-meta">
                  {mk > 0 && <span className="dot-mk" title={`${mk} marker${mk > 1 ? 's' : ''}`}>{mk}</span>}
                  {cl > 0 && <span className="dot-cl" title={`${cl} clip${cl > 1 ? 's' : ''} in tonight's lineup`}>{cl}</span>}
                  <span className="score mono">{r.extra ? '—' : `${r.scoreAfter[0]}–${r.scoreAfter[1]}`}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarkerList() {
  const markers = useApp((s) => s.markers);
  const roundId = useApp((s) => s.roundId);
  const t = useApp((s) => s.t);
  const draft = useApp((s) => s.markerDraft);
  const set = useApp((s) => s.set);
  const addMarker = useApp((s) => s.addMarker);
  const openRound = useApp((s) => s.openRound);
  const curMap = ROUND_BY_ID[roundId].map;
  const groups = (['foundry', 'saltworks', 'canopy'] as const)
    .map((m) => ({ m, items: markers.filter((x) => ROUND_BY_ID[x.roundId].map === m).sort((a, b) => ROUND_BY_ID[a.roundId].n - ROUND_BY_ID[b.roundId].n || a.t - b.t) }))
    .filter((g) => g.items.length)
    .sort((a, b) => Number(b.m === curMap) - Number(a.m === curMap));
  return (
    <div className="markers">
      <div className="sec-head">
        <span>Your markers <span className="muted">· {markers.length}</span></span>
        <button className="btn-ghost xs" onClick={() => set({ markerDraft: { roundId, t, text: '' }, playing: false })} title="Add marker at playhead (M)">
          + Marker <kbd>M</kbd>
        </button>
      </div>
      <div className="marker-scroll">
        {draft && <MarkerDraft onSave={addMarker} />}
        {groups.map((g) => (
          <div key={g.m}>
            <div className="half">{MAP_LABEL[g.m]}</div>
            {g.items.map((m) => (
              <MarkerRow key={m.id} m={m} active={m.roundId === roundId && Math.abs(m.t - t) < 1.5} onOpen={() => openRound(m.roundId, Math.max(0, m.t - 4))} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MarkerDraft({ onSave }: { onSave: (text: string) => void }) {
  const draft = useApp((s) => s.markerDraft)!;
  const set = useApp((s) => s.set);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const r = ROUND_BY_ID[draft.roundId];
  return (
    <form
      className="marker-draft"
      onSubmit={(e) => { e.preventDefault(); if (draft.text.trim()) onSave(draft.text.trim()); }}
    >
      <div className="mono tiny amber">{MAP_LABEL[r.map]} R{r.n} · {fmt(draft.t, true)}</div>
      <input
        ref={ref}
        value={draft.text}
        placeholder="What happened here?"
        onChange={(e) => set({ markerDraft: { ...draft, text: e.target.value } })}
        onKeyDown={(e) => { if (e.key === 'Escape') set({ markerDraft: null }); }}
      />
      <div className="row-end">
        <button type="button" className="btn-ghost xs" onClick={() => set({ markerDraft: null })}>Cancel</button>
        <button type="submit" className="btn xs" disabled={!draft.text.trim()}>Save marker</button>
      </div>
    </form>
  );
}

function MarkerRow({ m, active, onOpen }: { m: Marker; active: boolean; onOpen: () => void }) {
  const r = ROUND_BY_ID[m.roundId];
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(m.text);
  const updateMarker = useApp((s) => s.updateMarker);
  const removeMarker = useApp((s) => s.removeMarker);
  const beginClip = useApp((s) => s.beginClip);
  const openRound = useApp((s) => s.openRound);
  const clips = useApp((s) => s.clips);
  const inLineup = clips.some((c) => c.roundId === m.roundId && c.tIn <= m.t && c.tOut >= m.t);
  if (edit) {
    return (
      <form className="marker-draft" onSubmit={(e) => { e.preventDefault(); updateMarker(m.id, text.trim() || m.text); setEdit(false); }}>
        <div className="mono tiny amber">R{r.n} · {fmt(m.t)}</div>
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setEdit(false); }} />
        <div className="row-end">
          <button type="button" className="btn-ghost xs danger" onClick={() => removeMarker(m.id)}>Delete</button>
          <button type="submit" className="btn xs">Save</button>
        </div>
      </form>
    );
  }
  return (
    <div className={`marker-row ${active ? 'on' : ''}`} onClick={onOpen} title="Jump to 4s before this marker">
      <span className="mono mk-time">R{r.n} {fmt(m.t)}</span>
      <span className="mk-text">{m.text}{inLineup && <span className="in-lineup" title="Already in tonight's lineup">●</span>}</span>
      <span className="mk-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="icon-btn"
          title="Add as clip to tonight's lineup"
          onClick={() => { openRound(m.roundId, m.t); beginClip({ roundId: m.roundId, tIn: Math.max(0, m.t - 5), tOut: Math.min(r.duration, m.t + 5), title: m.text }); }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16"><rect x="1.5" y="3" width="13" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 5.5v5M5.5 8h5" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <button className="icon-btn" title="Edit marker" onClick={() => setEdit(true)}>
          <svg width="13" height="13" viewBox="0 0 16 16"><path d="M3 11.5 10.5 4l1.5 1.5L4.5 13H3z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
        </button>
      </span>
    </div>
  );
}
