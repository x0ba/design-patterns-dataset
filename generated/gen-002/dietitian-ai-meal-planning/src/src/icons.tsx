type P = { size?: number; className?: string };
const S = ({ size = 16, className, children, fill }: P & { children: React.ReactNode; fill?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {children}
  </svg>
);
export const ICheck = (p: P) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const IX = (p: P) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const IAlert = (p: P) => <S {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.2v.1" /></S>;
export const IClock = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></S>;
export const IBook = (p: P) => <S {...p}><path d="M5 4.5h10.5A3.5 3.5 0 0119 8v11.5H8.5A3.5 3.5 0 015 16z" /><path d="M5 16a3 3 0 013-3h11" /></S>;
export const IRuler = (p: P) => <S {...p}><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></S>;
export const ISpark = (p: P) => <S {...p}><path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" /><path d="M18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></S>;
export const IChevron = (p: P) => <S {...p}><path d="M8 10l4 4 4-4" /></S>;
export const IChevronR = (p: P) => <S {...p}><path d="M10 8l4 4-4 4" /></S>;
export const ISend = (p: P) => <S {...p}><path d="M4 12l16-8-6 16-2.5-6.5z" /></S>;
export const ICart = (p: P) => <S {...p}><path d="M3.5 4.5h2.2l2 11h10.8l1.8-8H7" /><circle cx="9.5" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></S>;
export const IFile = (p: P) => <S {...p}><path d="M7 3.5h7l4.5 4.5v12.5H7z" /><path d="M14 3.5V8h4.5M9.5 12.5h6M9.5 16h6" /></S>;
export const ICal = (p: P) => <S {...p}><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></S>;
export const IQuestion = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 014.8 1c0 1.7-2.4 2-2.4 3.5M12 16.8v.1" /></S>;
export const IUser = (p: P) => <S {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0115 0" /></S>;
export const ILock = (p: P) => <S {...p}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></S>;
export const IUndo = (p: P) => <S {...p}><path d="M9 7L4.5 11.5 9 16" /><path d="M4.5 11.5H15a4.5 4.5 0 010 9h-3" /></S>;
export const ISwap = (p: P) => <S {...p}><path d="M7 7h12l-3-3M17 17H5l3 3" /></S>;
export const IPause = (p: P) => <S {...p}><path d="M9 6v12M15 6v12" /></S>;
export const ILeftover = (p: P) => <S {...p}><path d="M4 12a8 8 0 1016 0H4z" /><path d="M8 8c0-1.5 1-2 1-3.5M12 8c0-1.5 1-2 1-3.5" /></S>;
export const IDot = (p: P) => <S {...p} fill><circle cx="12" cy="12" r="5" /></S>;
export const ILeaf = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <path d="M16 2.5C7.5 9 5.5 18.5 16 29.5 26.5 18.5 24.5 9 16 2.5Z" fill="#A6462A" />
    <path d="M16 7v21M16 14l-4-3M16 19l5-4M16 24l-4-3" stroke="#F6E3D8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);
