import { createContext, useContext } from 'react'
import type { Doc, Selection } from '../lib/types'
import type { Store } from '../lib/store'

export type Tab = 'check' | 'details' | 'comments' | 'history'

export interface AppCtx {
  doc: Doc
  apply: Store['apply']
  selection: Selection
  /** Select something on the canvas. `tab` switches the side panel; `null` leaves it alone. */
  select: (s: Selection, tab?: Tab | null) => void
  setTab: (t: Tab) => void
  toast: (text: string, undoable?: boolean) => void
  focusText: string | null
  clearFocusText: () => void
  toggleEdge: (from: string, to: string, on: boolean) => void
  removeElement: (id: string) => void
  removeEdge: (id: string) => void
  tidy: () => void
  crossings: number
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx)
export const useApp = () => useContext(Ctx)
