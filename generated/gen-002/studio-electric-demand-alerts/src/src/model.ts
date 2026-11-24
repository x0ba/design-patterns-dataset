import { AVG_FIRING_KWH, DEVICES, DeviceId, PEAK_KW, RATE, SERIES, SMALL_END, dev } from './data'
import { DAY, EVENT_END, EVENT_START, NOW, STEP, at, isOnPeak, minOfDay } from './time'

// ───────── Planner: projected demand ─────────
export interface Loads {
  heater: boolean
  lights: boolean
  pug: boolean
}

export const PLAN_FROM = at(11, 16, 12, 0)
export const PLAN_TO = at(11, 17, 21, 0)
export const FIRST_FORECAST = NOW - (NOW % STEP) // 3:30 pm slot (in progress)
export const BIG_HOURS = 10
export const STUDIO_OUT_MON = at(11, 16, 18, 30)
export const PUG_WINDOW: [number, number] = [at(11, 16, 17, 0), at(11, 16, 18, 0)]
const TUE_IN = at(11, 17, 9, 0)
const TUE_OUT = at(11, 17, 18, 0)

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))

export type Breakdown = Record<DeviceId, number>

/** Average kW over a 15-minute slot for each device, given the plan. */
export function slotBreakdown(slot: number, glazeStart: number, loads: Loads): Breakdown {
  const e = slot + STEP
  const frac = (a: number, b: number) => overlap(slot, e, a, b) / STEP
  const presence = frac(NOW - 120, STUDIO_OUT_MON) + frac(TUE_IN, TUE_OUT)
  return {
    big: dev('big').kw * frac(glazeStart, glazeStart + BIG_HOURS * 60),
    small: dev('small').kw * frac(NOW - 600, SMALL_END),
    heater: loads.heater ? dev('heater').kw * presence : 0,
    lights: loads.lights ? dev('lights').kw * presence : 0,
    pug: loads.pug ? dev('pug').kw * frac(PUG_WINDOW[0], PUG_WINDOW[1]) : 0,
    base: dev('base').kw,
  }
}

export interface Slot {
  t: number
  b: Breakdown
  total: number
}

export function projectSlots(glazeStart: number, loads: Loads): Slot[] {
  const out: Slot[] = []
  for (let t = FIRST_FORECAST; t < PLAN_TO; t += STEP) {
    const b = slotBreakdown(t, glazeStart, loads)
    const total = (Object.keys(b) as DeviceId[]).reduce((s, k) => s + b[k], 0)
    out.push({ t, b, total: Math.round(total * 100) / 100 })
  }
  return out
}

export interface Outcome {
  maxKw: number
  maxAt: number
  overKw: number
  headroom: number
  demandAdded: number
  status: 'clear' | 'edge' | 'over'
  onPeakKwh: number
  offPeakKwh: number
  energyCost: number
  firingKwh: number
  end: number
  eventKilnMin: number
  eventBigMin: number
}

export function evaluate(glazeStart: number, loads: Loads): Outcome {
  const slots = projectSlots(glazeStart, loads)
  let maxKw = 0
  let maxAt = glazeStart
  // Only slots that matter for the *billing* peak: anything from now on
  for (const s of slots) {
    if (s.total > maxKw + 1e-9) {
      maxKw = s.total
      maxAt = s.t
    }
  }
  maxKw = Math.round(maxKw * 100) / 100
  const overKw = Math.max(0, Math.round((maxKw - PEAK_KW) * 100) / 100)
  const headroom = Math.round((PEAK_KW - maxKw) * 100) / 100
  const dur = BIG_HOURS * 60
  // Energy split for the glaze firing, spread evenly over its length
  let onMin = 0
  for (let m = glazeStart; m < glazeStart + dur; m += 5) if (isOnPeak(m)) onMin += 5
  const firingKwh = AVG_FIRING_KWH.big
  const onPeakKwh = (firingKwh * onMin) / dur
  const offPeakKwh = firingKwh - onPeakKwh
  const energyCost = onPeakKwh * RATE.onPeak + offPeakKwh * RATE.offPeak
  const eventBigMin = overlap(glazeStart, glazeStart + dur, EVENT_START, EVENT_END)
  return {
    maxKw,
    maxAt,
    overKw,
    headroom,
    demandAdded: overKw * RATE.demand,
    status: overKw > 0 ? 'over' : headroom < 1 ? 'edge' : 'clear',
    onPeakKwh,
    offPeakKwh,
    energyCost,
    firingKwh,
    end: glazeStart + dur,
    eventKilnMin: eventBigMin + overlap(NOW - 600, SMALL_END, EVENT_START, EVENT_END),
    eventBigMin,
  }
}

// ───────── Peak guard ─────────
export interface GuardCfg {
  enabled: boolean
  margin: number // kW under the cycle peak to start warning
  floor: number // never warn below this many kW
  lookahead: number // minutes
  repeatHrs: number // don't repeat within this many hours
}

export const DEFAULT_GUARD: GuardCfg = { enabled: false, margin: 1, floor: 16, lookahead: 30, repeatHrs: 2 }

export const guardLine = (g: GuardCfg, peak = PEAK_KW) => Math.max(peak - g.margin, g.floor)

/** When would the guard text for a given plan? null = never. */
export function guardTextTime(slots: Slot[], g: GuardCfg): { at: number; slot: number; kw: number } | null {
  const line = guardLine(g)
  for (const s of slots) {
    if (s.t + STEP <= NOW) continue
    if (s.total >= line - 1e-9) {
      const when = Math.max(NOW, s.t - g.lookahead)
      return { at: when, slot: s.t, kw: s.total }
    }
  }
  return null
}

// ───────── Replay on this cycle's meter readings ─────────
export interface Alert {
  i: number
  t: number
  kw: number
  line: number
}

/** Old rule: fire each time a reading crosses up through the threshold. */
export function replayFixed(kwLimit: number): Alert[] {
  const out: Alert[] = []
  for (let i = 1; i < SERIES.n; i++) {
    if (SERIES.kw[i] >= kwLimit && SERIES.kw[i - 1] < kwLimit) {
      out.push({ i, t: SERIES.t[i], kw: SERIES.kw[i], line: kwLimit })
    }
  }
  return out
}

/** Peak guard: warn when demand (looking `lookahead` minutes ahead) reaches the line. */
export function replayGuard(g: GuardCfg): Alert[] {
  const out: Alert[] = []
  const steps = Math.round(g.lookahead / STEP)
  let runPeak = 0
  let lastFire = -1e9
  for (let i = 0; i < SERIES.n; i++) {
    const line = Math.max(runPeak - g.margin, g.floor)
    let ahead = 0
    for (let k = 0; k <= steps && i + k < SERIES.n; k++) ahead = Math.max(ahead, SERIES.kw[i + k])
    if (ahead >= line && SERIES.t[i] - lastFire >= g.repeatHrs * 60) {
      out.push({ i, t: SERIES.t[i], kw: ahead, line })
      lastFire = SERIES.t[i]
    }
    runPeak = Math.max(runPeak, SERIES.kw[i])
  }
  return out
}

export const fmtKw = (v: number, d = 1) => v.toFixed(d)
export const fmtUsd = (v: number, cents = false) =>
  '$' + (cents ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'))
export const fmtUsd2 = (v: number) => '$' + v.toFixed(2)

export const _days = DAY
export const _mod = minOfDay
export const _devs = DEVICES
