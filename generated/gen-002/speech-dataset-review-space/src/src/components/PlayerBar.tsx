import { useEffect, useMemo, useRef, useState } from 'react';
import { ACCENTS, DATA, ENVS, VENDORS, evalClipId, speakerId } from '../data/model';
import { transcriptFor, Tok } from '../data/transcripts';
import { synthesize, player, SynthClip } from '../audio/synth';
import { fmtDelta, mmss, pct } from '../format';
import { PauseIcon, PlayIcon } from './ClipList';

interface Props {
  clip: number;
  playing: boolean;
  onToggle: () => void;
  onSeek: (t: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onLocate: () => void;
  position: number;
}

export function synthFor(i: number): SynthClip {
  const { ev } = DATA;
  const tx = transcriptFor(i);
  return synthesize({
    key: 'clip' + i,
    duration: ev.dur[i],
    env: ev.env[i],
    snr: ev.snr[i],
    female: ev.female[i] === 1,
    words: tx.ref,
  });
}

export function PlayerBar({ clip, playing, onToggle, onSeek, onPrev, onNext, onLocate, position }: Props) {
  const { ev } = DATA;
  const tx = transcriptFor(clip);
  const syn = useMemo(() => synthFor(clip), [clip]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(position);
  const acc = ACCENTS[ev.accent[clip]];
  const metric = acc.metric;
  const cl = DATA.clusterById.get(ev.cluster[clip])!;
  const d = ev.wer42[clip] - ev.wer41[clip];

  useEffect(() => setPos(position), [position, clip]);

  // follow the playhead
  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const tick = () => {
      setPos(player.position());
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, clip]);

  // waveform
  useEffect(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth;
    const H = 46;
    if (c.width !== W * dpr) {
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const peaks = syn.peaks;
    const bars = Math.floor(W / 3);
    const frac = pos / syn.duration;
    // speech spans
    ctx.fillStyle = 'rgba(255,224,138,0.06)';
    for (const [s, e] of syn.wordTimes) {
      ctx.fillRect((s / syn.duration) * W, 0, ((e - s) / syn.duration) * W, H);
    }
    for (let b = 0; b < bars; b++) {
      const p0 = Math.floor((b / bars) * peaks.length);
      const p1 = Math.max(p0 + 1, Math.floor(((b + 1) / bars) * peaks.length));
      let m = 0;
      for (let k = p0; k < p1; k++) m = Math.max(m, peaks[k]);
      const hh = Math.max(1, m * (H - 4));
      ctx.fillStyle = b / bars < frac ? '#ffd27a' : '#55707f';
      ctx.fillRect(b * 3, (H - hh) / 2, 2, hh);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.min(W - 2, frac * W), 0, 2, H);
  }, [syn, pos]);

  const curWord = useMemo(() => {
    if (!playing && pos === 0) return -1;
    return syn.wordTimes.findIndex(([s, e]) => pos >= s && pos <= e + 0.05);
  }, [pos, syn, playing]);

  const sep = tx.charLevel ? '' : ' ';
  const renderToks = (toks: Tok[]) =>
    toks.map((t, k) => {
      const space = k === 0 ? '' : sep;
      if (t.t === 'ok') return <span key={k}>{space + t.w}</span>;
      if (t.t === 'sub')
        return (
          <span key={k}>
            {space}
            <span className={`tok sub${t.isNew ? ' new' : ''}`} title={`“${t.ref}” heard as “${t.hyp}”`}>
              {t.hyp}
            </span>
          </span>
        );
      if (t.t === 'del')
        return (
          <span key={k}>
            {space}
            <span className={`tok del${t.isNew ? ' new' : ''}`} title={`“${t.ref}” dropped`}>
              {t.ref}
            </span>
          </span>
        );
      return (
        <span key={k}>
          {space}
          <span className={`tok ins${t.isNew ? ' new' : ''}`} title={`“${t.hyp}” inserted`}>
            {t.hyp}
          </span>
        </span>
      );
    });

  const n = tx.ref.length;
  const unit = tx.charLevel ? 'chars' : 'words';

  return (
    <div className="playerbar">
      <div className="pb-top">
        <button className="play-big" onClick={onToggle} aria-label={playing ? 'Pause clip' : 'Play clip aloud'}>
          {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </button>
        <div className="pb-nav">
          <button className="ghost icon" onClick={onPrev} title="Previous clip in list (Shift+N)">
            ‹
          </button>
          <button className="ghost icon" onClick={onNext} title="Next clip in list (N)">
            ›
          </button>
        </div>
        <div className="pb-title">
          <div className="pb-id mono">{evalClipId(clip)}</div>
          <div className="pb-time mono">
            {mmss(pos)} / {mmss(syn.duration)}
          </div>
        </div>
        <div className="pb-chips">
          <span className="chip">{acc.label}</span>
          <span className="chip">{ENVS[ev.env[clip]]}</span>
          <span className={`chip${ev.snr[clip] < 5 ? ' warn' : ''}`}>SNR {ev.snr[clip].toFixed(1)} dB</span>
          <span className="chip mono-ish">{cl.name}</span>
          <span className="chip dim-chip" title={`Speaker ${speakerId(clip)} · labeled by ${VENDORS[ev.vendor[clip]]}`}>
            {VENDORS[ev.vendor[clip]].split(' ')[0]} label · conf {ev.conf[clip].toFixed(2)}
          </span>
        </div>
        <button className="ghost small" onClick={onLocate} title="Center the map on this clip">
          ◎ Locate
        </button>
      </div>
      <div
        className="pb-wave"
        ref={wrapRef}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const t = ((e.clientX - r.left) / r.width) * syn.duration;
          setPos(t);
          onSeek(t);
        }}
        title="Click to seek"
      >
        <canvas ref={canvasRef} />
      </div>
      <div className="pb-tx" dir="auto">
        <div className="tx-row">
          <div className="tx-label">Reference</div>
          <div className={`tx-text${tx.rtl ? ' rtl' : ''}`} dir={tx.rtl ? 'rtl' : 'ltr'}>
            {tx.ref.map((w, k) => (
              <span key={k} className={k === curWord ? 'tok-now' : ''}>
                {(k === 0 ? '' : sep) + w}
              </span>
            ))}
          </div>
          <div className="tx-score dim">
            {n} {unit}
          </div>
        </div>
        <div className="tx-row">
          <div className="tx-label">v41</div>
          <div className={`tx-text${tx.rtl ? ' rtl' : ''}`} dir={tx.rtl ? 'rtl' : 'ltr'}>
            {renderToks(tx.v41)}
          </div>
          <div className="tx-score">
            {metric} {pct(ev.wer41[clip])}
          </div>
        </div>
        <div className="tx-row">
          <div className="tx-label">v42</div>
          <div className={`tx-text${tx.rtl ? ' rtl' : ''}`} dir={tx.rtl ? 'rtl' : 'ltr'}>
            {renderToks(tx.v42)}
          </div>
          <div className="tx-score">
            {metric} {pct(ev.wer42[clip])}{' '}
            <span className={`delta-chip tiny ${d > 0.02 ? 'bad' : d < -0.02 ? 'good' : 'neutral'}`}>{fmtDelta(d)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
