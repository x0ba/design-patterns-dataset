import { at } from '../time'
import { PEOPLE } from './people'

export interface Region {
  key: string
  name: string
  stores: number
}
export const REGIONS: Region[] = [
  { key: 'ne', name: 'Northeast', stores: 84 },
  { key: 'ma', name: 'Mid-Atlantic', stores: 72 },
  { key: 'se', name: 'Southeast', stores: 66 },
  { key: 'gl', name: 'Great Lakes', stores: 52 },
  { key: 'mt', name: 'Mountain', stores: 36 },
]

export type Domain =
  | 'Sales'
  | 'Merchandising'
  | 'Loss Prevention'
  | 'Labor'
  | 'Supply Chain'
  | 'Store Operations'
  | 'Finance'
  | 'E-commerce'
  | 'Pharmacy'
  | 'Executive'
  | 'Loyalty'

export interface Report {
  id: string
  name: string
  domain: Domain
  owner: string // person id
  schedule: string
  scheduleKind: 'daily' | 'hourly' | 'quarter' | 'weekly'
  upstream: string[]
  lastRefresh: Date
  nextRefresh: Date
  viewers: number
  viewersNote?: string
  loadP95: number
  region?: string
  dept?: string
  banner?: string
}

// small deterministic PRNG so the catalogue is identical on every load
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(310)
const ri = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo))

interface Tpl {
  name: string
  domain: Domain
  sched: [kind: Report['scheduleKind'], h?: number, m?: number]
  up: string[] // tokens: {r} replaced with region key
  v: [number, number]
}

const OWNER_BY_DOMAIN: Record<Domain, string> = {
  Sales: 'marcus',
  Merchandising: 'amara',
  'Loss Prevention': 'hannah',
  Labor: 'ingrid',
  'Supply Chain': 'tobias',
  'Store Operations': 'joel',
  Finance: 'meiling',
  'E-commerce': 'rafael',
  Pharmacy: 'sunita',
  Executive: 'marcus',
  Loyalty: 'rafael',
}

const REGIONAL: Tpl[] = [
  { name: 'Daily Sales by Store', domain: 'Sales', sched: ['daily', 5, 15], up: ['pos.{r}_transaction_lines', 'ref.store_master'], v: [70, 130] },
  { name: 'Basket Size & Mix', domain: 'Sales', sched: ['daily', 5, 30], up: ['pos.{r}_transaction_lines', 'merch.item_hierarchy'], v: [30, 60] },
  { name: 'Promo Lift Tracker', domain: 'Sales', sched: ['daily', 6, 0], up: ['pos.{r}_transaction_lines', 'merch.promo_calendar'], v: [25, 55] },
  { name: 'Hourly Sales Pace', domain: 'Sales', sched: ['hourly'], up: ['pos.{r}_transaction_lines'], v: [40, 90] },
  { name: 'Comp Sales vs. Last Year', domain: 'Sales', sched: ['daily', 5, 45], up: ['pos.{r}_transaction_lines', 'finance.fiscal_calendar'], v: [35, 70] },
  { name: 'Price Compliance Audit', domain: 'Merchandising', sched: ['daily', 4, 30], up: ['merch.price_book', 'pos.{r}_transaction_lines'], v: [12, 30] },
  { name: 'Planogram Reset Status', domain: 'Merchandising', sched: ['daily', 4, 0], up: ['merch.planogram_resets', 'ref.store_master'], v: [15, 35] },
  { name: 'Markdown & Clearance Tracker', domain: 'Merchandising', sched: ['daily', 3, 30], up: ['merch.markdown_events', 'inventory.onhand_snapshot'], v: [18, 40] },
  { name: 'Void & Refund Exceptions', domain: 'Loss Prevention', sched: ['daily', 7, 0], up: ['lp.shrink_events_curated', 'pos.{r}_transaction_lines'], v: [10, 24] },
  { name: 'Scheduled vs. Actual Hours', domain: 'Labor', sched: ['daily', 5, 0], up: ['labor.punch_detail', 'labor.schedule_published'], v: [45, 95] },
  { name: 'Overtime Watchlist', domain: 'Labor', sched: ['daily', 5, 0], up: ['labor.punch_detail'], v: [20, 45] },
  { name: 'Absenteeism & Call-Outs', domain: 'Labor', sched: ['daily', 5, 10], up: ['labor.attendance_events'], v: [14, 32] },
  { name: 'Delivery Window Adherence', domain: 'Supply Chain', sched: ['hourly'], up: ['scm.dc_shipments', 'scm.store_receipts'], v: [22, 48] },
  { name: 'Out-of-Stock Rate', domain: 'Supply Chain', sched: ['daily', 4, 45], up: ['inventory.onhand_snapshot', 'pos.{r}_transaction_lines'], v: [40, 85] },
  { name: 'Inventory On-Hand Snapshot', domain: 'Supply Chain', sched: ['hourly'], up: ['inventory.onhand_snapshot'], v: [25, 60] },
  { name: 'Supplier Fill Rate', domain: 'Supply Chain', sched: ['daily', 5, 0], up: ['scm.purchase_orders', 'scm.store_receipts'], v: [16, 34] },
  { name: 'Store Traffic by Hour', domain: 'Store Operations', sched: ['quarter'], up: ['ops.traffic_counters'], v: [30, 70] },
  { name: 'Checkout Wait Times', domain: 'Store Operations', sched: ['quarter'], up: ['ops.checkout_lane_events'], v: [20, 52] },
  { name: 'Self-Checkout Uptime', domain: 'Store Operations', sched: ['hourly'], up: ['ops.checkout_lane_events'], v: [12, 28] },
  { name: 'Store Audit Scores', domain: 'Store Operations', sched: ['daily', 4, 0], up: ['ops.store_audits'], v: [26, 58] },
  { name: 'Cold-Chain Temperature Exceptions', domain: 'Store Operations', sched: ['quarter'], up: ['ops.refrigeration_sensors'], v: [18, 40] },
  { name: 'Store P&L Flash', domain: 'Finance', sched: ['daily', 6, 0], up: ['finance.gl_daily', 'pos.{r}_transaction_lines'], v: [24, 50] },
  { name: 'Gross Margin by Category', domain: 'Finance', sched: ['daily', 6, 0], up: ['finance.gl_daily', 'merch.item_hierarchy'], v: [22, 46] },
  { name: 'Online Order Fulfillment', domain: 'E-commerce', sched: ['hourly'], up: ['ecom.orders', 'ecom.pickup_slots'], v: [28, 62] },
  { name: 'Pickup Slot Utilization', domain: 'E-commerce', sched: ['hourly'], up: ['ecom.pickup_slots'], v: [16, 36] },
  { name: 'Substitution Rate', domain: 'E-commerce', sched: ['daily', 5, 30], up: ['ecom.orders', 'ecom.substitutions'], v: [14, 30] },
  { name: 'Pharmacy Fill Rate', domain: 'Pharmacy', sched: ['daily', 5, 0], up: ['rx.fill_events', 'ref.store_master'], v: [10, 24] },
  { name: 'Receiving Accuracy', domain: 'Supply Chain', sched: ['daily', 4, 15], up: ['scm.store_receipts'], v: [12, 26] },
]

