const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5',
  chat: 'M4 5h16v11H9l-5 4z M8 9h8 M8 12h5',
  book: 'M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.5a3.2 3.2 0 0 1 0 6.3M18.5 14.5c1.6.8 2.7 2.8 3 5.5',
  'chev-up': 'M6 15l6-6 6 6',
  'chev-down': 'M6 9l6 6 6-6',
  'chev-left': 'M15 6l-6 6 6 6',
  'chev-right': 'M9 6l6 6-6 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  plus: 'M12 5v14M5 12h14',
  pin: 'M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  x: 'M6 6l12 12M18 6L6 18',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  back10: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  fwd10: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4',
  slides: 'M3 5h18v11H3zM8 20h8M12 16v4',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  send: 'M4 12l16-8-6 16-3-7z',
  dup: 'M8 8h12v12H8zM4 4h12v2M4 4v12h2',
};

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const filled = name === 'play' || name === 'pause';
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name] || P.info} />
    </svg>
  );
}
