import { useCallback, useEffect, useReducer } from 'react'
import type { Comment, Doc } from './types'
import { INITIAL_COMMENTS, INITIAL_DOC, ROSTER } from './data'

export interface Snap {
  doc: Doc
  comments: Comment[]
  agreed: string[]
}

export interface State {
  present: Snap
  past: Snap[]
  future: Snap[]
  status: 'draft' | 'sent'
  lastKey: string | null
  lastAt: number
  /** set when an edit wipes huddle agreement; seq lets the UI react once */
  cleared: { seq: number; count: number } | null
}

type Action =
  | { type: 'doc'; fn: (d: Doc) => Doc; key?: string }
  | { type: 'comments'; fn: (c: Comment[]) => Comment[] }
  | { type: 'agree'; id: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'send' }
  | { type: 'recall' }

const KEY = 'huddlesheet:OPL-L3-0418:v2'

function initial(): State {
  const base: State = {
    present: { doc: INITIAL_DOC, comments: INITIAL_COMMENTS, agreed: [] },
    past: [],
    future: [],
    status: 'draft',
    lastKey: null,
    lastAt: 0,
    cleared: null,
  }
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved?.present?.doc?.id === INITIAL_DOC.id) return { ...base, present: saved.present, status: saved.status }
    }
  } catch {
    /* storage unavailable: start from the draft as it stands */
  }
  return base
}

const HISTORY_LIMIT = 80

function push(s: State, next: Snap, key: string | null): State {
  const now = Date.now()
  const coalesce = key !== null && key === s.lastKey && now - s.lastAt < 2500
  return {
    ...s,
    present: next,
    past: coalesce ? s.past : [...s.past, s.present].slice(-HISTORY_LIMIT),
    future: [],
    lastKey: key,
    lastAt: now,
  }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'doc': {
      if (s.status === 'sent') return s
      const doc = a.fn(s.present.doc)
      if (doc === s.present.doc) return s
      const hadAgreement = s.present.agreed.length > 0
      const next = push(s, { ...s.present, doc, agreed: [] }, a.key ?? null)
      return hadAgreement
        ? { ...next, cleared: { seq: (s.cleared?.seq ?? 0) + 1, count: s.present.agreed.length } }
        : next
    }
    case 'comments': {
      const comments = a.fn(s.present.comments)
      return push(s, { ...s.present, comments }, null)
    }
    case 'agree': {
      if (s.status === 'sent') return s
      const has = s.present.agreed.includes(a.id)
      const agreed = has ? s.present.agreed.filter((x) => x !== a.id) : [...s.present.agreed, a.id]
      return { ...s, present: { ...s.present, agreed }, cleared: null, lastKey: null }
    }
    case 'undo': {
      if (s.status === 'sent' || !s.past.length) return s
      const prev = s.past[s.past.length - 1]
      return { ...s, present: prev, past: s.past.slice(0, -1), future: [s.present, ...s.future], lastKey: null }
    }
    case 'redo': {
      if (s.status === 'sent' || !s.future.length) return s
      const [nx, ...rest] = s.future
      return { ...s, present: nx, past: [...s.past, s.present], future: rest, lastKey: null }
    }
    case 'send':
      return { ...s, status: 'sent', lastKey: null }
    case 'recall':
      return { ...s, status: 'draft', present: { ...s.present, agreed: [] }, lastKey: null }
  }
}

export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, initial)

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ present: stripUploads(state.present), status: state.status }))
    } catch {
      /* quota: skip */
    }
  }, [state.present, state.status])

  const edit = useCallback((fn: (d: Doc) => Doc, key?: string) => dispatch({ type: 'doc', fn, key }), [])
  const editComments = useCallback((fn: (c: Comment[]) => Comment[]) => dispatch({ type: 'comments', fn }), [])
  return { state, dispatch, edit, editComments }
}

function stripUploads(s: Snap): Snap {
  // uploaded photos can be large; don't try to keep them in session storage
  return {
    ...s,
    doc: { ...s.doc, photos: s.doc.photos.map((p) => (p.src && p.src.length > 400_000 ? { ...p, src: undefined } : p)) },
  }
}

export const ROSTER_SIZE = ROSTER.length
