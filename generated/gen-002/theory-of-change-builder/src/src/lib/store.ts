import { useCallback, useReducer } from 'react'
import { produce } from 'immer'
import type { Doc } from './types'
import { ME } from './types'
import { makeInitialDoc } from './data'
import { now } from './time'

interface State {
  doc: Doc
  past: Doc[]
  future: Doc[]
}

type Action =
  | { type: 'apply'; label: string | null; ts: number; fn: (d: Doc) => void }
  | { type: 'undo' }
  | { type: 'redo' }

const LIMIT = 120

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'apply': {
      const doc = produce(s.doc, (d) => {
        a.fn(d)
        if (a.label) {
          d.log.unshift({ id: `lg-${a.ts}`, author: ME, ts: a.ts, text: a.label })
          if (d.log.length > 40) d.log.length = 40
        }
      })
      if (doc === s.doc) return s
      return { doc, past: [...s.past, s.doc].slice(-LIMIT), future: [] }
    }
    case 'undo': {
      if (!s.past.length) return s
      return { doc: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.doc, ...s.future] }
    }
    case 'redo': {
      if (!s.future.length) return s
      return { doc: s.future[0], past: [...s.past, s.doc], future: s.future.slice(1) }
    }
  }
}

export function useDocStore() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ doc: makeInitialDoc(), past: [], future: [] }) as State)
  /** Apply an edit. `label` becomes a line in the activity log (null = don't log). */
  const apply = useCallback((label: string | null, fn: (d: Doc) => void) => {
    dispatch({ type: 'apply', label, ts: now(), fn })
  }, [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  return { doc: state.doc, canUndo: state.past.length > 0, canRedo: state.future.length > 0, apply, undo, redo }
}

export type Store = ReturnType<typeof useDocStore>
let counter = 0
export const uid = (p: string) => `${p}-${Date.now().toString(36)}${(counter++).toString(36)}`
export const clip = (s: string, n = 44) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
