import { ITEMS, WORK_LOG } from './data/draft.js'
import { clockLabel } from './lib/text.js'

const freshClaim = (c) => ({
  ...c,
  sources: c.sources.map((s) => ({ ...s })),
  state: 'unchecked', // unchecked | verified | flagged
  removed: false,
  edited: false,
  original: c.text,
})

export const freshItem = (it) => ({
  id: it.id,
  label: it.label,
  confidence: it.confidence,
  note: it.note,
  decision: 'pending', // pending | approved | rejected
  busy: false,
  version: 1,
  versions: [],
  claims: it.claims.map(freshClaim),
})

const firstActive = (item) => item.claims.find((c) => !c.removed)

function viewerFor(claim, fallback) {
  const s = claim && claim.sources[0]
  return s ? { doc: s.doc, page: s.page, active: 0 } : fallback
}

export function initState() {
  const items = Object.fromEntries(ITEMS.map((it) => [it.id, freshItem(it)]))
  const first = items[1]
  const c = firstActive(first)
  return {
    items,
    selectedItem: 1,
    selectedClaim: c.id,
    viewer: viewerFor(c, { doc: 'council', page: 1, active: 0 }),
    search: { open: false, query: '' },
    ackUnread: false,
    leftTab: 'items',
    modal: null,
    toast: null,
    log: WORK_LOG,
    clock: 0,
    taskOpen: false,
  }
}

const patchItem = (state, id, fn) => ({
  ...state,
  items: { ...state.items, [id]: fn(state.items[id]) },
})
const patchClaim = (state, itemId, claimId, fn) =>
  patchItem(state, itemId, (it) => ({
    ...it,
    claims: it.claims.map((c) => (c.id === claimId ? fn(c) : c)),
  }))

let toastSeq = 0
const toast = (message, extra = {}) => ({ id: ++toastSeq, message, ...extra })

