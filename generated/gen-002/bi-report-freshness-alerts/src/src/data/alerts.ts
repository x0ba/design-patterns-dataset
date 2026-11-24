import { at } from '../time'
import { reportByName } from './reports'
import { Severity } from './rules'

export type AlertKind = 'sales' | 'shrink' | 'labor' | 'feed' | 'generic'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

export interface TimelineEntry {
  at: Date
  text: string
  actor?: string
}
export interface Alert {
  id: string
  kind: AlertKind
  reportId: string
  ruleId: string
  title: string
  summary: string
  severity: Severity
  firedAt: Date
  status: AlertStatus
  ackBy?: string
  resolvedAt?: Date
  resolution?: string
  observed?: string
  expected?: string
  timeline: TimelineEntry[]
  escalated?: boolean
  muteId?: string
  released?: boolean
}

const rid = (n: string) => reportByName(n).id

interface G {
  t: Date
  report: string
  rule: string
  title: string
  summary: string
  observed: string
  expected: string
  sev: Severity
  status: AlertStatus
  resolvedAt?: Date
  ackBy?: string
  resolution?: string
}

const GENERIC: G[] = [
  { t: at(-1, 8, 5), report: 'Daily Sales by Store — Great Lakes', rule: 'R-004', title: 'Refresh 14 min late', summary: 'Scheduled 5:15 AM run started late behind the Great Lakes POS extract.', observed: 'Refreshed 14 min after schedule', expected: 'Within 20 min', sev: 'Warning', status: 'resolved', resolvedAt: at(-1, 8, 19), resolution: 'Auto-resolved: refresh succeeded' },
  { t: at(-1, 11, 30), report: 'Store Traffic by Hour — Southeast', rule: 'R-044', title: 'Load time 13.9 s', summary: 'p95 load time stayed above 12 s for 15 minutes.', observed: 'p95 13.9 s', expected: 'p95 under 12 s', sev: 'Info', status: 'resolved', resolvedAt: at(-1, 12, 10), ackBy: 'Kiran Shah', resolution: 'Counter firmware reboot at 14 stores caused a burst of backfill queries; cleared on its own.' },
  { t: at(-1, 13, 15), report: 'Pharmacy Fill Rate — Mid-Atlantic', rule: 'R-045', title: 'Load time 13.2 s', summary: 'p95 load time above 12 s for 15 minutes.', observed: 'p95 13.2 s', expected: 'p95 under 12 s', sev: 'Info', status: 'resolved', resolvedAt: at(-1, 13, 40), resolution: 'Auto-resolved: load time back under 12 s' },
  { t: at(-1, 16, 48), report: 'Delivery Window Adherence — Mid-Atlantic', rule: 'R-011', title: 'Refresh 22 min late', summary: 'Hourly refresh at 4:10 PM finished late.', observed: 'Refreshed 22 min late', expected: 'Within 25 min', sev: 'Warning', status: 'resolved', resolvedAt: at(-1, 16, 58), resolution: 'Auto-resolved: next refresh on time' },
  { t: at(-1, 19, 2), report: 'Promo Lift Tracker — Great Lakes', rule: 'R-031', title: 'Promo lift +27% vs. last week', summary: 'Lift jumped after the Thanksgiving turkey pre-sale launched Sunday.', observed: '+27% WoW', expected: 'Within ±25%', sev: 'Info', status: 'resolved', resolvedAt: at(-1, 19, 20), ackBy: 'Kiran Shah', resolution: 'Expected: pre-sale launch confirmed with Merchandising.' },
  { t: at(-1, 21, 30), report: 'Online Order Fulfillment — Southeast', rule: 'R-025', title: 'ecom.orders rows −26%', summary: 'Hourly load landed fewer rows than the 4-week Sunday average.', observed: '74% of expected rows', expected: '≥ 75%', sev: 'Warning', status: 'resolved', resolvedAt: at(-1, 22, 5), resolution: 'Auto-resolved: late rows arrived' },
  { t: at(-1, 23, 12), report: 'Inventory On-Hand Snapshot — Mountain', rule: 'R-011', title: 'Refresh 31 min late', summary: 'Mountain DC extract has not arrived; snapshot is serving the 10:10 PM data.', observed: 'Last refresh 10:10 PM', expected: 'Hourly', sev: 'Warning', status: 'acknowledged', ackBy: 'Kiran Shah', resolution: 'Waiting on Mountain DC extract; Data Engineering notified.' },
  { t: at(0, 1, 20), report: 'Executive Daily Flash', rule: 'R-040', title: 'Load time 12.8 s', summary: 'Brief slowdown during overnight cache rebuild.', observed: 'p95 12.8 s', expected: 'p95 under 12 s', sev: 'Warning', status: 'resolved', resolvedAt: at(0, 1, 34), resolution: 'Auto-resolved: load time back under 12 s' },
  { t: at(0, 2, 45), report: 'Markdown & Clearance Tracker — Southeast', rule: 'R-003', title: 'Refresh 18 min late', summary: '3:30 AM run waited on the inventory snapshot.', observed: 'Refreshed 18 min late', expected: 'Within 20 min', sev: 'Warning', status: 'resolved', resolvedAt: at(0, 3, 1), resolution: 'Auto-resolved: refresh succeeded' },
  { t: at(0, 4, 10), report: 'Loyalty Program KPIs', rule: 'R-022', title: 'loyalty.member_activity rows −27%', summary: 'Vendor delivered the member-activity file in two parts.', observed: '73% of expected rows', expected: '≥ 75%', sev: 'Warning', status: 'resolved', resolvedAt: at(0, 4, 50), ackBy: 'Kiran Shah', resolution: 'Second half of the vendor file landed at 4:46 AM.' },
  { t: at(0, 5, 44), report: 'Executive Daily Flash', rule: 'R-007', title: 'Refresh 11 min late', summary: 'Daily 5:00 AM refresh finished at 5:11 AM.', observed: 'Refreshed 11 min late', expected: 'Within 10 min', sev: 'Critical', status: 'resolved', resolvedAt: at(0, 5, 53), resolution: 'Auto-resolved: refresh succeeded' },
]

