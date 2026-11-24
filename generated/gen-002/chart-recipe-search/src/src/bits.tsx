import type { RunStatus } from './logic';

const PATHS: Record<string, string> = {
  search: 'M10.5 3a7.5 7.5 0 015.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z',
  clock: 'M12 3a9 9 0 110 18 9 9 0 010-18zm0 2a7 7 0 100 14 7 7 0 000-14zm1 2v4.6l3.2 1.9-1 1.7L11 12.7V7h2z',
  check: 'M9.5 16.2L5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z',
  alert: 'M12 2.5l10 17.5H2L12 2.5zm0 4L5.4 18h13.2L12 6.5zM11 10h2v4h-2v-4zm0 5h2v2h-2v-2z',
  info: 'M12 2a10 10 0 110 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm-1 6h2v7h-2v-7zm0-3h2v2h-2V7z',
  file: 'M6 2h8l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm7 1.5V8h4.5L13 3.5zM7 12h10v1.5H7V12zm0 3h10v1.5H7V15zm0 3h7v1.5H7V18z',
  back: 'M10.8 5.3L4.1 12l6.7 6.7 1.4-1.4L7.9 13H20v-2H7.9l4.3-4.3z',
  snow: 'M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9L12 3zm0 4.5l-1.5 3.2-3.5.5 2.5 2.5-.6 3.5 3.1-1.7 3.1 1.7-.6-3.5 2.5-2.5-3.5-.5L12 7.5z',
  starFill: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9z',
  download: 'M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3V3zM4 18h16v2H4z',
  close: 'M6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z',
  globe: 'M12 2a10 10 0 110 20 10 10 0 010-20zm6.9 9a7 7 0 00-3.4-5.2c.6 1.4 1 3.2 1.1 5.2h2.3zM12 4.1c-.8.9-1.6 3.3-1.7 6.9h3.4c-.1-3.6-.9-6-1.7-6.9zM8.5 5.8A7 7 0 005.1 11h2.3c.1-2 .5-3.8 1.1-5.2zM5.1 13a7 7 0 003.4 5.2c-.6-1.4-1-3.2-1.1-5.2H5.1zm5.2 0c.1 3.6.9 6 1.7 6.9.8-.9 1.6-3.3 1.7-6.9h-3.4zm5.2 5.2a7 7 0 003.4-5.2h-2.3c-.1 2-.5 3.8-1.1 5.2z',
  x: 'M12 2a10 10 0 110 20 10 10 0 010-20zm3.5 5.1L12 10.6 8.5 7.1 7.1 8.5l3.5 3.5-3.5 3.5 1.4 1.4 3.5-3.5 3.5 3.5 1.4-1.4-3.5-3.5 3.5-3.5z',
};

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      {name === 'snow' ? (
        <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d={PATHS[name]} fill="currentColor" />
      )}
    </svg>
  );
}

export function StatusBadge({ status, compact }: { status: RunStatus; compact?: boolean }) {
  const icon = status.kind === 'ready' ? 'check' : status.kind === 'browser' ? 'globe' : status.kind === 'install' ? 'alert' : 'x';
  const compactLabel =
    status.kind === 'ready' ? 'Runs for you' : status.kind === 'install' ? `Needs ${status.missing.join(', ')}` : status.kind === 'browser' ? 'Browser, not Python' : 'Not Python';
  return (
    <span className={`status ${status.kind} ${compact ? 'compact' : ''}`} title={status.detail}>
      <Icon name={icon} />
      {compact ? compactLabel : status.label}
    </span>
  );
}

export function DifficultyPips({ level }: { level: number }) {
  return (
    <span className={`pips l${level}`} aria-label={`Difficulty ${level} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= level ? 'on' : ''} />
      ))}
    </span>
  );
}
