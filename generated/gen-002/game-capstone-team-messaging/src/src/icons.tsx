import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3.5 3.5" /></svg>
)
export const IconPaperclip = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15.5 9.5 9.6 15.4a3.6 3.6 0 0 1-5.1-5.1l6.4-6.4a2.4 2.4 0 0 1 3.4 3.4L8 13.7a1.2 1.2 0 0 1-1.7-1.7l5.6-5.6" /></svg>
)
export const IconSend = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 10 17 3l-4 14-3-6-7-1Z" /><path d="m10 11 7-8" /></svg>
)
export const IconQuote = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 5 3.5 9.5 8 14M3.5 9.5H12a4.5 4.5 0 0 1 4.5 4.5v1" /></svg>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m5 5 10 10M15 5 5 15" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2.2, ...p })}><path d="m4.5 10.5 3.4 3.4L15.5 6" /></svg>
)
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="4.5" width="14" height="12.5" rx="2.5" /><path d="M3 8.5h14M7 3v3M13 3v3" /></svg>
)
export const IconFile = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9.5A.5.5 0 0 1 4.5 17V3a.5.5 0 0 1 .5-.5Z" /><path d="M11 2.5V7h4.5" /></svg>
)
export const IconArrowDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M10 4v12M5 11l5 5 5-5" /></svg>
)
export const IconUndo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 4 3.5 7.5 7 11" /><path d="M3.5 7.5H12a4.5 4.5 0 0 1 0 9H8" /></svg>
)
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="7.5" cy="7" r="2.8" /><path d="M2.5 16c.4-2.8 2.4-4.4 5-4.4s4.6 1.6 5 4.4" /><path d="M13 4.4a2.6 2.6 0 0 1 0 5M14.5 11.8c1.6.5 2.7 1.8 3 4.2" /></svg>
)

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#e29a2b" />
      <path d="M9 20.5Q16 8.5 23 20.5" stroke="#172125" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="20.5" r="3.6" fill="#172125" />
      <circle cx="23" cy="20.5" r="3.6" fill="#172125" />
    </svg>
  )
}