const fmt = (g: G): Omit<Alert, 'id'> => ({
  kind: 'generic',
  reportId: rid(g.report),
  ruleId: g.rule,
  title: g.title,
  summary: g.summary,
  severity: g.sev,
  firedAt: g.t,
  status: g.status,
  resolvedAt: g.resolvedAt,
  ackBy: g.ackBy,
  resolution: g.resolution,
  observed: g.observed,
  expected: g.expected,
  timeline: [
    { at: g.t, text: `Alert fired by ${g.rule}` },
    ...(g.ackBy ? [{ at: new Date(g.t.getTime() + 6 * 60000), text: 'Acknowledged', actor: g.ackBy }] : []),
    ...(g.resolvedAt ? [{ at: g.resolvedAt, text: g.resolution ?? 'Resolved' }] : []),
  ],
})

const SHRINK: Omit<Alert, 'id'> = {
  kind: 'shrink',
  reportId: rid('Shrink & Loss Summary'),
  ruleId: 'R-008',
  title: 'Refresh failed: permission denied on source table',
  summary: 'The 3:00 AM refresh failed on all 3 attempts. Report is serving Sunday’s data.',
  severity: 'Warning',
  firedAt: at(0, 3, 2),
  status: 'open',
  observed: 'Last good refresh Sun 3:01 AM',
  expected: 'Daily 3:00 AM',
  timeline: [
    { at: at(0, 3, 0), text: 'Scheduled refresh started' },
    { at: at(0, 3, 2), text: 'Refresh failed (attempt 3 of 3): PERMISSION_DENIED on lp.shrink_events_curated' },
    { at: at(0, 3, 2), text: 'Alert fired by R-008 · paged on-call' },
  ],
}
const SALES: Omit<Alert, 'id'> = {
  kind: 'sales',
  reportId: rid('Weekly Sales Performance'),
  ruleId: 'R-027',
  title: 'Northeast revenue down 41% week over week',
  summary: 'Reported $4.97M vs. $8.42M last week. Other four regions are within ±3%.',
  severity: 'Critical',
  firedAt: at(0, 5, 19),
  status: 'open',
  observed: '−41.0% WoW',
  expected: 'Within ±25%',
  timeline: [
    { at: at(0, 4, 15), text: 'Typical Northeast POS feed completion time (4-week Monday average)' },
    { at: at(0, 4, 58), text: 'Last Northeast POS rows landed (71% of expected)' },
    { at: at(0, 5, 0), text: 'Row-count check on pos.ne_transaction_lines: 71% of expected. Alert suppressed by mute M-3' },
    { at: at(0, 5, 15), text: 'Weekly Sales Performance refresh started on schedule' },
    { at: at(0, 5, 18), text: 'Refresh succeeded with partial Northeast data' },
    { at: at(0, 5, 19), text: 'Alert fired by R-027 · paged on-call' },
  ],
}
const LABOR: Omit<Alert, 'id'> = {
  kind: 'labor',
  reportId: rid('Labor Hours by Store & Department'),
  ruleId: 'R-041',
  title: 'Load time 18.4 s, above the 12 s limit',
  summary: 'p95 load time has been above 12 s since 5:57 AM and is still climbing.',
  severity: 'Warning',
  firedAt: at(0, 6, 12),
  status: 'open',
  observed: 'p95 18.4 s',
  expected: 'p95 under 12 s',
  timeline: [
    { at: at(0, 5, 42), text: 'Scheduled refresh succeeded; p95 load time begins rising from a ~6 s baseline' },
    { at: at(0, 5, 57), text: 'p95 crosses 12 s' },
    { at: at(0, 6, 12), text: 'Alert fired by R-041 after 15 min above limit' },
  ],
}

