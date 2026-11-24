import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { INITIAL_CONFIGS, INITIAL_CONFLICTS, type AppState, type View } from './model'

export * from './model'

const initialState: AppState = {
  view: { kind: 'machine', id: 'pi' },
  configs: structuredClone(INITIAL_CONFIGS),
  conflicts: structuredClone(INITIAL_CONFLICTS),
  locked: true,
  macPushed: false,
  piApplied: null,
  compareWith: 'thinkpad',
  toast: null,
}

interface Store {
  state: AppState
  update: (fn: (draft: AppState) => void) => void
  go: (v: View) => void
  toast: (text: string) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  const update = useCallback((fn: (d: AppState) => void) => {
    setState((s) => {
      const n: AppState = {
        ...s,
        configs: structuredClone(s.configs),
        conflicts: structuredClone(s.conflicts),
        view: { ...s.view },
      }
      fn(n)
      return n
    })
  }, [])
  const go = useCallback(
    (v: View) => {
      update((d) => {
        d.view = v
      })
      document.querySelector('.main-scroll')?.scrollTo({ top: 0 })
    },
    [update],
  )
  const toast = useCallback(
    (text: string) => {
      const id = Date.now()
      update((d) => {
        d.toast = { text, id }
      })
      window.setTimeout(() => {
        setState((s) => (s.toast?.id === id ? { ...s, toast: null } : s))
      }, 3200)
    },
    [update],
  )
  return <Ctx.Provider value={{ state, update, go, toast }}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('no store')
  return s
}

