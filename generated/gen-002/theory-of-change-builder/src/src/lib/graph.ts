import type { Doc, Edge, El } from './types'
import { checkMeasurable } from './measure'

export function reach(edges: Edge[], start: string, dir: 'down' | 'up'): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>()
  const es = new Set<string>()
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()!
    for (const e of edges) {
      const next = dir === 'down' ? (e.from === cur ? e.to : null) : e.to === cur ? e.from : null
      if (next) {
        es.add(e.id)
        if (!nodes.has(next)) {
          nodes.add(next)
          queue.push(next)
        }
      }
    }
  }
  return { nodes, edges: es }
}

export interface Focus {
  nodes: Set<string>
  edges: Set<string>
}

export function focusFor(doc: Doc, kind: 'element' | 'edge', id: string): Focus {
  const nodes = new Set<string>()
  const edges = new Set<string>()
  const add = (r: { nodes: Set<string>; edges: Set<string> }) => {
    r.nodes.forEach((n) => nodes.add(n))
    r.edges.forEach((n) => edges.add(n))
  }
  if (kind === 'element') {
    nodes.add(id)
    add(reach(doc.edges, id, 'up'))
    add(reach(doc.edges, id, 'down'))
  } else {
    const e = doc.edges.find((x) => x.id === id)
    if (e) {
      edges.add(e.id)
      nodes.add(e.from)
      nodes.add(e.to)
      add(reach(doc.edges, e.from, 'up'))
      add(reach(doc.edges, e.to, 'down'))
    }
  }
  return { nodes, edges }
}

export const isOutcome = (e: El) => e.stage === 'outcome' || e.stage === 'longterm'

export const openComments = (doc: Doc) => doc.comments.filter((c) => !c.resolved)

export function openCommentsOn(doc: Doc, type: 'element' | 'edge', id: string) {
  return doc.comments.filter((c) => !c.resolved && c.anchor.type === type && 'id' in c.anchor && c.anchor.id === id)
}

export interface Stats {
  longterm: El[]
  longtermNoIndicator: El[]
  outcomes: El[]
  notMeasurable: El[]
  noEvidence: El[]
  weak: Edge[]
  inherited: Edge[]
  open: number
}

export function computeStats(doc: Doc): Stats {
  const outcomes = doc.elements.filter(isOutcome)
  const longterm = doc.elements.filter((e) => e.stage === 'longterm')
  return {
    longterm,
    longtermNoIndicator: longterm.filter((e) => e.indicators.length === 0),
    outcomes,
    notMeasurable: outcomes.filter((e) => !checkMeasurable(e.text).ok),
    noEvidence: outcomes.filter((e) => e.evidenceIds.length === 0),
    weak: doc.edges.filter((e) => e.weak),
    inherited: doc.edges.filter((e) => e.inherited),
    open: openComments(doc).length,
  }
}

export const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`
