import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLOR, ROUND_BY_ID, TEAM_COLOR, teamOf } from '../data/scrim';
import { hash2 } from '../data/rng';
import type { GameEvent } from '../data/types';
import { fmt, useApp } from '../store';

const LABEL_W = 70;

function evLabel(e: GameEvent) {
  if (e.type === 'kill') return `${e.actor} killed ${e.victim}${e.headshot ? ' (headshot)' : ''} · ${e.weapon} · ${e.area}`;
  if (e.type === 'plant') return `${e.actor} planted the charge · ${e.area}`;
  if (e.type === 'defuse') return `${e.actor} defused · ${e.area}`;
  return `${e.actor} used ${e.ability}${e.popT && e.abilityKind === 'flash' ? ` — pops ${fmt(e.popT, true)}` : ''} · ${e.area}`;
}

export function Timeline() {
  const roundId = useApp((s) => s.roundId);
  const t = useApp((s) => s.t);
  const zoom = useApp((s) => s.zoom);
  const markers = useApp((s) => s.markers);
  const clips = useApp((s) => s.clips);
  const draft = useApp((s) => s.draft);
  const set = useApp((s) => s.set);
  const seek = useApp((s) => s.seek);
  const r = ROUND_BY_ID[roundId];
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<{ x: number; text: string; sub?: string } | null>(null);
  const drag = useRef<null | 'seek' | 'in' | 'out'>(null);

  useLayoutEffect(() => {
    const el = inner.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // view window
  const span = zoom ? 24 : r.duration;
  let v0 = zoom ? t - span / 2 : 0;
  v0 = Math.max(0, Math.min(r.duration - span, v0));
  const v1 = v0 + span;
  const X = (tt: number) => ((tt - v0) / span) * w;
  const T = (x: number) => v0 + (x / w) * span;
  const vis = (tt: number) => tt >= v0 - 1 && tt <= v1 + 1;

  const ticks = useMemo(() => {
    const step = zoom ? 2 : 10;
    const out: number[] = [];
    for (let s = Math.ceil(v0 / step) * step; s <= v1; s += step) out.push(s);
    return out;
  }, [v0, v1, zoom]);

  const onDown = (e: React.PointerEvent, mode: 'seek' | 'in' | 'out' = 'seek') => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = mode;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    move(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const rect = inner.current!.getBoundingClientRect();
    const tt = Math.max(0, Math.min(r.duration, T(e.clientX - rect.left)));
    if (drag.current === 'seek') seek(tt);
    else if (draft && draft.roundId === roundId) {
      const v = Math.round(tt * 10) / 10;
      set({ draft: { ...draft, [drag.current === 'in' ? 'tIn' : 'tOut']: v } });
      seek(v);
    }
  };
  const up = () => { drag.current = null; };

  const roundClips = clips.map((c, i) => ({ c, i })).filter(({ c }) => c.roundId === roundId);
  const roundMarkers = markers.filter((m) => m.roundId === roundId);
  const hov = (x: number, text: string, sub?: string) => () => setHover({ x, text, sub });

  return (
    <div className="timeline">
      <div className="tl-labels" style={{ width: LABEL_W }}>
        <div className="tl-lab ruler-lab">
          <button className={`zoom-btn ${zoom ? 'on' : ''}`} onClick={() => set({ zoom: !zoom })} title="Zoom to 24s around the playhead (Z)">
            {zoom ? '24s' : 'Round'}
          </button>
        </div>
        <div className="tl-lab">Events</div>
        <div className="tl-lab">Comms</div>
        <div className="tl-lab">Markers</div>
        <div className="tl-lab">Lineup</div>
      </div>
      <div
        className="tl-track"
        ref={ref}
        onPointerDown={(e) => onDown(e)}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={() => setHover(null)}
      >
        <div className="tl-inner" ref={inner}>
        {/* ruler */}
        <div className="tl-ruler">
          {ticks.map((s) => (
            <div key={s} className="tick" style={{ left: X(s) }}>
              <span>{fmt(s)}</span>
            </div>
          ))}
        </div>
        {/* phase shading */}
        {r.plantT !== undefined && (
          <div className="tl-postplant" style={{ left: X(r.plantT), width: Math.max(0, X(r.endT) - X(r.plantT)) }} title="Post-plant" />
        )}
        <div className="tl-ended" style={{ left: X(r.endT), width: Math.max(0, X(r.duration) - X(r.endT)) }} />
        <div className="tl-endline" style={{ left: X(r.endT) }}>
          <span>{r.won ? 'Won' : 'Lost'} {fmt(r.endT)}</span>
        </div>

        {/* events */}
        <div className="lane ev-lane">
          {r.events.filter((e) => vis(e.t)).map((e) => {
            const x = X(e.t);
            if (e.type === 'kill') {
              const ourLoss = teamOf(e.victim!) === 'LOW';
              return (
                <div
                  key={e.id}
                  className={`ev-kill ${ourLoss ? 'loss' : 'gain'}`}
                  style={{ left: x }}
                  onPointerEnter={hov(x, evLabel(e), fmt(e.t, true))}
                  onPointerLeave={() => setHover(null)}
                  onPointerDown={(ev) => { ev.stopPropagation(); seek(Math.max(0, e.t - 2)); }}
                >
                  {e.victim![0]}
                </div>
              );
            }
            if (e.type === 'plant' || e.type === 'defuse') {
              return (
                <div key={e.id} className={`ev-obj ${e.type}`} style={{ left: x }} onPointerEnter={hov(x, evLabel(e), fmt(e.t, true))} onPointerLeave={() => setHover(null)} onPointerDown={(ev) => { ev.stopPropagation(); seek(Math.max(0, e.t - 2)); }} />
              );
            }
            return (
              <div key={e.id} className={`ev-abil ${e.abilityKind}`} style={{ left: x, color: TEAM_COLOR[e.team] }} onPointerEnter={hov(x, evLabel(e), fmt(e.t, true))} onPointerLeave={() => setHover(null)} onPointerDown={(ev) => { ev.stopPropagation(); seek(Math.max(0, e.t - 1)); }}>
                {e.abilityKind === 'flash' && e.popT !== undefined && <span className="flash-arc" style={{ width: Math.max(2, X(e.popT) - x) }} />}
              </div>
            );
          })}
        </div>

        {/* comms waveform */}
        <div className="lane comms-lane">
          {r.comms.filter((l) => vis(l.t) || vis(l.t + l.dur)).map((l, i) => {
            const x = X(l.t), ww = Math.max(3, X(l.t + l.dur) - x);
            const bars = Math.max(2, Math.floor(ww / 3));
            return (
              <div
                key={i}
                className="cm"
                style={{ left: x, width: ww, color: PLAYER_COLOR[l.speaker] }}
                onPointerEnter={hov(x, `${l.speaker}: “${l.text}”`, fmt(l.t, true))}
                onPointerLeave={() => setHover(null)}
              >
                {Array.from({ length: bars }, (_, k) => (
                  <i key={k} style={{ height: `${25 + hash2(i * 31 + k, l.t * 10) * 75 * Math.sin(Math.PI * ((k + 0.5) / bars)) ** 0.4}%` }} />
                ))}
              </div>
            );
          })}
        </div>

        {/* markers */}
        <div className="lane mk-lane">
          {roundMarkers.filter((m) => vis(m.t)).map((m) => (
            <div
              key={m.id}
              className="mk-pin"
              style={{ left: X(m.t) }}
              onPointerEnter={hov(X(m.t), m.text, `Your marker · ${fmt(m.t)}`)}
              onPointerLeave={() => setHover(null)}
              onPointerDown={(ev) => { ev.stopPropagation(); seek(m.t); }}
            >
              <svg width="10" height="12" viewBox="0 0 10 12"><path d="M1 12V1h8L7 4l2 3H1" fill="#f5c451" /></svg>
            </div>
          ))}
        </div>

        {/* lineup clips */}
        <div className="lane clip-lane">
          {roundClips.map(({ c, i }) => (
            <div
              key={c.id}
              className="clip-bar"
              style={{ left: X(c.tIn), width: Math.max(4, X(c.tOut) - X(c.tIn)) }}
              onPointerEnter={hov(X(c.tIn), `#${i + 1} ${c.title}`, `${fmt(c.tIn)}–${fmt(c.tOut)} · ${c.pov} · ${c.speed}×`)}
              onPointerLeave={() => setHover(null)}
              onPointerDown={(ev) => { ev.stopPropagation(); seek(c.tIn); }}
            >
              #{i + 1}
            </div>
          ))}
          {draft && draft.roundId === roundId && !draft.editingId && (
            <div className="clip-bar draft" style={{ left: X(Math.min(draft.tIn, draft.tOut)), width: Math.max(4, Math.abs(X(draft.tOut) - X(draft.tIn))) }}>
              <span className="handle l" onPointerDown={(e) => onDown(e, 'in')} title="Drag clip start" />
              new
              <span className="handle r" onPointerDown={(e) => onDown(e, 'out')} title="Drag clip end" />
            </div>
          )}
          {draft && draft.roundId === roundId && draft.editingId && (
            <div className="clip-bar draft" style={{ left: X(Math.min(draft.tIn, draft.tOut)), width: Math.max(4, Math.abs(X(draft.tOut) - X(draft.tIn))) }}>
              <span className="handle l" onPointerDown={(e) => onDown(e, 'in')} />
              editing
              <span className="handle r" onPointerDown={(e) => onDown(e, 'out')} />
            </div>
          )}
        </div>

        {/* playhead */}
        <div className="playhead" style={{ left: X(t) }}>
          <span className="ph-knob" />
        </div>
        {hover && (
          <div className="tl-tip" style={{ left: Math.min(Math.max(hover.x, 90), w - 90) }}>
            <div>{hover.text}</div>
            {hover.sub && <div className="muted tiny mono">{hover.sub}</div>}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