const DEPTS = ['Produce', 'Meat & Seafood', 'Dairy', 'Bakery', 'Deli & Prepared Foods', 'Frozen', 'Center Store Grocery', 'Floral', 'Health & Beauty', 'Beverage & Beer/Wine']
const DEPT_TPL: { name: string; domain: Domain; up: string[]; sched: [Report['scheduleKind'], number?, number?] }[] = [
  { name: 'Sales & Margin', domain: 'Sales', up: ['pos.all_transaction_lines', 'finance.gl_daily'], sched: ['daily', 5, 45] },
  { name: 'Shrink', domain: 'Loss Prevention', up: ['lp.shrink_dept_rollup'], sched: ['daily', 4, 0] },
  { name: 'Waste & Spoilage', domain: 'Supply Chain', up: ['inventory.waste_log'], sched: ['daily', 4, 30] },
  { name: 'Inventory Turns', domain: 'Supply Chain', up: ['inventory.onhand_snapshot', 'pos.all_transaction_lines'], sched: ['daily', 5, 0] },
  { name: 'Vendor Scorecard', domain: 'Merchandising', up: ['scm.purchase_orders', 'scm.store_receipts'], sched: ['daily', 5, 30] },
  { name: 'Price Change Impact', domain: 'Merchandising', up: ['merch.price_book', 'pos.all_transaction_lines'], sched: ['daily', 6, 0] },
  { name: 'Item Availability', domain: 'Supply Chain', up: ['inventory.onhand_snapshot'], sched: ['daily', 4, 45] },
]

