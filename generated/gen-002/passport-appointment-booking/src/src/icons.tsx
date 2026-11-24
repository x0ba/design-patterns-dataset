import React from 'react';

type P = { size?: number; className?: string };
const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const Check = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 6 9 17l-5-5" /></svg>
);
export const X = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const Clock = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const Help = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01" /></svg>
);
export const Minus = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12h14" /></svg>
);
export const Alert = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17h.01" /></svg>
);
export const Pin = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const Message = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
);
export const Calendar = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const Mail = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
export const Doc = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
);
export const Swap = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>
);
export const Plane = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M10.5 13.5 3 11l1.5-1.5 8 .5 4-4.5c1-1 2.5-1.5 3.5-.5s.5 2.5-.5 3.5l-4.5 4 .5 8L14 22l-2.5-7.5-3 3V20l-1.5 1-1-3.5L2.5 16l1-1.5H6l3-3" /></svg>
);
export const Copy = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
);
export const Arrow = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Car = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 17h14v-5l-2-5H7l-2 5z" /><path d="M5 12h14" /><circle cx="8" cy="17" r="1.5" /><circle cx="16" cy="17" r="1.5" /></svg>
);

export const Logo = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="8" fill="#0f3d4c" />
    <path d="M7 21h18" stroke="#f2c14e" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M10.5 21v-5.5a5.5 5.5 0 0 1 11 0V21" stroke="#f2c14e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M16 12.5v3l2 1.2" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);
