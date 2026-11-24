import { useSyncExternalStore } from 'react';

// One global player. Recorded notes play their real audio; the scenario's
// sample voice notes and "Listen" on text are read aloud with the browser's
// speech synthesis, so there is always something to hear without a backend.
let state = { id: null, t: 0, dur: 0, speed: 1 };
const subs = new Set();
const emit = (next) => { state = next; subs.forEach((f) => f()); };
let timer = null;
let audioEl = null;

export const usePlayer = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

function cleanup() {
  clearInterval(timer); timer = null;
  if (audioEl) { audioEl.pause(); audioEl.onended = audioEl.ontimeupdate = null; audioEl = null; }
  try { synth?.cancel(); } catch { /* ignore */ }
}

export function stop() {
  cleanup();
  emit({ id: null, t: 0, dur: 0, speed: state.speed });
}

export function estimateSeconds(text) {
  return Math.max(2, text.trim().split(/\s+/).length / 2.5);
}

export function play({ id, dur, text, url, speed = 1, onStart }) {
  cleanup();
  onStart?.();
  emit({ id, t: 0, dur, speed });
  if (url) {
    audioEl = new Audio(url);
    audioEl.playbackRate = speed;
    audioEl.ontimeupdate = () => emit({ id, t: audioEl?.currentTime ?? 0, dur, speed });
    audioEl.onended = () => stop();
    audioEl.play().catch(() => stop());
    return;
  }
  if (synth && text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = Math.min(1.6, Math.max(0.7, (estimateSeconds(text) / dur) * speed));
      u.lang = 'en-US';
      synth.speak(u);
    } catch { /* ignore */ }
  }
  const start = performance.now();
  timer = setInterval(() => {
    const t = ((performance.now() - start) / 1000) * speed;
    if (t >= dur) stop();
    else emit({ id, t, dur, speed });
  }, 100);
}

export function setSpeed(speed) {
  state = { ...state, speed };
  if (audioEl) audioEl.playbackRate = speed;
  subs.forEach((f) => f());
}