const CHAIN: { name: string; domain: Domain; sched: [Report['scheduleKind'], number?, number?]; up: string[]; v: number; note?: string }[] = [
  { name: 'Weekly Sales Performance', domain: 'Executive', sched: ['weekly', 5, 15], up: ['pos.ne_transaction_lines', 'pos.ma_transaction_lines', 'pos.se_transaction_lines', 'pos.gl_transaction_lines', 'pos.mt_transaction_lines', 'finance.fiscal_calendar'], v: 180, note: 'Monday viewers' },
  { name: 'Executive Daily Flash', domain: 'Executive', sched: ['daily', 5, 0], up: ['pos.all_transaction_lines', 'finance.gl_daily'], v: 220 },
  { name: 'Shrink & Loss Summary', domain: 'Loss Prevention', sched: ['daily', 3, 0], up: ['lp.shrink_events_curated', 'pos.all_transaction_lines'], v: 46 },
  { name: 'Labor Hours by Store & Department', domain: 'Labor', sched: ['daily', 5, 40], up: ['labor.punch_detail', 'labor.schedule_published', 'ref.store_master'], v: 140, note: 'Monday viewers' },
  { name: 'Weekly Operations Scorecard', domain: 'Executive', sched: ['weekly', 5, 30], up: ['ops.store_audits', 'ops.traffic_counters', 'scm.store_receipts'], v: 95 },
  { name: 'Loyalty Program KPIs', domain: 'Loyalty', sched: ['daily', 4, 0], up: ['loyalty.member_activity'], v: 58 },
  { name: 'Loyalty Offer Redemption', domain: 'Loyalty', sched: ['daily', 4, 15], up: ['loyalty.member_activity', 'merch.promo_calendar'], v: 33 },
  { name: 'Customer Satisfaction Trend', domain: 'Store Operations', sched: ['daily', 6, 0], up: ['ops.survey_responses'], v: 41 },
  { name: 'Private Label Penetration', domain: 'Merchandising', sched: ['weekly', 5, 0], up: ['pos.all_transaction_lines', 'merch.item_hierarchy'], v: 27 },
  { name: 'Chain Comp Sales Bridge', domain: 'Finance', sched: ['weekly', 5, 45], up: ['pos.all_transaction_lines', 'finance.fiscal_calendar'], v: 64 },
  { name: 'Weekly Flash P&L', domain: 'Finance', sched: ['weekly', 6, 0], up: ['finance.gl_daily'], v: 72 },
  { name: 'Store Staffing Coverage Forecast', domain: 'Labor', sched: ['daily', 4, 30], up: ['labor.schedule_published', 'ops.traffic_counters'], v: 52 },
  { name: 'DC Inventory Position', domain: 'Supply Chain', sched: ['hourly'], up: ['scm.dc_shipments', 'inventory.dc_onhand'], v: 38 },
  { name: 'Transportation Cost per Case', domain: 'Supply Chain', sched: ['daily', 5, 0], up: ['scm.dc_shipments', 'finance.freight_invoices'], v: 15 },
  { name: 'Cold-Chain Compliance Summary', domain: 'Store Operations', sched: ['daily', 5, 0], up: ['ops.refrigeration_sensors'], v: 29 },
  { name: 'Seasonal Item Tracker — Thanksgiving', domain: 'Merchandising', sched: ['daily', 5, 30], up: ['pos.all_transaction_lines', 'inventory.onhand_snapshot'], v: 84 },
  { name: 'Ad Circular Performance', domain: 'Merchandising', sched: ['weekly', 5, 0], up: ['merch.promo_calendar', 'pos.all_transaction_lines'], v: 44 },
  { name: 'Vendor Funding & Allowances', domain: 'Finance', sched: ['daily', 6, 0], up: ['finance.vendor_allowances'], v: 17 },
  { name: 'Price Zone Compliance', domain: 'Merchandising', sched: ['daily', 4, 30], up: ['merch.price_book'], v: 21 },
  { name: 'Food Safety Audit Summary', domain: 'Store Operations', sched: ['daily', 5, 0], up: ['ops.store_audits'], v: 36 },
  { name: 'Workers’ Comp Incident Trends', domain: 'Labor', sched: ['weekly', 5, 0], up: ['labor.incident_reports'], v: 12 },
  { name: 'Payroll Accrual Estimate', domain: 'Finance', sched: ['daily', 6, 0], up: ['labor.punch_detail', 'finance.gl_daily'], v: 14 },
  { name: 'Fuel Rewards Redemption', domain: 'Loyalty', sched: ['daily', 4, 30], up: ['loyalty.member_activity', 'ref.fuel_sites'], v: 19 },
  { name: 'Gift Card Liability', domain: 'Finance', sched: ['daily', 5, 0], up: ['finance.gift_card_ledger'], v: 11 },
  { name: 'Digital Coupon Clips', domain: 'Loyalty', sched: ['hourly'], up: ['loyalty.coupon_events'], v: 23 },
  { name: 'Store Remodel Impact', domain: 'Finance', sched: ['weekly', 5, 15], up: ['pos.all_transaction_lines', 'ref.store_master'], v: 9 },
  { name: 'New Item Introduction Scorecard', domain: 'Merchandising', sched: ['weekly', 5, 30], up: ['merch.item_hierarchy', 'pos.all_transaction_lines'], v: 24 },
  { name: 'Out-of-Stock Root Cause', domain: 'Supply Chain', sched: ['daily', 5, 15], up: ['inventory.onhand_snapshot', 'scm.purchase_orders'], v: 31 },
  { name: 'Markdown Cadence Review', domain: 'Merchandising', sched: ['weekly', 5, 0], up: ['merch.markdown_events'], v: 16 },
  { name: 'BI Refresh Success Rate', domain: 'Executive', sched: ['hourly'], up: ['bi.refresh_log'], v: 8 },
]

