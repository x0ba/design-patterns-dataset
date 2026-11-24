// Northeast POS feed (pos.ne_transaction_lines): what landed overnight, store by store.
export interface Store {
  id: string
  town: string
  closedSat: boolean
  expected: number
  landed: number
}
export interface Batch {
  id: string
  name: string
  stores: Store[]
  landedAt: string // human readable
  lastWeek: number // $M revenue, week ending Nov 8
  thisWeek: number // $M as reported at 5:18 AM
}

const ROWS_PER_STORE = 28700
const make = (startNo: number, towns: string[], closed: number[], landedStores: number): Store[] =>
  towns.map((town, i) => ({
    id: `HP-${startNo + i * 3}`,
    town,
    closedSat: closed.includes(i),
    expected: ROWS_PER_STORE,
    landed: Math.round(ROWS_PER_STORE * Math.max(0, Math.min(1, landedStores - i))),
  }))

export const NE_BATCHES: Batch[] = [
  {
    id: 'NE-1',
    name: 'Boston Metro',
    landedAt: '2:52 AM',
    lastWeek: 1.62,
    thisWeek: 1.442,
    stores: make(2101, ['Back Bay', 'Brookline', 'Cambridge', 'Somerville', 'Quincy', 'Newton', 'Medford', 'Watertown', 'Dedham', 'Woburn', 'Braintree', 'Lynn', 'Waltham', 'Arlington'], [3, 12], 14),
  },
  {
    id: 'NE-2',
    name: 'Central MA & Merrimack Valley',
    landedAt: '3:21 AM',
    lastWeek: 1.38,
    thisWeek: 1.139,
    stores: make(2150, ['Worcester', 'Framingham', 'Marlborough', 'Leominster', 'Shrewsbury', 'Lowell', 'Nashua', 'Concord NH', 'Fitchburg', 'Westborough', 'Milford', 'Auburn', 'Chelmsford', 'Haverhill'], [3, 8, 10], 14),
  },
  {
    id: 'NE-3',
    name: 'Hartford & Western MA/CT',
    landedAt: '3:47 AM',
    lastWeek: 1.41,
    thisWeek: 1.114,
    stores: make(2201, ['Hartford', 'West Hartford', 'Farmington', 'Manchester CT', 'Springfield', 'Holyoke', 'Northampton', 'Meriden', 'New Britain', 'Bristol', 'Glastonbury', 'Enfield', 'Pittsfield', 'Torrington'], [2, 6, 11, 13], 14),
  },
  {
    id: 'NE-4',
    name: 'Albany & Hudson Valley',
    landedAt: '4:06 AM',
    lastWeek: 1.36,
    thisWeek: 0.986,
    stores: make(2250, ['Albany', 'Schenectady', 'Troy', 'Saratoga Springs', 'Clifton Park', 'Latham', 'Glens Falls', 'Kingston', 'Poughkeepsie', 'Newburgh', 'Middletown', 'Hudson', 'Fishkill', 'Cohoes'], [1, 4, 6, 7, 11], 14),
  },
  {
    id: 'NE-5',
    name: 'Providence & Cape',
    landedAt: 'Not landed',
    lastWeek: 1.37,
    thisWeek: 0,
    stores: make(2301, ['Providence', 'Cranston', 'Warwick', 'Pawtucket', 'Newport', 'Fall River', 'New Bedford', 'Taunton', 'Plymouth', 'Hyannis', 'Falmouth', 'Attleboro', 'Brockton', 'Westerly'], [4, 9, 10, 13], 0),
  },
  {
    id: 'NE-6',
    name: 'Northern New England',
    landedAt: 'Partial · last rows 4:58 AM',
    lastWeek: 1.28,
    thisWeek: 0.286,
    stores: make(2350, ['Portland ME', 'South Portland', 'Bangor', 'Augusta', 'Manchester NH', 'Portsmouth', 'Dover', 'Burlington VT', 'South Burlington', 'Rutland', 'Montpelier', 'Lewiston', 'Brunswick', 'Keene'], [0, 2, 3, 9, 10], 3.64),
  },
]

export const NE_STORES = NE_BATCHES.flatMap((b) => b.stores)
export const NE_EXPECTED = NE_STORES.reduce((a, s) => a + s.expected, 0)
export const NE_LANDED = NE_STORES.reduce((a, s) => a + s.landed, 0)
export const NE_LANDED_PCT = (NE_LANDED / NE_EXPECTED) * 100 // 71.0
export const NE_CLOSED = NE_STORES.filter((s) => s.closedSat).length // 23

