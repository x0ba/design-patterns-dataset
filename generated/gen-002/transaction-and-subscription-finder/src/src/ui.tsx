import type { ReactNode } from 'react'

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const IconSearch = () => (<svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>)
export const IconCheck = () => (<svg {...base}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>)
export const IconX = () => (<svg {...base}><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>)
export const IconFlag = () => (<svg {...base}><path d="M5 21V4m0 0h11l-2 4 2 4H5" /></svg>)
export const IconCopy = () => (<svg {...base}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>)
export const IconArrow = () => (<svg {...base}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>)
export const IconClose = () => (<svg {...base} width={14} height={14} strokeWidth={2.4}><path d="m6 6 12 12M18 6 6 18" /></svg>)
export const IconRepeat = () => (<svg {...base} width={16} height={16}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></svg>)
export const IconEye = () => (<svg {...base}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>)

export const Logo = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#F5F1E8" />
    <path d="M9 8v16M14 8v16M19 8v16M24 8v16M6 21 27 11" stroke="#1E5B49" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </svg>
)

export function Chip({ tone = 'plain', children }: { tone?: 'plain' | 'pine' | 'amber' | 'rose'; children: ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the textarea fallback */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
