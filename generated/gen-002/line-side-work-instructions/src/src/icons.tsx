import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 22, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IUp = (p: P) => <Svg {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Svg>
export const IDown = (p: P) => <Svg {...p}><path d="M12 5v14M5 12l7 7 7-7" /></Svg>
export const IPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IClose = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
export const ICheck = (p: P) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
export const ITrash = (p: P) => <Svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></Svg>
export const IUndo = (p: P) => <Svg {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></Svg>
export const IRedo = (p: P) => <Svg {...p}><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 000 12h3" /></Svg>
export const IPrint = (p: P) => <Svg {...p}><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" /></Svg>
export const ISend = (p: P) => <Svg {...p}><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" /></Svg>
export const IPlay = (p: P) => <Svg {...p}><path d="M7 4l13 8-13 8z" fill="currentColor" /></Svg>
export const IFlag = (p: P) => <Svg {...p}><path d="M5 21V4M5 4h12l-2 4 2 4H5" /></Svg>
export const IChat = (p: P) => <Svg {...p}><path d="M4 5h16v11H9l-5 4z" /></Svg>
export const IBook = (p: P) => <Svg {...p}><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7" /></Svg>
export const IPeople = (p: P) => <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6M16 5.2a3.2 3.2 0 010 5.6M21 20c0-2.6-1.4-4.7-3.5-5.6" /></Svg>
export const IImage = (p: P) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 9" /></Svg>
export const ITarget = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></Svg>
export const IGrip = (p: P) => (
  <Svg {...p} strokeWidth={0} fill="currentColor">
    <circle cx="9" cy="6" r="1.8" /><circle cx="15" cy="6" r="1.8" />
    <circle cx="9" cy="12" r="1.8" /><circle cx="15" cy="12" r="1.8" />
    <circle cx="9" cy="18" r="1.8" /><circle cx="15" cy="18" r="1.8" />
  </Svg>
)
export const IArrowL = (p: P) => <Svg {...p}><path d="M19 12H5M12 5l-7 7 7 7" /></Svg>
export const IArrowR = (p: P) => <Svg {...p}><path d="M5 12h14M12 5l7 7-7 7" /></Svg>
export const IPen = (p: P) => <Svg {...p}><path d="M4 20l1-5L16 4l4 4L9 19z" /></Svg>
export const ISearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></Svg>
export const ILink = (p: P) => <Svg {...p}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></Svg>
export const ICopy = (p: P) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" /></Svg>
export const IAlert = (p: P) => <Svg {...p}><path d="M12 3L2 20h20zM12 10v4.5M12 17.5v.5" /></Svg>

export function PadlockMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M12 18v-5a8 8 0 0116 0v5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <rect x="7" y="18" width="26" height="18" rx="3" fill="currentColor" />
      <circle cx="20" cy="26" r="2.6" fill="#fff" />
      <rect x="18.8" y="27" width="2.4" height="5" rx="1" fill="#fff" />
    </svg>
  )
}
