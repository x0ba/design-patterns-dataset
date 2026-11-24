import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>),
  pin: (<><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  phone: (<><path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" /></>),
  sms: (<><path d="M4 5.5h16v10.5H9.5L5.5 20v-4H4Z" /><path d="M8 9.5h8M8 12.5h5" /></>),
  print: (<><path d="M7 8V3.5h10V8" /><rect x="4" y="8" width="16" height="8" rx="2" /><path d="M7 14h10v6.5H7Z" /></>),
  qr: (<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2.5v2.5H14zM18 14h2v2M14 19h2M18.5 18.5V20" /></>),
  stepfree: (<><circle cx="12" cy="4.5" r="1.8" /><path d="M12 7.5v6h4.5l2 5.5M12 10.5h4M8.5 11a5 5 0 1 0 6 7.5" /></>),
  elevator: (<><rect x="5" y="3.5" width="14" height="17" rx="2.2" /><path d="m9 10 3-3 3 3M9 14l3 3 3-3" /></>),
  stairs: (<><path d="M4 19.5h4.5v-4H13v-4h4.5v-4H21" /></>),
  bridge: (<><path d="M3 15h18M5 15V9m14 6V9M5 11c4 0 10 0 14 0M9 15v-2.5M12 15v-2.5M15 15v-2.5" /></>),
  walk: (<><circle cx="13" cy="4.5" r="1.9" /><path d="m10.5 21 1.8-6.5-2.3-2 1-4.3 3 1.3 2 2.7M9 12.5l-2 .5-1 3M12.3 14.5l3.2 2 .8 4.5" /></>),
  flag: (<><path d="M6 21V4.5M6 5h11l-2.5 3.5L17 12H6" /></>),
  close: (<><path d="m6 6 12 12M18 6 6 18" /></>),
  check: (<><path d="m5 12.5 4.5 4.5L19 7.5" /></>),
  back: (<><path d="M20 12H5m6-6-6 6 6 6" /></>),
  delete: (<><path d="M9 5.5h11.5v13H9L3 12Z" /><path d="m12.5 9.5 5 5m0-5-5 5" /></>),
  blocked: (<><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></>),
  info: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.4" /></>),
  alert: (<><path d="M12 4 3 19.5h18Z" /><path d="M12 10v4.5M12 17v.3" /></>),
  restroom: (<><circle cx="7" cy="4.5" r="1.8" /><path d="M7 7.5v7M4.5 10.5h5M5.5 14.5V20M8.5 14.5V20" /><circle cx="17" cy="4.5" r="1.8" /><path d="M14.5 20v-5.5h-1l2-6.5c.3-.5 1.7-.5 2 0l2 6.5h-1V20" /></>),
  cafe: (<><path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M11.5 3.5v2.5" /></>),
  pharmacy: (<><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M9 9V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V9M12 12v5M9.5 14.5h5" /></>),
  wheelchair: (<><circle cx="10" cy="4.5" r="1.8" /><path d="M10 8v6h5l2.5 5M10 11h5M8 12.5a5 5 0 1 0 6 6.5" /></>),
  chapel: (<><path d="M12 3v6M9.5 5.5h5M5 21v-8l7-4 7 4v8ZM10 21v-4a2 2 0 0 1 4 0v4" /></>),
  chevron: (<><path d="m9 6 6 6-6 6" /></>),
  up: (<><path d="m6 14 6-6 6 6" /></>),
  down: (<><path d="m6 10 6 6 6-6" /></>),
  edit: (<><path d="M4.5 19.5 5.5 15 15.5 5a2 2 0 0 1 3 0l1 1a2 2 0 0 1 0 3L9.5 19Z" /></>),
  globe: (<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5C9.5 18 8.5 15 8.5 12S9.5 6 12 3.5Z" /></>),
  type: (<><path d="M4 19 9.5 5 15 19M6 14.5h7M16 19l3-8 2 8M17 16.5h4" /></>),
  gift: (<><rect x="4" y="9" width="16" height="4" rx="1" /><path d="M5.5 13v7h13v-7M12 9v11M12 9c-3 0-4.5-1-4.5-2.5S9 4 10.5 5s1.5 4 1.5 4Zm0 0c3 0 4.5-1 4.5-2.5S15 4 13.5 5 12 9 12 9Z" /></>),
  car: (<><path d="M5 16V12l1.8-4.5A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.5L19 12v4M4 16h16v2.5H4zM7.5 12.5h.01M16.5 12.5h.01" /></>),
};

export function Icon({ name, size = 24, className, label }: { name: keyof typeof P | string; size?: number; className?: string; label?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {P[name]}
    </svg>
  );
}
