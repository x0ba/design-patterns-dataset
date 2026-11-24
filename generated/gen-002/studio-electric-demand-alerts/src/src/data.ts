import { at, DAY, isOnPeak, NOW, CYCLE_START, STEP, dowOf, minOfDay } from './time'

// ───────── Rate: Small Commercial TOU-B ─────────
export const RATE = {
  name: 'Small Commercial TOU-B',
  onPeak: 0.31,
  offPeak: 0.14,
  demand: 18.4, // $/kW of the cycle's highest 15-min demand
}

// ───────── Equipment ─────────
export type DeviceId = 'big' | 'small' | 'heater' | 'pug' | 'lights' | 'base'

export interface Device {
  id: DeviceId
  name: string
  kw: number
  color: string
  note: string
}

export const DEVICES: Device[] = [
  { id: 'big', name: 'Big kiln', kw: 11.5, color: '#c4521d', note: '240 V, L&L-style' },
  { id: 'small', name: 'Small kiln', kw: 7.2, color: '#e29a54', note: '240 V' },
  { id: 'heater', name: 'Space heater', kw: 2.0, color: '#5e7f8f', note: 'Thermostat-cycled' },
  { id: 'pug', name: 'Pug mill', kw: 1.5, color: '#8a6f9e', note: 'Run in short sessions' },
  { id: 'lights', name: 'Studio lights', kw: 0.8, color: '#c9b458', note: 'LED shop lights' },
  { id: 'base', name: 'Standby & controllers', kw: 0.1, color: '#a9a39a', note: 'Kiln controllers, meter hub' },
]
export const dev = (id: DeviceId) => DEVICES.find((d) => d.id === id)!

// ───────── Firings ─────────
export interface Firing {
  kiln: 'big' | 'small'
  start: number
  hours: number
  label: string
}

const F = (kiln: 'big' | 'small', mo: number, d: number, h: number, mi: number, hours: number, label: string): Firing => ({
  kiln,
  start: at(mo, d, h, mi),
  hours,
  label,
})

// Past firings in this cycle (these drove the meter data)
const PAST_FIRINGS: Firing[] = [
  F('big', 10, 29, 21, 0, 10, 'Glaze cone 6'),
  F('small', 11, 2, 10, 0, 9, 'Bisque'),
  F('small', 11, 4, 12, 30, 9, 'Bisque'),
  F('big', 11, 4, 15, 30, 10, 'Glaze cone 6'),
  F('small', 11, 6, 9, 30, 9, 'Bisque'),
  F('big', 11, 6, 16, 0, 10, 'Glaze cone 6'),
  F('small', 11, 9, 10, 0, 9, 'Bisque'),
  F('big', 11, 9, 17, 0, 10, 'Glaze cone 6'),
  F('small', 11, 13, 11, 0, 9, 'Bisque'),
  F('big', 11, 13, 15, 30, 10, 'Glaze cone 6'),
  F('small', 11, 16, 9, 40, 9, 'Bisque'), // running now
]
export const SMALL_BISQUE = PAST_FIRINGS[PAST_FIRINGS.length - 1]
export const SMALL_END = SMALL_BISQUE.start + SMALL_BISQUE.hours * 60
export const SMALL_TEMP_NOW = 1420
export const SMALL_TARGET = 1828 // cone 06

export const PLANNED_GLAZE: Firing = F('big', 11, 16, 16, 30, 10, 'Glaze cone 6')
export const AVG_FIRING_KWH = { big: 92, small: 49 }

// ───────── Deterministic RNG ─────────
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ───────── Readings ─────────
export interface Series {
  t: Float64Array // interval start (min)
  kw: Float32Array // 15-min average demand
  kwh: Float32Array
  dev: Record<DeviceId, Float32Array>
  n: number
}

export const PEAK_AT = at(11, 4, 18, 15)
export const PEAK_KW = 21.6

function kilnDuty(p: number, rnd: () => number) {
  let d: number
  if (p < 0.12) d = 0.55 + rnd() * 0.15
  else if (p < 0.7) d = 0.95 + rnd() * 0.04
  else if (p < 0.9) d = 0.72 + rnd() * 0.25
  else d = 0.35 + rnd() * 0.3
  return Math.min(d, 0.985)
}

