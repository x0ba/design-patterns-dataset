import { useState } from 'react';
import { fmt, rangesLength, usedRanges, type Clip, type Doc } from '../model';

interface Props {
  doc: Doc;
  viewClipId: string;
  onOpen: (id: string) => void;
  onAdd: (id: string) => void;
  onRecord: () => void;
}

const GROUPS: { key: string; title: string; test: (c: Clip) => boolean }[] = [
  { key: 'voice', title: 'Your narration', test: (c) => c.kind === 'narration' },
  { key: 'int', title: 'Interviews', test: (c) => c.kind === 'interview' },
  { key: 'sound', title: 'Sounds & music', test: (c) => c.kind === 'ambience' || c.kind === 'music' },
  { key: 'pick', title: 'Pickup lines', test: (c) => c.kind === 'pickup' },
];

export function Library({ doc, viewClipId, onOpen, onAdd, onRecord }: Props) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  return (
    <aside className="library">
      <div className="lib-head">
        <div>
          <h3>Clips</h3>
          <span className="muted">{doc.clips.length} in this project</span>
        </div>
        <button className="btn rec" onClick={onRecord}>
          <span className="rec-dot" /> Record
        </button>
      </div>
      <div className="lib-list">
        {GROUPS.map((g) => {
          const items = doc.clips.filter(g.test);
          if (!items.length) return null;
          const isClosed = closed[g.key];
          return (
            <div key={g.key} className="lib-group">
              <button className="lib-group-title" onClick={() => setClosed({ ...closed, [g.key]: !isClosed })}>
                <span className={`chev ${isClosed ? '' : 'open'}`}>›</span>
                {g.title}
                <span className="count">{items.length}</span>
              </button>
              {!isClosed &&
                items.map((c) => {
                  const used = rangesLength(usedRanges(doc.segs, c.id));
                  const isBed = doc.segs.some((s) => s.clipId === c.id && s.track === 'bed');
                  return (
                    <div
                      key={c.id}
                      className={`lib-item ${viewClipId === c.id ? 'on' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/ondita-clip', c.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onOpen(c.id)}
                      title="Click to open · drag onto the timeline"
                    >
                      <span className="lib-bar" style={{ background: c.color }} />
                      <div className="lib-main">
                        <div className="lib-name">{c.kind === 'ambience' ? c.short + ' · ' + c.name.split(' · ')[1].replace(/^(mercado|parada) /, '') : c.name.replace(/^Entrevista · /, '')}</div>
                        <div className="lib-sub">
                          <span className="mono">{fmt(c.duration)}</span>
                          {used > 0 ? (
                            <span className="use on">{isBed ? 'under voice' : used >= c.duration - 0.2 ? 'in story' : `${fmt(used)} used`}</span>
                          ) : (
                            <span className="use">not used</span>
                          )}
                          {c.note && <span className="lib-note">“{c.note}”</span>}
                          {c.library && <span className="lib-note">class library</span>}
                          {c.fromScript && <span className="use new">new</span>}
                        </div>
                      </div>
                      <button
                        className="lib-add"
                        title={c.kind === 'ambience' || c.kind === 'music' ? 'Add under the voice at the playhead' : 'Add to the end of the story'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdd(c.id);
                        }}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
