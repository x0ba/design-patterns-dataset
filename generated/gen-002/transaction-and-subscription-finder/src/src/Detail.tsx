import { useEffect, useState, type ReactNode } from 'react'
import { GROUPS, type Group } from './analysis'
import { accountById } from './data'
import { fmtDate, fmtDateLong, fmtMoney } from './dates'
import { HistoryChart } from './Chart'
import { Chip, IconArrow, IconCheck, IconCopy, IconFlag, IconX } from './ui'

export type Decision = 'keep' | 'cancel' | 'unknown'

export interface DetailProps {
  group: Group
  decision: Decision | undefined
  cancelDone: boolean
  highlight?: Set<string>
  /** how the nearest charges relate to the date she gave */
  dateNote?: string | null
  rememberedDate?: string | null
  /** shown in review mode: why we picked this one */
  reason?: string
  onDecide: (d: Decision | null) => void
  onCancelDone: (v: boolean) => void
  onOpenOther: (merchantId: string) => void
  onCopy: (text: string, message: string) => void
  next?: { label: string; onClick: () => void } | null
}

function verdict(g: Group): { lead: string; rest: string } {
  const m = g.merchant
  const paid = `You’ve paid ${fmtMoney(g.totalCents)} so far, across ${g.count} ${g.count === 1 ? 'charge' : 'charges'} since ${fmtDate(g.firstDate)}.`
  switch (g.cadence.kind) {
    case 'monthly':
      return {
        lead: m.kind === 'bill' ? 'This is a regular monthly bill.' : 'Yes, this is a subscription. It repeats every month.',
        rest: `${m.name} charges ${fmtMoney(g.lastCents)} ${g.cadence.label.replace('Every month, ', 'each month, ')}. ${paid}`,
      }
    case 'weekly':
      return {
        lead: 'This repeats most weeks.',
        rest: `Your latest charge was ${fmtMoney(g.lastCents)} on ${fmtDate(g.lastDate)}. ${paid}`,
      }
    case 'biweekly':
      return { lead: 'This repeats every two weeks.', rest: `Your latest charge was ${fmtMoney(g.lastCents)}. ${paid}` }
    case 'once':
      return {
        lead: 'This was a one-time charge. It hasn’t repeated.',
        rest: `${fmtMoney(g.lastCents)} on ${fmtDateLong(g.lastDate)}. There’s nothing here that will charge you again.`,
      }
    default:
      return {
        lead: 'This doesn’t look like a subscription.',
        rest: `It’s a place you spend at now and then: ${g.count} charges, ${fmtMoney(g.totalCents)} in all.`,
      }
  }
}

function stats(g: Group): { label: string; value: string; sub: string }[] {
  const repeats = {
    label: 'How often',
    value: g.cadence.short,
    sub: g.nextDate ? `Next one expected ${fmtDate(g.nextDate)}` : g.cadence.kind === 'once' ? 'Only once' : g.cadence.label,
  }
  const paid = { label: 'Paid so far', value: fmtMoney(g.totalCents), sub: `${g.count} ${g.count === 1 ? 'charge' : 'charges'} since ${fmtDate(g.firstDate)}` }
  let third
  if (g.yearlyCents !== null) {
    third = {
      label: 'Over a year',
      value: fmtMoney(Math.round(g.yearlyCents / 100) * 100, { noCents: true }),
      sub: `About ${fmtMoney(g.lastCents)} × ${g.cadence.kind === 'monthly' ? 12 : 26}`,
    }
  } else if (g.cadence.kind === 'once') {
    third = { label: 'Next charge', value: 'None expected', sub: 'It hasn’t repeated' }
  } else if (g.cadence.kind === 'weekly') {
    third = { label: 'Latest box', value: fmtMoney(g.lastCents), sub: `Charged ${fmtDate(g.lastDate)}` }
  } else {
    third = { label: 'Average charge', value: fmtMoney(Math.round(g.totalCents / g.count)), sub: `Latest was ${fmtMoney(g.lastCents)}` }
  }
  return [repeats, paid, third]
}

interface Guide { title: string; steps: ReactNode[]; message: string | null }

