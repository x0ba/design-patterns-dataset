import type { CSSProperties, ReactNode } from 'react';
import { STATUS_LABEL } from '../data';

const P: Record<string, ReactNode> = {
  check: <path d="M4 8.5l2.7 2.7L12 5.5" />,
  'check-circle': <><circle cx="8" cy="8" r="6.2" /><path d="M5.3 8.2l1.9 1.9 3.6-3.8" /></>,
  ticket: <><path d="M2.2 5.2a1 1 0 0 1 1-1h9.6a1 1 0 0 1 1 1v1.4a1.4 1.4 0 0 0 0 2.8v1.4a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1V9.4a1.4 1.4 0 0 0 0-2.8z" /><path d="M10 4.4v7.2" strokeDasharray="1.2 1.4" /></>,
  clock: <><circle cx="8" cy="8" r="6.2" /><path d="M8 4.6V8l2.3 1.5" /></>,
  'x-circle': <><circle cx="8" cy="8" r="6.2" /><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" /></>,
  film: <><rect x="2.2" y="2.6" width="11.6" height="10.8" rx="1.4" /><path d="M5 2.6v10.8M11 2.6v10.8M2.2 6h2.8M2.2 10h2.8M11 6h2.8M11 10h2.8" /></>,
  reel: <><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="1.3" /><circle cx="8" cy="4.4" r="1" /><circle cx="8" cy="11.6" r="1" /><circle cx="4.5" cy="8" r="1" /><circle cx="11.5" cy="8" r="1" /></>,
  scene: <><rect x="2.2" y="4.4" width="11.6" height="8.4" rx="1.2" /><path d="M2.2 7.2h11.6M3.2 4.4l1.4-2.2M6.6 4.4L8 2.2M10 4.4l1.4-2.2" /></>,
  archive: <><rect x="2.2" y="2.8" width="11.6" height="3.2" rx="0.8" /><path d="M3.4 6v6.2a1 1 0 0 0 1 1h7.2a1 1 0 0 0 1-1V6M6.4 9h3.2" /></>,
  mic: <><rect x="5.9" y="2" width="4.2" height="7" rx="2.1" /><path d="M3.6 7.6a4.4 4.4 0 0 0 8.8 0M8 12v2" /></>,
  doc: <><path d="M4 2.2h5.2L12.4 5.4v8.4H4z" /><path d="M9 2.2v3.4h3.4M5.9 8.4h4.4M5.9 10.8h4.4" /></>,
  clip: <><rect x="2.2" y="3.4" width="11.6" height="9.2" rx="1.4" /><path d="M6.8 6.2v3.6l3.1-1.8z" /></>,
  grid: <><rect x="2.4" y="2.4" width="4.6" height="4.6" rx="1" /><rect x="9" y="2.4" width="4.6" height="4.6" rx="1" /><rect x="2.4" y="9" width="4.6" height="4.6" rx="1" /><rect x="9" y="9" width="4.6" height="4.6" rx="1" /></>,
  search: <><circle cx="7.2" cy="7.2" r="4.4" /><path d="M10.6 10.6L14 14" /></>,
  star: <path d="M8 2.2l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 10.7l-3.4 1.9.7-3.8L2.5 6.2l3.8-.5z" />,
  'chev-down': <path d="M4 6.2l4 4 4-4" />,
  'chev-right': <path d="M6 3.6l4.4 4.4L6 12.4" />,
  'chev-left': <path d="M10 3.6L5.6 8l4.4 4.4" />,
  'arrow-left': <path d="M13 8H3.2M7 4L3 8l4 4" />,
  'arrow-right': <path d="M3 8h9.8M9 4l4 4-4 4" />,
  copy: <><rect x="5.4" y="5.4" width="8" height="8" rx="1.4" /><path d="M10.6 5.4V4a1.2 1.2 0 0 0-1.2-1.2H4A1.2 1.2 0 0 0 2.8 4v5.4A1.2 1.2 0 0 0 4 10.6h1.4" /></>,
  plus: <path d="M8 3.4v9.2M3.4 8h9.2" />,
  x: <path d="M4 4l8 8M12 4l-8 8" />,
  history: <><path d="M2.6 8a5.4 5.4 0 1 0 1.6-3.8L2.6 5.8" /><path d="M2.6 2.8v3h3M8 5v3.2l2 1.2" /></>,
  home: <path d="M2.6 7.6L8 3l5.4 4.6M4 6.8v6h8v-6" />,
  quote: <path d="M3.4 10.4c0-3 1-4.6 3-5.4M9 10.4c0-3 1-4.6 3-5.4M3.4 10.4h3v2.6h-3zM9 10.4h3v2.6H9z" />,
  alert: <><path d="M8 2.6l6 10.4H2z" /><path d="M8 6.6v3M8 11.2v.2" /></>,
  link: <><path d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.6.6" /><path d="M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.5 8.8a2.6 2.6 0 0 0 3.7 3.7l.6-.6" /></>,
  user: <><circle cx="8" cy="5.6" r="2.6" /><path d="M2.8 13.4c.5-2.6 2.6-4 5.2-4s4.7 1.4 5.2 4" /></>,
  pin: <><path d="M9.6 2.6l3.8 3.8-2 .6-2.4 2.8.2 2.4-.8.8-2.6-2.6-3.2 3.2" /><path d="M6.6 5.2l.6-1.8" /></>,
  note: <><path d="M3 3h10v7.4L10.4 13H3z" /><path d="M10 13v-2.6h3M5.4 6h5.2M5.4 8.4h3" /></>,
  filter: <path d="M2.6 3.6h10.8L9.4 8.4v4l-2.8-1.4V8.4z" />,
  keyboard: <><rect x="1.8" y="4" width="12.4" height="8" rx="1.4" /><path d="M4.4 6.8h.2M7 6.8h.2M9.6 6.8h.2M11.8 6.8h.2M5 9.4h6" /></>,
};

