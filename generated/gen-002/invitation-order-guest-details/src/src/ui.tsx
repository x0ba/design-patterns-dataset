import type { ReactNode } from 'react';

type IconName = 'check' | 'alert' | 'chevron' | 'search' | 'plus' | 'expand' | 'close' | 'lock' | 'clock' | 'arrow' | 'trash' | 'info';
const P: Record<IconName, ReactNode> = {
  check: <path d="M4 10.5l4 4 8-9" />,
  alert: <><path d="M10 3.5l7.5 13h-15z" /><path d="M10 8.5v4M10 14.6v.1" /></>,
  chevron: <path d="M6 8l4 4 4-4" />,
  search: <><circle cx="9" cy="9" r="5" /><path d="M13 13l4 4" /></>,
  plus: <path d="M10 4v12M4 10h12" />,
  expand: <path d="M12 4h4v4M8 16H4v-4M16 4l-5 5M4 16l5-5" />,
  close: <path d="M5 5l10 10M15 5L5 15" />,
  lock: <><rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 016 0V9" /></>,
  clock: <><circle cx="10" cy="10" r="7" /><path d="M10 6v4.5l3 1.5" /></>,
  arrow: <path d="M4 10h12M11 5l5 5-5 5" />,
  trash: <path d="M4.5 6h11M8 6V4h4v2M6 6l.7 10h6.6L14 6" />,
  info: <><circle cx="10" cy="10" r="7" /><path d="M10 9v5M10 6.4v.1" /></>,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}

export function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  const near = value >= max - 4;
  return (
    <span className={'counter' + (over ? ' over' : near ? ' near' : '')} aria-live="polite">
      {value}/{max}
      {over && <span className="sr"> characters, {value - max} over the limit</span>}
    </span>
  );
}

export function Logo() {
  return (
    <div className="logo">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#2D5A47" />
        <path d="M8 21c5 1 11-2 14-9-3 1-6 1-8 3 1-2 2-4 4-6-5 1-9 5-10 12z" fill="#F6F1E7" />
        <path d="M8 24c3-1 6-4 8-8" stroke="#F6F1E7" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </svg>
      <span>Paperlark</span>
    </div>
  );
}
