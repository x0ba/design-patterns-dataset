const P: Record<string, string> = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  calendar: 'M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM4 10h16M8 3v4M16 3v4',
  book: 'M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5zM20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5a1.5 1.5 0 001.5-1.5z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.2a2.6 2.6 0 015 .8c0 1.7-2.5 2.2-2.5 3.8M12 17h.01',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0',
  bellOff: 'M6 16V11a6 6 0 019.3-5M18 11v5l1.5 2H8M10 20.5a2 2 0 004 0M4 4l16 16',
  repeat: 'M17 2l3 3-3 3M20 5H8a4 4 0 00-4 4v1M7 22l-3-3 3-3M4 19h12a4 4 0 004-4v-1',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  x: 'M6 6l12 12M18 6L6 18',
  chevronR: 'M9 6l6 6-6 6',
  chevronL: 'M15 6l-6 6 6 6',
  chevronD: 'M6 9l6 6 6-6',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  share: 'M16 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM16 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l4.8 2.9M13.4 6.6L8.6 9.5',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7.5M22 21v-1a6 6 0 00-4-5.6',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  plus: 'M12 5v14M5 12h14',
  play: 'M7 5l12 7-12 7z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5h.01',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  panel: 'M4 5h16v14H4zM15 5v14',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 017 0V11',
};

export function Icon({ name, size = 16, stroke = 2, className }: { name: keyof typeof P | string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? ''} />
    </svg>
  );
}
