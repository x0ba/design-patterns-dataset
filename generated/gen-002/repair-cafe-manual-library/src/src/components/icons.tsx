import { DocType } from '../data/types';

type P = { size?: number; className?: string };

const svg = (size: number, className: string | undefined, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

export const IconSearch = ({ size = 20, className }: P) => svg(size, className, <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>);
export const IconWrench = ({ size = 20, className }: P) => svg(size, className, <path d="M14.7 6.3a4 4 0 0 0 5 5L21 13a6 6 0 0 1-7.6 1.6L7 21a2.1 2.1 0 0 1-3-3l6.4-6.4A6 6 0 0 1 12 4l1.7 1.3a4 4 0 0 0 1 1Z" />);
export const IconX = ({ size = 18, className }: P) => svg(size, className, <path d="M6 6l12 12M18 6 6 18" />);
export const IconBack = ({ size = 20, className }: P) => svg(size, className, <path d="M15 5l-7 7 7 7" />);
export const IconNext = ({ size = 20, className }: P) => svg(size, className, <path d="M9 5l7 7-7 7" />);
export const IconCheck = ({ size = 16, className }: P) => svg(size, className, <path d="M5 12.5 10 17l9-10" />);
export const IconPrint = ({ size = 18, className }: P) => svg(size, className, <><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></>);
export const IconSun = ({ size = 18, className }: P) => svg(size, className, <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const IconZoomIn = ({ size = 18, className }: P) => svg(size, className, <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M11 8v6M8 11h6" /></>);
export const IconZoomOut = ({ size = 18, className }: P) => svg(size, className, <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M8 11h6" /></>);
export const IconUser = ({ size = 16, className }: P) => svg(size, className, <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const IconPin = ({ size = 16, className }: P) => svg(size, className, <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const IconAlert = ({ size = 16, className }: P) => svg(size, className, <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>);
export const IconInfo = ({ size = 16, className }: P) => svg(size, className, <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>);
export const IconBook = ({ size = 22, className }: P) => svg(size, className, <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>);
export const IconChevronDown = ({ size = 16, className }: P) => svg(size, className, <path d="m6 9 6 6 6-6" />);

export function TypeIcon({ type, size = 22 }: { type: DocType; size?: number }) {
  switch (type) {
    case 'service':
      return svg(size, undefined, <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h7M9 15.5h7M9 19h4" /></>);
    case 'user':
      return svg(size, undefined, <><path d="M5 4h11a3 3 0 0 1 3 3v14H8a3 3 0 0 1-3-3z" /><path d="M9 9h6M9 12.5h6" /></>);
    case 'wiring':
      return svg(size, undefined, <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h5v12h3" /><path d="M13 10h5" /><circle cx="18" cy="10" r="1.2" /></>);
    case 'parts':
      return svg(size, undefined, <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>);
    case 'note':
      return svg(size, undefined, <><path d="M5 4h14v12l-5 5H5z" /><path d="M14 21v-5h5" /><path d="M8 9h8M8 12.5h5" /></>);
  }
}
