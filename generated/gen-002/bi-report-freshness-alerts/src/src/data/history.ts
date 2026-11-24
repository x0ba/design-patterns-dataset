import { at } from '../time'

export type Outcome = 'real' | 'false' | 'minor' | 'today'
export interface HistEvent {
  id: string
  when: Date
  region: string
  swing: number // signed %
  completeness: number // % of expected upstream rows at fire time
  knownLate: boolean // on the feed calendar as a planned late window
  completeAfter: number | null // minutes until feed completes (null = still stalled)
  outcome: Outcome
  note: string
}

export const EVENTS: HistEvent[] = [
  { id: 'e1', when: at(-28, 5, 21), region: 'Northeast', swing: -33, completeness: 67, knownLate: true, completeAfter: 95, outcome: 'false', note: 'POS vendor maintenance; feed finished 6:56 AM. The false alarm from last month.' },
  { id: 'e2', when: at(-25, 5, 20), region: 'Southeast', swing: -19, completeness: 100, knownLate: false, completeAfter: 0, outcome: 'minor', note: 'Real but small: rain on Sunday.' },
  { id: 'e3', when: at(-21, 5, 21), region: 'Great Lakes', swing: 27, completeness: 100, knownLate: false, completeAfter: 0, outcome: 'real', note: 'Halloween weekend promo. Directors wanted the heads-up.' },
  { id: 'e4', when: at(-19, 5, 20), region: 'Mid-Atlantic', swing: -17, completeness: 100, knownLate: false, completeAfter: 0, outcome: 'minor', note: 'Real but small: two stores closed for refrigeration repair.' },
  { id: 'e5', when: at(-14, 5, 20), region: 'Mountain', swing: 26, completeness: 99, knownLate: false, completeAfter: 0, outcome: 'real', note: 'Early-season snowstorm stock-up.' },
  { id: 'e6', when: at(-13, 5, 20), region: 'Southeast', swing: 21, completeness: 100, knownLate: false, completeAfter: 0, outcome: 'minor', note: 'Real but small: Veterans Day promo carry-over.' },
  { id: 'e7', when: at(-11, 5, 21), region: 'Great Lakes', swing: -31, completeness: 93, knownLate: false, completeAfter: 55, outcome: 'real', note: 'Ice storm closed 11 stores. Feed was 7% short; completed 55 min later.' },
  { id: 'e8', when: at(-7, 5, 22), region: 'Mid-Atlantic', swing: -26, completeness: 88, knownLate: false, completeAfter: 70, outcome: 'false', note: 'Unplanned late load; swing vanished once the feed finished at 6:32 AM.' },
  { id: 'e9', when: at(-6, 5, 20), region: 'Mountain', swing: -23, completeness: 100, knownLate: false, completeAfter: 0, outcome: 'minor', note: 'Real but small: cold snap.' },
  { id: 'e10', when: at(-3, 5, 20), region: 'Northeast', swing: -18, completeness: 100, knownLate: false, completeAfter: 0, outcome: 'minor', note: 'Real but small: pre-storm Friday traffic dip.' },
  { id: 'e11', when: at(0, 5, 19), region: 'Northeast', swing: -41, completeness: 71, knownLate: false, completeAfter: null, outcome: 'today', note: 'Today. Feed stalled at 71%; real storm decline underneath (~−19%).' },
]

export interface BtConfig {
  threshold: number
  gateMin: number | null
  maxHold: number
  honorCalendar: boolean
}
export type Result =
  | { kind: 'quiet' }
  | { kind: 'fires'; delay: number; provisional: boolean }
  | { kind: 'suppressed'; why: 'calendar' | 'cleared' }

export function evaluate(e: HistEvent, c: BtConfig): Result {
  if (Math.abs(e.swing) < c.threshold) return { kind: 'quiet' }
  if (c.honorCalendar && e.knownLate) return { kind: 'suppressed', why: 'calendar' }
  if (c.gateMin !== null && e.completeness < c.gateMin) {
    const lands = e.completeAfter !== null && e.completeAfter <= c.maxHold
    if (lands) {
      if (e.outcome === 'false') return { kind: 'suppressed', why: 'cleared' }
      return { kind: 'fires', delay: e.completeAfter!, provisional: false }
    }
    return { kind: 'fires', delay: c.maxHold, provisional: true }
  }
  return { kind: 'fires', delay: 0, provisional: false }
}

export function summarize(c: BtConfig) {
  let fired = 0, falseFired = 0, realCaught = 0, realMissed = 0, noise = 0, delaySum = 0, delayed = 0, maxDelay = 0
  let falsePrevented = 0
  for (const e of EVENTS) {
    const r = evaluate(e, c)
    if (r.kind === 'fires') {
      fired++
      if (e.outcome === 'false') falseFired++
      if (e.outcome === 'minor') noise++
      if (e.outcome === 'real') {
        realCaught++
        if (r.delay > 0) { delayed++; delaySum += r.delay; maxDelay = Math.max(maxDelay, r.delay) }
      }
    } else {
      if (e.outcome === 'real') realMissed++
      if (e.outcome === 'false') falsePrevented++
    }
  }
  return { fired, falseFired, realCaught, realMissed, noise, delayed, avgDelay: delayed ? Math.round(delaySum / delayed) : 0, maxDelay, falsePrevented }
}
export const CURRENT_CFG: BtConfig = { threshold: 25, gateMin: null, maxHold: 90, honorCalendar: false }
export const PROPOSED_CFG: BtConfig = { threshold: 25, gateMin: 95, maxHold: 90, honorCalendar: true }