function cancelGuide(g: Group): Guide {
  const m = g.merchant
  const raw = g.txns[0].raw
  const nextText = g.nextDate ? `around ${fmtDate(g.nextDate)}` : 'on your next order day'
  const noun = m.category === 'Fitness' ? 'membership' : 'subscription'
  const message =
    `Hello,\n\nI’d like to cancel my ${m.name} ${noun}. It’s billed ${g.cadence.label.toLowerCase().replace(/^every month, /, 'monthly, ')} at ${fmtMoney(g.lastCents)}, ` +
    `and shows on my statement as “${raw}”.\n\nPlease cancel it today, stop all future charges, and email me to confirm.\n\nThank you`
  const check = `Look at your account ${nextText}. If the charge doesn’t show up, the cancellation worked.`

  if (m.payVia === 'apple') {
    return {
      title: 'Cancel it through Apple',
      steps: [
        'On an iPhone or iPad, open Settings, tap your name, then tap Subscriptions. On a Mac, open the App Store, click your name, then Account Settings.',
        `Look for the app that costs ${fmtMoney(g.lastCents)} a month, tap it, then choose Cancel Subscription. Not sure which one it is? Search your email for receipts from Apple; they name the app.`,
        check,
      ],
      message: null,
    }
  }
  if (m.payVia === 'paypal') {
    return {
      title: 'Cancel it through PayPal',
      steps: [
        'Sign in to PayPal and open Settings (the gear icon), then Payments.',
        `Choose Manage automatic payments, find ${m.name}, and select Cancel.`,
        check,
      ],
      message: null,
    }
  }
  const first =
    m.id === 'basil'
      ? `Sign in to ${m.name} and look under Account for Cancel plan. Choose Cancel, not Skip a week. Skipping only pauses one box.`
      : `Sign in to ${m.name}’s website or app and look under Account or Membership for Cancel.`
  return {
    title: `Cancel it with ${m.name}`,
    steps: [
      first,
      m.payVia === 'square'
        ? `Can’t find it? Send them the message below. ${m.name} is paid through Square, which only moves the money. Square can’t cancel it for you.`
        : 'Can’t find it? Send them the message below by email or chat, or call them.',
      check,
    ],
    message,
  }
}

function emailTerm(name: string): string {
  const words = name.replace(/\s*\(.*\)/, '').replace(/^The /, '').split(' ')
  return words.slice(0, words[1] === '&' ? 3 : 2).join(' ')
}

export function bankDetails(g: Group): string {
  const acct = accountById(g.txns[0].accountId)
  const lines = g.txns.slice(0, 8).map((t) => `• ${fmtDateLong(t.date)}, ${fmtMoney(t.cents)}, ${accountById(t.accountId).name} ••${accountById(t.accountId).mask}`)
  const more = g.count > 8 ? `\n…and ${g.count - 8} earlier ${g.count - 8 === 1 ? 'charge' : 'charges'}` : ''
  return (
    `I don’t recognize these charges and I’d like to look into them.\n\n` +
    `Shown on my statement as: “${g.txns[0].raw}”\n` +
    `Appears as: ${g.merchant.name}\n${lines.join('\n')}${more}\n` +
    `Total so far: ${fmtMoney(g.totalCents)}\n\n` +
    `Account: ${acct.name} ••${acct.mask}`
  )
}

