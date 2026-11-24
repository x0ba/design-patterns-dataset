import { wordCount } from './text.js'
import { ISSUE } from '../data/draft.js'

export const activeClaims = (item) => item.claims.filter((c) => !c.removed)
export const itemWords = (item) => activeClaims(item).reduce((n, c) => n + wordCount(c.text), 0)
export const itemText = (item) => activeClaims(item).map((c) => c.text).join(' ')

export function claimProgress(item) {
  const claims = activeClaims(item)
  return {
    total: claims.length,
    verified: claims.filter((c) => c.state === 'verified').length,
    flagged: claims.filter((c) => c.state === 'flagged').length,
    unsourced: claims.filter((c) => c.sources.length === 0).length,
  }
}

export function canApprove(item) {
  const p = claimProgress(item)
  return p.total > 0 && p.verified === p.total
}

export function budget(items) {
  const list = Object.values(items)
  const included = list.filter((i) => i.decision !== 'rejected')
  const words = included.reduce((n, i) => n + itemWords(i), 0)
  return {
    words,
    limit: ISSUE.houseLimit,
    over: words - ISSUE.houseLimit,
    approvedWords: list.filter((i) => i.decision === 'approved').reduce((n, i) => n + itemWords(i), 0),
  }
}

export function readiness(state) {
  const list = Object.values(state.items)
  const live = list.filter((i) => i.decision !== 'rejected')
  const b = budget(state.items)
  const unsourced = live.reduce((n, i) => n + claimProgress(i).unsourced, 0)
  const flagged = live.reduce((n, i) => n + claimProgress(i).flagged, 0)
  const undecided = list.filter((i) => i.decision === 'pending').length
  return {
    budget: b,
    unsourced,
    flagged,
    undecided,
    decided: list.length - undecided,
    total: list.length,
    unreadAcknowledged: state.ackUnread,
    ready: b.over <= 0 && unsourced === 0 && flagged === 0 && undecided === 0 && state.ackUnread,
  }
}
