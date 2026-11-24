import { useStore } from './store'
import { ROLE_LABEL, fmtTime } from './format'
import type { Role } from './types'

const FILTERS: Array<[Role | 'all', string]> = [
  ['all', 'All'],
  ['housekeeping', 'Housekeeping'],
  ['frontdesk', 'Front desk'],
  ['maintenance', 'Maint.'],
]

export function Feed() {
  const { s, dispatch } = useStore()
  const items = s.feed.filter((e) => s.feedFilter === 'all' || e.role === s.feedFilter)
  const groups: Array<{ label: string; items: typeof items }> = [
    { label: 'Last 5 minutes', items: [] },
    { label: '5 to 15 minutes ago', items: [] },
    { label: '15 to 35 minutes ago', items: [] },
  ]
  for (const e of items) {
    const age = s.now - e.at
    if (age < 5) groups[0].items.push(e)
    else if (age < 15) groups[1].items.push(e)
    else if (age < 36) groups[2].items.push(e)
  }
  return (
    <section className="panel feed" aria-label="Recent changes">
      <div className="feed-h">
        <div className="ph">
          <span>Who changed what</span>
          <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0, color: 'var(--dim)' }}>{s.live ? 'live' : 'paused'}</span>
        </div>
        <div className="fchips" role="group" aria-label="Filter activity">
          {FILTERS.map(([k, label]) => (
            <button key={k} className={s.feedFilter === k ? 'on' : ''} onClick={() => dispatch({ type: 'feedFilter', v: k })} aria-pressed={s.feedFilter === k}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flist">
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <div key={g.label}>
                <div className="fgroup">{g.label}</div>
                {g.items.map((e) => (
                  <button
                    key={e.id}
                    className={`fitem r-${e.role}`}
                    onClick={() => e.room != null && dispatch({ type: 'selectRoom', id: e.room })}
                    title={ROLE_LABEL[e.role]}
                    style={{ cursor: e.room != null ? 'pointer' : 'default' }}
                  >
                    <span className="bar3" />
                    <span style={{ minWidth: 0 }}>
                      <span className="l1" style={{ display: 'block' }}>
                        {e.room != null && <b className="num">{e.room}</b>}
                        {e.room != null && ' '}
                        {e.verb}
                      </span>
                      <span className="l2 num" style={{ display: 'block' }}>
                        <span className="w">{e.by}</span> · {fmtTime(e.at)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ),
        )}
        {groups.every((g) => g.items.length === 0) && <div className="empty" style={{ marginTop: 8 }}>Nothing from this group in the last 35 minutes.</div>}
      </div>
    </section>
  )
}
