import { at } from '../time'
import { REPORTS, REGIONS, Report, reportByName } from './reports'

export type RuleType = 'Freshness' | 'Row count' | 'Metric swing' | 'Load time'
export type Severity = 'Critical' | 'Warning' | 'Info'

export interface Rule {
  id: string
  type: RuleType
  title: string
  scope: string
  condition: string
  severity: Severity
  route: string
  enabled: boolean
  version: number
  updated: Date
  updatedBy: string
  fires30d: number
  lastFired?: Date
  match: (r: Report) => boolean
  // tunable parameters (only used for display + the R-027 backtest)
  threshold?: number
  gateMin?: number | null
  maxHold?: number
  honorCalendar?: boolean
}

const byName = (...n: string[]) => (r: Report) => n.includes(r.name)
const regionDomain = (reg: string, d: string) => (r: Report) => r.region === reg && r.domain === d
const baseName = (n: string) => (r: Report) => r.name.startsWith(n)
const uses = (t: string) => (r: Report) => r.upstream.includes(t)

const mk = (
  id: string,
  type: RuleType,
  title: string,
  scope: string,
  condition: string,
  severity: Severity,
  route: string,
  match: (r: Report) => boolean,
  fires30d: number,
  extra: Partial<Rule> = {}
): Rule => ({
  id,
  type,
  title,
  scope,
  condition,
  severity,
  route,
  enabled: true,
  version: 1 + (fires30d % 3),
  updated: at(-(20 + ((fires30d * 7) % 90)), 10, 15),
  updatedBy: 'Kiran Shah',
  fires30d,
  match,
  ...extra,
})

const FR = (m: number) => `No successful refresh within ${m} min of scheduled time, or refresh fails`
const RC = (p: number) => `Rows landed ${p}% below 4-week same-weekday average at check time`
const SW = `Metric moves more than 25% vs. same period last week`
const LT = `p95 load time above 12 s for 15 minutes`

