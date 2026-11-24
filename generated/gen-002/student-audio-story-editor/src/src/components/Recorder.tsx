import { useEffect, useRef, useState } from 'react';
import { COLORS } from '../data';
import { buildWords, fmtPrecise, guessTense, PEAK_RATE, seeded, uid, type Clip } from '../model';
import { Wave } from './Wave';

export type Placement = 'replace' | 'end' | 'library';

export interface RecorderInit {
  mode: 'replace' | 'end' | 'free';
  clipId?: string;
  clipName?: string;
  a?: number;
  b?: number;
  script: string;
}

interface Props {
  init: RecorderInit;
  nextPickupNo: number;
  onCancel: () => void;
  onSave: (clip: Clip, placement: Placement) => void;
}

const STARTERS = ['Antes, La Loma era…, pero hoy…', 'Gracias a mi abuela, aprendí que…', 'Cuando empecé esta crónica, no sabía que…'];
const MAX = 30;

export function Recorder({ init, nextPickupNo, onCancel, onSave }: Props) {
  const [script, setScript] = useState(init.script);
  const [phase, setPhase] = useState<'idle' | 'count' | 'rec' | 'review'>('idle');
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [sim, setSim] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement>(init.mode === 'replace' ? 'replace' : 'end');
  const [playPos, setPlayPos] = useState<number | null>(null);
  const [takes, setTakes] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);
  const anRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t0Ref = useRef(0);

  const cleanup = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  };
  useEffect(() => () => {
    cleanup();
    audioRef.current?.pause();
  }, []);

  const begin = async () => {
    setAudioUrl(null);
    setPeaks([]);
    peaksRef.current = [];
    setElapsed(0);
    let useSim = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('no mic');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      ctxRef.current = ctx;
      anRef.current = an;
    } catch {
      useSim = true;
    }
    setSim(useSim);
    setPhase('count');
    for (let i = 3; i >= 1; i--) {
      setCount(i);
      await new Promise((r) => setTimeout(r, 650));
    }
    startRec(useSim);
  };

  const startRec = (useSim: boolean) => {
    setPhase('rec');
    t0Ref.current = performance.now();
    if (!useSim && streamRef.current) {
      chunksRef.current = [];
      const rec = new MediaRecorder(streamRef.current);
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
      };
      rec.start();
      recRef.current = rec;
    }
    const rnd = seeded('take' + Date.now());
    const buf = new Float32Array(1024);
    timerRef.current = window.setInterval(() => {
      const t = (performance.now() - t0Ref.current) / 1000;
      let v: number;
      if (!useSim && anRef.current) {
        anRef.current.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        v = Math.min(1, Math.sqrt(sum / buf.length) * 5);
      } else {
        const syll = Math.max(0, Math.sin(t * 13.5)) * (0.55 + 0.4 * rnd());
        const phrase = t < 0.4 ? 0 : Math.sin(t * 1.3) > -0.75 ? 1 : 0.1;
        v = 0.03 + rnd() * 0.03 + syll * phrase * 0.85;
      }
      peaksRef.current.push(v);
      setPeaks([...peaksRef.current]);
      setElapsed(t);
      if (t >= MAX) stop();
    }, 1000 / PEAK_RATE);
  };

  const stop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    recRef.current?.state === 'recording' && recRef.current.stop();
    recRef.current = null;
    setElapsed((performance.now() - t0Ref.current) / 1000);
    cleanup();
    setTakes((n) => n + 1);
    setPhase('review');
  };

  const playTake = () => {
    if (playPos !== null) {
      audioRef.current?.pause();
      setPlayPos(null);
      return;
    }
    if (audioUrl) {
      const a = new Audio(audioUrl);
      audioRef.current = a;
      a.ontimeupdate = () => setPlayPos(a.currentTime);
      a.onended = () => setPlayPos(null);
      a.play().catch(() => setPlayPos(null));
      setPlayPos(0);
    } else {
      const start = performance.now();
      let cancelled = false;
      audioRef.current = { pause: () => { cancelled = true; } } as unknown as HTMLAudioElement;
      setPlayPos(0);
      const step = () => {
        if (cancelled) return;
        const t = (performance.now() - start) / 1000;
        if (t >= elapsed) return setPlayPos(null);
        setPlayPos(t);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  };

  const save = () => {
    const dur = Math.max(1, Math.round(elapsed * 10) / 10);
    const text = script.trim();
    const utts = text ? [{ spk: 'S', start: Math.min(0.3, dur * 0.1), end: Math.max(0.6, dur - 0.25), text }] : [];
    const words = buildWords(utts).map((w) => ({ ...w, tense: guessTense(w.text) }));
    const firstWords = text.split(/\s+/).slice(0, 4).join(' ').replace(/[.,;:!?…]+$/, '');
    const clip: Clip = {
      id: uid('rec'),
      name: `Pickup ${nextPickupNo} · «${firstWords}${text.split(/\s+/).length > 4 ? '…' : ''}»`,
      short: `Pickup ${nextPickupNo}`,
      kind: 'pickup',
      duration: dur,
      color: COLORS.pickup,
      speakers: { S: 'Sofía' },
      utts,
      words,
      events: [],
      peaks: peaksRef.current.slice(0, Math.ceil(dur * PEAK_RATE)),
      recorded: 'today',
      audioUrl: audioUrl ?? undefined,
      fromScript: true,
      ownVoice: true,
    };
    onSave(clip, placement);
  };

  const title = init.mode === 'replace' ? 'Re-record a line' : init.mode === 'end' ? 'Record your closing line' : 'Record a new clip';
  const showTip = /problema/i.test(script);
  const W = 560;

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && phase !== 'rec' && onCancel()}>
      <div className="modal recorder" role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost icon" onClick={onCancel} disabled={phase === 'rec'}>✕</button>
        </div>

        <label className="field-label">What you'll say <span className="muted">· it becomes the transcript</span></label>
        <textarea
          className="script"
          lang="es"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={2}
          placeholder={init.mode === 'end' ? 'Escribe tu frase de cierre…' : 'Escribe la frase…'}
          disabled={phase === 'rec' || phase === 'count'}
        />
        {init.mode === 'end' && !script && (
          <div className="starters">
            <span className="muted small">Ideas para empezar:</span>
            {STARTERS.map((s) => (
              <button key={s} className="chip" onClick={() => setScript(s)} lang="es">
                {s}
              </button>
            ))}
          </div>
        )}
        {showTip && (
          <div className="tip">
            <span className="avatar teacher xs">MD</span>
            <span lang="es">
              <b>pro-BLE-ma</b> · la «r» es un toque rápido justo después de la «p». Practica despacio: <i>pro… pro-ble… problema</i>.
            </span>
          </div>
        )}

        <div className={`rec-stage ${phase}`}>
          {phase === 'idle' && (
            <div className="rec-idle">
              <button className="big-rec" onClick={begin} disabled={!script.trim()} title={script.trim() ? 'Start recording' : 'Write your line first'}>
                <span />
              </button>
              <div>
                <b>{script.trim() ? 'Press to record' : 'Write your line first'}</b>
                <div className="muted small">3-second countdown, then speak. Up to {MAX} seconds. Your take stays here until you choose to use it.</div>
              </div>
            </div>
          )}
          {phase === 'count' && <div className="countdown">{count}</div>}
          {(phase === 'rec' || phase === 'review') && (
            <div className="rec-live">
              <div className="rec-wave">
                <Wave peaks={peaks} a={phase === 'rec' ? Math.max(0, elapsed - 12) : 0} b={phase === 'rec' ? Math.max(12, elapsed) : Math.max(0.5, elapsed)} width={W} height={84} color={phase === 'rec' ? '#D9483B' : COLORS.pickup} bar={3} gap={1} />
                {phase === 'review' && playPos !== null && <div className="rec-ph" style={{ left: (playPos / Math.max(0.5, elapsed)) * W }} />}
              </div>
              <div className="rec-controls">
                {phase === 'rec' ? (
                  <>
                    <span className="rec-live-dot" /> <b className="mono">{fmtPrecise(elapsed)}</b>
                    <span className="muted small">{sim ? 'Microphone unavailable: recording a practice take' : 'Recording…'}</span>
                    <span className="grow" />
                    <button className="btn stop" onClick={stop}>
                      <span className="stop-sq" /> Stop
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn round" onClick={playTake} title="Listen to this take">
                      {playPos !== null ? '❚❚' : '▶'}
                    </button>
                    <b className="mono">{fmtPrecise(elapsed)}</b>
                    <span className="muted small">Take {takes}{sim ? ' · practice take (no microphone found)' : ''}</span>
                    <span className="grow" />
                    <button className="btn ghost" onClick={begin}>↺ Try again</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {phase === 'review' && (
          <div className="placement">
            <div className="field-label">Where should it go?</div>
            {init.mode === 'replace' && (
              <label className="radio">
                <input type="radio" checked={placement === 'replace'} onChange={() => setPlacement('replace')} />
                <span>
                  <b>Replace the old line</b> in {init.clipName}
                  <span className="muted small"> · the rest of the take stays as it is</span>
                </span>
              </label>
            )}
            <label className="radio">
              <input type="radio" checked={placement === 'end'} onChange={() => setPlacement('end')} />
              <span>
                <b>Add at the end of the story</b>
              </span>
            </label>
            <label className="radio">
              <input type="radio" checked={placement === 'library'} onChange={() => setPlacement('library')} />
              <span>
                <b>Just save it to my clips</b>
              </span>
            </label>
          </div>
        )}

        <div className="modal-foot">
          <button className="btn ghost" onClick={onCancel} disabled={phase === 'rec'}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={phase !== 'review' || !script.trim()}>
            Use this take
          </button>
        </div>
      </div>
    </div>
  );
}
