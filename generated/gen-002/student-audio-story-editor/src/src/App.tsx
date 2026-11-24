import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { COURSE, DUE, initialClips, initialSegs, NOW, PROJECT, STUDENT, TEACHER, teacherComments, type TeacherComment } from './data';
import {
  cutRange,
  fmt,
  fmtPrecise,
  inRanges,
  layout,
  locate,
  mapAnchor,
  plainText,
  rangesLength,
  replaceRangeWith,
  restoreRange,
  splitSeg,
  storyPosOf,
  TARGET_MAX,
  TARGET_MIN,
  uid,
  usedRanges,
  wordMid,
  wordSpanRange,
  type Clip,
  type Doc,
  type Segment,
} from './model';
import { histReducer } from './store';
import { Editor, type TSel } from './components/Editor';
import { Library } from './components/Library';
import { Outline } from './components/Outline';
import { Recorder, type Placement, type RecorderInit } from './components/Recorder';
import { SidePanel, type Check, type LiveComment } from './components/SidePanel';
import { Timeline, type PinInfo } from './components/Timeline';

interface Toast {
  id: number;
  text: string;
  undo?: boolean;
}

export default function App() {
  const [hist, dispatch] = useReducer(histReducer, { past: [], present: { clips: initialClips, segs: initialSegs }, future: [] });
  const doc = hist.present;
  const lay = useMemo(() => layout(doc.segs), [doc.segs]);
  const clips = useMemo(() => Object.fromEntries(doc.clips.map((c) => [c.id, c])) as Record<string, Clip>, [doc.clips]);
  const docRef = useRef(doc);
  docRef.current = doc;
  const layRef = useRef(lay);
  layRef.current = lay;

  const [selSegId, setSelSegId] = useState<string | null>('seg-rosa');
  const [viewClipId, setViewClipId] = useState('rosa');
  const [tsel, setTsel] = useState<TSel | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<'transcript' | 'outline'>('transcript');
  const [showTenses, setShowTenses] = useState(false);
  const [tab, setTab] = useState<'feedback' | 'rubric'>('feedback');
  const [cstate, setCstate] = useState<Record<string, { done: boolean; replies: { text: string; when: string }[] }>>(() =>
    Object.fromEntries(teacherComments.map((c) => [c.id, { done: false, replies: [] }])),
  );
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ t: number; nonce: number } | null>(null);
  const [recorder, setRecorder] = useState<RecorderInit | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fitW, setFitW] = useState(1150);
  const [zoom, setZoom] = useState(1);
  const [savedAt, setSavedAt] = useState('7:38 PM');

  const [fitSpan, setFitSpan] = useState(() => Math.max(layout(initialSegs).total, TARGET_MAX) + 40);
  const pps = (fitW / fitSpan) * zoom;

  // ---------- toasts ----------
  const toastN = useRef(0);
  const toast = useCallback((text: string, undo = true) => {
    const id = ++toastN.current;
    setToasts([{ id, text, undo }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const commit = useCallback(
    (fn: (d: Doc) => Doc, msg?: string) => {
      dispatch({ type: 'apply', fn });
      if (msg) toast(msg);
    },
    [toast],
  );

  // autosave indicator
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const d = new Date();
    setSavedAt(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
  }, [doc]);

  // ---------- playback ----------
  const totalRef = useRef(lay.total);
  totalRef.current = lay.total;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPlayhead((p) => Math.min(totalRef.current, p + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => {
    if (playing && playhead >= lay.total - 0.001) setPlaying(false);
  }, [playhead, playing, lay.total]);

  const loc = locate(lay, playhead);
  const curSegId = loc?.seg.id ?? null;

  // follow the playing clip in the transcript
  useEffect(() => {
    if (!playing || !loc) return;
    if (loc.seg.id !== selSegId) {
      setSelSegId(loc.seg.id);
      if (loc.seg.clipId !== viewClipId) {
        setViewClipId(loc.seg.clipId);
        setTsel(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curSegId, playing]);

  // real audio for takes recorded in this session
  const audioRef = useRef<{ el: HTMLAudioElement; segId: string } | null>(null);
  useEffect(() => {
    const cur = audioRef.current;
    const seg = loc?.seg;
    const url = seg ? clips[seg.clipId]?.audioUrl : undefined;
    if (!playing || !seg || !url) {
      if (cur) {
        cur.el.pause();
        audioRef.current = null;
      }
      return;
    }
    if (cur && cur.segId === seg.id) return;
    cur?.el.pause();
    const el = new Audio(url);
    el.currentTime = loc!.src;
    el.play().catch(() => {});
    audioRef.current = { el, segId: seg.id };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, curSegId]);

  const seek = useCallback((t: number) => {
    setPlayhead(Math.max(0, Math.min(totalRef.current, t)));
    if (audioRef.current) {
      audioRef.current.el.pause();
      audioRef.current = null;
    }
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && playheadRef.current >= totalRef.current - 0.05) setPlayhead(0);
      return !p;
    });
  }, []);
  const playheadRef = useRef(playhead);
  playheadRef.current = playhead;

  // ---------- selection helpers ----------
  const viewClip = clips[viewClipId] ?? doc.clips[0];

  const selectSeg = useCallback((id: string | null) => {
    setSelSegId(id);
    if (!id) return;
    const s = docRef.current.segs.find((x) => x.id === id);
    if (s) {
      setViewClipId((prev) => {
        if (prev !== s.clipId) setTsel(null);
        return s.clipId;
      });
    }
  }, []);

  const openClip = useCallback((clipId: string) => {
    setViewClipId(clipId);
    setTsel(null);
    setView('transcript');
    const s = docRef.current.segs.find((x) => x.clipId === clipId);
    setSelSegId(s ? s.id : null);
  }, []);

  const seekSource = useCallback(
    (t: number) => {
      const pos = storyPosOf(layRef.current, viewClipId, t);
      if (pos !== null) {
        seek(pos);
        const seg = locate(layRef.current, pos)?.seg;
        if (seg && seg.clipId === viewClipId) setSelSegId(seg.id);
      } else toast('That part isn’t in your story right now. Select it and choose “Put back” to use it.', false);
    },
    [viewClipId, seek, toast],
  );

  // ---------- editing actions ----------
  const usedOf = (d: Doc, clipId: string) => rangesLength(usedRanges(d.segs, clipId));

  const cutSel = useCallback(
    (a: number, b: number) => {
      const d = docRef.current;
      const clip = clips[viewClipId];
      const before = usedOf(d, viewClipId);
      const segs = cutRange(d.segs, viewClipId, a, b);
      const after = rangesLength(usedRanges(segs, viewClipId));
      if (before - after < 0.05) return;
      commit((x) => ({ ...x, segs: cutRange(x.segs, viewClipId, a, b) }), `Cut ${(before - after).toFixed(1)} s from ${clip.short}`);
      setTsel(null);
      if (!segs.some((s) => s.id === selSegId)) setSelSegId(segs.find((s) => s.clipId === viewClipId)?.id ?? null);
    },
    [clips, viewClipId, commit, selSegId],
  );

  const restoreSel = useCallback(
    (a: number, b: number) => {
      const d = docRef.current;
      const clip = clips[viewClipId];
      const before = usedOf(d, viewClipId);
      const segs = restoreRange(d.segs, clip, a, b);
      const after = rangesLength(usedRanges(segs, viewClipId));
      commit((x) => ({ ...x, segs: restoreRange(x.segs, clip, a, b) }), `Put back ${(after - before).toFixed(1)} s of ${clip.short}`);
      setTsel(null);
    },
    [clips, viewClipId, commit],
  );

  const deleteSeg = useCallback(
    (id: string) => {
      const s = docRef.current.segs.find((x) => x.id === id);
      if (!s) return;
      commit((d) => ({ ...d, segs: d.segs.filter((x) => x.id !== id) }), `Removed ${clips[s.clipId].short} (${fmt(s.out - s.in)}) from the story`);
      setSelSegId(null);
    },
    [clips, commit],
  );

  const splitAtPlayhead = useCallback(() => {
    const l = layRef.current;
    const t = playheadRef.current;
    const pick = [...l.voice, ...l.bed].find((s) => s.id === selSegId && t > s.pos + 0.2 && t < s.pos + s.len - 0.2) ?? locate(l, t)?.seg;
    if (!pick) return;
    const src = pick.in + (t - pick.pos);
    commit((d) => ({ ...d, segs: splitSeg(d.segs, pick.id, src) }), `Split ${clips[pick.clipId].short} at ${fmt(t)}`);
  }, [selSegId, clips, commit]);

  const moveUnder = useCallback(
    (id: string) => {
      const l = layRef.current;
      const i = l.voice.findIndex((s) => s.id === id);
      if (i < 0) return;
      const seg = l.voice[i];
      const host = l.voice[i - 1] ?? l.voice[i + 1];
      if (!host) return;
      const clip = clips[seg.clipId];
      const hostPos = i > 0 ? host.pos : 0;
      const want = Math.max(seg.len, host.len);
      const nin = Math.max(0, Math.min(seg.in, clip.duration - want));
      const nout = Math.min(clip.duration, nin + want);
      commit(
        (d) => ({
          ...d,
          segs: [...d.segs.filter((s) => s.id !== id), { ...d.segs.find((s) => s.id === id)!, track: 'bed', start: hostPos, in: nin, out: nout, gain: -14 }],
        }),
        `${clip.short} now plays quietly under ${clips[host.clipId].short} (${fmt(nout - nin)}). The story is ${fmt(seg.len)} shorter.`,
      );
    },
    [clips, commit],
  );

  const moveIntoStory = useCallback(
    (id: string) => {
      const l = layRef.current;
      const seg = l.bed.find((s) => s.id === id);
      if (!seg) return;
      const idx = l.voice.filter((v) => v.pos + v.len / 2 <= seg.pos).length;
      commit((d) => {
        const rest = d.segs.filter((s) => s.id !== id);
        const voice = rest.filter((s) => s.track === 'voice');
        const target = voice[idx];
        const out = [...rest];
        out.splice(target ? out.indexOf(target) : out.length, 0, { ...d.segs.find((s) => s.id === id)!, track: 'voice', gain: 0, start: 0 });
        return { ...d, segs: out };
      }, `${clips[seg.clipId].short} moved back into the story track`);
    },
    [clips, commit],
  );

  const moveToIndex = useCallback(
    (id: string, to: number) => {
      commit((d) => {
        const seg = d.segs.find((s) => s.id === id)!;
        const rest = d.segs.filter((s) => s.id !== id);
        const voice = rest.filter((s) => s.track === 'voice');
        const target = voice[to];
        const out = [...rest];
        out.splice(target ? out.indexOf(target) : out.length, 0, seg);
        return { ...d, segs: out };
      }, `Moved ${clips[docRef.current.segs.find((s) => s.id === id)!.clipId].short} to position ${to + 1}`);
    },
    [clips, commit],
  );

  const addClip = useCallback(
    (clipId: string) => {
      const c = clips[clipId];
      const isSound = c.kind === 'ambience' || c.kind === 'music';
      const seg: Segment = {
        id: uid(),
        clipId,
        track: isSound ? 'bed' : 'voice',
        in: 0,
        out: c.duration,
        start: isSound ? Math.min(playheadRef.current, layRef.current.voiceEnd) : 0,
        gain: isSound ? (c.kind === 'music' ? -10 : -14) : 0,
      };
      commit((d) => ({ ...d, segs: [...d.segs, seg] }), isSound ? `${c.short} added under the voice at ${fmt(seg.start)}` : `${c.short} added at the end (+${fmt(c.duration)})`);
      setSelSegId(seg.id);
      setViewClipId(clipId);
    },
    [clips, commit],
  );

  const dropClip = useCallback(
    (clipId: string, track: 'voice' | 'bed', at: number) => {
      const c = clips[clipId];
      const seg: Segment = { id: uid(), clipId, track, in: 0, out: c.duration, start: track === 'bed' ? at : 0, gain: track === 'bed' ? (c.kind === 'music' ? -10 : -14) : 0 };
      commit((d) => {
        if (track === 'bed') return { ...d, segs: [...d.segs, seg] };
        const voice = d.segs.filter((s) => s.track === 'voice');
        const target = voice[at];
        const out = [...d.segs];
        out.splice(target ? out.indexOf(target) : out.length, 0, seg);
        return { ...d, segs: out };
      }, track === 'bed' ? `${c.short} added under the voice` : `${c.short} added to the story (+${fmt(c.duration)})`);
      setSelSegId(seg.id);
      setViewClipId(clipId);
      setTsel(null);
    },
    [clips, commit],
  );

  const swapTake = useCallback(
    (newId: string) => {
      const nc = clips[newId];
      const d = docRef.current;
      const old = d.segs.filter((s) => s.track === 'voice' && clips[s.clipId].takeGroup === nc.takeGroup && s.clipId !== newId);
      if (!old.length) return;
      const oldClip = clips[old[0].clipId];
      const newSeg: Segment = { id: uid(), clipId: newId, track: 'voice', in: 0, out: nc.duration, start: 0, gain: 0 };
      commit((x) => {
        const out: Segment[] = [];
        let placed = false;
        for (const s of x.segs) {
          if (old.some((o) => o.id === s.id)) {
            if (!placed) {
              out.push(newSeg);
              placed = true;
            }
          } else out.push(s);
        }
        return { ...x, segs: out };
      }, `Swapped toma ${oldClip.takeNo} for toma ${nc.takeNo} (${fmt(nc.duration)})`);
      setSelSegId(newSeg.id);
    },
    [clips, commit],
  );

  const setGain = (id: string, gain: number, live: boolean) => {
    dispatch({ type: 'apply', live, fn: (d) => ({ ...d, segs: d.segs.map((s) => (s.id === id ? { ...s, gain } : s)) }) });
  };

  // ---------- recording ----------
  const openRerecord = useCallback(
    (a: number, b: number, text: string) => {
      setRecorder({ mode: 'replace', clipId: viewClipId, clipName: clips[viewClipId].name, a, b, script: text });
    },
    [viewClipId, clips],
  );

  const onRecorded = (clip: Clip, placement: Placement) => {
    const init = recorder!;
    const seg: Segment = { id: uid(), clipId: clip.id, track: 'voice', in: 0, out: clip.duration, start: 0, gain: 0 };
    commit(
      (d) => {
        const clipsN = [...d.clips, clip];
        if (placement === 'library') return { ...d, clips: clipsN };
        if (placement === 'replace' && init.clipId != null) return { clips: clipsN, segs: replaceRangeWith(d.segs, init.clipId, init.a!, init.b!, seg) };
        return { clips: clipsN, segs: [...d.segs, seg] };
      },
      placement === 'library'
        ? `${clip.short} saved to your clips`
        : placement === 'replace'
          ? `New take replaced the old line in ${clips[init.clipId!].short}`
          : `${clip.short} added at the end of the story`,
    );
    setRecorder(null);
    setViewClipId(clip.id);
    setTsel(null);
    setView('transcript');
    setSelSegId(placement === 'library' ? null : seg.id);
  };

  // ---------- comments ----------
  const findProblemLine = () => {
    const d = docRef.current;
    for (const s of d.segs) {
      if (s.track !== 'voice') continue;
      const c = clips[s.clipId];
      const i = c.words.findIndex((w) => w.low && wordMid(w) >= s.in && wordMid(w) <= s.out);
      if (i >= 0) {
        const u = c.words[i].u;
        const idx = c.words.map((w, k) => (w.u === u ? k : -1)).filter((k) => k >= 0);
        const [a, b] = wordSpanRange(c, idx[0], idx[idx.length - 1]);
        return { clip: c, a, b, text: plainText(c.utts[u].text) };
      }
    }
    return null;
  };

  const goToComment = useCallback(
    (id: string) => {
      const c = teacherComments.find((x) => x.id === id)!;
      const m = mapAnchor(layRef.current, c.anchor);
      setActiveComment(id);
      setTab('feedback');
      if (m.status !== 'gone') seek(m.pos);
      if ('clipId' in c.anchor) {
        const a = c.anchor;
        setViewClipId(a.clipId);
        setView('transcript');
        setTsel(null);
        const seg = locate(layRef.current, m.pos)?.seg;
        setSelSegId(seg && seg.clipId === a.clipId ? seg.id : (docRef.current.segs.find((s) => s.clipId === a.clipId)?.id ?? null));
        setFocus({ t: a.t, nonce: Date.now() });
      } else {
        const last = layRef.current.voice[layRef.current.voice.length - 1];
        if (last) {
          setSelSegId(last.id);
          setViewClipId(last.clipId);
          setFocus({ t: last.out, nonce: Date.now() });
        }
      }
      requestAnimationFrame(() => document.getElementById(`comment-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    },
    [seek],
  );

  const commentAction = (c: TeacherComment) => {
    if (c.action === 'rerecord') {
      const pl = findProblemLine();
      if (pl) {
        setViewClipId(pl.clip.id);
        setRecorder({ mode: 'replace', clipId: pl.clip.id, clipName: pl.clip.name, a: pl.a, b: pl.b, script: pl.text });
      } else setRecorder({ mode: 'free', script: 'Pero el problema es que el barrio está cambiando muy rápido.' });
    } else if (c.action === 'trim-rosa') {
      goToComment(c.id);
    } else if (c.action === 'closing') {
      setRecorder({ mode: 'end', script: '' });
    }
  };

  // ---------- derived checks ----------
  const derived = useMemo(() => {
    const voice = lay.voice;
    const first = voice[0] ? clips[voice[0].clipId] : null;
    const last = voice[voice.length - 1] ? clips[voice[voice.length - 1].clipId] : null;
    const voiceSegs = doc.segs.filter((s) => s.track === 'voice');
    let pr = 0;
    let im = 0;
    let lowInStory = false;
    for (const s of voiceSegs) {
      for (const w of clips[s.clipId].words) {
        const m = wordMid(w);
        if (m < s.in || m > s.out) continue;
        if (w.tense === 'p') pr++;
        if (w.tense === 'i') im++;
        if (w.low) lowInStory = true;
      }
    }
    const newProblemTake = doc.clips.find((c) => c.fromScript && /problema/i.test(c.utts.map((u) => u.text).join(' ')) && voiceSegs.some((s) => s.clipId === c.id));
    const rosaUsed = rangesLength(usedRanges(voiceSegs, 'rosa'));
    const arturoUsed = rangesLength(usedRanges(voiceSegs, 'arturo'));
    const lupeIn = inRanges(70, usedRanges(voiceSegs, 'rosa'));
    const endsOwn = !!last?.ownVoice;
    const lastSeg = voice[voice.length - 1];
    const closingPast = !!(last && endsOwn && last.words.some((w) => w.tense && wordMid(w) >= lastSeg.in && wordMid(w) <= lastSeg.out));
    const marketUnder = doc.segs.some((s) => s.track === 'bed' && clips[s.clipId].kind === 'ambience');
    const total = lay.total;
    const inRange = total >= TARGET_MIN && total <= TARGET_MAX;

    const checks: Record<string, Check[]> = {
      content: [
        { label: 'Both interviews are in the story', ok: rosaUsed > 0 && arturoUsed > 0 },
        { label: 'Intro tells the listener what the piece is about', ok: voiceSegs.some((s) => s.clipId === 'intro') },
        { label: 'Street sounds help the listener picture the barrio', ok: doc.segs.some((s) => clips[s.clipId].kind === 'ambience') },
      ],
      pron: [
        {
          label: '«el problema» line re-recorded',
          ok: !lowInStory,
          detail: lowInStory ? 'old take still in the story' : newProblemTake ? `${newProblemTake.short} in story` : 'line no longer in story',
        },
      ],
      past: [
        { label: `Your current cut has ${pr} pretérito and ${im} imperfecto verbs`, ok: pr >= 6 && im >= 6 },
        { label: 'Closing line uses a past tense', ok: closingPast, detail: endsOwn ? undefined : 'no closing line yet' },
      ],
      structure: [
        { label: 'Total length between 3:00 and 4:00', ok: inRange, detail: `now ${fmt(total)}` },
        { label: 'Opens with your voice', ok: !!first?.ownVoice || first?.kind === 'music' },
        { label: 'Market sounds play under your narration', ok: marketUnder },
        { label: 'Ends with a closing line in your voice', ok: endsOwn, detail: last ? `ends with ${last.short}` : undefined },
      ],
    };

    const hints: Record<string, { ok: boolean; text: string }> = {
      c1: !lowInStory
        ? { ok: true, text: newProblemTake ? `Fixed: ${newProblemTake.short} replaces the old line.` : 'That line isn’t in your story anymore.' }
        : { ok: false, text: 'The old take with «ploblema» is still in your story.' },
      c2:
        rosaUsed <= 100
          ? { ok: true, text: `Abuela interview is now ${fmt(rosaUsed)} (was 2:41).` }
          : rosaUsed < 160
            ? { ok: false, text: `Now ${fmt(rosaUsed)}, still long. Aim for about 1:15–1:40.${lupeIn ? ' The Lupe/tele part is still in.' : ''}` }
            : { ok: false, text: 'Still the full 2:41. Cut the answers you don’t need.' },
      c3: endsOwn ? { ok: true, text: `Your story now ends with your voice (${last!.short}).` } : { ok: false, text: `Your story still ends with ${last?.short ?? '—'}.` },
    };
    return { checks, hints, pr, im, inRange, endsOwn };
  }, [doc, lay, clips]);

  const liveComments: LiveComment[] = teacherComments.map((c) => {
    const m = mapAnchor(lay, c.anchor);
    return { c, pos: m.pos, status: m.status, done: cstate[c.id].done, replies: cstate[c.id].replies, hint: derived.hints[c.id] };
  });
  const pins: PinInfo[] = liveComments.map((lc) => ({ id: lc.c.id, n: lc.c.n, pos: lc.pos, status: lc.status, done: lc.done, active: activeComment === lc.c.id, text: lc.c.text }));

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || recorder || submitOpen) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 's' && !mod) {
        splitAtPlayhead();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (tsel) cutSel(tsel.a, tsel.b);
        else if (selSegId) deleteSeg(selSegId);
      } else if (e.key === 'Escape') {
        setTsel(null);
      } else if (e.key === 'Home') {
        seek(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recorder, submitOpen, togglePlay, splitAtPlayhead, tsel, cutSel, selSegId, deleteSeg, seek]);

  // ---------- render ----------
  const selSeg = selSegId ? [...lay.voice, ...lay.bed].find((s) => s.id === selSegId) : undefined;
  const takes = viewClip.takeGroup ? doc.clips.filter((c) => c.takeGroup === viewClip.takeGroup) : [];
  const curSrc = loc && loc.seg.clipId === viewClip.id ? loc.src : null;
  const editorComments = liveComments
    .filter((lc) => 'clipId' in lc.c.anchor && lc.c.anchor.clipId === viewClip.id)
    .map((lc) => ({ id: lc.c.id, n: lc.c.n, t: (lc.c.anchor as { t: number }).t, done: lc.done, active: activeComment === lc.c.id }));
  const nextPickupNo = doc.clips.filter((c) => c.kind === 'pickup').length + 1;

  const daysLeft = Math.floor((DUE.getTime() - NOW.getTime()) / 86400000);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="9" fill="#138A7E" />
            <path d="M5 17c3 0 3-6 6-6s3 10 6 10 3-13 6-13 3 9 4 9" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </svg>
          <span>ondita</span>
        </div>
        <div className="crumbs">
          <span className="muted">{COURSE}</span>
          <span className="sep">/</span>
          <b lang="es">{PROJECT}</b>
          <span className={`status ${submitted ? 'sub' : ''}`}>{submitted ? `Submitted ${submitted}` : 'Draft · feedback received'}</span>
        </div>
        <div className="due">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          Due <b>Fri, Nov 20, 11:59 PM</b>
          <span className="due-left">{daysLeft} days left</span>
        </div>
        <div className="grow" />
        <div className="hist-btns">
          <button className="btn ghost icon" onClick={() => dispatch({ type: 'undo' })} disabled={!hist.past.length} title="Undo (⌘Z)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
          </button>
          <button className="btn ghost icon" onClick={() => dispatch({ type: 'redo' })} disabled={!hist.future.length} title="Redo (⇧⌘Z)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>
          </button>
        </div>
        <span className="saved">✓ Saved {savedAt}</span>
        <button className="btn primary" onClick={() => setSubmitOpen(true)}>
          {submitted ? 'Resubmit' : 'Submit final'}
        </button>
        <span className="avatar me" title={STUDENT.name}>{STUDENT.initials}</span>
      </header>

      <div className="main">
        <Library doc={doc} viewClipId={viewClip.id} onOpen={openClip} onAdd={addClip} onRecord={() => setRecorder({ mode: 'free', script: '' })} />

        <section className="center">
          <div className="center-tabs">
            <button className={view === 'transcript' ? 'on' : ''} onClick={() => setView('transcript')}>
              Transcript
            </button>
            <button className={view === 'outline' ? 'on' : ''} onClick={() => setView('outline')}>
              Story order <span className="count">{lay.voice.length}</span>
            </button>
            <span className="grow" />
            <span className="kbd-hints">
              <kbd>Space</kbd> play <kbd>S</kbd> split <kbd>Del</kbd> cut <kbd>⌘Z</kbd> undo
            </span>
          </div>
          {view === 'transcript' ? (
            <Editor
              clip={viewClip}
              doc={doc}
              lay={lay}
              tsel={tsel}
              setTsel={setTsel}
              currentSrc={curSrc}
              showTenses={showTenses}
              setShowTenses={setShowTenses}
              comments={editorComments}
              focus={focus}
              takes={takes}
              onSeekSource={seekSource}
              onCut={cutSel}
              onRestore={restoreSel}
              onRerecord={openRerecord}
              onPlayFrom={(t) => {
                seekSource(t);
                setPlaying(true);
              }}
              onOpenClip={openClip}
              onSwapTake={swapTake}
              onComment={goToComment}
              onAddToStory={() => addClip(viewClip.id)}
            />
          ) : (
            <Outline
              lay={lay}
              clips={clips}
              selSegId={selSegId}
              onSelect={(id) => {
                selectSeg(id);
                const s = lay.voice.find((v) => v.id === id);
                if (s) seek(s.pos);
              }}
              onOpen={(id) => {
                selectSeg(id);
                setView('transcript');
              }}
              onMove={moveToIndex}
            />
          )}
        </section>

        <SidePanel
          tab={tab}
          setTab={setTab}
          comments={liveComments}
          activeId={activeComment}
          checks={derived.checks}
          tenseCounts={{ pr: derived.pr, im: derived.im }}
          onGo={goToComment}
          onToggleDone={(id) => setCstate((s) => ({ ...s, [id]: { ...s[id], done: !s[id].done } }))}
          onReply={(id, text) => setCstate((s) => ({ ...s, [id]: { ...s[id], replies: [...s[id].replies, { text, when: 'just now' }] } }))}
          onAction={commentAction}
          onShowTenses={() => {
            setShowTenses(true);
            setView('transcript');
          }}
        />
      </div>

      <section className="bottom">
        <div className="transport">
          <div className="tp-left">
            <button className="btn ghost icon" onClick={() => seek(0)} title="Back to start (Home)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
            </button>
            <button className="play" onClick={togglePlay} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
              {playing ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>
              )}
            </button>
            <div className="clock">
              <b className="mono">{fmtPrecise(playhead)}</b>
              <span className="mono muted"> / {fmt(lay.total)}</span>
            </div>
          </div>

          <div className="tp-ctx">
            {selSeg ? (
              <>
                <span className="ctx-chip">
                  <span style={{ background: clips[selSeg.clipId].color }} />
                  {clips[selSeg.clipId].short}
                  <b className="mono">{fmt(selSeg.len)}</b>
                </span>
                <button className="btn small ghost" onClick={splitAtPlayhead} title="Split at the playhead (S)">
                  ✂ Split
                </button>
                {selSeg.track === 'voice' && (clips[selSeg.clipId].kind === 'ambience' || clips[selSeg.clipId].kind === 'music') && (
                  <button className="btn small primary-ghost" onClick={() => moveUnder(selSeg.id)} title="Play this sound quietly under the narration next to it">
                    ↧ Move under the voice
                  </button>
                )}
                {selSeg.track === 'bed' && (
                  <>
                    <label className="gain">
                      Volume
                      <input
                        type="range"
                        min={-30}
                        max={0}
                        step={1}
                        value={selSeg.gain}
                        onPointerDown={() => dispatch({ type: 'checkpoint' })}
                        onPointerUp={() => dispatch({ type: 'endGesture' })}
                        onChange={(e) => setGain(selSeg.id, Number(e.target.value), true)}
                      />
                      <span className="mono">{selSeg.gain} dB</span>
                    </label>
                    <button className="btn small ghost" onClick={() => moveIntoStory(selSeg.id)}>↥ Into story track</button>
                  </>
                )}
                <button className="btn small ghost danger-text" onClick={() => deleteSeg(selSeg.id)} title="Remove from the story (Delete)">
                  Remove
                </button>
              </>
            ) : (
              <span className="muted small">Click a clip on the timeline to trim, split or move it.</span>
            )}
          </div>

          <LengthMeter total={lay.total} lay={lay} clips={clips} />

          <div className="zoom">
            <button className="btn ghost icon" onClick={() => setZoom((z) => Math.max(0.6, z / 1.5))} title="Zoom out">−</button>
            <button
              className="btn ghost small"
              onClick={() => {
                setZoom(1);
                setFitSpan(Math.max(lay.total, TARGET_MAX) + 40);
              }}
              title="Fit the whole story"
            >
              Fit
            </button>
            <button className="btn ghost icon" onClick={() => setZoom((z) => Math.min(12, z * 1.5))} title="Zoom in">+</button>
          </div>
        </div>
        <Timeline
          doc={doc}
          lay={lay}
          clips={clips}
          pps={pps}
          playhead={playhead}
          selSegId={selSegId}
          pins={pins}
          onSeek={seek}
          onSelectSeg={selectSeg}
          dispatch={dispatch}
          commit={commit}
          onPin={goToComment}
          onDropClip={dropClip}
          onWidth={(w) => {
            setFitW(w);
          }}
        />
      </section>

      {recorder && <Recorder init={recorder} nextPickupNo={nextPickupNo} onCancel={() => setRecorder(null)} onSave={onRecorded} />}

      {submitOpen && (
        <SubmitModal
          total={lay.total}
          checks={derived.checks}
          comments={liveComments}
          onClose={() => setSubmitOpen(false)}
          onSubmit={() => {
            setSubmitOpen(false);
            setSubmitted('Mon 7:42 PM');
            toast(`Sent to ${TEACHER.name}. You can keep editing and resubmit until Friday 11:59 PM.`, false);
          }}
        />
      )}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.text}</span>
            {t.undo && (
              <button
                onClick={() => {
                  dispatch({ type: 'undo' });
                  setToasts((x) => x.filter((y) => y.id !== t.id));
                }}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LengthMeter({ total, lay, clips }: { total: number; lay: ReturnType<typeof layout>; clips: Record<string, Clip> }) {
  const scaleMax = Math.max(360, Math.ceil((total + 15) / 60) * 60);
  const over = total - TARGET_MAX;
  const under = TARGET_MIN - total;
  const state = over > 0 ? 'over' : under > 0 ? 'under' : 'ok';
  const by: Record<string, number> = { interview: 0, voice: 0, sound: 0 };
  for (const s of lay.voice) {
    const k = clips[s.clipId].kind;
    if (k === 'interview') by.interview += s.len;
    else if (k === 'ambience' || k === 'music') by.sound += s.len;
    else by.voice += s.len;
  }
  return (
    <div className={`meter ${state}`}>
      <div className="meter-top">
        <span className="meter-label">Length</span>
        <b className="mono meter-total">{fmt(total)}</b>
        <span className="meter-state">
          {state === 'over' ? `${fmt(over)} over 4:00` : state === 'under' ? `${fmt(under)} short of 3:00` : `In range · ${fmt(TARGET_MAX - total)} to spare`}
        </span>
      </div>
      <div className="meter-bar">
        <div className="meter-zone" style={{ left: `${(TARGET_MIN / scaleMax) * 100}%`, width: `${((TARGET_MAX - TARGET_MIN) / scaleMax) * 100}%` }} />
        <div className="meter-stack" style={{ width: `${(Math.min(total, scaleMax) / scaleMax) * 100}%` }}>
          <span className="m-voice" style={{ flex: by.voice }} />
          <span className="m-int" style={{ flex: by.interview }} />
          <span className="m-sound" style={{ flex: by.sound }} />
          <span className="m-tail" style={{ flex: Math.max(0, total - lay.voiceEnd) }} />
        </div>
        <div className="meter-limit" style={{ left: `${(TARGET_MAX / scaleMax) * 100}%` }} />
      </div>
      <div className="meter-pop">
        <div className="pop-row"><span className="sw m-voice" /> Your voice <b className="mono">{fmt(by.voice)}</b></div>
        <div className="pop-row"><span className="sw m-int" /> Interviews <b className="mono">{fmt(by.interview)}</b></div>
        <div className="pop-row"><span className="sw m-sound" /> Sounds in the story track <b className="mono">{fmt(by.sound)}</b></div>
        <div className="muted small">Sounds under the voice don’t add time.</div>
      </div>
    </div>
  );
}

function SubmitModal({ total, checks, comments, onClose, onSubmit }: { total: number; checks: Record<string, Check[]>; comments: LiveComment[]; onClose: () => void; onSubmit: () => void }) {
  const all = [...checks.structure, ...checks.pron];
  const problems = all.filter((c) => !c.ok);
  const open = comments.filter((c) => !c.done);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal submit" role="dialog" aria-label="Submit final version">
        <div className="modal-head">
          <h3>Submit “{PROJECT}”</h3>
          <button className="btn ghost icon" onClick={onClose}>✕</button>
        </div>
        <p className="muted">
          {TEACHER.name} will get this version ({fmt(total)}) for grading. You can keep editing and resubmit until Fri, Nov 20, 11:59 PM.
        </p>
        <ul className="checks big">
          {all.map((c, i) => (
            <li key={i} className={c.ok ? 'ok' : ''}>
              <span className="ck">{c.ok ? '✓' : '!'}</span>
              <span>
                {c.label}
                {c.detail && <em> · {c.detail}</em>}
              </span>
            </li>
          ))}
          <li className={open.length ? '' : 'ok'}>
            <span className="ck">{open.length ? '!' : '✓'}</span>
            <span>
              Teacher comments marked done <em>· {comments.length - open.length} of {comments.length}</em>
            </span>
          </li>
        </ul>
        {problems.length > 0 && <div className="warn">Some things on the list aren’t done yet. You can still submit, but {TEACHER.name} grades this version.</div>}
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Keep editing</button>
          <button className="btn primary" onClick={onSubmit}>Submit to {TEACHER.name}</button>
        </div>
      </div>
    </div>
  );
}