export function Icon({ name, size = 16, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const fill = name === 'star-fill';
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 16 16" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {fill ? P.star : P[name] || null}
    </svg>
  );
}

const SICON: Record<string, string> = { 'cleared-all-media': 'check-circle', 'cleared-festival-only': 'ticket', pending: 'clock', denied: 'x-circle' };
export function StatusBadge({ status, size = 'md', short }: { status: string; size?: 'sm' | 'md' | 'lg'; short?: boolean }) {
  const label = short ? { 'cleared-all-media': 'All media', 'cleared-festival-only': 'Festival only', pending: 'Pending', denied: 'Denied' }[status] : STATUS_LABEL[status];
  return (
    <span className={`badge badge-${status} badge-${size}`}>
      <Icon name={SICON[status]} size={size === 'lg' ? 18 : 14} />
      {label}
    </span>
  );
}

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const TONES: Record<string, [string, string, string]> = {
  bw: ['#d8d8d4', '#6c6e6e', '#1a1b1c'],
  sepia: ['#e6d6b8', '#9a8260', '#32281b'],
  color: ['#bcd0cf', '#5c7f86', '#1d2b33'],
  video: ['#cfd3d8', '#6f7a8a', '#1b2029'],
};

export function FrameThumb({ id, tone = 'bw', label, w, h, rounded = true }: { id: string; tone?: string; label?: string; w?: number | string; h?: number | string; rounded?: boolean }) {
  const hs = hash(id);
  const [hi, mid, lo] = TONES[tone] || TONES.bw;
  const horizon = 48 + (hs % 22);
  const sx = 12 + ((hs >> 4) % 60);
  const fid = `g${hs}`;
  return (
    <div className="frame" style={{ width: w, height: h, borderRadius: rounded ? 6 : 0 }} role="img" aria-label={`Frame placeholder for ${id}`}>
      <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <linearGradient id={`${fid}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={hi} /><stop offset="1" stopColor={mid} /></linearGradient>
          <radialGradient id={`${fid}v`} cx="50%" cy="50%" r="75%"><stop offset="0.5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.6" /></radialGradient>
          <filter id={`${fid}n`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={hs % 97} /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0" /></filter>
        </defs>
        <rect width="160" height="90" fill={`url(#${fid}s)`} />
        <rect y={horizon * 0.9} width="160" height="90" fill={lo} opacity="0.88" />
        <rect x={sx} y={horizon * 0.9 - 24} width="5" height="30" fill={lo} opacity="0.9" />
        <rect x={sx + 44} y={horizon * 0.9 - 14} width="3" height="20" fill={lo} opacity="0.8" />
        <rect x={sx + 70} y={horizon * 0.9 - 30} width="4" height="36" fill={lo} opacity="0.85" />
        <rect width="160" height="90" filter={`url(#${fid}n)`} opacity="0.35" />
        <rect width="160" height="90" fill={`url(#${fid}v)`} />
      </svg>
      {label && <span className="frame-burn">{label}</span>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) { return <kbd className="kbd">{children}</kbd>; }

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}
