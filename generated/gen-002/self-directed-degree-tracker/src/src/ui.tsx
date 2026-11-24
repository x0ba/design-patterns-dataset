import { ReactNode } from 'react';
import { Status } from './data';
import { CheckState } from './logic';

const paths: Record<string, ReactNode> = {
  check: <path d="M4 10.5l3.5 3.5L16 5.5" />,
  x: <path d="M5 5l10 10M15 5L5 15" />,
  alert: (
    <>
      <path d="M10 3.5l7 12.5H3z" />
      <path d="M10 8.5v3.5M10 14.2v.3" />
    </>
  ),
  block: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M5.5 14.5l9-9" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5h5a2 2 0 012 2V16a1.6 1.6 0 00-1.6-1.6H4z" />
      <path d="M16 4.5h-5a2 2 0 00-2 2V16a1.6 1.6 0 011.6-1.6H16z" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="14" height="10" rx="2" />
      <path d="M8.5 8v4l3.5-2z" />
    </>
  ),
  ocw: (
    <>
      <path d="M3 8l7-3.5L17 8l-7 3.5z" />
      <path d="M6 9.5V13c1.2 1.2 2.6 1.8 4 1.8s2.8-.6 4-1.8V9.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5V10l2.5 1.5" />
    </>
  ),
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  trash: <path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />,
  pencil: <path d="M4 16l1-3.5L13 4.5l2.5 2.5-8 8z" />,
  chevron: <path d="M8 5l5 5-5 5" />,
  undo: <path d="M7 6L4 9l3 3M4 9h7.5a4 4 0 010 8H9" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1" />
      <rect x="11" y="3.5" width="5.5" height="5.5" rx="1" />
      <rect x="3.5" y="11" width="5.5" height="5.5" rx="1" />
      <rect x="11" y="11" width="5.5" height="5.5" rx="1" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 9v4.5M10 6.6v.3" />
    </>
  ),
  link: <path d="M8.5 11.5l3-3M7 9.5l-1.5 1.5a2.5 2.5 0 003.5 3.5l1.5-1.5M13 10.5l1.5-1.5a2.5 2.5 0 00-3.5-3.5L9.5 7" />,
  phone: (
    <>
      <rect x="6" y="3" width="8" height="14" rx="1.8" />
      <path d="M9.2 14.5h1.6" />
    </>
  ),
  desktop: (
    <>
      <rect x="3" y="4" width="14" height="9.5" rx="1.5" />
      <path d="M7.5 16.5h5M10 13.5v3" />
    </>
  ),
  arrow: <path d="M4 10h11M11 6l4 4-4 4" />,
};

export function Icon({ name, size = 16, className }: { name: keyof typeof paths | string; size?: number; className?: string }) {
  return (
    <svg className={'icon ' + (className ?? '')} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

export const STATUS_LABEL: Record<Status, string> = {
  complete: 'Complete',
  'complete-gaps': 'Complete with gaps',
  review: 'Completion review',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

export function StatusDot({ status }: { status: Status }) {
  return <span className={`sdot sdot-${status}`} aria-hidden />;
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`pill pill-${status}`}>
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CheckIcon({ state }: { state: CheckState }) {
  const name = state === 'pass' ? 'check' : state === 'block' ? 'block' : state === 'fail' ? 'x' : 'alert';
  return (
    <span className={`cicon cicon-${state}`}>
      <Icon name={name} size={14} />
    </span>
  );
}