function build(): Series {
  const rnd = mulberry32(20261116)
  const lastStart = NOW - 25 // 3:15 pm interval (ended 3:30)
  const n = Math.floor((lastStart - CYCLE_START) / STEP) + 1
  const t = new Float64Array(n)
  const kw = new Float32Array(n)
  const kwh = new Float32Array(n)
  const d: Record<DeviceId, Float32Array> = {
    big: new Float32Array(n),
    small: new Float32Array(n),
    heater: new Float32Array(n),
    pug: new Float32Array(n),
    lights: new Float32Array(n),
    base: new Float32Array(n),
  }

  // Per-day presence & pug-mill sessions
  const dayInfo = new Map<number, { in: number; out: number; pug: number[]; chill: number }>()
  const info = (m: number) => {
    const ds = Math.floor(m / DAY) * DAY
    if (!dayInfo.has(ds)) {
      const dr = mulberry32(Math.abs(ds) + 77)
      const dow = dowOf(ds)
      let inn = 9 * 60 + Math.floor(dr() * 80) - 20
      let out = 17 * 60 + 40 + Math.floor(dr() * 110)
      if (dow === 6) out = inn + 5 * 60
      if (dow === 0) {
        inn = 0
        out = 0
      }
      const pug: number[] = []
      if (dow >= 1 && dow <= 5 && dr() > 0.25) pug.push(10 * 60 + Math.floor(dr() * 70), 25 + Math.floor(dr() * 25))
      if (dow >= 1 && dow <= 5 && dr() > 0.7) pug.push(14 * 60 + Math.floor(dr() * 90), 20 + Math.floor(dr() * 20))
      dayInfo.set(ds, { in: inn, out, pug, chill: 0.5 + dr() * 0.4 })
    }
    return dayInfo.get(ds)!
  }
  // Today: one pug-mill session this morning, idle since
  info(at(11, 16)).pug = [10 * 60 + 5, 30]
  // Nov 4: she stayed late
  info(at(11, 4)).out = 19 * 60 + 10
  info(at(11, 4)).in = 9 * 60 + 30

  for (let i = 0; i < n; i++) {
    const s = CYCLE_START + i * STEP
    t[i] = s
    const mod = minOfDay(s)
    const di = info(s)
    const present = di.out > 0 && mod >= di.in && mod < di.out

    for (const f of PAST_FIRINGS) {
      const fs = f.start
      const fe = f.start + f.hours * 60
      if (s >= fs && s < fe) {
        const p = (s - fs) / (fe - fs)
        const v = dev(f.kiln).kw * kilnDuty(p, rnd)
        d[f.kiln][i] = Math.max(d[f.kiln][i], v)
      }
    }
    d.lights[i] = present ? 0.8 : 0
    d.heater[i] = present ? 2.0 * Math.min(0.97, di.chill * 0.55 + 0.25 * rnd() + 0.05) : 0
    // pug mill sessions
    let pugOn = 0
    for (let k = 0; k < di.pug.length; k += 2) {
      const ps = di.pug[k]
      const pe = ps + di.pug[k + 1]
      const ov = Math.max(0, Math.min(mod + STEP, pe) - Math.max(mod, ps))
      pugOn += ov / STEP
    }
    d.pug[i] = 1.5 * Math.min(1, pugOn)
    d.base[i] = 0.1

    // Peak interval: everything on at nameplate
    if (s === PEAK_AT) {
      d.big[i] = 11.5
      d.small[i] = 7.2
      d.heater[i] = 2.0
      d.lights[i] = 0.8
      d.pug[i] = 0
    }
    let tot = d.big[i] + d.small[i] + d.heater[i] + d.pug[i] + d.lights[i] + d.base[i]
    // Nothing else may reach the cycle peak: shave the pug mill, then soften
    if (s !== PEAK_AT && tot > 21.2) {
      d.pug[i] = 0
      tot = d.big[i] + d.small[i] + d.heater[i] + d.lights[i] + d.base[i]
      if (tot > 21.2) {
        const over = tot - (20.7 + rnd() * 0.4)
        d.heater[i] = Math.max(0, d.heater[i] - over)
        tot = d.big[i] + d.small[i] + d.heater[i] + d.lights[i] + d.base[i]
      }
    }
    kw[i] = Math.round(tot * 100) / 100
    kwh[i] = Math.round(tot * STEP / 60 * 1000) / 1000
  }
  return { t, kw, kwh, dev: d, n }
}