export const batchPct = (b: Batch) => (b.stores.reduce((a, s) => a + s.landed, 0) / b.stores.reduce((a, s) => a + s.expected, 0)) * 100

// Revenue bridge ($M). Complete batches give a like-for-like read; incomplete ones are scaled by it.
export const LAST_WEEK = NE_BATCHES.reduce((a, b) => a + b.lastWeek, 0) // 8.42
export const REPORTED = NE_BATCHES.reduce((a, b) => a + b.thisWeek, 0) // 4.967
const complete = NE_BATCHES.filter((b) => batchPct(b) >= 99.5)
const incomplete = NE_BATCHES.filter((b) => batchPct(b) < 99.5)
export const LFL_PCT = complete.reduce((a, b) => a + b.thisWeek, 0) / complete.reduce((a, b) => a + b.lastWeek, 0) - 1 // ≈ -18.9%
export const REAL_DECLINE = LAST_WEEK * -LFL_PCT // $M
export const PROJECTED = LAST_WEEK * (1 + LFL_PCT)
export const MISSING = PROJECTED - REPORTED
export const CLOSURE_EST = NE_BATCHES.reduce((a, b) => a + (b.lastWeek * b.stores.filter((s) => s.closedSat).length * 0.17) / b.stores.length, 0)
export const SWING_PCT = (REPORTED / LAST_WEEK - 1) * 100 // -41.0

// Cumulative % of expected rows landed, minutes after midnight. Today vs. the 4-week Monday average.
const interp = (knots: [number, number][], t: number) => {
  if (t <= knots[0][0]) return knots[0][1]
  for (let i = 1; i < knots.length; i++) {
    if (t <= knots[i][0]) {
      const [t0, v0] = knots[i - 1]
      const [t1, v1] = knots[i]
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
    }
  }
  return knots[knots.length - 1][1]
}
const h = (hh: number, mm: number) => hh * 60 + mm
const TODAY_KNOTS: [number, number][] = [
  [h(2, 0), 0], [h(2, 20), 4], [h(2, 40), 10], [h(2, 52), 16.7], [h(3, 10), 25], [h(3, 21), 33.3], [h(3, 35), 41],
  [h(3, 47), 50], [h(4, 0), 58], [h(4, 6), 66.7], [h(4, 20), 67.5], [h(4, 40), 69], [h(4, 58), NE_LANDED_PCT],
]
const TYPICAL_KNOTS: [number, number][] = [
  [h(2, 0), 2], [h(2, 30), 12], [h(3, 0), 32], [h(3, 30), 58], [h(3, 45), 75], [h(4, 0), 92], [h(4, 15), 100],
]
export const todayCurve = (t: number) => (t > h(4, 58) ? NE_LANDED_PCT : interp(TODAY_KNOTS, t))
export const typicalCurve = (t: number) => interp(TYPICAL_KNOTS, t)

export const REGION_WOW = [
  { region: 'Northeast', pct: SWING_PCT },
  { region: 'Mid-Atlantic', pct: 1.8 },
  { region: 'Southeast', pct: -0.6 },
  { region: 'Great Lakes', pct: 2.4 },
  { region: 'Mountain', pct: -1.1 },
]

// Labor report p95 load time (seconds), 5-minute buckets from 3:40 AM to 6:40 AM
export const LABOR_LOAD: number[] = (() => {
  const out: number[] = []
  const base = [5.4, 5.9, 5.2, 6.1, 5.6, 5.8, 6.3, 5.5, 5.9, 6.0, 5.4, 5.7]
  for (let i = 0; i < 37; i++) {
    const t = h(3, 40) + i * 5
    if (t < h(5, 42)) out.push(base[i % base.length])
    else if (t < h(5, 57)) {
      // the 5:42 refresh pulled in the pay-period rows; load climbs past the limit by 5:57
      out.push(Math.round((6 + ((t - h(5, 42)) / 15) * 6.2) * 10) / 10)
    } else {
      const k = (t - h(5, 57)) / (h(6, 40) - h(5, 57))
      const wobble = [0, 0.5, -0.3, 0.4, -0.2, 0.3, -0.4, 0.2, 0][i % 9] * (1 - k)
      out.push(Math.round((12.2 + k * 6.2 + wobble) * 10) / 10)
    }
  }
  out[out.length - 1] = 18.4
  return out
})()
export const LABOR_START = h(3, 40)
