import { SVGProps } from 'react';
import { UtilityKind } from './data';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconBolt = (p: P) => <Svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></Svg>;
export const IconFlame = (p: P) => <Svg {...p}><path d="M12 2c2.5 3.5 6 6.5 6 11a6 6 0 0 1-12 0c0-2.4 1.1-4.3 2.6-5.8.3 1.8 1.2 3 2.4 3.3C11 7.6 11 4.6 12 2z" /></Svg>;
export const IconDrop = (p: P) => <Svg {...p}><path d="M12 2.5S5.5 9.6 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.6 12 2.5 12 2.5z" /></Svg>;
export const IconTrash = (p: P) => <Svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></Svg>;
export const IconWifi = (p: P) => <Svg {...p}><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="19.2" r="1" fill="currentColor" /></Svg>;
export const IconTank = (p: P) => <Svg {...p}><rect x="3" y="8" width="18" height="10" rx="5" /><path d="M10 8V5h4v3M7 18v2M17 18v2" /></Svg>;
export const IconHome = (p: P) => <Svg {...p}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Svg>;
export const IconSale = (p: P) => <Svg {...p}><path d="M2.5 11 10 5l7.5 6" /><path d="M4.5 10v10h11V10" /><path d="M19 20V8M19 9h3v5h-3" /></Svg>;
export const IconCabin = (p: P) => <Svg {...p}><path d="M2 12 9 5l7 7" /><path d="M4 11v8h10v-8" /><path d="M8 19v-4h2v4" /><path d="M19 6l-2.5 5h5zM19 11v8" /><path d="M1.5 21.5c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
export const IconPhone = (p: P) => <Svg {...p}><path d="M5 3h3.5l1.8 4.6-2.3 1.5a11 11 0 0 0 6 6l1.5-2.3L20 14.5V18a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" /></Svg>;
export const IconCopy = (p: P) => <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const IconAlert = (p: P) => <Svg {...p}><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17.2v.1" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const IconChevron = (p: P) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>;
export const IconChevronDown = (p: P) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const IconMail = (p: P) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></Svg>;
export const IconNote = (p: P) => <Svg {...p}><path d="M5 3h10l4 4v14H5z" /><path d="M14 3v5h5M8 12h8M8 16h6" /></Svg>;
export const IconKey = (p: P) => <Svg {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l2.5 2.5M14.5 8.5l2 2" /></Svg>;
export const IconX = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconList = (p: P) => <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" /></Svg>;
export const IconUser = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
export const IconPin = (p: P) => <Svg {...p}><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Svg>;
export const IconGauge = (p: P) => <Svg {...p}><path d="M4 18a8 8 0 1 1 16 0" /><path d="m12 18 4-6" /></Svg>;
export const IconReceipt = (p: P) => <Svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6M9 11h6M9 15h4" /></Svg>;
export const IconRepeat = (p: P) => <Svg {...p}><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></Svg>;
export const IconArrowLeft = (p: P) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;

export function KindIcon({ kind, size }: { kind: UtilityKind; size?: number }) {
  switch (kind) {
    case 'electric': return <IconBolt size={size} />;
    case 'gas': return <IconFlame size={size} />;
    case 'water': return <IconDrop size={size} />;
    case 'trash': return <IconTrash size={size} />;
    case 'internet': return <IconWifi size={size} />;
    case 'propane': return <IconTank size={size} />;
  }
}

export function PropertyGlyph({ glyph, size }: { glyph: 'home' | 'sale' | 'cabin'; size?: number }) {
  if (glyph === 'sale') return <IconSale size={size} />;
  if (glyph === 'cabin') return <IconCabin size={size} />;
  return <IconHome size={size} />;
}
