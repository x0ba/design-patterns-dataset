import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fmt, layout, TARGET_MAX, TARGET_MIN, type Clip, type Doc, type Layout, type Placed, type Segment } from '../model';
import type { Action } from '../store';
import { Wave } from './Wave';

export interface PinInfo {
  id: string;
  n: number;
  pos: number;
  status: 'ok' | 'cut' | 'gone';
  done: boolean;
  active: boolean;
  text: string;
}

interface Props {
  doc: Doc;
  lay: Layout;
  clips: Record<string, Clip>;
  pps: number;
  playhead: number;
  selSegId: string | null;
  pins: PinInfo[];
  onSeek: (t: number) => void;
  onSelectSeg: (id: string | null) => void;
  dispatch: (a: Action) => void;
  commit: (fn: (d: Doc) => Doc, toast?: string) => void;
  onPin: (id: string) => void;
  onDropClip: (clipId: string, track: 'voice' | 'bed', at: number) => void;
  onWidth: (w: number) => void;
}

const PAD = 14;
const RULER_H = 30;
const VOICE_TOP = RULER_H + 8;
const VOICE_H = 94;
const BED_TOP = VOICE_TOP + VOICE_H + 10;
const BED_H = 62;
const CONTENT_H = BED_TOP + BED_H + 10;

type Drag =
  | {
      kind: 'move';
      segId: string;
      from: 'voice' | 'bed';
      grabDx: number;
      startX: number;
      startY: number;
      cx: number;
      started: boolean;
      lane: 'voice' | 'bed';
      index: number;
      bedStart: number;
      len: number;
      clickT: number;
    }
  | { kind: 'trim'; segId: string; edge: 'l' | 'r'; startX: number; orig: Segment }
  | { kind: 'scrub' };