export function Detail(p: DetailProps) {
  const { group: g } = p
  const m = g.merchant
  const v = verdict(g)
  const isSub = m.kind === 'sub'
  const [showAll, setShowAll] = useState(false)
  useEffect(() => setShowAll(false), [g.merchant.id])
  const rows = showAll ? g.txns : g.txns.slice(0, 8)
  const guide = p.decision === 'cancel' ? cancelGuide(g) : null
  const other = g.sameDay.map((s) => GROUPS.get(s.merchantId)!).filter(Boolean)
  const acct = accountById(g.txns[0].accountId)

  const notes: { tone: 'info' | 'warn'; body: ReactNode }[] = []
  if (p.dateNote?.startsWith('First charge') && p.rememberedDate && g.cadence.kind === 'monthly') {
    notes.push({
      tone: 'info',
      body: (
        <>
          <strong>About that free trial.</strong> You remembered {p.rememberedDate.replace(/ \d{4}$/, '')}, and the first charge came on {fmtDate(g.firstDate)}.
          If you signed up with a free trial, this is about when a trial would have ended.
        </>
      ),
    })
  }
  if (g.priceChange && !p.reason) {
    notes.push({
      tone: 'warn',
      body: (
        <>
          <strong>The price went up.</strong> It was {fmtMoney(g.priceChange.fromCents)} a month until{' '}
          {fmtDate(g.priceChange.date)}, then {fmtMoney(g.priceChange.toCents)}. Your total so far is {fmtMoney(g.totalCents)}.
        </>
      ),
    })
  }
  if (g.gap && !p.reason) {
    notes.push({
      tone: 'warn',
      body: (
        <>
          <strong>A {g.gap.skipped}-week gap, then a charge.</strong> Nothing was charged from {fmtDate(g.gap.from)} to {fmtDate(g.gap.to)}.
          Then {fmtMoney(g.lastCents)} was charged on {fmtDate(g.lastDate)}.
        </>
      ),
    })
  }
  for (const o of other) {
    const matches = g.sameDay.find((s) => s.merchantId === o.merchant.id)!.matches
    const apple = m.id === 'apple' || o.merchant.id === 'apple'
    notes.push({
      tone: 'warn',
      body: (
        <>
          <strong>Same day as {o.merchant.name}.</strong> It charged {fmtMoney(o.lastCents)} on {matches === o.count ? 'every one of those dates' : `${matches} of the same dates`}.{' '}
          {apple
            ? 'That could be a second app, or the same service billed twice. Worth a look.'
            : 'You may not need both.'}{' '}
          <button className="link" onClick={() => p.onOpenOther(o.merchant.id)}>
            See {o.merchant.name}
          </button>
        </>
      ),
    })
  }
  if (m.note) notes.push({ tone: 'info', body: <>{m.note}</> })

  return (
    <article className="detail" aria-labelledby="detail-title">
      <header className="detail-head">
        <div className="detail-chips">
          <Chip>{m.category}</Chip>
          <Chip tone={g.cadence.recurring ? 'pine' : 'plain'}>{g.cadence.short}</Chip>
        </div>
        <h2 id="detail-title">{m.name}</h2>
        <p className="statement-line">
          On your statement as <code>{g.txns[0].raw}</code>
        </p>
      </header>

      {p.reason && <p className="why-picked"><strong>Why we picked this one:</strong> {p.reason}</p>}

      <p className="verdict">
        <strong>{v.lead}</strong> {v.rest}
      </p>

      <dl className="stats">
        {stats(g).map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
            <span>{s.sub}</span>
          </div>
        ))}
      </dl>

      {isSub ? (
        <section className="decide" aria-labelledby="decide-h">
          <h3 id="decide-h">What do you want to do?</h3>
          <div className="decide-row" role="group" aria-labelledby="decide-h">
            <button className={`dbtn ${p.decision === 'keep' ? 'on on-keep' : ''}`} aria-pressed={p.decision === 'keep'} onClick={() => p.onDecide(p.decision === 'keep' ? null : 'keep')}>
              <IconCheck /> Keep it
            </button>
            <button className={`dbtn ${p.decision === 'cancel' ? 'on on-cancel' : ''}`} aria-pressed={p.decision === 'cancel'} onClick={() => p.onDecide(p.decision === 'cancel' ? null : 'cancel')}>
              <IconX /> Cancel it
            </button>
            <button className={`dbtn ${p.decision === 'unknown' ? 'on on-flag' : ''}`} aria-pressed={p.decision === 'unknown'} onClick={() => p.onDecide(p.decision === 'unknown' ? null : 'unknown')}>
              <IconFlag /> I don’t recognize this
            </button>
          </div>

          {p.decision === 'keep' && (
            <div className="after after-keep" role="status">
              <IconCheck />
              <p>Marked as one you’re keeping. You can change your mind any time.</p>
              {p.next && <button className="btn btn-quiet" onClick={p.next.onClick}>{p.next.label} <IconArrow /></button>}
            </div>
          )}

          {p.decision === 'cancel' && guide && (
            <div className="after after-cancel">
              <h4>{guide.title}</h4>
              <p className="small">Tallyway can’t cancel this for you. Here’s how to do it yourself.</p>
              <ol>{guide.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              {guide.message && (
                <div className="message">
                  <pre>{guide.message}</pre>
                  <button className="btn btn-ghost" onClick={() => p.onCopy(guide.message!, 'Message copied. Paste it into an email or chat.')}>
                    <IconCopy /> Copy message
                  </button>
                </div>
              )}
              <label className="check">
                <input type="checkbox" checked={p.cancelDone} onChange={(e) => p.onCancelDone(e.target.checked)} />
                <span>I’ve cancelled it</span>
              </label>
              {p.cancelDone && (
                <p className="small done-note" role="status">
                  Got it. {g.nextDate ? `If you’re charged again after ${fmtDate(g.nextDate)}, the cancellation didn’t go through.` : 'If another box is charged, the cancellation didn’t go through.'}
                </p>
              )}
              {p.next && <button className="btn btn-quiet" onClick={p.next.onClick}>{p.next.label} <IconArrow /></button>}
            </div>
          )}

          {p.decision === 'unknown' && (
            <div className="after after-flag">
              <h4>Flagged. Here’s what to do next.</h4>
              <ol>
                <li>Search your email for “{emailTerm(m.name)}” to find a receipt or a sign-up message. Someone else at home may have signed up.</li>
                <li>If you still don’t recognize it, contact {acct.name} and tell them you don’t recognize these charges. Do it soon, since banks usually only take disputes for a limited time.</li>
                <li>Once you’ve sorted it out, come back here and cancel it so it stops.</li>
              </ol>
              <div className="message">
                <pre>{bankDetails(g)}</pre>
                <button className="btn btn-ghost" onClick={() => p.onCopy(bankDetails(g), 'Details copied. Paste them into a message to your bank.')}>
                  <IconCopy /> Copy details for your bank
                </button>
              </div>
              {p.next && <button className="btn btn-quiet" onClick={p.next.onClick}>{p.next.label} <IconArrow /></button>}
            </div>
          )}
        </section>
      ) : (
        <section className="decide decide-na">
          <p>{g.cadence.kind === 'once' ? 'Nothing to cancel here. It was a single purchase.' : m.kind === 'bill' ? 'This is a regular bill, not something you signed up to by accident.' : 'There’s nothing to cancel here. It’s just where you shop.'}</p>
        </section>
      )}

      {notes.length > 0 && (
        <section className="notes" aria-label="Things worth knowing">
          {notes.map((n, i) => (
            <div key={i} className={`note note-${n.tone}`}>{n.body}</div>
          ))}
        </section>
      )}

      <section className="history" aria-labelledby="hist-h">
        <h3 id="hist-h">Charge history</h3>
        <HistoryChart group={g} />
        <table>
          <thead>
            <tr><th scope="col">Date</th><th scope="col">Account</th><th scope="col" className="num">Amount</th></tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              const a = accountById(t.accountId)
              return (
                <tr key={t.id} className={p.highlight?.has(t.id) ? 'hl' : ''}>
                  <td>
                    {fmtDateLong(t.date)}
                    {i === 0 && <span className="tag">Latest</span>}
                    {p.highlight?.has(t.id) && <span className="tag tag-hl">Fits your search</span>}
                  </td>
                  <td>{a.short} ••{a.mask}</td>
                  <td className="num">{fmtMoney(t.cents)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr><th scope="row" colSpan={2}>Total of {g.count} {g.count === 1 ? 'charge' : 'charges'}</th><td className="num">{fmtMoney(g.totalCents)}</td></tr>
          </tfoot>
        </table>
        {g.count > 8 && (
          <button className="btn btn-quiet" onClick={() => setShowAll((s) => !s)}>
            {showAll ? 'Show fewer' : `Show all ${g.count} charges`}
          </button>
        )}
      </section>
    </article>
  )
}
