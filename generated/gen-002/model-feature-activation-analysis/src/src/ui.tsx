import type { ReactNode } from 'react'

export const LAYER_COLORS = ['#5b2a86', '#3e4ea0', '#2b6cb0', '#1f8a9a', '#2a9d6f', '#6aa84f', '#b5a132', '#d9822b']
export const HUMAN_COLORS = ['#9aa1a9', '#2b8a3e', '#e08a00', '#c92a2a']
export const CLUSTER_COLOR = '#c2185b'

const paths: Record<string, ReactNode> = {
  explore: <><circle cx="5" cy="13" r="1.4" /><circle cx="9" cy="6" r="1.4" /><circle cx="14" cy="11" r="1.4" /><circle cx="15" cy="4.5" r="1.4" /><path d="M2.5 16.5h13.5M2.5 2.5v14" fill="none" /></>,
  notebook: <><path d="M4 2.5h9.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4z" fill="none" /><path d="M7 6h5M7 9h5M7 12h3" fill="none" /></>,
  bookmark: <path d="M5 2.5h8v13l-4-3-4 3z" fill="none" />,
  runs: <><rect x="3" y="3" width="12" height="3" rx=".8" fill="none" /><rect x="3" y="7.5" width="12" height="3" rx=".8" fill="none" /><rect x="3" y="12" width="12" height="3" rx=".8" fill="none" /></>,
  search: <><circle cx="8" cy="8" r="4.5" fill="none" /><path d="m11.5 11.5 4 4" fill="none" /></>,
  download: <path d="M9 3v8m-3.5-3L9 11.5 12.5 8M3.5 14.5h11" fill="none" />,
  close: <path d="m4.5 4.5 9 9m0-9-9 9" fill="none" />,
  arrow: <path d="M3.5 9h11m-4-4 4 4-4 4" fill="none" />,
  up: <path d="m5 11 4-4 4 4" fill="none" />,
  down: <path d="m5 7 4 4 4-4" fill="none" />,
  reset: <path d="M4 9a5 5 0 1 0 1.8-3.8M4 3v3.5h3.5" fill="none" />,
}

export function Icon({ n, size = 16 }: { n: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[n]}
    </svg>
  )
}

export function Star({ on, size = 15 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path d="M9 2.2l2.1 4.5 4.9.6-3.6 3.4.9 4.9L9 13.2l-4.3 2.4.9-4.9L2 7.3l4.9-.6z" fill={on ? '#e0a100' : 'none'} stroke={on ? '#c48a00' : '#9aa1a9'} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

export function Seg<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { v: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className={`seg seg-${size}`} role="tablist">
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={o.v === value} className={o.v === value ? 'on' : ''} title={o.title} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ScoreBar({ s, lo, hi, w = 64 }: { s: number; lo: number; hi: number; w?: number }) {
  if (isNaN(s)) return <span className="muted">—</span>
  return (
    <svg className="scorebar" width={w} height="12" viewBox={`0 0 ${w} 12`} aria-label={`score ${s.toFixed(2)}, 95% CI ${lo.toFixed(2)} to ${hi.toFixed(2)}`}>
      <line x1="0" x2={w} y1="6" y2="6" stroke="#e2dfd8" />
      <line x1={lo * w} x2={hi * w} y1="6" y2="6" stroke="#6b7480" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <circle cx={s * w} cy="6" r="3" fill="#1b1f24" />
    </svg>
  )
}

export const f2 = (x: number) => (isNaN(x) ? '—' : x.toFixed(2))