function schedLabel(s: [Report['scheduleKind'], number?, number?]) {
  const t = (h = 0, m = 0) => `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  if (s[0] === 'hourly') return 'Hourly at :10'
  if (s[0] === 'quarter') return 'Every 15 min'
  if (s[0] === 'weekly') return `Mondays ${t(s[1], s[2])}`
  return `Daily ${t(s[1], s[2])}`
}

// "now" for catalogue purposes is the page-open moment, 6:40 AM Monday
function lastAndNext(s: [Report['scheduleKind'], number?, number?], jitter: number) {
  const nowMin = 6 * 60 + 40
  if (s[0] === 'hourly') return { last: at(0, 6, 10 + jitter), next: at(0, 7, 10) }
  if (s[0] === 'quarter') return { last: at(0, 6, 30 + Math.min(jitter, 4)), next: at(0, 6, 45) }
  const h = s[1] ?? 5
  const m = s[2] ?? 0
  const sched = h * 60 + m
  if (s[0] === 'weekly') {
    return sched <= nowMin ? { last: at(0, h, m + jitter), next: at(7, h, m) } : { last: at(-7, h, m + jitter), next: at(0, h, m) }
  }
  return sched <= nowMin ? { last: at(0, h, m + jitter), next: at(1, h, m) } : { last: at(-1, h, m + jitter), next: at(0, h, m) }
}

const reports: Report[] = []
let seq = 1
function push(r: Omit<Report, 'id'>) {
  reports.push({ ...r, id: `rpt-${String(seq++).padStart(3, '0')}` })
}

for (const t of CHAIN) {
  const jitter = t.name === 'Weekly Sales Performance' ? 3 : t.name === 'Labor Hours by Store & Department' ? 2 : ri(1, 4)
  const { last, next } = lastAndNext(t.sched, jitter)
  let lastRefresh = last
  if (t.name === 'Shrink & Loss Summary') lastRefresh = at(-1, 3, 1) // last good refresh before the 3:02 AM failure
  push({
    name: t.name,
    domain: t.domain,
    owner: OWNER_BY_DOMAIN[t.domain],
    schedule: schedLabel(t.sched),
    scheduleKind: t.sched[0],
    upstream: t.up,
    lastRefresh,
    nextRefresh: next,
    viewers: t.v,
    viewersNote: t.note,
    loadP95: t.name === 'Labor Hours by Store & Department' ? 18.4 : Math.round((2.4 + rand() * 4.6) * 10) / 10,
  })
}
for (const reg of REGIONS) {
  for (const t of REGIONAL) {
    const { last, next } = lastAndNext(t.sched, ri(1, 5))
    push({
      name: `${t.name} — ${reg.name}`,
      domain: t.domain,
      owner: OWNER_BY_DOMAIN[t.domain],
      schedule: schedLabel(t.sched),
      scheduleKind: t.sched[0],
      upstream: t.up.map((u) => u.replace('{r}', reg.key)),
      lastRefresh: last,
      nextRefresh: next,
      viewers: Math.max(6, Math.round(ri(t.v[0], t.v[1]) * (reg.stores / 66))),
      loadP95: Math.round((1.8 + rand() * 5.2) * 10) / 10,
      region: reg.key,
    })
  }
}
for (const d of DEPTS) {
  for (const t of DEPT_TPL) {
    const { last, next } = lastAndNext(t.sched, ri(1, 5))
    push({
      name: `${d} ${t.name}`,
      domain: t.domain,
      owner: OWNER_BY_DOMAIN[t.domain],
      schedule: schedLabel(t.sched),
      scheduleKind: t.sched[0],
      upstream: t.up,
      lastRefresh: last,
      nextRefresh: next,
      viewers: ri(8, 48),
      loadP95: Math.round((2 + rand() * 5) * 10) / 10,
      dept: d,
    })
  }
}

export const REPORTS: Report[] = reports
export const reportByName = (n: string) => {
  const r = REPORTS.find((x) => x.name === n)
  if (!r) throw new Error('unknown report ' + n)
  return r
}
export const reportById = (id: string) => REPORTS.find((r) => r.id === id)
export const regionName = (key?: string) => REGIONS.find((r) => r.key === key)?.name

export const NE_FEED_TABLE = 'pos.ne_transaction_lines'
export const SHRINK_TABLE = 'lp.shrink_events_curated'
export const dependentsOf = (table: string) =>
  REPORTS.filter((r) => r.upstream.includes(table) || (table.startsWith('pos.') && r.upstream.includes('pos.all_transaction_lines')))
