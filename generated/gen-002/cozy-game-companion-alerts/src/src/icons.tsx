import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const S = ({ size = 18, children, ...rest }: P & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const IconHouse = (p: P) => (
  <S {...p}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </S>
);
export const IconBell = (p: P) => (
  <S {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </S>
);
export const IconBellOff = (p: P) => (
  <S {...p}>
    <path d="M8.5 5.3A6 6 0 0 1 18 11v4" />
    <path d="M6 9.8V16l-1.5 2H16" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
    <path d="m3 3 18 18" />
  </S>
);
export const IconMoon = (p: P) => (
  <S {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </S>
);
export const IconClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </S>
);
export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </S>
);
export const IconX = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </S>
);
export const IconArrowRight = (p: P) => (
  <S {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </S>
);
export const IconSwap = (p: P) => (
  <S {...p}>
    <path d="M4 8h14l-3.5-3.5" />
    <path d="M20 16H6l3.5 3.5" />
  </S>
);
export const IconUsers = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.6a3.2 3.2 0 0 1 0 6" />
    <path d="M17.5 14a5.5 5.5 0 0 1 3 5" />
  </S>
);
export const IconStar = (p: P) => (
  <S {...p}>
    <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />
  </S>
);
export const IconShield = (p: P) => (
  <S {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z" />
  </S>
);
export const IconBolt = (p: P) => (
  <S {...p}>
    <path d="M13 3 5 13.5h6L10.5 21 19 10h-6z" />
  </S>
);
export const IconInbox = (p: P) => (
  <S {...p}>
    <path d="M4 13.5 6.5 5h11l2.5 8.5V19H4z" />
    <path d="M4 13.5h4.5l1 2h5l1-2H20" />
  </S>
);
export const IconUndo = (p: P) => (
  <S {...p}>
    <path d="M9 7 4.5 11.5 9 16" />
    <path d="M5 11.5h9a5 5 0 0 1 0 10h-2" />
  </S>
);
export const IconBan = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m6 6 12 12" />
  </S>
);
export const IconSkip = (p: P) => (
  <S {...p}>
    <path d="M6 6.5v11l8-5.5z" />
    <path d="M18 6.5v11" />
  </S>
);
export const IconPhone = (p: P) => (
  <S {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2.5" />
    <path d="M11 17.5h2" />
  </S>
);

/* ---- filled crop & item glyphs ---- */

export const Pumpkin = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 7.2c1-.2 1.4-2 2.6-2.6" stroke="#7fa65a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <ellipse cx="8.2" cy="14" rx="5" ry="6" fill="#e0862e" />
    <ellipse cx="15.8" cy="14" rx="5" ry="6" fill="#e0862e" />
    <ellipse cx="12" cy="14" rx="4.2" ry="6.4" fill="#f29e45" />
  </svg>
);
export const Lavender = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21V9M12 16c-2-1-3.5-1-4.5-.5M12 18c2-1 3.5-1.2 4.5-.6" stroke="#7fa65a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {[3.5, 5.5, 7.5, 9.5].map((y, i) => (
      <g key={i}>
        <ellipse cx="10.6" cy={y + 0.5} rx="1.5" ry="1.2" fill="#a68ad8" />
        <ellipse cx="13.4" cy={y + 0.5} rx="1.5" ry="1.2" fill="#b9a3e3" />
      </g>
    ))}
    <ellipse cx="12" cy="2.6" rx="1.3" ry="1.1" fill="#c8b6ee" />
  </svg>
);
export const Wheat = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 22V6" stroke="#c9a24d" strokeWidth="1.6" strokeLinecap="round" />
    {[6, 9.5, 13].map((y, i) => (
      <g key={i} fill="#e8c66a">
        <ellipse cx="9.6" cy={y} rx="1.6" ry="2.6" transform={`rotate(-30 9.6 ${y})`} />
        <ellipse cx="14.4" cy={y} rx="1.6" ry="2.6" transform={`rotate(30 14.4 ${y})`} />
      </g>
    ))}
    <ellipse cx="12" cy="3.6" rx="1.4" ry="2.3" fill="#f0d488" />
  </svg>
);
export const Pie = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 13h18l-1.5 5.5h-15z" fill="#b8733a" />
    <path d="M3 13c0-4 4-6.5 9-6.5s9 2.5 9 6.5z" fill="#e7b46a" />
    <path d="M8 10.2 9.4 11.6M12 9.4v2M16 10.2l-1.4 1.4" stroke="#b8733a" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
export const GoldenEgg = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3c3.6 0 6.5 5.3 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.3 8.4 3 12 3z" fill="#e8c66a" />
    <path d="M9.2 8.5c.6-1.4 1.5-2.4 2.4-2.8" stroke="#fff3c4" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);
export const Lantern = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5v2.5" stroke="#a99db5" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="8.5" y="5" width="7" height="2" rx="1" fill="#8b7d99" />
    <path d="M7.5 7h9l-1 11h-7z" fill="#f0a04b" opacity=".9" />
    <ellipse cx="12" cy="12.5" rx="2" ry="3" fill="#ffe1a8" />
    <rect x="8.5" y="18" width="7" height="2" rx="1" fill="#8b7d99" />
  </svg>
);