export function reducer(state, a) {
  switch (a.type) {
    case 'selectItem': {
      const item = state.items[a.id]
      const claim = firstActive(item)
      return {
        ...state,
        selectedItem: a.id,
        selectedClaim: claim ? claim.id : null,
        viewer: viewerFor(claim, state.viewer),
        search: { ...state.search, open: false },
      }
    }
    case 'selectClaim': {
      const claim = state.items[state.selectedItem].claims.find((c) => c.id === a.id)
      return {
        ...state,
        selectedClaim: a.id,
        viewer: viewerFor(claim, state.viewer),
        search: { ...state.search, open: false },
      }
    }
    case 'viewSource':
      return {
        ...state,
        selectedClaim: a.claimSelect ?? state.selectedClaim,
        viewer: { doc: a.doc, page: a.page, active: a.active ?? null, term: a.term },
        search: a.keepSearch ? state.search : { ...state.search, open: false },
      }
    case 'setClaimState':
      return patchClaim(state, a.itemId, a.claimId, (c) => ({
        ...c,
        state: c.state === a.value ? 'unchecked' : a.value,
      }))
    case 'editClaim':
      return patchClaim(state, a.itemId, a.claimId, (c) => ({
        ...c,
        text: a.text,
        edited: a.text !== c.original,
        state: 'unchecked',
      }))
    case 'removeClaim': {
      let next = patchClaim(state, a.itemId, a.claimId, (c) => ({ ...c, removed: true, state: 'unchecked' }))
      if (state.selectedClaim === a.claimId) {
        const item = next.items[a.itemId]
        const c = firstActive(item)
        next = { ...next, selectedClaim: c ? c.id : null }
      }
      return { ...next, toast: toast('Claim removed from the item.', { undo: { type: 'restoreClaim', itemId: a.itemId, claimId: a.claimId } }) }
    }
    case 'restoreClaim':
      return { ...patchClaim(state, a.itemId, a.claimId, (c) => ({ ...c, removed: false })), selectedClaim: a.claimId, toast: null }
    case 'applySuggestion': {
      const next = patchClaim(state, a.itemId, a.claimId, (c) => ({
        ...c,
        text: a.suggestion.text,
        sources: a.suggestion.sources ? a.suggestion.sources.map((s) => ({ ...s })) : c.sources,
        conflict: false,
        edited: true,
        state: 'unchecked',
        suggestions: [],
      }))
      const claim = next.items[a.itemId].claims.find((c) => c.id === a.claimId)
      return { ...next, viewer: viewerFor(claim, state.viewer), toast: toast('Claim rewritten. Check it against the source again.') }
    }
    case 'linkSource': {
      const next = patchClaim(state, a.itemId, a.claimId, (c) => ({
        ...c,
        sources: [...c.sources, { ...a.source }],
        state: 'unchecked',
      }))
      return {
        ...next,
        viewer: { doc: a.source.doc, page: a.source.page, active: next.items[a.itemId].claims.find((c) => c.id === a.claimId).sources.length - 1 },
        search: { ...state.search, open: false },
        toast: toast('Passage linked. Read it and say whether it supports the claim.'),
      }
    }
    case 'decide': {
      const label = { approved: 'approved', rejected: 'rejected', pending: 'returned to review' }[a.decision]
      return {
        ...patchItem(state, a.itemId, (it) => ({ ...it, decision: a.decision })),
        toast: toast(`Item ${a.itemId} ${label}.`, a.decision !== 'pending' ? { undo: { type: 'decide', itemId: a.itemId, decision: 'pending' } } : {}),
      }
    }
    case 'redoStart':
      return {
        ...patchItem(state, a.itemId, (it) => ({ ...it, busy: true })),
        modal: null,
        leftTab: state.leftTab,
        clock: state.clock + 1,
        log: [
          ...state.log,
          { n: state.log.length + 1, time: clockLabel(state.clock + 1), text: `You asked: ${a.instruction}`, user: true },
        ],
      }
    case 'redoDone': {
      const clock = state.clock + 2
      const entry = { n: state.log.length + 1, time: clockLabel(clock), text: a.logText }
      let next = patchItem(state, a.itemId, (it) => {
        if (!a.result) return { ...it, busy: false, reply: a.reply }
        return {
          ...it,
          busy: false,
          reply: null,
          version: it.version + 1,
          versions: [...it.versions, { label: it.label, confidence: it.confidence, note: it.note, claims: it.claims, decision: it.decision }],
          label: a.result.label,
          confidence: a.result.confidence,
          note: a.result.note,
          claims: a.result.claims.map(freshClaim),
          decision: 'pending',
        }
      })
      next = { ...next, clock, log: [...state.log, entry] }
      if (state.selectedItem === a.itemId && a.result) {
        const c = firstActive(next.items[a.itemId])
        next = { ...next, selectedClaim: c.id, viewer: viewerFor(c, state.viewer) }
      }
      return {
        ...next,
        toast: toast(a.result ? `Item ${a.itemId} redrafted. Its claims need checking again.` : `Item ${a.itemId}: the assistant changed nothing.`),
      }
    }
    case 'restoreVersion': {
      const it = state.items[a.itemId]
      const prev = it.versions[it.versions.length - 1]
      if (!prev) return state
      const next = patchItem(state, a.itemId, (x) => ({
        ...x,
        label: prev.label,
        confidence: prev.confidence,
        note: prev.note,
        claims: prev.claims,
        decision: prev.decision,
        version: x.version - 1,
        versions: x.versions.slice(0, -1),
      }))
      const c = firstActive(next.items[a.itemId])
      return { ...next, selectedClaim: c.id, viewer: viewerFor(c, state.viewer), toast: toast(`Item ${a.itemId}: earlier version restored.`) }
    }
    case 'setAck':
      return { ...state, ackUnread: a.value }
    case 'setTab':
      return { ...state, leftTab: a.tab }
    case 'modal':
      return { ...state, modal: a.modal }
    case 'search':
      return { ...state, search: { ...state.search, ...a.patch } }
    case 'toggleTask':
      return { ...state, taskOpen: !state.taskOpen }
    case 'clearToast':
      return { ...state, toast: null }
    default:
      return state
  }
}