export const RULES_INITIAL: Rule[] = [
  ...REGIONS.map((reg, i) =>
    mk(`R-00${i + 1}`, 'Freshness', `Sales reports — ${reg.name}`, 'Sales reports', FR(20), 'Warning', '#bi-oncall', regionDomain(reg.key, 'Sales'), [6, 4, 5, 7, 3][i])
  ),
  mk('R-006', 'Freshness', 'Weekly Sales Performance', 'Single report', FR(15), 'Critical', 'Page on-call', byName('Weekly Sales Performance'), 2),
  mk('R-007', 'Freshness', 'Executive Daily Flash', 'Single report', FR(10), 'Critical', 'Page on-call', byName('Executive Daily Flash'), 5),
  mk('R-008', 'Freshness', 'Shrink & Loss Summary', 'Single report', FR(30), 'Warning', 'Page on-call', byName('Shrink & Loss Summary'), 1),
  mk('R-009', 'Freshness', 'Labor Hours by Store & Department', 'Single report', FR(30), 'Warning', '#bi-oncall', byName('Labor Hours by Store & Department'), 2),
  mk('R-010', 'Freshness', 'Store operations — 15-minute reports', 'Store Operations', FR(20), 'Info', '#bi-alerts', (r) => r.scheduleKind === 'quarter', 9),
  mk('R-011', 'Freshness', 'Supply chain snapshots', 'Supply Chain', FR(25), 'Warning', '#bi-oncall', (r) => r.domain === 'Supply Chain', 11),
  mk('R-012', 'Freshness', 'Finance flash reports', 'Finance', FR(30), 'Warning', '#bi-alerts', (r) => r.domain === 'Finance', 3),
  mk('R-013', 'Freshness', 'E-commerce reports', 'E-commerce', FR(20), 'Warning', '#bi-alerts', (r) => r.domain === 'E-commerce', 8),
  mk('R-014', 'Freshness', 'Pharmacy reports', 'Pharmacy', FR(30), 'Warning', '#bi-alerts', (r) => r.domain === 'Pharmacy', 1),
  mk('R-015', 'Freshness', 'Department reports', 'Department reports', FR(45), 'Info', '#bi-alerts', (r) => !!r.dept, 4),
  mk('R-016', 'Freshness', 'Loyalty & CRM reports', 'Loyalty', FR(30), 'Info', '#bi-alerts', (r) => r.domain === 'Loyalty', 2),

  mk('R-017', 'Row count', 'pos.ne_transaction_lines', 'Source table', RC(25), 'Critical', 'Page on-call', uses('pos.ne_transaction_lines'), 3, { lastFired: at(-28, 5, 0) }),
  mk('R-018', 'Row count', 'pos.ma_transaction_lines', 'Source table', RC(25), 'Critical', 'Page on-call', uses('pos.ma_transaction_lines'), 2),
  mk('R-019', 'Row count', 'pos.se_transaction_lines', 'Source table', RC(25), 'Critical', 'Page on-call', uses('pos.se_transaction_lines'), 1),
  mk('R-020', 'Row count', 'pos.gl_transaction_lines', 'Source table', RC(25), 'Critical', 'Page on-call', uses('pos.gl_transaction_lines'), 2),
  mk('R-021', 'Row count', 'pos.mt_transaction_lines', 'Source table', RC(25), 'Critical', 'Page on-call', uses('pos.mt_transaction_lines'), 0),
  mk('R-022', 'Row count', 'loyalty.member_activity', 'Source table', RC(25), 'Warning', '#bi-oncall', uses('loyalty.member_activity'), 3),
  mk('R-023', 'Row count', 'inventory.onhand_snapshot', 'Source table', RC(20), 'Warning', '#bi-alerts', uses('inventory.onhand_snapshot'), 4),
  mk('R-024', 'Row count', 'labor.punch_detail', 'Source table', RC(25), 'Warning', '#bi-alerts', uses('labor.punch_detail'), 1),
  mk('R-025', 'Row count', 'ecom.orders', 'Source table', RC(25), 'Warning', '#bi-alerts', uses('ecom.orders'), 6),
  mk('R-026', 'Row count', 'lp.shrink_events_curated', 'Source table', RC(25), 'Warning', '#bi-alerts', uses('lp.shrink_events_curated'), 0),

  mk('R-027', 'Metric swing', 'Weekly Sales Performance · revenue by region', 'Single report', SW, 'Critical', 'Page on-call', byName('Weekly Sales Performance'), 6, {
    threshold: 25,
    gateMin: null,
    maxHold: 90,
    honorCalendar: false,
    version: 4,
    updated: at(-61, 14, 5),
    updatedBy: 'Elena Voss',
  }),
  mk('R-028', 'Metric swing', 'Executive Daily Flash · net sales', 'Single report', SW, 'Critical', 'Page on-call', byName('Executive Daily Flash'), 1),
  mk('R-029', 'Metric swing', 'Shrink & Loss Summary · shrink % of sales', 'Single report', SW, 'Warning', '#bi-oncall', byName('Shrink & Loss Summary'), 2),
  mk('R-030', 'Metric swing', 'Labor Hours · hours per $1k sales', 'Single report', SW, 'Warning', '#bi-alerts', byName('Labor Hours by Store & Department'), 3),
  mk('R-031', 'Metric swing', 'Promo Lift Tracker · lift %', 'Regional reports', SW, 'Info', '#bi-alerts', baseName('Promo Lift Tracker'), 7),
  mk('R-032', 'Metric swing', 'Online Order Fulfillment · order volume', 'Regional reports', SW, 'Warning', '#bi-alerts', baseName('Online Order Fulfillment'), 5),
  mk('R-033', 'Metric swing', 'Gross Margin by Category · margin %', 'Regional reports', SW, 'Warning', '#bi-alerts', baseName('Gross Margin by Category'), 2),
  mk('R-034', 'Metric swing', 'Basket Size & Mix · average basket', 'Regional reports', SW, 'Info', '#bi-alerts', baseName('Basket Size & Mix'), 4),
  mk('R-035', 'Metric swing', 'Out-of-Stock Rate · OOS %', 'Regional reports', SW, 'Warning', '#bi-alerts', baseName('Out-of-Stock Rate'), 6),
  mk('R-036', 'Metric swing', 'Loyalty Program KPIs · active members', 'Single report', SW, 'Info', '#bi-alerts', byName('Loyalty Program KPIs'), 1),
  mk('R-037', 'Metric swing', 'Pharmacy Fill Rate · fill rate', 'Regional reports', SW, 'Warning', '#bi-alerts', baseName('Pharmacy Fill Rate'), 0),
  mk('R-038', 'Metric swing', 'Overtime Watchlist · overtime hours', 'Regional reports', SW, 'Info', '#bi-alerts', baseName('Overtime Watchlist'), 5),

  mk('R-039', 'Load time', 'Weekly Sales Performance', 'Single report', LT, 'Warning', '#bi-oncall', byName('Weekly Sales Performance'), 1),
  mk('R-040', 'Load time', 'Executive Daily Flash', 'Single report', LT, 'Warning', '#bi-oncall', byName('Executive Daily Flash'), 2),
  mk('R-041', 'Load time', 'Labor Hours by Store & Department', 'Single report', LT, 'Warning', '#bi-oncall', byName('Labor Hours by Store & Department'), 4),
  mk('R-042', 'Load time', 'Shrink & Loss Summary', 'Single report', LT, 'Info', '#bi-alerts', byName('Shrink & Loss Summary'), 1),
  mk('R-043', 'Load time', 'Daily Sales by Store (all regions)', 'Regional reports', LT, 'Warning', '#bi-alerts', baseName('Daily Sales by Store'), 6),
  mk('R-044', 'Load time', 'Store Traffic by Hour (all regions)', 'Regional reports', LT, 'Info', '#bi-alerts', baseName('Store Traffic by Hour'), 5),
  mk('R-045', 'Load time', 'Pharmacy Fill Rate (all regions)', 'Regional reports', LT, 'Info', '#bi-alerts', baseName('Pharmacy Fill Rate'), 3),
  mk('R-046', 'Load time', 'Online Order Fulfillment (all regions)', 'Regional reports', LT, 'Info', '#bi-alerts', baseName('Online Order Fulfillment'), 2),
]

export const ruleReportCount = (r: Rule) => REPORTS.filter(r.match).length
export const rulesFor = (rules: Rule[], rep: Report) => rules.filter((r) => r.match(rep))
export { reportByName }
