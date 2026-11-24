import type { ReactNode } from 'react';

const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const mk = (d: ReactNode) => ({ size = 18 }: { size?: number }) => <svg {...base} width={size} height={size}>{d}</svg>;

export const IconSearch = mk(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>);
export const IconHeart = ({ size = 18, filled = true }: { size?: number; filled?: boolean }) => (
  <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'}><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10.2-7.5 10.2Z" /></svg>
);
export const IconClose = mk(<path d="M6 6l12 12M18 6 6 18" />);
export const IconCheck = mk(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconChevronL = mk(<path d="m14.5 6-6 6 6 6" />);
export const IconChevronR = mk(<path d="m9.5 6 6 6-6 6" />);
export const IconChevronD = mk(<path d="m6 9.5 6 6 6-6" />);
export const IconPencil = mk(<><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" /><path d="m14.5 7.5 3 3" /></>);
export const IconBook = mk(<><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z" /></>);
export const IconImage = mk(<><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 3.5 3 3-2.5L20 17" /></>);
export const IconEar = mk(<><path d="M5 12a7 7 0 1 1 14 0c0 3-2.5 3.8-3 6a3 3 0 0 1-5.5 1.2" /><path d="M9 11.5a3 3 0 0 1 6 0c0 1.6-1.5 2-2 3" /></>);
export const IconCompare = mk(<><rect x="3.5" y="5" width="7" height="14" rx="1.8" /><rect x="13.5" y="5" width="7" height="14" rx="1.8" /></>);
export const IconBox = mk(<><path d="M3.5 8 12 3.5 20.5 8v8.5L12 21l-8.5-4.5z" /><path d="m3.5 8 8.5 4.5L20.5 8M12 12.5V21" /></>);
export const IconPlus = mk(<path d="M12 5v14M5 12h14" />);
export const IconSparkle = mk(<><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4L4.5 10.8 10.2 9z" /><path d="m18.5 3.5.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" /></>);
export const IconClock = mk(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const IconTruck = mk(<><path d="M3 6.5h11v9H3zM14 9.5h4l3 3.2v2.8h-7" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>);
export const IconAlert = mk(<><path d="M12 4 3 19.5h18z" /><path d="M12 10v4.2M12 17h.01" /></>);
export const IconRegen = mk(<><path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" /><path d="M19.5 4.5v4h-4" /></>);
export const IconGrid = mk(<><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>);
export const IconFilter = mk(<><path d="M4 6h16M7 12h10M10 18h4" /></>);

export function Lantern({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M12.5 5.5h7M16 3v2.5" stroke="#f2b04a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 9.5h10l2 3H9z" fill="#f2b04a" />
      <path d="M10 12.5h12l-1.2 12H11.2z" fill="#f7d58f" />
      <path d="M13.5 14.5h5v8h-5z" fill="#e3893a" opacity=".55" />
      <circle cx="16" cy="18.5" r="2.6" fill="#fff4d0" />
      <rect x="9" y="24.5" width="14" height="3" rx="1.5" fill="#f2b04a" />
    </svg>
  );
}
