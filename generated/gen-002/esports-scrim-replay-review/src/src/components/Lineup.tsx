import { useEffect, useRef, useState } from 'react';
import { SESSION } from '../data/review';
import { PLAYER_COLOR, ROUND_BY_ID } from '../data/scrim';
import type { Clip, PlayerName, PovId } from '../data/types';
import { MAP_LABEL, fmt, fmtPrecise, useApp } from '../store';
import { Snapshot } from './View';

const POVS: PovId[] = ['Rook', 'Vesper', 'Juno', 'Kael', 'Mara', 'Spectator'];
const SPEEDS = [0.25, 0.5, 1, 2];
const povColor = (p: PovId) => (p === 'Spectator' ? '#cfd5de' : PLAYER_COLOR[p as PlayerName]);
const povName = (p: PovId) => (p === 'Spectator' ? 'Free cam' : p);

export function Lineup() {
  const clips = useApp((s) => s.clips);
  const draft = useApp((s) => s.draft);
  const roundId = useApp((s) => s.roundId);
  const t = useApp((s) => s.t);
  const markers = useApp((s) => s.markers);
  const startPresent = useApp((s) => s.startPresent);
  const beginClip = useApp((s) => s.beginClip);
  const moveClip = useApp((s) => s.moveClip);
  const openRound = useApp((s) => s.openRound);
  const [dragI, setDragI] = useState<number | null>(null);
  const [overI, setOverI] = useState<number | null>(null);
  const r = ROUND_BY_ID[roundId];

  const remaining = Math.max(0, SESSION.target - clips.length);
  const unclipped = markers
    .filter((m) => !clips.some((c) => c.roundId === m.roundId && c.tIn <= m.t + 0.5 && c.tOut >= m.t - 0.5))
    .sort((a, b) => {
      const ra = ROUND_BY_ID[a.roundId], rb = ROUND_BY_ID[b.roundId];
      const cur = (x: typeof ra) => (x.map === r.map ? 0 : 1);
      return cur(ra) - cur(rb) || ra.n - rb.n || a.t - b.t;
    });

  const editingIndex = draft?.editingId ? clips.findIndex((c) => c.id === draft.editingId) : -1;

  return (
    <section className="lineup">
      <div className="lu-head">
        <div>
          <div className="eyebrow">{SESSION.when} · {SESSION.audience}</div>
          <h2>{SESSION.title}</h2>
        </div>
        <button className="btn present" disabled={!clips.length} onClick={() => startPresent(0)} title="Run the lineup full screen, in order">
          <svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor" /></svg>
          Present
        </button>
      </div>
      <div className="lu-progress">
        <div className="lu-steps">
          {Array.from({ length: Math.max(SESSION.target, clips.length) }, (_, i) => (
            <span key={i} className={i < clips.length ? 'done' : ''} />
          ))}
        </div>
        <span className="muted small">{clips.length} of {SESSION.target} moments lined up</span>
      </div>

      <div className="lu-list">
        {clips.map((c, i) => (
          <div key={c.id}>
            {draft && !draft.editingId && draft.insertAt === i && <DraftForm />}
            {editingIndex === i ? (
              <DraftForm />
            ) : (
              <ClipCard
                c={c}
                i={i}
                dragging={dragI === i}
                over={overI === i && dragI !== null && dragI !== i}
                onDragStart={() => setDragI(i)}
                onDragEnter={() => setOverI(i)}
                onDrop={() => { if (dragI !== null) moveClip(dragI, i); setDragI(null); setOverI(null); }}
                onDragEnd={() => { setDragI(null); setOverI(null); }}
                onMove={(d) => moveClip(i, i + d)}
                last={i === clips.length - 1}
              />
            )}
          </div>
        ))}
        {draft && !draft.editingId && draft.insertAt >= clips.length && <DraftForm />}

        {!draft && remaining > 0 && (
          <button className="slot next" onClick={() => beginClip()}>
            <span className="slot-n">{clips.length + 1}</span>
            <span>
              <b>Clip the current moment</b>
              <span className="muted small"> · {MAP_LABEL[r.map]} R{r.n} {fmt(t)} from {povName(useApp.getState().pov)}</span>
            </span>
            <kbd>C</kbd>
          </button>
        )}
        {!draft && Array.from({ length: Math.max(0, remaining - 1) }, (_, i) => (
          <div key={i} className="slot"><span className="slot-n">{clips.length + 2 + i}</span><span className="muted small">Open slot</span></div>
        ))}

        {unclipped.length > 0 && (
          <div className="suggest">
            <div className="half">From your markers · not in lineup yet</div>
            {unclipped.slice(0, 6).map((m) => {
              const mr = ROUND_BY_ID[m.roundId];
              return (
                <div key={m.id} className="sg-row">
                  <button className="sg-main" onClick={() => openRound(m.roundId, Math.max(0, m.t - 4))} title="Jump to 4s before the marker">
                    <span className="mono mk-time">{mr.map !== r.map ? `${MAP_LABEL[mr.map].slice(0, 4)} ` : ''}R{mr.n} {fmt(m.t)}</span>
                    <span className="sg-text">{m.text}</span>
                  </button>
                  <button
                    className="btn-ghost xs"
                    onClick={() => { openRound(m.roundId, m.t); beginClip({ roundId: m.roundId, tIn: Math.max(0, m.t - 5), tOut: Math.min(mr.duration, m.t + 5), title: m.text }); }}
                    title="Clip ±5s around this marker"
                  >
                    + Clip
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ClipCard(props: {
  c: Clip; i: number; dragging: boolean; over: boolean; last: boolean;
  onDragStart: () => void; onDragEnter: () => void; onDrop: () => void; onDragEnd: () => void; onMove: (d: number) => void;
}) {
  const { c, i } = props;
  const r = ROUND_BY_ID[c.roundId];
  const roundId = useApp((s) => s.roundId);
  const t = useApp((s) => s.t);
  const stopAt = useApp((s) => s.stopAt);
  const playClip = useApp((s) => s.playClip);
  const editClip = useApp((s) => s.editClip);
  const removeClip = useApp((s) => s.removeClip);
  const active = roundId === c.roundId && t >= c.tIn - 0.01 && t <= c.tOut + 0.01 && stopAt === c.tOut;
  return (
    <div
      className={`clip-card ${active ? 'active' : ''} ${props.dragging ? 'dragging' : ''} ${props.over ? 'over' : ''}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.id); props.onDragStart(); }}
      onDragEnter={props.onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); props.onDrop(); }}
      onDragEnd={props.onDragEnd}
      onDoubleClick={() => editClip(c.id)}
    >
      <div className="cc-grip" title="Drag to reorder">
        <span className="cc-n">{i + 1}</span>
        <svg width="8" height="14" viewBox="0 0 8 14"><g fill="currentColor"><circle cx="2" cy="3" r="1" /><circle cx="6" cy="3" r="1" /><circle cx="2" cy="7" r="1" /><circle cx="6" cy="7" r="1" /><circle cx="2" cy="11" r="1" /><circle cx="6" cy="11" r="1" /></g></svg>
      </div>
      <button className="cc-thumb" onClick={() => playClip(c.id)} title="Play this clip">
        <Snapshot roundId={c.roundId} t={(c.tIn + c.tOut) / 2} pov={c.pov} className="cc-img" />
        <span className="cc-play">▶</span>
        <span className="cc-len mono">{Math.round((c.tOut - c.tIn) / c.speed)}s</span>
      </button>
      <div className="cc-body">
        <div className="cc-title">{c.title}</div>
        <div className="cc-meta">
          <span>{MAP_LABEL[r.map]} R{r.n}</span>
          <span className="mono">{fmt(c.tIn)}–{fmt(c.tOut)}</span>
          <span style={{ color: povColor(c.pov) }}>{povName(c.pov)}</span>
          <span className={c.speed < 1 ? 'slow' : ''}>{c.speed}×</span>
        </div>
        {c.note && <div className="cc-note">{c.note}</div>}
      </div>
      <div className="cc-actions">
        <button className="icon-btn" disabled={i === 0} onClick={() => props.onMove(-1)} title="Move up">↑</button>
        <button className="icon-btn" disabled={props.last} onClick={() => props.onMove(1)} title="Move down">↓</button>
        <button className="icon-btn" onClick={() => editClip(c.id)} title="Edit clip">
          <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 11.5 10.5 4l1.5 1.5L4.5 13H3z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
        </button>
        <button className="icon-btn danger" onClick={() => removeClip(c.id)} title="Remove from lineup">✕</button>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const t = useApp((s) => s.t);
  return (
    <div className="time-field">
      <span className="tf-label">{label}</span>
      <button type="button" className="icon-btn" onClick={() => onChange(Math.max(0, Math.round((value - 0.5) * 10) / 10))}>−</button>
      <span className="mono tf-val">{fmtPrecise(value).slice(0, -1)}</span>
      <button type="button" className="icon-btn" onClick={() => onChange(Math.round((value + 0.5) * 10) / 10)}>+</button>
      <button type="button" className="btn-ghost xs" onClick={() => onChange(Math.round(t * 10) / 10)} title="Set to playhead">⤓ playhead</button>
    </div>
  );
}

function DraftForm() {
  const draft = useApp((s) => s.draft)!;
  const clips = useApp((s) => s.clips);
  const set = useApp((s) => s.set);
  const saveDraft = useApp((s) => s.saveDraft);
  const titleRef = useRef<HTMLInputElement>(null);
  const r = ROUND_BY_ID[draft.roundId];
  const upd = (p: Partial<typeof draft>) => set({ draft: { ...draft, ...p } });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    titleRef.current?.select();
    formRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  const n = draft.editingId ? clips.length : clips.length + 1;
  const len = Math.abs(draft.tOut - draft.tIn);
  const preview = () => {
    const s = useApp.getState();
    s.openRound(draft.roundId, Math.min(draft.tIn, draft.tOut));
    set({ pov: draft.pov, speed: draft.speed, stopAt: Math.max(draft.tIn, draft.tOut), playing: true });
  };
  return (
    <form
      ref={formRef}
      className="draft"
      onSubmit={(e) => { e.preventDefault(); saveDraft(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') set({ draft: null }); }}
    >
      <div className="draft-head">
        <span className="eyebrow violet">{draft.editingId ? 'Edit clip' : 'New clip'} · {MAP_LABEL[r.map]} R{r.n}</span>
        <span className="muted tiny mono">{len.toFixed(1)}s · plays in {Math.round(len / draft.speed)}s</span>
      </div>
      <input ref={titleRef} className="draft-title" value={draft.title} placeholder="What should the team see?" onChange={(e) => upd({ title: e.target.value })} />
      <TimeField label="In" value={draft.tIn} onChange={(v) => upd({ tIn: Math.min(v, r.duration) })} />
      <TimeField label="Out" value={draft.tOut} onChange={(v) => upd({ tOut: Math.min(v, r.duration) })} />
      <div className="draft-row">
        <span className="tf-label">POV</span>
        <div className="seg tiny-seg">
          {POVS.map((p) => (
            <button type="button" key={p} className={draft.pov === p ? 'on' : ''} onClick={() => upd({ pov: p })} style={draft.pov === p ? { color: povColor(p) } : undefined}>
              {p === 'Spectator' ? 'Cam' : p}
            </button>
          ))}
        </div>
      </div>
      <div className="draft-row">
        <span className="tf-label">Speed</span>
        <div className="seg tiny-seg">
          {SPEEDS.map((s) => (
            <button type="button" key={s} className={draft.speed === s ? 'on' : ''} onClick={() => upd({ speed: s })}>{s}×</button>
          ))}
        </div>
        <span className="spacer" />
        <span className="tf-label">Show as</span>
        <select value={draft.insertAt} onChange={(e) => upd({ insertAt: Number(e.target.value) })}>
          {Array.from({ length: n }, (_, i) => (
            <option key={i} value={i}>#{i + 1}{i === n - 1 && !draft.editingId ? ' (last)' : ''}</option>
          ))}
        </select>
      </div>
      <textarea rows={2} value={draft.note} placeholder="Talking point for the meeting (optional)" onChange={(e) => upd({ note: e.target.value })} />
      <div className="row-end">
        <button type="button" className="btn-ghost xs" onClick={preview} title="Play the range with these settings">▶ Preview</button>
        <span className="spacer" />
        <button type="button" className="btn-ghost xs" onClick={() => set({ draft: null })}>Cancel</button>
        <button type="submit" className="btn xs">{draft.editingId ? 'Save clip' : `Add as #${draft.insertAt + 1}`}</button>
      </div>
    </form>
  );
}
