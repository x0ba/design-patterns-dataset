import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CHANGELOG_PUBLISHED, CODEBOOK_V3, CODE_BY_ID,
  type Codebook, type CodeId, type Example,
} from './data/codes'
import {
  CODED, CODED_BY_ID, COST_PER_POST, COST_SO_FAR, CODED_TOTAL, GOLD_TOTAL, NON_GOLD,
  NOW_START, RUN_START, CONFIG_HASH,
} from './data/corpus'
import { THRESHOLD, V3_STATS, affectedByRequestChange, simulateV4, statsFor, type CodeStat, type V4Change } from './lib/stats'
import { cloneCodebook, draftSig, heldOutOf, strengthOf } from './lib/draft'
import { fmtUSD } from './lib/format'

export type Cause = 'model' | 'codebook' | 'gold'
export interface Tag { cause?: Cause; note: string }
export type LogKind = 'run' | 'codebook' | 'review' | 'label' | 'system'
export interface LogEvent { id: number; at: number; actor: string; kind: LogKind; text: string; detail?: string }

export type RunStatus = 'running' | 'paused' | 'stopped' | 'queued' | 'cancelled'
export interface RunRec {
  id: number
  name: string
  version: 'v3' | 'v4'
  status: RunStatus
  from: number
  to: number
  done: number
  startedAt: number
  cost: number
  note?: string
}

export interface ScoreResult {
  sig: string
  strength: number
  n: number
  heldOut: number
  stats: Record<CodeStat['code'], CodeStat>
  changes: V4Change[]
  at: number
  cost: number
}
export interface Decision { choice: 'keep' | 'rerun' | 'discard'; scope?: 'targeted' | 'all'; at: number; affected: number }
export interface Published { codebook: Codebook; note: string; at: number; sig: string; scored: boolean }

export type Toast = { id: number; text: string; tone: 'ok' | 'info' | 'warn' } | null

const PRIYA = 'Priya Ramaswamy'
const MARCUS = 'Marcus Bell'

const goldDone = Math.max(...CODED.filter((p) => p.isGold).map((p) => p.labeledAt))
const firstPassDiffs = CODED.filter((p) => p.isGold && p.priya !== p.marcus).length

const baseLog = (): LogEvent[] => [
  { id: 1, at: new Date(2026, 7, 12, 11, 20).getTime(), actor: PRIYA, kind: 'codebook', text: 'Published codebook v1', detail: 'Seven codes from the spring pilot memo.' },
  { id: 2, at: new Date(2026, 8, 9, 16, 5).getTime(), actor: PRIYA, kind: 'codebook', text: 'Published codebook v2', detail: 'Added resource sharing and rule enforcement; removed “other”.' },
  { id: 3, at: new Date(2026, 9, 21, 10, 48).getTime(), actor: PRIYA, kind: 'codebook', text: 'Published codebook v3', detail: 'Added unclear; narrowed logistics; two gratitude examples.' },
  { id: 4, at: new Date(2026, 9, 28, 17, 2).getTime(), actor: `${PRIYA}, ${MARCUS}`, kind: 'review', text: 'Finalized gold sample: 300 posts double-coded', detail: `${firstPassDiffs} first-pass differences reconciled by discussion; final labels frozen.` },
  { id: 5, at: new Date(2026, 10, 15, 14, 4).getTime(), actor: PRIYA, kind: 'run', text: 'Created run 1: apply codebook v3 to 3,800 posts', detail: `claude-research-2026-09 · queue: gold sample first, then random order (seed 4117) · ${CONFIG_HASH}` },
  { id: 6, at: RUN_START, actor: 'System', kind: 'run', text: 'Run 1 started' },
  { id: 7, at: goldDone, actor: 'System', kind: 'run', text: 'Gold sample fully labeled (300 of 300)', detail: 'Agreement report generated against the reconciled gold labels.' },
  { id: 8, at: new Date(2026, 10, 16, 9, 2).getTime(), actor: 'System', kind: 'system', text: 'Policy gate: blocked', detail: `Request for help κ ${V3_STATS.request.kappa.toFixed(2)} is below the 0.75 minimum set by Dr. Elena Voss. No labels can be accepted into the dataset.` },
]

