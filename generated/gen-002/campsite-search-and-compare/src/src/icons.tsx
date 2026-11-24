import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 16, rest: SVGProps<SVGSVGElement>) => ({
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
});

export const Toilet = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M6 3h5v7H6z" />
    <path d="M4 10h16a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" />
    <path d="M9 16l-1 5h8l-1-5" />
  </svg>
);
export const Shower = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M4 20V7a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3" />
    <path d="M8 9h7a1 1 0 0 0-7 0z" />
    <path d="M10 13v1M13 13v1M16 13v1M11 17v1M14 17v1M17 17v1" />
  </svg>
);
export const Waves = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2 8c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    <path d="M2 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    <path d="M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
  </svg>
);
export const Tree = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 2l5 7h-3l4 6H6l4-6H7z" />
    <path d="M12 15v7" />
  </svg>
);
export const Bike = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="5.5" cy="16.5" r="3.5" />
    <circle cx="18.5" cy="16.5" r="3.5" />
    <path d="M5.5 16.5L9 9h6l3.5 7.5M9 9l3 7.5L15 9M8 6h3" />
  </svg>
);
export const Quiet = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M11 5L6 9H3v6h3l5 4z" />
    <path d="M16 9l5 6M21 9l-5 6" />
  </svg>
);
export const Generator = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect x="3" y="7" width="18" height="12" rx="2" />
    <path d="M7 7V5h10v2M13 10l-3 4h4l-3 4" />
  </svg>
);
export const Heart = ({ size, filled, ...r }: P & { filled?: boolean }) => (
  <svg {...base(size, r)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-9-8.6C1.6 8.3 3.5 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.3 0 5.2 3.3 3.8 6.4C19 15.6 12 20 12 20z" />
  </svg>
);
export const Star = ({ size, filled = true, ...r }: P & { filled?: boolean }) => (
  <svg {...base(size, r)} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.4}>
    <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z" />
  </svg>
);
export const Pin = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const Calendar = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const People = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="8" cy="7" r="3" />
    <circle cx="17" cy="9" r="2.3" />
    <path d="M2 20c0-3.5 2.7-6 6-6s6 2.5 6 6M14 20c0-2.5 1.3-4.6 3-4.6s4 1.6 4 4.6" />
  </svg>
);
export const Car = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 16v-4l2-5h14l2 5v4" />
    <path d="M3 16h18v2H3zM3 12h18" />
    <circle cx="7" cy="18.5" r="1.5" />
    <circle cx="17" cy="18.5" r="1.5" />
  </svg>
);
export const Tent = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 4L2 20h20z" />
    <path d="M12 4l-3 16M12 4l3 16" />
  </svg>
);
export const Clock = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const Close = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Chevron = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const Check = ({ size, ...r }: P) => (
  <svg {...base(size, r)} strokeWidth={2.4}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const Minus = ({ size, ...r }: P) => (
  <svg {...base(size, r)} strokeWidth={2.4}>
    <path d="M6 12h12" />
  </svg>
);
export const Plus = ({ size, ...r }: P) => (
  <svg {...base(size, r)} strokeWidth={2.2}>
    <path d="M12 6v12M6 12h12" />
  </svg>
);
export const Alert = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 3L2 20h20z" />
    <path d="M12 10v4M12 17v.5" />
  </svg>
);
export const Info = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </svg>
);
export const Share = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);
export const Bookmark = ({ size, filled, ...r }: P & { filled?: boolean }) => (
  <svg {...base(size, r)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6 3h12v18l-6-4-6 4z" />
  </svg>
);
export const Compare = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect x="3" y="4" width="7" height="16" rx="1.5" />
    <rect x="14" y="4" width="7" height="16" rx="1.5" />
  </svg>
);
export const Book = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
    <path d="M4 19V5M8 7h7" />
  </svg>
);
export const Mosquito = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <ellipse cx="12" cy="13" rx="2" ry="5" />
    <path d="M12 8V3M10 11L4 7M14 11l6-4M10 14l-5 3M14 14l5 3M10 17l-3 4M14 17l3 4" />
  </svg>
);
export const Droplet = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
  </svg>
);
export const Store = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18" />
    <path d="M10 20v-6h4v6" />
  </svg>
);
export const Swing = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 20L7 4h10l4 16M7 4h10M10 4v9M14 4v9M9 13h6" />
  </svg>
);
export const Walk = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="13" cy="4" r="2" />
    <path d="M9 21l2-6 3 3v3M11 15l1-6-3 2-2 3M12 9l3 3 3 1" />
  </svg>
);
export const Arrow = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
