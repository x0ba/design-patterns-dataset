import { useEffect, useRef, useState } from 'react';
import { Mic, Send, X, Square, Trash2, Play, Pause, Quote, Reply, Lock, Users, AudioLines, CircleAlert } from 'lucide-react';
import { Wave } from './bits.jsx';
import { PEOPLE, SPACES, ME } from '../data.js';
import { mmss } from '../time.js';
import { usePlayer, play, stop } from '../audio.js';

const MAX_SECS = 180;

function useRecorder() {
  const [phase, setPhase] = useState('idle'); // idle | recording | review | error
  const [secs, setSecs] = useState(0);
  const [live, setLive] = useState([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const r = useRef({});

  const teardown = () => {
    const c = r.current;
    clearInterval(c.tick); clearInterval(c.sample);
    try { c.rec?.state === 'recording' && c.rec.stop(); } catch { /* ignore */ }
    try { c.sr?.stop(); } catch { /* ignore */ }
    c.stream?.getTracks().forEach((t) => t.stop());
    c.ctx?.close?.().catch(() => {});
  };
  useEffect(() => () => teardown(), []);

  async function start() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser can’t record audio.'); setPhase('error'); return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(e?.name === 'NotAllowedError' ? 'Microphone access is blocked for this page.' : 'No microphone was found.');
      setPhase('error'); return;
    }
    const c = r.current = { stream, chunks: [], peaks: [], text: '', started: Date.now() };
    const rec = new MediaRecorder(stream);
    c.rec = rec;
    rec.ondataavailable = (e) => e.data.size && c.chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(c.chunks, { type: rec.mimeType || 'audio/webm' });
      const dur = Math.max(1, Math.round((Date.now() - c.started) / 1000));
      setResult({ url: URL.createObjectURL(blob), dur, peaks: c.peaks.length ? c.peaks : [0.3], transcript: c.text.trim() });
      setPhase('review');
    };
    // level meter
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      c.ctx = ctx;
      const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      c.sample = setInterval(() => {
        an.getByteTimeDomainData(buf);
        let mx = 0; for (const v of buf) mx = Math.max(mx, Math.abs(v - 128));
        const lvl = Math.min(1, mx / 70);
        c.peaks.push(lvl);
        setLive((l) => [...l.slice(-47), lvl]);
      }, 100);
    } catch { /* meter is optional */ }
    // live transcript where the browser supports it
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const sr = new SR(); sr.continuous = true; sr.interimResults = false; sr.lang = 'en-US';
        sr.onresult = (ev) => { for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) c.text += ev.results[i][0].transcript + ' '; };
        sr.onerror = () => {};
        sr.start(); c.sr = sr;
      }
    } catch { /* optional */ }
    rec.start();
    setSecs(0); setLive([]); setPhase('recording');
    c.tick = setInterval(() => {
      const s = Math.round((Date.now() - c.started) / 1000);
      setSecs(s);
      if (s >= MAX_SECS) finish();
    }, 250);
  }
  function finish() {
    const c = r.current;
    clearInterval(c.tick); clearInterval(c.sample);
    try { c.sr?.stop(); } catch { /* ignore */ }
    try { c.rec.stop(); } catch { /* ignore */ }
    c.stream?.getTracks().forEach((t) => t.stop());
    c.ctx?.close?.().catch(() => {});
  }
  function cancel() {
    const c = r.current;
    c.rec && (c.rec.onstop = null);
    teardown();
    setPhase('idle'); setResult(null); setSecs(0); setLive([]);
  }
  const reset = () => { setPhase('idle'); setResult(null); setSecs(0); setLive([]); setError(''); };
  return { phase, secs, live, error, result, start, finish, cancel, reset, setResult };
}