interface Store {
  now: () => number
  // run
  runs: RunRec[]
  runMode: 'running' | 'paused' | 'restarted'
  pause: () => void
  resume: () => void
  restart: () => void
  // review
  tags: Record<string, Tag>
  setCause: (id: string, cause: Cause | undefined) => void
  setNote: (id: string, note: string) => void
  // codebook
  draft: Codebook | null
  published: Published | null
  startDraft: () => void
  discardDraft: () => void
  editCode: (code: CodeId, patch: Partial<Codebook[CodeId]>) => void
  revertCode: (code: CodeId) => void
  addExample: (code: CodeId, ex: Omit<Example, 'id' | 'isNew'>) => void
  removeExample: (code: CodeId, id: string) => void
  score: ScoreResult | null
  scoreCost: number
  runScore: () => void
  publish: (note: string) => void
  // decision
  decision: Decision | null
  decide: (choice: Decision['choice'], scope?: Decision['scope']) => void
  clearDecision: () => void
  affected: { all: number; targeted: number }
  // misc
  spend: number
  log: LogEvent[]
  toast: Toast
  say: (text: string, tone?: 'ok' | 'info' | 'warn') => void
}

const Ctx = createContext<Store | null>(null)
export const useStore = () => {
  const s = useContext(Ctx)
  if (!s) throw new Error('store missing')
  return s
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const t0 = useRef(Date.now())
  const now = useCallback(() => NOW_START + (Date.now() - t0.current), [])
  const logId = useRef(100)

  const [runMode, setRunMode] = useState<'running' | 'paused' | 'restarted'>('running')
  const [runs, setRuns] = useState<RunRec[]>([
    { id: 1, name: 'Apply codebook v3 to all posts', version: 'v3', status: 'running', from: 1, to: 3800, done: CODED_TOTAL, startedAt: RUN_START, cost: COST_SO_FAR },
  ])
  const [tags, setTags] = useState<Record<string, Tag>>({})
  const [draft, setDraft] = useState<Codebook | null>(null)
  const [published, setPublished] = useState<Published | null>(null)
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [extraSpend, setExtraSpend] = useState(0)
  const [log, setLog] = useState<LogEvent[]>(baseLog)
  const [toast, setToast] = useState<Toast>(null)

  const addLog = useCallback((e: Omit<LogEvent, 'id' | 'at'>) => {
    setLog((l) => [...l, { ...e, id: ++logId.current, at: now() }])
  }, [now])

  const say = useCallback((text: string, tone: 'ok' | 'info' | 'warn' = 'ok') => {
    setToast({ id: Date.now() + Math.random(), text, tone })
  }, [])
  useEffect(() => {
    if (!toast) return
    const h = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(h)
  }, [toast])

  const affected = useMemo(() => ({
    all: NON_GOLD.length,
    targeted: NON_GOLD.filter(affectedByRequestChange).length,
  }), [])

  // ── run control
  const pause = useCallback(() => {
    setRunMode('paused')
    setRuns((rs) => rs.map((r) => (r.id === 1 ? { ...r, status: 'paused' as RunStatus } : r)))
    addLog({ actor: PRIYA, kind: 'run', text: 'Paused run 1 at 1,240 of 3,800', detail: 'Nothing in flight. Labels already written are unchanged.' })
    say('Run paused at 1,240 of 3,800. Nothing is in flight.', 'info')
  }, [addLog, say])

  const resume = useCallback(() => {
    setRunMode('running')
    setRuns((rs) => rs.map((r) => (r.id === 1 ? { ...r, status: 'running' as RunStatus } : r)))
    addLog({ actor: PRIYA, kind: 'run', text: 'Resumed run 1 with codebook v3' })
    say('Run 1 resumed with codebook v3.', 'info')
  }, [addLog, say])

  const restart = useCallback(() => {
    if (!published) return
    setRunMode('restarted')
    setRuns((rs) => [
      ...rs.map((r) => (r.id === 1 ? { ...r, status: 'stopped' as RunStatus, note: 'Stopped at #1,240; codebook changed' } : r)),
      { id: 2, name: 'Apply codebook v4 from post #1,241', version: 'v4' as const, status: 'running' as RunStatus, from: CODED_TOTAL + 1, to: 3800, done: 0, startedAt: now(), cost: 0 },
    ])
    addLog({ actor: PRIYA, kind: 'run', text: 'Started run 2 with codebook v4 from post #1,241', detail: `Same model and queue order as run 1 · ${CONFIG_HASH} · 2,560 posts remaining` })
    say('Run 2 started with codebook v4 from post #1,241.')
  }, [published, now, addLog, say])

  // ── review
  const setCause = useCallback((id: string, cause: Cause | undefined) => {
    setTags((t) => ({ ...t, [id]: { note: t[id]?.note ?? '', cause } }))
    if (cause) {
      const label = { model: 'model misread the post', codebook: 'codebook doesn’t cover this', gold: 'gold label looks wrong' }[cause]
      addLog({ actor: PRIYA, kind: 'review', text: `Tagged ${id}: ${label}` })
    }
  }, [addLog])
  const setNote = useCallback((id: string, note: string) => {
    setTags((t) => ({ ...t, [id]: { cause: t[id]?.cause, note } }))
  }, [])

  // ── codebook
  const startDraft = useCallback(() => {
    setDraft(cloneCodebook(CODEBOOK_V3))
    addLog({ actor: PRIYA, kind: 'codebook', text: 'Started codebook v4 draft', detail: 'Based on v3. Not usable by any run until published.' })
    say('Draft v4 started from v3.', 'info')
  }, [addLog, say])
  const discardDraft = useCallback(() => {
    setDraft(null)
    setScore(null)
    addLog({ actor: PRIYA, kind: 'codebook', text: 'Discarded codebook v4 draft' })
  }, [addLog])
  const editCode = useCallback((code: CodeId, patch: Partial<Codebook[CodeId]>) => {
    setDraft((d) => (d ? { ...d, [code]: { ...d[code], ...patch } } : d))
  }, [])
  const revertCode = useCallback((code: CodeId) => {
    setDraft((d) => (d ? { ...d, [code]: cloneCodebook(CODEBOOK_V3)[code] } : d))
    addLog({ actor: PRIYA, kind: 'codebook', text: `Reverted ${CODE_BY_ID[code].name} to v3 in the draft` })
  }, [addLog])
  const addExample = useCallback((code: CodeId, ex: Omit<Example, 'id' | 'isNew'>) => {
    const full: Example = { ...ex, id: `ex-new-${Date.now()}`, isNew: true }
    setDraft((d) => (d ? { ...d, [code]: { ...d[code], examples: [...d[code].examples, full] } } : d))
    const gold = ex.postId && CODED_BY_ID[ex.postId]?.isGold
    addLog({
      actor: PRIYA, kind: 'codebook',
      text: `Added boundary example to ${CODE_BY_ID[code].name} (correct code: ${CODE_BY_ID[ex.code].name})`,
      detail: ex.postId ? `From ${ex.postId}${gold ? ' · gold-sample post, now held out of agreement scoring' : ''}` : 'Written by hand',
    })
    say(gold ? 'Example added. That gold post is now held out of scoring.' : 'Boundary example added to the draft.')
  }, [addLog, say])
  const removeExample = useCallback((code: CodeId, id: string) => {
    setDraft((d) => (d ? { ...d, [code]: { ...d[code], examples: d[code].examples.filter((e) => e.id !== id) } } : d))
  }, [])

  const scoreCost = useMemo(() => {
    const held = heldOutOf(draft).size
    return (GOLD_TOTAL - held) * COST_PER_POST
  }, [draft])

  const runScore = useCallback(() => {
    if (!draft) return
    const held = heldOutOf(draft)
    const strength = strengthOf(draft)
    const { pairs, changes } = simulateV4(strength, held)
    const stats = statsFor(pairs)
    const cost = (GOLD_TOTAL - held.size) * COST_PER_POST
    setScore({ sig: draftSig(draft), strength, n: pairs.length, heldOut: held.size, stats, changes, at: now(), cost })
    setExtraSpend((s) => s + cost)
    const fixed = changes.filter((c) => c.kind === 'fixed').length
    const broken = changes.filter((c) => c.kind === 'broken').length
    addLog({
      actor: PRIYA, kind: 'codebook', text: `Scored draft v4 on the gold sample (${pairs.length} posts)`,
      detail: `${fixed} labels now match gold, ${broken} newly differ · request for help κ ${stats.request.kappa.toFixed(2)} · cost ${fmtUSD(cost)}`,
    })
    say(`Scored ${pairs.length} gold posts with draft v4 for ${fmtUSD(cost)}.`)
  }, [draft, now, addLog, say])

  const publish = useCallback((note: string) => {
    if (!draft) return
    const cb = cloneCodebook(draft)
    for (const k of Object.keys(cb) as CodeId[]) cb[k].examples = cb[k].examples.map((e) => ({ ...e, isNew: undefined }))
    const sig = draftSig(draft)
    setPublished({ codebook: cb, note, at: now(), sig, scored: !!score && score.sig === sig })
    addLog({ actor: PRIYA, kind: 'codebook', text: 'Published codebook v4', detail: note })
    say('Codebook v4 published. It can now be used by a run.')
  }, [draft, score, now, addLog, say])

  // ── decision
  const decide = useCallback((choice: Decision['choice'], scope?: Decision['scope']) => {
    const n = choice === 'rerun' ? (scope === 'all' ? affected.all : affected.targeted) : choice === 'discard' ? affected.all : 0
    setDecision({ choice, scope, at: now(), affected: n })
    if (choice === 'rerun') {
      setRuns((rs) => [
        ...rs.filter((r) => r.id !== 3),
        { id: 3, name: `Re-label ${n} v3 posts with codebook v4`, version: 'v4' as const, status: 'queued' as RunStatus, from: 0, to: 0, done: 0, startedAt: now(), cost: n * COST_PER_POST, note: scope === 'all' ? 'All 940 non-gold labels' : 'Only labels the change can touch' },
      ])
      addLog({ actor: PRIYA, kind: 'label', text: `Decision: re-run ${n} of the first 1,240 labels with codebook v4`, detail: `${scope === 'all' ? 'All non-gold posts' : 'Only v3 “request for help” labels and posts ending in a question'} · est. ${fmtUSD(n * COST_PER_POST)} · v3 labels are kept in the record as superseded.` })
      say(`Re-run of ${n} posts queued after run 2.`)
    } else if (choice === 'discard') {
      addLog({ actor: PRIYA, kind: 'label', text: `Decision: discard ${n} v3 labels from the dataset`, detail: 'The 300 gold-sample labels stay on file as evaluation records. Discarded labels are archived with provenance, not deleted.' })
      say(`${n} v3 labels discarded. They stay archived with provenance.`, 'warn')
    } else {
      addLog({ actor: PRIYA, kind: 'label', text: 'Decision: keep all 1,240 labels as v3', detail: 'Labels stay tagged codebook v3 / run 1 and remain outside the analysis dataset while v3 fails the policy gate.' })
      say('All 1,240 labels kept as codebook v3.')
    }
  }, [affected, now, addLog, say])

  const clearDecision = useCallback(() => {
    setDecision(null)
    setRuns((rs) => rs.filter((r) => r.id !== 3))
    addLog({ actor: PRIYA, kind: 'label', text: 'Withdrew the decision on the first 1,240 labels', detail: 'Labels are back to “provisional”. Any queued re-run was cancelled.' })
    say('Decision withdrawn.', 'info')
  }, [addLog, say])

  const spend = COST_SO_FAR + extraSpend

  const value: Store = {
    now, runs, runMode, pause, resume, restart, tags, setCause, setNote,
    draft, published, startDraft, discardDraft, editCode, revertCode, addExample, removeExample,
    score, scoreCost, runScore, publish, decision, decide, clearDecision, affected,
    spend, log, toast, say,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export { THRESHOLD, CHANGELOG_PUBLISHED }