export function Timeline(p: Props) {
  const { doc, lay, clips, pps } = p;
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const [dropHint, setDropHint] = useState<{ lane: 'voice' | 'bed'; x: number; w: number } | null>(null);

  const X = (t: number) => PAD + t * pps;
  const span = Math.max(lay.total, TARGET_MAX) + 40;
  const [viewW, setViewW] = useState(1200);
  const contentW = Math.max(viewW, X(span) + 160);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewW(el.clientWidth);
      p.onWidth(el.clientWidth - PAD - 24);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the playhead in view while playing
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const x = X(p.playhead);
    if (x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = x - 120;
    else if (x < el.scrollLeft) el.scrollLeft = Math.max(0, x - 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.playhead, pps]);

  const local = (clientX: number, clientY: number) => {
    const r = contentRef.current!.getBoundingClientRect();
    return { cx: clientX - r.left, cy: clientY - r.top };
  };

  const laneAt = (cy: number): 'voice' | 'bed' | null => {
    if (cy >= VOICE_TOP - 30 && cy < BED_TOP - 4) return 'voice';
    if (cy >= BED_TOP - 4 && cy < CONTENT_H + 60) return 'bed';
    return null;
  };

  const othersVoice = (segId: string) => doc.segs.filter((s) => s.track === 'voice' && s.id !== segId);

  const voiceIndexFor = (segId: string, centerT: number) => {
    let t = 0;
    let idx = 0;
    for (const s of othersVoice(segId)) {
      const len = s.out - s.in;
      if (t + len / 2 < centerT) idx++;
      t += len;
    }
    return idx;
  };

  const snapBed = (start: number, segId: string, fromVoice: boolean) => {
    const base = fromVoice ? layout(othersVoice(segId).concat(doc.segs.filter((s) => s.track === 'bed'))) : lay;
    const pts = [0];
    for (const s of base.voice) pts.push(s.pos, s.pos + s.len);
    let best = start;
    let bestD = 10 / pps;
    for (const q of pts) {
      if (Math.abs(q - start) < bestD) {
        bestD = Math.abs(q - start);
        best = q;
      }
    }
    return Math.max(0, best);
  };

  // global pointer handling for drags
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const { cx, cy } = local(e.clientX, e.clientY);
      if (d.kind === 'scrub') {
        p.onSeek(Math.max(0, Math.min(lay.total, (cx - PAD) / pps)));
      } else if (d.kind === 'trim') {
        const clip = clips[d.orig.clipId];
        const dt = (e.clientX - d.startX) / pps;
        p.dispatch({
          type: 'apply',
          live: true,
          fn: (doc) => ({
            ...doc,
            segs: doc.segs.map((s) => {
              if (s.id !== d.segId) return s;
              if (d.edge === 'l') {
                let nin = Math.min(Math.max(0, d.orig.in + dt), d.orig.out - 0.5);
                if (s.track === 'bed') {
                  const ns = d.orig.start + (nin - d.orig.in);
                  if (ns < 0) nin = d.orig.in - d.orig.start;
                  return { ...s, in: nin, start: Math.max(0, d.orig.start + (nin - d.orig.in)) };
                }
                return { ...s, in: nin };
              }
              const nout = Math.max(d.orig.in + 0.5, Math.min(clip.duration, d.orig.out + dt));
              return { ...s, out: nout };
            }),
          }),
        });
      } else if (d.kind === 'move') {
        const started = d.started || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 4;
        if (!started) return;
        const lane = laneAt(cy) ?? d.lane;
        const leftT = (cx - d.grabDx - PAD) / pps;
        const next: Drag = { ...d, started, cx, lane };
        if (lane === 'voice') next.index = voiceIndexFor(d.segId, leftT + d.len / 2);
        else next.bedStart = snapBed(leftT, d.segId, d.from === 'voice');
        setDrag(next);
      }
    };
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      if (d.kind === 'trim') p.dispatch({ type: 'endGesture' });
      if (d.kind !== 'move') return;
      if (!d.started) {
        p.onSeek(d.clickT);
        return;
      }
      const seg = doc.segs.find((s) => s.id === d.segId)!;
      const clip = clips[seg.clipId];
      if (d.lane === 'voice') {
        const others = othersVoice(d.segId);
        const moved: Segment = { ...seg, track: 'voice', gain: d.from === 'bed' ? 0 : seg.gain, start: 0 };
        const target = others[d.index];
        p.commit((doc) => {
          const rest = doc.segs.filter((s) => s.id !== d.segId);
          const i = target ? rest.findIndex((s) => s.id === target.id) : rest.length;
          const out = [...rest];
          out.splice(i, 0, moved);
          return { ...doc, segs: out };
        }, d.from === 'bed' ? `Moved ${clip.short} back into the story track` : `Moved ${clip.short} to position ${d.index + 1}`);
      } else {
        const moved: Segment = { ...seg, track: 'bed', start: d.bedStart, gain: d.from === 'voice' ? -14 : seg.gain };
        p.commit(
          (doc) => ({ ...doc, segs: [...doc.segs.filter((s) => s.id !== d.segId), moved] }),
          d.from === 'voice' ? `${clip.short} now plays under the voice at ${fmt(d.bedStart)} — the story got ${fmt(seg.out - seg.in)} shorter` : undefined,
        );
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null, doc, lay, pps]);

  const onSegDown = (e: React.PointerEvent, s: Placed) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const { cx } = local(e.clientX, e.clientY);
    p.onSelectSeg(s.id);
    setDrag({
      kind: 'move',
      segId: s.id,
      from: s.track,
      grabDx: cx - X(s.pos),
      startX: e.clientX,
      startY: e.clientY,
      cx,
      started: false,
      lane: s.track,
      index: 0,
      bedStart: s.pos,
      len: s.len,
      clickT: Math.max(0, (cx - PAD) / pps),
    });
  };

  const onTrimDown = (e: React.PointerEvent, s: Placed, edge: 'l' | 'r') => {
    e.stopPropagation();
    p.onSelectSeg(s.id);
    p.dispatch({ type: 'checkpoint' });
    const orig = doc.segs.find((x) => x.id === s.id)!;
    setDrag({ kind: 'trim', segId: s.id, edge, startX: e.clientX, orig });
  };

  const onRulerDown = (e: React.PointerEvent) => {
    const { cx } = local(e.clientX, e.clientY);
    p.onSeek(Math.max(0, Math.min(lay.total, (cx - PAD) / pps)));
    setDrag({ kind: 'scrub' });
  };

  const onLaneDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const { cx } = local(e.clientX, e.clientY);
    p.onSelectSeg(null);
    p.onSeek(Math.max(0, Math.min(lay.total, (cx - PAD) / pps)));
  };

  // ---- preview layout while dragging ----
  const moving = drag?.kind === 'move' && drag.started ? drag : null;
  const preview = useMemo(() => {
    if (!moving) return lay;
    const seg = doc.segs.find((s) => s.id === moving.segId)!;
    const others = doc.segs.filter((s) => s.id !== moving.segId);
    if (moving.lane === 'voice') {
      const voice = others.filter((s) => s.track === 'voice');
      const ph: Segment = { ...seg, id: '__ph', track: 'voice' };
      voice.splice(moving.index, 0, ph);
      return layout([...voice, ...others.filter((s) => s.track === 'bed')]);
    }
    return layout([...others, { ...seg, id: '__ph', track: 'bed', start: moving.bedStart }]);
  }, [moving, doc.segs, lay]);

  // ---- ruler ticks ----
  const ticks = useMemo(() => {
    const majors = [5, 10, 15, 30, 60, 120];
    const major = majors.find((m) => m * pps >= 64) ?? 120;
    const minor = major * pps / 5 >= 9 ? major / 5 : major / 2;
    const out: { t: number; major: boolean }[] = [];
    for (let t = 0; t <= span + 60; t += minor) out.push({ t: Math.round(t * 100) / 100, major: Math.abs(t / major - Math.round(t / major)) < 1e-6 });
    return out;
  }, [pps, span]);

  // ---- library drop ----
  const dragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('text/ondita-clip')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const { cx, cy } = local(e.clientX, e.clientY);
    const lane = laneAt(cy) ?? 'voice';
    const t = Math.max(0, (cx - PAD) / pps);
    if (lane === 'voice') {
      // boundary nearest to t
      let best = lay.voiceEnd;
      let bd = Infinity;
      const bounds = [0, ...lay.voice.map((s) => s.pos + s.len)];
      for (const b of bounds) if (Math.abs(b - t) < bd) { bd = Math.abs(b - t); best = b; }
      setDropHint({ lane, x: X(best), w: 0 });
    } else setDropHint({ lane, x: X(t), w: 0 });
  };
  const drop = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData('text/ondita-clip');
    setDropHint(null);
    if (!id) return;
    e.preventDefault();
    const { cx, cy } = local(e.clientX, e.clientY);
    const lane = laneAt(cy) ?? 'voice';
    const t = Math.max(0, (cx - PAD) / pps);
    if (lane === 'voice') {
      const bounds = [0, ...lay.voice.map((s) => s.pos + s.len)];
      let idx = 0;
      let bd = Infinity;
      bounds.forEach((b, i) => { if (Math.abs(b - t) < bd) { bd = Math.abs(b - t); idx = i; } });
      p.onDropClip(id, 'voice', idx);
    } else p.onDropClip(id, 'bed', t);
  };

  const renderSeg = (s: Placed, lane: 'voice' | 'bed') => {
    if (s.id === '__ph') {
      return <div key="__ph" className={`seg-ph ${lane}`} style={{ left: X(s.pos), width: Math.max(4, s.len * pps - 2) }} />;
    }
    const clip = clips[s.clipId];
    const w = Math.max(3, s.len * pps - 2);
    const h = lane === 'voice' ? VOICE_H : BED_H;
    const sel = p.selSegId === s.id;
    const isDragged = moving?.segId === s.id;
    const trimming = drag?.kind === 'trim' && drag.segId === s.id;
    return (
      <div
        key={s.id}
        className={`seg ${lane} ${sel ? 'sel' : ''} ${isDragged ? 'dragged' : ''} ${moving ? 'anim' : ''}`}
        style={{ left: X(s.pos), width: w, height: h, ['--c' as string]: clip.color }}
        onPointerDown={(e) => onSegDown(e, s)}
        title={`${clip.name} · ${fmt(s.len)}`}
      >
        <div className="seg-label">
          {w > 36 && <span className="seg-name">{clip.short}</span>}
          {w > 84 && <span className="seg-dur">{fmt(s.len)}</span>}
          {lane === 'bed' && w > 130 && <span className="seg-gain">{s.gain} dB</span>}
        </div>
        <Wave className="seg-wave" peaks={clip.peaks} a={s.in} b={s.out} width={w - 4} height={h - 26} color={lane === 'bed' ? `${clip.color}aa` : clip.color} />
        {sel && (
          <>
            <div className="trim l" onPointerDown={(e) => onTrimDown(e, s, 'l')} title="Drag to trim the start" />
            <div className="trim r" onPointerDown={(e) => onTrimDown(e, s, 'r')} title="Drag to trim the end" />
          </>
        )}
        {trimming && <div className="trim-tip">{fmt(s.len)}</div>}
      </div>
    );
  };

  const ghost = moving
    ? (() => {
        const seg = doc.segs.find((s) => s.id === moving.segId)!;
        const clip = clips[seg.clipId];
        const lane = moving.lane;
        const top = lane === 'voice' ? VOICE_TOP : BED_TOP;
        const h = lane === 'voice' ? VOICE_H : BED_H;
        const left = lane === 'bed' ? X(moving.bedStart) : moving.cx - moving.grabDx;
        return (
          <div className="seg ghost" style={{ left, top, width: moving.len * pps - 2, height: h, ['--c' as string]: clip.color }}>
            <div className="seg-label">
              <span className="seg-name">{clip.short}</span>
              <span className="seg-dur">{fmt(moving.len)}</span>
            </div>
            <Wave className="seg-wave" peaks={clip.peaks} a={seg.in} b={seg.out} width={moving.len * pps - 6} height={h - 26} color={clip.color} />
          </div>
        );
      })()
    : null;

  const shown = preview;

  return (
    <div className="timeline">
      <div className="tl-heads">
        <div className="tl-head-ruler" style={{ height: VOICE_TOP }} />
        <div className="tl-head" style={{ height: VOICE_H, marginBottom: 10 }}>
          <div className="tl-head-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            Story
          </div>
          <div className="tl-head-sub">Voices in order. Each clip plays after the one before it.</div>
        </div>
        <div className="tl-head" style={{ height: BED_H }}>
          <div className="tl-head-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" /></svg>
            Under the voice
          </div>
          <div className="tl-head-sub">Sounds &amp; music play quietly underneath.</div>
        </div>
      </div>
      <div className="tl-scroll" ref={scrollRef}>
        <div
          className="tl-content"
          ref={contentRef}
          style={{ width: contentW, height: CONTENT_H }}
          onDragOver={dragOver}
          onDragLeave={() => setDropHint(null)}
          onDrop={drop}
        >
          {/* over-limit shading */}
          <div className="over-zone" style={{ left: X(TARGET_MAX), top: RULER_H, height: CONTENT_H - RULER_H }} />
          <div className="limit-line" style={{ left: X(TARGET_MAX), top: 0, height: CONTENT_H }} />

          <div className="ruler" style={{ height: RULER_H }} onPointerDown={onRulerDown}>
            <div className="target-zone" style={{ left: X(TARGET_MIN), width: (TARGET_MAX - TARGET_MIN) * pps }} title="Target length: 3:00–4:00" />
            {ticks.map((t) => (
              <div key={t.t} className={`tick ${t.major ? 'major' : ''}`} style={{ left: X(t.t) }}>
                {t.major && <span>{fmt(t.t)}</span>}
              </div>
            ))}
            <div className="limit-flag" style={{ left: X(TARGET_MAX) }}>4:00</div>
            {p.pins
              .filter((pin) => pin.status !== 'gone')
              .map((pin) => (
                <button
                  key={pin.id}
                  className={`pin ${pin.done ? 'done' : ''} ${pin.active ? 'active' : ''}`}
                  style={{ left: X(pin.pos) }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => p.onPin(pin.id)}
                  title={pin.text}
                >
                  {pin.done ? '✓' : pin.n}
                </button>
              ))}
          </div>

          {p.pins
            .filter((pin) => pin.status !== 'gone')
            .map((pin) => (
              <div key={pin.id} className={`pin-line ${pin.active ? 'active' : ''} ${pin.done ? 'done' : ''}`} style={{ left: X(pin.pos), top: RULER_H, height: VOICE_H + 8 }} />
            ))}

          <div className="lane voice" style={{ top: VOICE_TOP, height: VOICE_H }} onPointerDown={onLaneDown}>
            {shown.voice.map((s) => renderSeg(s, 'voice'))}
            {!moving && (
              <div className="end-slot" style={{ left: X(lay.voiceEnd) + 6, height: VOICE_H }}>
                <span>Drop a clip here</span>
              </div>
            )}
          </div>
          <div className="lane bed" style={{ top: BED_TOP, height: BED_H }} onPointerDown={onLaneDown}>
            {shown.bed.map((s) => renderSeg(s, 'bed'))}
            {lay.bed.length === 0 && !moving && <div className="bed-empty" style={{ left: X(0) + 8 }}>Drag sound clips here (like the market) so they play under your narration instead of adding time.</div>}
          </div>

          {ghost}

          {dropHint && (
            <div
              className="drop-hint"
              style={{ left: dropHint.x - 1, top: dropHint.lane === 'voice' ? VOICE_TOP - 4 : BED_TOP - 4, height: (dropHint.lane === 'voice' ? VOICE_H : BED_H) + 8 }}
            />
          )}

          <div className="end-flag" style={{ left: X(lay.total), top: VOICE_TOP - 6, height: CONTENT_H - VOICE_TOP + 6 }}>
            <span>End {fmt(lay.total)}</span>
          </div>
          <div className="playhead" style={{ left: X(p.playhead), height: CONTENT_H }}>
            <div className="playhead-knob" />
          </div>
        </div>
      </div>
    </div>
  );
}
