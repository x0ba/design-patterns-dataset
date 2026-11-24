import { useSyncExternalStore } from 'react'
import { ACTIONS } from '../data/recordings'
import type { ActionItem } from '../data/types'

let items: ActionItem[] = ACTIONS.map((a) => ({ ...a }))
const ls = new Set<() => void>()
export const useActions = (): ActionItem[] =>
  useSyncExternalStore(
    (l) => {
      ls.add(l)
      return () => ls.delete(l)
    },
    () => items,
  )
export const toggleAction = (id: string) => {
  items = items.map((a) => (a.id === id ? { ...a, done: !a.done } : a))
  ls.forEach((l) => l())
}
