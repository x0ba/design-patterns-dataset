export type IconName =
  | 'play' | 'pause' | 'back15' | 'fwd30' | 'prev' | 'next' | 'search' | 'compass' | 'library' | 'tasks'
  | 'check' | 'chevron' | 'arrowLeft' | 'x' | 'diamond' | 'quote' | 'keyboard' | 'scissors' | 'clock' | 'replay' | 'wave' | 'ear'

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'play':
      return <svg {...p}><path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l10.8-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z" fill="currentColor" stroke="none" /></svg>
    case 'pause':
      return <svg {...p}><rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" /></svg>
    case 'back15':
      return <svg {...p}><path d="M5 9a8 8 0 1 1-1 4" /><path d="M5 4v5h5" /><text x="12" y="16" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">15</text></svg>
    case 'fwd30':
      return <svg {...p}><path d="M19 9a8 8 0 1 0 1 4" /><path d="M19 4v5h-5" /><text x="12" y="16" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">30</text></svg>
    case 'prev':
      return <svg {...p}><path d="M6 5v14" /><path d="M18 5.5v13L9 12z" fill="currentColor" /></svg>
    case 'next':
      return <svg {...p}><path d="M18 5v14" /><path d="M6 5.5v13L15 12z" fill="currentColor" /></svg>
    case 'search':
      return <svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
    case 'compass':
      return <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
    case 'library':
      return <svg {...p}><rect x="4" y="4" width="4" height="16" rx="1" /><rect x="10" y="4" width="4" height="16" rx="1" /><path d="m16.4 5.3 3.7-.9 3.2 14.6-3.7.9z" transform="translate(-2.4 .2)" /></svg>
    case 'tasks':
      return <svg {...p}><rect x="4" y="4.5" width="16" height="15" rx="2.5" /><path d="m8.3 12 2.5 2.5 4.9-5" /></svg>
    case 'check':
      return <svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
    case 'chevron':
      return <svg {...p}><path d="m9 5.5 6.5 6.5L9 18.5" /></svg>
    case 'arrowLeft':
      return <svg {...p}><path d="M19 12H5.5M11 6l-6 6 6 6" /></svg>
    case 'x':
      return <svg {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
    case 'diamond':
      return <svg {...p}><path d="m12 3.5 8.5 8.5-8.5 8.5L3.5 12z" fill="currentColor" stroke="none" /></svg>
    case 'quote':
      return <svg {...p}><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" /></svg>
    case 'keyboard':
      return <svg {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></svg>
    case 'scissors':
      return <svg {...p}><path d="M5 12h14M5 7l5 5-5 5M19 7l-5 5 5 5" /></svg>
    case 'clock':
      return <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
    case 'replay':
      return <svg {...p}><path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" /><path d="M4.5 4.5v4h4" /></svg>
    case 'wave':
      return <svg {...p}><path d="M2.5 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 16 4 16 2-8 3-8" /></svg>
    case 'ear':
      return <svg {...p}><path d="M7 9.5a5 5 0 0 1 10 0c0 2.5-2 3.2-3 4.5s-.5 3.5-3 3.5a2.5 2.5 0 0 1-2.5-2.5" /><path d="M10 9.5a2 2 0 0 1 4 0" /></svg>
  }
}