// Ordered by time; ids ascend with time.
const all = [
  ...GENERIC.slice(0, 9).map(fmt),
  SHRINK,
  fmt(GENERIC[9]),
  SALES,
  fmt(GENERIC[10]),
  LABOR,
].sort((a, b) => a.firedAt.getTime() - b.firedAt.getTime())

export const ALERTS_INITIAL: Alert[] = all.map((a, i) => ({ ...a, id: `A-${1031 + i}` }))
export const SALES_ALERT_ID = ALERTS_INITIAL.find((a) => a.kind === 'sales')!.id
export const SHRINK_ALERT_ID = ALERTS_INITIAL.find((a) => a.kind === 'shrink')!.id
export const LABOR_ALERT_ID = ALERTS_INITIAL.find((a) => a.kind === 'labor')!.id

export interface Mute {
  id: string
  ruleId: string
  target: string
  reason: string
  createdBy: string
  createdAt: Date
  expiresAt: Date | null // null = until lifted
  suppressed7d: number
  active: boolean
  conflict?: string
}

export const MUTES_INITIAL: Mute[] = [
  { id: 'M-1', ruleId: 'R-044', target: 'Store Traffic by Hour — Mountain', reason: 'Traffic counters being replaced at 6 stores; backfill queries run slow until Wednesday.', createdBy: 'Kiran Shah', createdAt: at(-6, 9, 30), expiresAt: at(2, 17, 0), suppressed7d: 4, active: true },
  { id: 'M-2', ruleId: 'R-031', target: 'Promo Lift Tracker — all regions', reason: 'Thanksgiving promo ramp. Large lift swings are expected through the holiday.', createdBy: 'Marcus Oyelaran', createdAt: at(-9, 15, 10), expiresAt: at(13, 23, 59), suppressed7d: 9, active: true },
  {
    id: 'M-3',
    ruleId: 'R-017',
    target: 'pos.ne_transaction_lines (row count)',
    reason: 'POS vendor maintenance window: known late feed, avoid false pages.',
    createdBy: 'Kiran Shah',
    createdAt: at(-28, 6, 2),
    expiresAt: at(14, 23, 59),
    suppressed7d: 1,
    active: true,
    conflict: 'Suppressed the 5:00 AM row-count alert today (71% of expected). That alert would have named the stalled feed before the weekly sales swing fired.',
  },
  { id: 'M-4', ruleId: 'R-015', target: 'Floral Waste & Spoilage', reason: 'Floral supplier feed is migrating; refresh is intermittent until Sunday.', createdBy: 'Tobias Wren', createdAt: at(-3, 11, 45), expiresAt: at(6, 23, 59), suppressed7d: 3, active: true },
  { id: 'M-5', ruleId: 'R-045', target: 'Pharmacy Fill Rate — Southeast', reason: 'Rx system migration; slow queries expected through the cutover.', createdBy: 'Sunita Kapoor', createdAt: at(-12, 8, 0), expiresAt: at(15, 23, 59), suppressed7d: 6, active: true },
]

export const FEED_ALERT_TEMPLATE: Omit<Alert, 'id'> = {
  kind: 'feed',
  reportId: rid('Weekly Sales Performance'),
  ruleId: 'R-017',
  title: 'Northeast POS feed at 71% of expected rows',
  summary: 'Row-count check at 5:00 AM found 29% of expected rows missing; no new rows since 4:58 AM.',
  severity: 'Critical',
  firedAt: at(0, 5, 0),
  status: 'open',
  observed: '71% of expected rows',
  expected: '≥ 75% by 5:00 AM',
  released: true,
  timeline: [
    { at: at(0, 5, 0), text: 'Row-count check on pos.ne_transaction_lines: 71% of expected rows' },
    { at: at(0, 5, 0), text: 'Alert suppressed by mute M-3' },
  ],
}
