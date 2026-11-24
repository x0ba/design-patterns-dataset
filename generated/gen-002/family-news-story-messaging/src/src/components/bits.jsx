import { PEOPLE } from '../data.js';

export function Avatar({ id, size = 32, ring }) {
  const p = PEOPLE[id];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: p.color, fontSize: size * 0.4, boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 3.5px ${p.color}` : undefined }}
      aria-hidden="true"
    >
      {p.first[0]}
    </span>
  );
}

const OUTLET_COLORS = ['#7A4B2A', '#2F5D6B', '#5A4A8A', '#8A3B3B', '#3F6B3F', '#6B5A2F', '#2F4A7A', '#7A2F5A'];
export function Monogram({ outlet, size = 36 }) {
  let h = 0;
  for (const c of outlet) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const words = outlet.replace(/^The /, '').split(/\s+/);
  const letters = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
  return (
    <span className="monogram" style={{ width: size, height: size, background: OUTLET_COLORS[h % OUTLET_COLORS.length], fontSize: size * 0.36 }} aria-hidden="true">
      {letters}
    </span>
  );
}

export function Logo() {
  return (
    <div className="logo">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0E5A52" />
        <path d="M11 8h8a3 3 0 0 1 3 3v10a5 5 0 0 1-10 0V12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span>Clip<b>thread</b></span>
    </div>
  );
}

export function Wave({ seed, peaks, progress = 0, bars = 44, color }) {
  const hs = [];
  if (peaks?.length) {
    for (let i = 0; i < bars; i++) {
      const a = Math.floor((i / bars) * peaks.length), b = Math.max(a + 1, Math.floor(((i + 1) / bars) * peaks.length));
      hs.push(Math.max(...peaks.slice(a, b)));
    }
  } else {
    let x = 0;
    for (const c of seed) x = (x * 33 + c.charCodeAt(0)) >>> 0;
    for (let i = 0; i < bars; i++) {
      x = (x * 1664525 + 1013904223) >>> 0;
      const env = 0.55 + 0.45 * Math.sin((i / bars) * Math.PI);
      hs.push(0.18 + 0.82 * ((x >>> 8) % 100) / 100 * env);
    }
  }
  return (
    <span className="wave" aria-hidden="true">
      {hs.map((h, i) => (
        <i key={i} style={{ height: `${Math.max(12, h * 100)}%`, background: i / bars < progress ? color : undefined }} className={i / bars < progress ? 'on' : ''} />
      ))}
    </span>
  );
}

export function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}
    </>
  );
}
