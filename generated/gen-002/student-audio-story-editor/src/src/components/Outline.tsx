import { useState } from 'react';
import { fmt, wordMid, type Clip, type Layout } from '../model';

interface Props {
  lay: Layout;
  clips: Record<string, Clip>;
  selSegId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onMove: (segId: string, toIndex: number) => void;
}

const ROLE: Record<Clip['kind'], string> = {
  narration: 'Your narration',
  pickup: 'Your voice',
  interview: 'Interview',
  ambience: 'Sound',
  music: 'Music',
};

export function Outline({ lay, clips, selSegId, onSelect, onOpen, onMove }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const n = lay.voice.length;

  return (
    <div className="outline">
      <div className="tr-note">
        The order your listener hears. Drag cards (or use the arrows) to tell the story in a different order. Sounds “under the voice” are shown inside the part they play under.
      </div>
      <ol className="ol-list">
        {lay.voice.map((s, i) => {
          const c = clips[s.clipId];
          const words = c.words.filter((w) => wordMid(w) >= s.in && wordMid(w) <= s.out);
          const excerpt = words.slice(0, 16).map((w) => w.text).join(' ');
          const beds = lay.bed.filter((b) => b.pos < s.pos + s.len - 0.5 && b.pos + b.len > s.pos + 0.5);
          return (
            <li
              key={s.id}
              className={`ol-card ${selSegId === s.id ? 'sel' : ''} ${dragId === s.id ? 'dragging' : ''} ${overIdx === i && dragId && dragId !== s.id ? 'over' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragId(s.id);
                e.dataTransfer.setData('text/ondita-seg', s.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverIdx(null);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverIdx(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== s.id) onMove(dragId, i);
                setDragId(null);
                setOverIdx(null);
              }}
              onClick={() => onSelect(s.id)}
              onDoubleClick={() => onOpen(s.id)}
            >
              <span className="ol-grip" aria-hidden>⋮⋮</span>
              <span className="ol-num">{i + 1}</span>
              <span className="ol-bar" style={{ background: c.color }} />
              <div className="ol-main">
                <div className="ol-top">
                  <b>{c.name}</b>
                  <span className="ol-role">{ROLE[c.kind]}</span>
                </div>
                {excerpt ? (
                  <div className="ol-excerpt" lang="es">
                    “{excerpt}
                    {words.length > 16 ? '…' : ''}”
                  </div>
                ) : (
                  <div className="ol-excerpt muted">{c.events.filter((e) => e.t >= s.in && e.t <= s.out).map((e) => e.label).join(' · ') || 'Sound'}</div>
                )}
                {beds.map((b) => (
                  <div key={b.id} className="ol-bed">
                    <span style={{ background: clips[b.clipId].color }} /> {clips[b.clipId].short} plays underneath · {fmt(b.len)} · {b.gain} dB
                  </div>
                ))}
              </div>
              <div className="ol-times">
                <span className="mono ol-dur">{fmt(s.len)}</span>
                <span className="mono muted small">
                  {fmt(s.pos)}–{fmt(s.pos + s.len)}
                </span>
              </div>
              <div className="ol-arrows">
                <button className="btn tiny ghost" disabled={i === 0} onClick={(e) => { e.stopPropagation(); onMove(s.id, i - 1); }} title="Move earlier">↑</button>
                <button className="btn tiny ghost" disabled={i === n - 1} onClick={(e) => { e.stopPropagation(); onMove(s.id, i + 1); }} title="Move later">↓</button>
                <button className="btn tiny ghost" onClick={(e) => { e.stopPropagation(); onOpen(s.id); }} title="Open transcript">Open</button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="ol-total">
        <span>{n} parts</span>
        <span className="mono">Total {fmt(lay.total)}</span>
      </div>
    </div>
  );
}
