import { MERCHANTS, TXNS, type Merchant, type Txn } from './data'
import { MONTHS, TODAY, addMonths, fmtDate, fmtMoney, ordinal, parts, toDay } from './dates'

export type CadenceKind = 'once' | 'monthly' | 'weekly' | 'biweekly' | 'irregular'

export interface Cadence {
  kind: CadenceKind
  /** plain-language pattern, e.g. "Every month, on the 2nd" */
  label: string
  /** short version for lists, e.g. "Monthly" */
  short: string
  recurring: boolean
}

export interface Group {
  merchant: Merchant
  /** newest first */
  txns: Txn[]
  count: number
  totalCents: number
  firstDate: string
  lastDate: string
  lastCents: number
  cadence: Cadence
  /** estimated cost per year, or null when it depends on how often you order */
  yearlyCents: number | null
  nextDate: string | null
  priceChange: { fromCents: number; toCents: number; date: string } | null
  /** a gap in an otherwise regular pattern */
  gap: { from: string; to: string; skipped: number } | null
  /** other monthly subscriptions that bill on exactly the same days */
  sameDay: { merchantId: string; matches: number }[]
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function detectCadence(txns: Txn[]): Cadence {
  const days = txns.map((t) => toDay(t.date)).sort((a, b) => a - b)
  if (days.length === 1) {
    return { kind: 'once', label: 'One-time charge', short: 'One time', recurring: false }
  }
  const gaps = days.slice(1).map((d, i) => d - days[i])
  const med = median(gaps)
  const share = (lo: number, hi: number) => gaps.filter((g) => g >= lo && g <= hi).length / gaps.length
  if (days.length >= 3 && med >= 27 && med <= 34 && share(26, 35) >= 0.7) {
    const doms = txns.map((t) => parts(t.date).d)
    const counts = new Map<number, number>()
    doms.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1))
    const [mode, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    const steady = n / doms.length >= 0.7
    return {
      kind: 'monthly',
      label: steady ? `Every month, on the ${ordinal(mode)}` : `Every month, around the ${ordinal(mode)}`,
      short: 'Every month',
      recurring: true,
    }
  }
  if (days.length >= 4 && med >= 6 && med <= 8 && share(6, 8) >= 0.6) {
    return { kind: 'weekly', label: 'About every week', short: 'Every week', recurring: true }
  }
  if (days.length >= 4 && med >= 13 && med <= 15 && share(13, 15) >= 0.6) {
    return { kind: 'biweekly', label: 'Every two weeks', short: 'Every 2 weeks', recurring: true }
  }
  const spanMonths = Math.max(1, (days[days.length - 1] - days[0]) / 30.4)
  const perMonth = days.length / spanMonths
  if (perMonth >= 4) {
    const perWeek = perMonth / 4.35
    return {
      kind: 'irregular',
      label: perWeek >= 1.5 ? `Shows up often, about ${Math.round(perWeek)} times a week` : 'Shows up often, about once a week',
      short: 'Often',
      recurring: false,
    }
  }
  return {
    kind: 'irregular',
    label: perMonth >= 1.5 ? `Shows up often, about ${Math.round(perMonth)} times a month` : `${days.length} charges, no set schedule`,
    short: 'No set schedule',
    recurring: false,
  }
}

function analyse(merchant: Merchant, txns: Txn[]): Group {
  const cadence = detectCadence(txns)
  const chronological = [...txns].sort((a, b) => (a.date < b.date ? -1 : 1))
  const first = chronological[0]
  const last = chronological[chronological.length - 1]

  let yearlyCents: number | null = null
  let nextDate: string | null = null
  if (cadence.kind === 'monthly') {
    yearlyCents = last.cents * 12
    nextDate = addMonths(last.date, 1)
  } else if (cadence.kind === 'biweekly') {
    yearlyCents = last.cents * 26
  }

  let priceChange: Group['priceChange'] = null
  if (cadence.kind === 'monthly') {
    for (let i = chronological.length - 1; i > 0; i--) {
      if (chronological[i].cents !== chronological[i - 1].cents) {
        priceChange = {
          fromCents: chronological[i - 1].cents,
          toCents: chronological[i].cents,
          date: chronological[i].date,
        }
        break
      }
    }
  }

  let gap: Group['gap'] = null
  if (cadence.kind === 'weekly') {
    for (let i = chronological.length - 1; i > 0; i--) {
      const diff = toDay(chronological[i].date) - toDay(chronological[i - 1].date)
      if (diff >= 28) {
        gap = { from: chronological[i - 1].date, to: chronological[i].date, skipped: Math.round(diff / 7) - 1 }
        break
      }
    }
  }

  return {
    merchant,
    txns,
    count: txns.length,
    totalCents: txns.reduce((s, t) => s + t.cents, 0),
    firstDate: first.date,
    lastDate: last.date,
    lastCents: last.cents,
    cadence,
    yearlyCents,
    nextDate,
    priceChange,
    gap,
    sameDay: [],
  }
}

