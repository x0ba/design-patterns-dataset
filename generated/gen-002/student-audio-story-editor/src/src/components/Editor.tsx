import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fmt, fmtPrecise, inRanges, rangesLength, usedRanges, wordMid, wordSpanRange, type Clip, type Doc, type Layout, type Word } from '../model';
import { Wave } from './Wave';

export interface TSel {
  clipId: string;
  a: number;
  b: number;
}

export interface EditorComment {
  id: string;
  n: number;
  t: number;
  done: boolean;
  active: boolean;
}

interface Props {
  clip: Clip;
  doc: Doc;
  lay: Layout;
  tsel: TSel | null;
  setTsel: (s: TSel | null) => void;
  currentSrc: number | null; // source time currently playing within this clip
  showTenses: boolean;
  setShowTenses: (v: boolean) => void;
  comments: EditorComment[];
  focus: { t: number; nonce: number } | null;
  takes: Clip[];
  onSeekSource: (t: number) => void;
  onCut: (a: number, b: number) => void;
  onRestore: (a: number, b: number) => void;
  onRerecord: (a: number, b: number, text: string) => void;
  onPlayFrom: (t: number) => void;
  onOpenClip: (id: string) => void;
  onSwapTake: (id: string) => void;
  onComment: (id: string) => void;
  onAddToStory: () => void;
}

const KIND_LABEL: Record<Clip['kind'], string> = {
  narration: 'Narration · your voice',
  interview: 'Interview',
  ambience: 'Street sound',
  music: 'Music',
  pickup: 'Pickup line · your voice',
};

