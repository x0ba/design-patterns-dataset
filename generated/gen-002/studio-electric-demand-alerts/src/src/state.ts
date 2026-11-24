import { createContext, useContext } from 'react'
import { GuardCfg, Loads } from './model'

export type Page = 'watch' | 'alerts' | 'bills' | 'equipment'

export interface FixedRule {
  enabled: boolean
  kw: number
}
export interface EventRule {
  enabled: boolean
  dayBefore: boolean
  hoursBefore: boolean
  flagOverlap: boolean
}
export interface Channels {
  sms: boolean
  email: boolean
  push: boolean
}

export interface Store {
  page: Page
  go: (p: Page) => void
  committed: number
  setCommitted: (m: number) => void
  preview: number
  setPreview: (m: number) => void
  loads: Loads
  setLoads: (l: Loads) => void
  guard: GuardCfg
  patchGuard: (p: Partial<GuardCfg>) => void
  fixed: FixedRule
  patchFixed: (p: Partial<FixedRule>) => void
  event: EventRule
  patchEvent: (p: Partial<EventRule>) => void
  channels: Channels
  patchChannels: (p: Partial<Channels>) => void
  reminder: number | null
  setReminder: (m: number | null) => void
  toast: (msg: string, action?: { label: string; run: () => void }) => void
}

export const StoreCtx = createContext<Store>(null as unknown as Store)
export const useStore = () => useContext(StoreCtx)