export const SERIES = build()
const _s = SERIES

// ───────── Derived cycle stats ─────────
export interface CycleStats {
  peakKw: number
  peakAt: number
  onKwh: number
  offKwh: number
  energyCost: number
  demandCost: number
  perDevice: Record<DeviceId, number>
  dailyKwh: { day: number; kwh: number; peak: number }[]
  peakBeforeNov4: number
  count: number
}

function stats(): CycleStats {
  let peakKw = 0
  let peakAt = 0
  let onKwh = 0
  let offKwh = 0
  const perDevice: Record<DeviceId, number> = { big: 0, small: 0, heater: 0, pug: 0, lights: 0, base: 0 }
  const daily = new Map<number, { kwh: number; peak: number }>()
  let peakBefore = 0
  for (let i = 0; i < _s.n; i++) {
    const v = _s.kw[i]
    if (v > peakKw) {
      peakKw = v
      peakAt = _s.t[i]
    }
    if (isOnPeak(_s.t[i])) onKwh += _s.kwh[i]
    else offKwh += _s.kwh[i]
    for (const k of Object.keys(perDevice) as DeviceId[]) perDevice[k] += (_s.dev[k][i] * STEP) / 60
    const ds = Math.floor(_s.t[i] / DAY) * DAY
    const e = daily.get(ds) ?? { kwh: 0, peak: 0 }
    e.kwh += _s.kwh[i]
    e.peak = Math.max(e.peak, v)
    daily.set(ds, e)
    if (_s.t[i] < at(11, 4, 12, 0)) peakBefore = Math.max(peakBefore, v)
  }
  const energyCost = onKwh * RATE.onPeak + offKwh * RATE.offPeak
  return {
    peakKw,
    peakAt,
    onKwh,
    offKwh,
    energyCost,
    demandCost: peakKw * RATE.demand,
    perDevice,
    dailyKwh: [...daily.entries()].sort((a, b) => a[0] - b[0]).map(([day, v]) => ({ day, ...v })),
    peakBeforeNov4: peakBefore,
    count: _s.n,
  }
}
export const STATS = stats()

// ───────── Bill history (last 12 cycles) ─────────
export interface Bill {
  label: string
  range: string
  total: number
  note?: string
}
export const BILLS: Bill[] = [
  { label: 'Nov', range: 'Oct 28 – Nov 27, 2025', total: 312 },
  { label: 'Dec', range: 'Nov 28 – Dec 27, 2025', total: 344 },
  { label: 'Jan', range: 'Dec 28 – Jan 27', total: 612, note: 'A glaze firing during the Jan 14 peak event added $410.' },
  { label: 'Feb', range: 'Jan 28 – Feb 27', total: 358 },
  { label: 'Mar', range: 'Feb 28 – Mar 27', total: 291 },
  { label: 'Apr', range: 'Mar 28 – Apr 27', total: 238 },
  { label: 'May', range: 'Apr 28 – May 27', total: 214 },
  { label: 'Jun', range: 'May 28 – Jun 27', total: 193 },
  { label: 'Jul', range: 'Jun 28 – Jul 27', total: 186 },
  { label: 'Aug', range: 'Jul 28 – Aug 27', total: 207 },
  { label: 'Sep', range: 'Aug 28 – Sep 27', total: 262 },
  { label: 'Oct', range: 'Sep 28 – Oct 27', total: 329 },
]

export const LAST_MONTH_ALERTS = 23
export const NOW_LIVE = _s.kw[_s.n - 1]
