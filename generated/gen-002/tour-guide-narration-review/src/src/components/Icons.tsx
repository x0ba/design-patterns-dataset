import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };
}

export const Play = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />
  </svg>
);
export const Pause = (p: P) => (
  <svg {...base(p)}>
    <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
export const Back15 = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4v4.5h4.5" />
    <text x="12.3" y="15.6" fontSize="7.4" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700" fontFamily="system-ui">15</text>
  </svg>
);
export const Fwd30 = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
    <text x="11.7" y="15.6" fontSize="7.4" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700" fontFamily="system-ui">30</text>
  </svg>
);
export const PrevStop = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 5v14" />
    <path d="M18 5.5v13L9 12z" fill="currentColor" stroke="none" />
  </svg>
);
export const NextStop = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 5v14" />
    <path d="M6 5.5v13L15 12z" fill="currentColor" stroke="none" />
  </svg>
);
export const Bookmark = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
  </svg>
);
export const BookmarkPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
    <path d="M12 7.5v5M9.5 10h5" />
  </svg>
);
export const CutStart = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4H6v16h3" />
    <path d="M12 12h7M16 9l3 3-3 3" />
  </svg>
);
export const CutEnd = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 4h3v16h-3" />
    <path d="M5 12h7M9 9l3 3-3 3" />
  </svg>
);
export const Queue = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h12M4 11h12M4 16h7" />
    <path d="M16 14.5v6l4.5-3z" fill="currentColor" stroke="none" />
  </svg>
);
export const Search = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.3-4.3" />
  </svg>
);
export const Close = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Trash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13" />
  </svg>
);
export const Up = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);
export const Down = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const Walk = (p: P) => (
  <svg {...base(p)}>
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="M10 21l2.5-6.5L15 17v4M8 12.5l2-5 4 1.5 2.5 3.5M12.5 14.5L11.5 9" />
  </svg>
);
export const Mic = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);
export const Lecture = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 7l9-4 9 4-9 4z" />
    <path d="M7 9v5c0 1.7 2.2 3 5 3s5-1.3 5-3V9" />
  </svg>
);
export const Now = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4" />
  </svg>
);
export const Follow = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </svg>
);
export const Plus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const Scissors = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="6.5" r="2.5" />
    <circle cx="6" cy="17.5" r="2.5" />
    <path d="M8 8l12 10M8 16L20 6" />
  </svg>
);
export const Keyboard = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </svg>
);
