import { ReactNode } from 'react';
import { Tier } from '../data/zones';
import { Severity } from '../engine/rules';

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`tier tier-${tier}`} title={`Traffic tier ${tier}`}>
      {tier}
    </span>
  );
}

export function SevDot({ sev }: { sev: Severity | null }) {
  if (!sev) return null;
  return <span className={`sevdot sev-${sev}`} aria-hidden />;
}

export function Pill({ tone, children, title }: { tone: string; children: ReactNode; title?: string }) {
  return (
    <span className={`pill pill-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function SlotBar({ valid, target, total }: { valid: number; target: number; total?: number }) {
  const max = Math.max(target, valid, total ?? 0, 1);
  const cells = Array.from({ length: max }, (_, i) => i);
  return (
    <span className="slotbar" title={`${valid} valid of ${target} guaranteed${total && total > valid ? ` · ${total - valid} displaced` : ''}`}>
      {cells.map((i) => {
        const cls =
          i < valid ? (i < target ? 'ok' : 'over') : total !== undefined && i < total ? 'bad' : i < target ? 'missing' : 'none';
        return <i key={i} className={`sb-${cls}`} />;
      })}
    </span>
  );
}

type IconName =
  | 'undo'
  | 'redo'
  | 'chev-l'
  | 'chev-r'
  | 'x'
  | 'check'
  | 'alert'
  | 'warn'
  | 'info'
  | 'truck'
  | 'search'
  | 'move'
  | 'plus'
  | 'send'
  | 'history'
  | 'swap'
  | 'calendar'
  | 'arrow-r'
  | 'trash'
  | 'eye'
  | 'phone'
  | 'wand';

const PATHS: Record<IconName, ReactNode> = {
  undo: <path d="M4 7h7a4 4 0 0 1 0 8H8M4 7l3-3M4 7l3 3" />,
  redo: <path d="M16 7H9a4 4 0 0 0 0 8h3M16 7l-3-3M16 7l-3 3" />,
  'chev-l': <path d="M12 4l-6 6 6 6" />,
  'chev-r': <path d="M8 4l6 6-6 6" />,
  x: <path d="M5 5l10 10M15 5L5 15" />,
  check: <path d="M4 10.5l4 4 8-9" />,
  alert: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v5M10 13.6v.4" />
    </>
  ),
  warn: <path d="M10 3l8 14H2L10 3zM10 8v4M10 14.5v.3" />,
  info: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v5M10 6.4v.3" />
    </>
  ),
  truck: <path d="M2 5h10v8H2zM12 8h3.5l2.5 3v2h-6M5 15.5a1.5 1.5 0 1 0 0-.01M14.5 15.5a1.5 1.5 0 1 0 0-.01" />,
  search: (
    <>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="M12.5 12.5L17 17" />
    </>
  ),
  move: <path d="M3 10h14M13 6l4 4-4 4" />,
  plus: <path d="M10 4v12M4 10h12" />,
  send: <path d="M3 10l14-6-5 14-2.5-6L3 10z" />,
  history: (
    <>
      <path d="M3.5 10a6.5 6.5 0 1 0 2-4.7M3 3.5v3h3" />
      <path d="M10 6.5V10l2.5 1.5" />
    </>
  ),
  swap: <path d="M4 7h12l-3-3M16 13H4l3 3" />,
  calendar: (
    <>
      <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
      <path d="M3 8.5h14M7 3v3M13 3v3" />
    </>
  ),
  'arrow-r': <path d="M4 10h11M11 6l4 4-4 4" />,
  trash: <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />,
  eye: (
    <>
      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
      <circle cx="10" cy="10" r="2.2" />
    </>
  ),
  phone: <path d="M5 3h3l1.5 4-2 1.2a8 8 0 0 0 4.3 4.3L13 10.5l4 1.5v3a2 2 0 0 1-2 2A12 12 0 0 1 3 5a2 2 0 0 1 2-2z" />,
  wand: <path d="M3 17L13 7M11 5l1-2 1 2 2 1-2 1-1 2-1-2-2-1zM15.5 10.5l.6-1.2.6 1.2 1.2.6-1.2.6-.6 1.2-.6-1.2-1.2-.6z" />,
};

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