export function Editor(p: Props) {
  const { clip, doc, tsel } = p;
  const used = useMemo(() => usedRanges(doc.segs, clip.id), [doc.segs, clip.id]);
  const usedLen = rangesLength(used);
  const parts = doc.segs.filter((s) => s.clipId === clip.id).length;
  const sel = tsel && tsel.clipId === clip.id ? tsel : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasWords = clip.words.length > 0;

  const curWord = useMemo(() => {
    if (p.currentSrc == null) return -1;
    const t = p.currentSrc;
    const w = clip.words;
    for (let i = 0; i < w.length; i++) {
      if (t < w[i].t0) return i > 0 && t - w[i - 1].t1 < 0.35 ? i - 1 : -1;
      if (t <= w[i].t1) return i;
    }
    return -1;
  }, [p.currentSrc, clip.words]);

  // -------- word selection by drag --------
  const dragRef = useRef<{ anchor: number; cur: number; moved: boolean } | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    const up = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      if (!d.moved) {
        p.setTsel(null);
        p.onSeekSource(clip.words[d.anchor].t0);
      }
      force((x) => x + 1);
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  });

  const L = useRef({ p, sel });
  L.current = { p, sel };
  const onWordDown = (i: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const { p, sel } = L.current;
    const clip = p.clip;
    if (e.shiftKey && sel) {
      const [a0, b0] = wordSpanRange(clip, i, i);
      p.setTsel({ clipId: clip.id, a: Math.min(sel.a, a0), b: Math.max(sel.b, b0) });
      return;
    }
    dragRef.current = { anchor: i, cur: i, moved: false };
  };
  const onWordEnter = (i: number) => {
    const { p } = L.current;
    const clip = p.clip;
    const d = dragRef.current;
    if (!d || d.cur === i) return;
    d.cur = i;
    d.moved = true;
    const [a, b] = wordSpanRange(clip, d.anchor, i);
    p.setTsel({ clipId: clip.id, a, b });
  };
  const onWordDbl = (i: number) => {
    const { p } = L.current;
    const clip = p.clip;
    const u = clip.words[i].u;
    const idx = clip.words.map((w, k) => (w.u === u ? k : -1)).filter((k) => k >= 0);
    const [a, b] = wordSpanRange(clip, idx[0], idx[idx.length - 1]);
    p.setTsel({ clipId: clip.id, a, b });
  };

  // -------- rows --------
  const rows = useMemo(() => {
    const r: { ui: number; i0: number; i1: number }[] = [];
    clip.words.forEach((w, i) => {
      const last = r[r.length - 1];
      if (last && last.ui === w.u) last.i1 = i;
      else r.push({ ui: w.u, i0: i, i1: i });
    });
    return r;
  }, [clip.words]);

  const commentAt = useMemo(() => {
    const map: Record<number, EditorComment[]> = {};
    for (const c of p.comments) {
      let best = 0;
      let bd = Infinity;
      clip.words.forEach((w, i) => {
        const d = Math.abs(wordMid(w) - c.t);
        if (d < bd) { bd = d; best = i; }
      });
      (map[best] ??= []).push(c);
    }
    return map;
  }, [p.comments, clip.words]);

  // scroll to focus target
  useLayoutEffect(() => {
    if (!p.focus || !scrollRef.current) return;
    const idx = clip.words.findIndex((w) => w.t1 >= p.focus!.t);
    const el = scrollRef.current.querySelector(`[data-i="${idx}"]`) as HTMLElement | null;
    if (el) {
      const box = scrollRef.current;
      box.scrollTo({ top: el.offsetTop - box.clientHeight / 3, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.focus?.nonce, clip.id]);

  // keep current word in view while playing
  useEffect(() => {
    if (curWord < 0 || !scrollRef.current) return;
    const box = scrollRef.current;
    const el = box.querySelector(`[data-i="${curWord}"]`) as HTMLElement | null;
    if (!el) return;
    const top = el.offsetTop - box.scrollTop;
    if (top < 20 || top > box.clientHeight - 60) box.scrollTo({ top: el.offsetTop - box.clientHeight / 3, behavior: 'smooth' });
  }, [curWord]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [clip.id]);

  // -------- overview waveform interactions --------
  const ovRef = useRef<HTMLDivElement>(null);
  const [ovW, setOvW] = useState(700);
  useLayoutEffect(() => {
    const el = ovRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setOvW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ovDown = (e: React.PointerEvent) => {
    const r = ovRef.current!.getBoundingClientRect();
    const t0 = ((e.clientX - r.left) / r.width) * clip.duration;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const t1 = Math.max(0, Math.min(clip.duration, ((ev.clientX - r.left) / r.width) * clip.duration));
      if (Math.abs(t1 - t0) * (r.width / clip.duration) > 3) moved = true;
      if (moved) p.setTsel({ clipId: clip.id, a: Math.round(Math.min(t0, t1) * 10) / 10, b: Math.round(Math.max(t0, t1) * 10) / 10 });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) {
        p.setTsel(null);
        p.onSeekSource(t0);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // -------- selection info --------
  const selInfo = useMemo(() => {
    if (!sel) return null;
    const words = clip.words.filter((w) => wordMid(w) >= sel.a && wordMid(w) <= sel.b);
    const len = sel.b - sel.a;
    let usedPart = 0;
    for (const [a, b] of used) usedPart += Math.max(0, Math.min(b, sel.b) - Math.max(a, sel.a));
    return { words, len, usedPart, text: words.map((w) => w.text).join(' ') };
  }, [sel, clip.words, used]);

  const tenseCounts = useMemo(() => {
    let pr = 0;
    let im = 0;
    for (const w of clip.words) {
      if (!inRanges(wordMid(w), used)) continue;
      if (w.tense === 'p') pr++;
      if (w.tense === 'i') im++;
    }
    return { pr, im };
  }, [clip.words, used]);

  const takeInStory = p.takes.find((t) => doc.segs.some((s) => s.clipId === t.id && s.track === 'voice'));

  return (
    <div className="editor">
      <div className="ed-head">
        <div className="ed-title-row">
          <span className="ed-dot" style={{ background: clip.color }} />
          <h2>{clip.name}</h2>
          {hasWords && (
            <label className="switch" title="Color the past-tense verbs in the transcript">
              <input type="checkbox" checked={p.showTenses} onChange={(e) => p.setShowTenses(e.target.checked)} />
              <span className="switch-track"><span /></span>
              Past tenses
            </label>
          )}
        </div>
        <div className="ed-meta">
          <span>{KIND_LABEL[clip.kind]}</span>
          <span>·</span>
          <span>{clip.library ?? `Recorded ${clip.recorded}`}</span>
          <span>·</span>
          <span className="mono">{fmt(clip.duration)}</span>
          {Object.keys(clip.speakers).length > 1 && (
            <>
              <span>·</span>
              <span>
                {Object.entries(clip.speakers).map(([k, n], i) => (
                  <span key={k}>
                    {i > 0 && ', '}
                    <b className={`spk spk-${k}`}>{n}</b>
                  </span>
                ))}
              </span>
            </>
          )}
          <span className="grow" />
          {usedLen > 0 ? (
            <span className="ed-usage">
              In story: <b className="mono">{fmt(usedLen)}</b> of {fmt(clip.duration)}
              {parts > 1 && <> · {parts} parts</>}
            </span>
          ) : (
            <span className="ed-usage off">
              Not in your story
              <button className="btn tiny" onClick={p.onAddToStory}>Add to story</button>
            </span>
          )}
        </div>
        {p.takes.length > 1 && (
          <div className="takes">
            <span className="takes-label">Takes</span>
            {p.takes.map((t) => {
              const inStory = takeInStory?.id === t.id;
              return (
                <button key={t.id} className={`take ${t.id === clip.id ? 'on' : ''}`} onClick={() => p.onOpenClip(t.id)}>
                  <b>Toma {t.takeNo}</b>
                  <span className="mono">{fmt(t.duration)}</span>
                  {inStory && <span className="take-badge">in story</span>}
                  {t.note && <i>“{t.note}”</i>}
                </button>
              );
            })}
            {takeInStory && takeInStory.id !== clip.id && (
              <button className="btn small primary-ghost" onClick={() => p.onSwapTake(clip.id)}>
                Use toma {clip.takeNo} instead of toma {takeInStory.takeNo}
              </button>
            )}
          </div>
        )}
        {p.showTenses && hasWords && (
          <div className="tense-legend">
            <span className="tl-p">pretérito</span> finished actions ({tenseCounts.pr} in story)
            <span className="tl-i">imperfecto</span> descriptions &amp; habits ({tenseCounts.im} in story)
          </div>
        )}
      </div>

      <div className="overview" ref={ovRef} onPointerDown={ovDown} title="Click to jump · drag to select a stretch">
        {used.map(([a, b], i) => (
          <div key={i} className="ov-used" style={{ left: `${(a / clip.duration) * 100}%`, width: `${((b - a) / clip.duration) * 100}%`, background: `${clip.color}14` }} />
        ))}
        <Wave peaks={clip.peaks} a={0} b={clip.duration} width={ovW} height={hasWords ? 54 : 96} color={clip.color} used={used} dimColor="#d6d1c7" bar={2} gap={1} />
        {sel && <div className="ov-sel" style={{ left: `${(sel.a / clip.duration) * 100}%`, width: `${((sel.b - sel.a) / clip.duration) * 100}%` }} />}
        {p.comments.map((c) => (
          <button
            key={c.id}
            className={`ov-pin ${c.done ? 'done' : ''}`}
            style={{ left: `${(c.t / clip.duration) * 100}%` }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => p.onComment(c.id)}
          >
            {c.done ? '✓' : c.n}
          </button>
        ))}
        {p.currentSrc != null && <div className="ov-head" style={{ left: `${(p.currentSrc / clip.duration) * 100}%` }} />}
        <div className="ov-scale">
          <span>0:00</span>
          <span>{fmt(clip.duration)}</span>
        </div>
      </div>

      <div className={`transcript ${p.showTenses ? 'tenses' : ''} ${usedLen === 0 ? 'none-used' : ''}`} ref={scrollRef}>
        {hasWords ? (
          <>
            <div className="tr-note">
              {clip.fromScript
                ? 'Transcript made from the script you read.'
                : 'Automatic transcript. Click a word to jump there, drag across words to select them.'}{' '}
              <span className="muted">Struck-out words are cut from your story; select them and choose Put back to restore.</span>
            </div>
            {rows.map((r) => {
              const words = clip.words.slice(r.i0, r.i1 + 1);
              const usedKey = words.map((w) => (inRanges(wordMid(w), used) ? '1' : '0')).join('');
              const selA = sel && sel.b >= words[0].t0 && sel.a <= words[words.length - 1].t1 ? sel.a : null;
              const selB = selA !== null ? sel!.b : null;
              const cur = curWord >= r.i0 && curWord <= r.i1 ? curWord : -1;
              const badges: Record<number, EditorComment[]> = {};
              for (let i = r.i0; i <= r.i1; i++) if (commentAt[i]) badges[i] = commentAt[i];
              const [ra, rb] = wordSpanRange(clip, r.i0, r.i1);
              return (
                <Row
                  key={`${clip.id}-${r.ui}`}
                  clip={clip}
                  words={words}
                  i0={r.i0}
                  usedKey={usedKey}
                  selA={selA}
                  selB={selB}
                  cur={cur}
                  badges={badges}
                  onWordDown={onWordDown}
                  onWordEnter={onWordEnter}
                  onWordDbl={onWordDbl}
                  onComment={(id) => L.current.p.onComment(id)}
                  onCutRow={() => L.current.p.onCut(ra, rb)}
                  onRestoreRow={() => L.current.p.onRestore(ra, rb)}
                />
              );
            })}
          </>
        ) : (
          <div className="sound-view">
            <div className="tr-note">
              {clip.kind === 'music'
                ? 'Short music piece from the class library. Good as an opener, a break between parts, or a quiet ending.'
                : 'Street sound, no speech. Drag across the waveform to pick a stretch. Sounds work best under your narration on the “Under the voice” track, so they don’t add time.'}
            </div>
            {clip.events.length > 0 && <h4>What you can hear</h4>}
            {clip.events.map((ev) => {
              const on = inRanges(ev.t, used);
              return (
                <button key={ev.t} className={`event ${on ? '' : 'off'}`} onClick={() => p.onSeekSource(ev.t)}>
                  <span className="mono">{fmt(ev.t)}</span>
                  <span>{ev.label}</span>
                  {!on && <em>not in story</em>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {sel && selInfo && (
        <div className="selbar">
          <div className="selbar-info">
            <span className="mono">{fmtPrecise(sel.a)} – {fmtPrecise(sel.b)}</span>
            <b>{selInfo.len.toFixed(1)} s selected</b>
            {selInfo.text && <span className="selbar-text">“{selInfo.text.length > 64 ? selInfo.text.slice(0, 62) + '…' : selInfo.text}”</span>}
          </div>
          <div className="selbar-actions">
            {selInfo.usedPart > 0.1 && (
              <button className="btn danger" onClick={() => p.onCut(sel.a, sel.b)} title="Delete key">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></svg>
                Cut from story
              </button>
            )}
            {selInfo.usedPart < selInfo.len - 0.1 && (
              <button className="btn" onClick={() => p.onRestore(sel.a, sel.b)}>
                ↺ Put back
              </button>
            )}
            {clip.ownVoice && selInfo.text && (
              <button className="btn rec" onClick={() => p.onRerecord(sel.a, sel.b, selInfo.text)}>
                <span className="rec-dot" /> Re-record this line
              </button>
            )}
            {selInfo.usedPart > 0.1 && (
              <button className="btn ghost" onClick={() => p.onPlayFrom(sel.a)}>▶ Play</button>
            )}
            <button className="btn ghost icon" onClick={() => p.setTsel(null)} title="Clear selection (Esc)">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  clip: Clip;
  words: Word[];
  i0: number;
  usedKey: string;
  selA: number | null;
  selB: number | null;
  cur: number;
  badges: Record<number, EditorComment[]>;
  onWordDown: (i: number, e: React.MouseEvent) => void;
  onWordEnter: (i: number) => void;
  onWordDbl: (i: number) => void;
  onComment: (id: string) => void;
  onCutRow: () => void;
  onRestoreRow: () => void;
}

const Row = memo(
  function Row(r: RowProps) {
    const spk = r.words[0].spk;
    const anyUsed = r.usedKey.includes('1');
    const allUsed = !r.usedKey.includes('0');
    return (
      <div className={`tr-row ${anyUsed ? '' : 'cut'}`}>
        <div className="tr-time mono">{fmt(r.words[0].t0)}</div>
        <div className={`tr-spk spk-${spk}`}>{r.clip.speakers[spk]}</div>
        <div className="tr-text">
          {r.words.map((w, k) => {
            const i = r.i0 + k;
            const m = wordMid(w);
            const isUsed = r.usedKey[k] === '1';
            const isSel = r.selA !== null && m >= r.selA && m <= (r.selB as number);
            const cls = ['w', isUsed ? '' : 'x', isSel ? 'sel' : '', r.cur === i ? 'cur' : '', w.tense ? `t-${w.tense}` : '', w.low ? 'low' : ''].join(' ');
            return (
              <span key={i}>
                {r.badges[i]?.map((c) => (
                  <button key={c.id} className={`tr-pin ${c.done ? 'done' : ''} ${c.active ? 'active' : ''}`} onMouseDown={(e) => e.stopPropagation()} onClick={() => r.onComment(c.id)} title="Sr. Delgado's comment">
                    {c.done ? '✓' : c.n}
                  </button>
                ))}
                <span
                  className={cls}
                  data-i={i}
                  onMouseDown={(e) => r.onWordDown(i, e)}
                  onMouseEnter={() => r.onWordEnter(i)}
                  onDoubleClick={() => r.onWordDbl(i)}
                  title={w.low ? 'The transcriber wasn’t sure about this word. Listen to it again.' : undefined}
                >
                  {w.text}
                </span>{' '}
              </span>
            );
          })}
        </div>
        <div className="tr-actions">
          {anyUsed ? (
            <button className="btn tiny" onClick={r.onCutRow} title="Cut this whole line from the story">✂ Cut line</button>
          ) : null}
          {!allUsed && (
            <button className="btn tiny" onClick={r.onRestoreRow} title="Put this line back into the story">↺ Put back</button>
          )}
        </div>
      </div>
    );
  },
  (a, b) =>
    a.clip === b.clip &&
    a.i0 === b.i0 &&
    a.words.length === b.words.length &&
    a.usedKey === b.usedKey &&
    a.selA === b.selA &&
    a.selB === b.selB &&
    a.cur === b.cur &&
    JSON.stringify(Object.entries(a.badges).map(([k, v]) => [k, v.map((c) => c.id + c.done + c.active)])) ===
      JSON.stringify(Object.entries(b.badges).map(([k, v]) => [k, v.map((c) => c.id + c.done + c.active)])),
);
