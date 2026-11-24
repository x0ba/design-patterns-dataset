import { TODAY } from './data'
import { State, daysBetween, longDate, shortDate, timeLabel, usd } from './model'

export function RescissionsView({ s }: { s: State }) {
  return (
    <div>
      <div className="pagehead">
        <div className="eyebrow">Spring 2027</div>
        <h1>Rescissions &amp; appeals</h1>
        <p>A rescission needs a written reason and opens a 10-day appeal window. Appeals are decided by the full Senate, not the finance committee.</p>
      </div>
      <section className="card listcard">
        {s.rescissions.length === 0 && (
          <div className="empty">
            No rescissions yet this term.
            <div style={{ marginTop: 6 }}>The Esports Club correction will appear here once you file it.</div>
          </div>
        )}
        {s.rescissions.map((x) => {
          const left = daysBetween(TODAY, x.windowEnds)
          return (
            <div className="rxrow" key={x.id}>
              <div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <h2>{x.club}</h2>
                  <span className="num" style={{ color: 'var(--ink-2)' }}>{usd(x.from)} → <b>{usd(x.to)}</b> (−{usd(x.from - x.to)})</span>
                </div>
                <blockquote>{x.reason}</blockquote>
                <div style={{ marginTop: 8, color: 'var(--ink-3)', fontSize: 12.5 }}>Notice sent to {x.president} on {longDate(x.issuedOn)}</div>
              </div>
              <div>
                <span className="chip amber">Appeal window open</span>
                <div className="serif num" style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}>{left} days left</div>
                <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>Closes {longDate(x.windowEnds)}. No appeal filed. If one arrives, it goes to the full Senate.</div>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

export function AuditView({ s }: { s: State }) {
  return (
    <div>
      <div className="pagehead">
        <div className="eyebrow">Spring 2027</div>
        <h1>Audit log</h1>
        <p>Every change to the pool, in order. Entries can’t be edited.</p>
      </div>
      <section className="card timeline">
        {s.audit.map((a, i) => (
          <div className="tl" key={i}>
            <time className="num">{timeLabel(a.at)}</time>
            <span className={'dot ' + (a.tone ?? '')} />
            <div><b>{a.who}</b> · {a.text}</div>
          </div>
        ))}
      </section>
    </div>
  )
}

export { shortDate }