function buildGroups(): Map<string, Group> {
  const byMerchant = new Map<string, Txn[]>()
  for (const t of TXNS) {
    // Money coming in (paychecks, card payments received) is not a "charge"
    if (t.cents <= 0) continue
    const list = byMerchant.get(t.merchantId) ?? []
    list.push(t)
    byMerchant.set(t.merchantId, list)
  }
  const groups = new Map<string, Group>()
  for (const [id, txns] of byMerchant) groups.set(id, analyse(MERCHANTS.get(id)!, txns))

  // Subscriptions that bill on exactly the same calendar days
  const subs = [...groups.values()].filter((g) => g.merchant.kind === 'sub' && g.cadence.kind === 'monthly')
  for (const a of subs) {
    const datesA = new Set(a.txns.map((t) => t.date))
    for (const b of subs) {
      if (a === b) continue
      const matches = b.txns.filter((t) => datesA.has(t.date)).length
      if (matches >= 3) a.sameDay.push({ merchantId: b.merchant.id, matches })
    }
  }
  return groups
}

export const GROUPS = buildGroups()

/** Is this something a person would consider "a subscription"? */
export const isSubscription = (g: Group) => g.merchant.kind === 'sub' && g.cadence.recurring

/** The sort of thing worth showing in "forgotten subscriptions", most urgent first */
export interface ReviewItem {
  merchantId: string
  headline: string
  why: string
}

export const REVIEW_ITEMS: ReviewItem[] = buildReview()

function buildReview(): ReviewItem[] {
  const g = (id: string) => GROUPS.get(id)!
  const basil = g('basil')
  const ledger = g('ledger')
  const north = g('northlight')
  const reel = g('reelhouse')
  const snap = g('snapvault')
  const weeksOff = basil.gap?.skipped ?? 0
  return [
    {
      merchantId: 'basil',
      headline: `Charged ${fmtMoney(basil.lastCents)} last week after ${weeksOff} weeks with no charges`,
      why:
        `Nothing was charged from ${fmtDate(basil.gap!.from)} to ${fmtDate(basil.gap!.to)}, ` +
        `and then a ${fmtMoney(basil.lastCents)} box was charged on ${fmtDate(basil.lastDate)}. ` +
        `That’s the largest of the charges we’ve flagged.`,
    },
    {
      merchantId: 'ledger',
      headline: `Went from ${fmtMoney(ledger.priceChange!.fromCents)} to ${fmtMoney(ledger.priceChange!.toCents, { noCents: true })} a month in ${MONTHS[parts(ledger.priceChange!.date).m - 1]}`,
      why:
        `It started at ${fmtMoney(ledger.priceChange!.fromCents)} a month, and the price changed to ` +
        `${fmtMoney(ledger.priceChange!.toCents, { noCents: true })} on ${fmtDate(ledger.priceChange!.date)}. ` +
        `At this price it comes to ${fmtMoney(ledger.yearlyCents!, { noCents: true })} a year.`,
    },
    {
      merchantId: 'northlight',
      headline: `Bills on the 15th, same as ${reel.merchant.name}`,
      why:
        `Two video services both bill you on the 15th: ${north.merchant.name} (${fmtMoney(north.lastCents)}) and ` +
        `${reel.merchant.name} (${fmtMoney(reel.lastCents)}). Together that’s ${fmtMoney(north.lastCents + reel.lastCents)} a month. Do you use both?`,
    },
    {
      merchantId: 'reelhouse',
      headline: `Bills on the 15th, same as ${north.merchant.name}`,
      why:
        `Two video services both bill you on the 15th: ${reel.merchant.name} (${fmtMoney(reel.lastCents)}) and ` +
        `${north.merchant.name} (${fmtMoney(north.lastCents)}). Together that’s ${fmtMoney(north.lastCents + reel.lastCents)} a month. Do you use both?`,
    },
    {
      merchantId: 'snapvault',
      headline: `Small charge every month since ${fmtDate(snap.firstDate)}`,
      why:
        `Small charges are the easiest to forget. This one has been ${fmtMoney(snap.lastCents)} every month for ` +
        `${snap.count} months, ${fmtMoney(snap.totalCents)} so far.`,
    },
  ]
}

export { TODAY }
