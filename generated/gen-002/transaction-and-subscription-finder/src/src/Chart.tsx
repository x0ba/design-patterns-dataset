import { useMemo } from 'react'
import type { Group } from './analysis'
import { MONTHS_SHORT, TODAY, fmtDate, fmtMoney, fromDay, iso, parts, toDay } from './dates'

const START = toDay('2025-09-01')
const END = toDay('2026-12-31')
const SPAN = END - START

const pct = (day: number) => ((day - START) / SPAN) * 100

/** One bar per charge (or per month when there are many), placed by date. */
export function HistoryChart({ group }: { group: Group }) {
  const { bars, max } = useMemo(() => {
    let list: { day: number; cents: number; label: string }[]
    if (group.count <= 40) {
      list = group.txns.map((t) => ({ day: toDay(t.date), cents: t.cents, label: `${fmtDate(t.date)}: ${fmtMoney(t.cents)}` }))
    } else {
      const byMonth = new Map<string, number>()
      for (const t of group.txns) {
        const k = t.date.slice(0, 7)
        byMonth.set(k, (byMonth.get(k) ?? 0) + t.cents)
      }
      list = [...byMonth.entries()].map(([k, c]) => {
        const [y, m] = k.split('-').map(Number)
        return { day: toDay(iso(y, m, 15)), cents: c, label: `${MONTHS_SHORT[m - 1]} ${y}: ${fmtMoney(c)} in total` }
      })
    }
    return { bars: list, max: Math.max(...list.map((b) => b.cents)) }
  }, [group])

  const monthly = group.count > 40
  const months: { day: number; label: string; year: boolean }[] = []
  for (let y = 2025, m = 9; toDay(iso(y, m, 1)) <= END; m === 12 ? (y++, (m = 1)) : m++) {
    months.push({ day: toDay(iso(y, m, 1)), label: MONTHS_SHORT[m - 1], year: m === 1 || (y === 2025 && m === 9) })
  }
  const next = group.nextDate ? toDay(group.nextDate) : null
  const summary = `${group.count} charges between ${fmtDate(group.firstDate)} and ${fmtDate(group.lastDate)}.`

  return (
    <figure className="chart" aria-label={summary}>
      <div className="chart-plot" aria-hidden="true">
        <span className="chart-max">{fmtMoney(max, { noCents: true })}</span>
        <span className="chart-today" style={{ left: `${pct(toDay(TODAY))}%` }}><i>Today</i></span>
        {bars.map((b, i) => (
          <span
            key={i}
            className={`bar ${monthly ? 'bar-wide' : ''}`}
            style={{ left: `${pct(b.day)}%`, height: `${Math.max(7, (b.cents / max) * 100)}%` }}
            title={b.label}
          />
        ))}
        {next !== null && (
          <span
            className="bar bar-next"
            style={{ left: `${pct(next)}%`, height: `${Math.max(7, (group.lastCents / max) * 100)}%` }}
            title={`Expected ${fmtDate(fromDay(next))}: about ${fmtMoney(group.lastCents)}`}
          />
        )}
      </div>
      <div className="chart-axis" aria-hidden="true">
        {months.map((m) => (
          <span key={m.day} style={{ left: `${pct(m.day)}%` }}>
            {m.label}
            {m.year && <b>{parts(fromDay(m.day)).y}</b>}
          </span>
        ))}
      </div>
      <figcaption>
        {monthly ? 'Monthly totals' : 'Each bar is one charge'}
        {next !== null && ' · the outlined bar is the next one we expect'}
      </figcaption>
    </figure>
  )
}