function ReviewPlayer({ result }) {
  const pl = usePlayer();
  const id = 'draft-voice';
  const playing = pl.id === id;
  return (
    <div className="voice-row">
      <button className="play" style={{ background: PEOPLE[ME].color }} onClick={() => (playing ? stop() : play({ id, dur: result.dur, url: result.url }))} aria-label={playing ? 'Pause' : 'Play your recording'}>
        {playing ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
      </button>
      <Wave seed="draft" peaks={result.peaks} progress={playing ? pl.t / pl.dur : 0} color={PEOPLE[ME].color} />
      <span className="vtime">{playing ? `${mmss(pl.t)} / ${mmss(result.dur)}` : mmss(result.dur)}</span>
    </div>
  );
}

export default function Composer({ article, draft, setDraft, replyTo, clearReply, quote, clearQuote, onSendText, onSendVoice, inputRef }) {
  const rec = useRecorder();
  const [transcript, setTranscript] = useState('');
  const space = SPACES[article.space];
  const others = space.members.filter((p) => p !== ME);
  const names = others.map((p) => PEOPLE[p].first);
  const to = names.join(' and ');
  const samiraHere = others.includes('S');
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const long = samiraHere && words > 40;

  useEffect(() => { if (rec.result) setTranscript(rec.result.transcript); }, [rec.result]);
  useEffect(() => { rec.cancel(); /* leave recording when switching threads */ }, [article.id]); // eslint-disable-line

  const send = () => {
    if (!draft.trim()) return;
    onSendText(draft.trim());
  };
  const sendVoice = () => {
    onSendVoice({ ...rec.result, transcript: transcript.trim() });
    rec.reset();
  };

  return (
    <div className="composer">
      {(replyTo || quote) && (
        <div className="ctx">
          {replyTo && (
            <div className="ctx-i"><Reply size={14} /><span><b>Replying to {replyTo.who === ME ? 'yourself' : PEOPLE[replyTo.who].first}:</b> {replyTo.text}</span><button className="icon-btn sm" onClick={clearReply} aria-label="Cancel reply"><X size={14} /></button></div>
          )}
          {quote && (
            <div className="ctx-i"><Quote size={14} /><span><b>Quoting the article:</b> {quote.text}</span><button className="icon-btn sm" onClick={clearQuote} aria-label="Remove quote"><X size={14} /></button></div>
          )}
        </div>
      )}

      {rec.phase === 'recording' && (
        <div className="recbox" role="status">
          <span className="rec-dot" aria-hidden="true" />
          <b className="rec-time">{mmss(rec.secs)}</b>
          <span className="live" aria-hidden="true">{Array.from({ length: 48 }, (_, i) => { const v = rec.live[i - (48 - rec.live.length)]; return <i key={i} style={{ height: `${Math.max(8, (v ?? 0.04) * 100)}%` }} />; })}</span>
          <button className="btn ghost sm" onClick={rec.cancel}><Trash2 size={15} />Discard</button>
          <button className="btn primary" onClick={rec.finish}><Square size={14} fill="#fff" />Stop</button>
        </div>
      )}

      {rec.phase === 'review' && rec.result && (
        <div className="review">
          <ReviewPlayer result={rec.result} />
          <label className="tr-edit">
            <span>Transcript, so {samiraHere ? 'Samira and Karim' : 'Karim'} can read it too{transcript ? '' : '. Nothing was picked up, so type what you said'}</span>
            <textarea rows={2} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="What you said, in words" />
          </label>
          <div className="review-actions">
            <button className="btn ghost sm" onClick={rec.cancel}><Trash2 size={15} />Discard</button>
            <button className="btn primary" onClick={sendVoice}><Send size={15} />Send voice reply to {to}</button>
          </div>
        </div>
      )}

      {(rec.phase === 'idle' || rec.phase === 'error') && (
        <>
          {rec.phase === 'error' && (
            <div className="rec-err" role="alert">
              <CircleAlert size={16} />
              <span>{rec.error} You can type your reply instead. Anyone can tap the speaker on a text message to hear it read aloud.</span>
              <button className="icon-btn sm" onClick={rec.reset} aria-label="Dismiss"><X size={14} /></button>
            </div>
          )}
          <div className="input-row">
            <textarea
              ref={inputRef}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Write to ${to}…`}
              aria-label={`Write to ${to}`}
            />
            <div className="input-btns">
              <button className={'btn mic' + (samiraHere ? ' suggest' : '')} onClick={rec.start}><Mic size={17} />Record voice reply</button>
              <button className="btn primary" onClick={send} disabled={!draft.trim()}><Send size={16} />Send</button>
            </div>
          </div>
          {long && (
            <p className="nudge"><AudioLines size={14} />That’s {words} words. Samira reads at Large text and prefers voice replies. <button className="link-btn" onClick={rec.start}>Record it instead</button></p>
          )}
        </>
      )}

      <p className="aud">
        {space.private ? <><Lock size={13} />Only you and Karim can see this</> : <><Users size={13} />Everyone in Haddads sees this: Samira and Karim</>}
        {samiraHere && <span className="aud-pref"><Mic size={12} />Samira prefers voice replies and Large text</span>}
      </p>
    </div>
  );
}
