import { useMemo } from 'react'
import { useStore } from './store'
import { GROUP } from './data'
import { TIER_RANK, lateBy } from './logic'
import { TYPE_LABEL, fmtTime } from './format'
import { AccIcon, TierBadge } from './ui'
import type { Guest, State } from './types'
import type { Derived } from './logic'

interface Cell {
  key: string
  label: string
  need: number
  ready: number
  soon: number
}

function supplyDemand(s: State): Cell[] {
  const unassigned = s.guests.filter((g) => g.early && g.roomId == null)
  const free = s.rooms.filter((r) => !r.guestId && ['dirty', 'cleaning', 'clean', 'inspected'].includes(r.status))
  const defs: Array<[string, string, (g: { type: string; accessible: boolean }) => boolean]> = [
    ['king', 'King', (g) => g.type === 'king' && !g.accessible],
    ['dq', 'Double queen', (g) => g.type === 'dq' && !g.accessible],
    ['suite', 'Suite', (g) => g.type === 'suite' && !g.accessible],
    ['acc', 'Accessible', (g) => g.accessible],
  ]
  return defs.map(([key, label, match]) => {
    const need = unassigned.filter(match).length
    const rooms = free.filter((r) => match({ type: r.type, accessible: r.accessible }))
    return {
      key,
      label,
      need,
      ready: rooms.filter((r) => r.status === 'inspected').length,
      soon: rooms.filter((r) => r.status !== 'inspected').length,
    }
  })
}

function CellView({ c }: { c: Cell }) {
  const have = c.ready + c.soon
  let cls = 'ok'
  let msg = c.need === 0 ? 'all placed' : 'ready covers all'
  if (c.need > 0 && c.ready < c.need) {
    cls = 'tight'
    msg = `${c.need - c.ready} to clean`
  }
  if (c.need > have) {
    cls = 'short'
    msg = `short by ${c.need - have}`
  }
  return (
    <div className={`sdc ${cls}`} title={`${c.need} guests still need a ${c.label.toLowerCase()} room. ${c.ready} inspected now, ${c.soon} more being turned.`}>
      <div className="a">
        <span>{c.label}</span>
        <span>
          <b className="num">{c.need}</b> need
        </span>
      </div>
      <div className="b num">
        {c.ready} ready · {c.soon} soon
      </div>
      <div className="b">
        <em>{msg}</em>
      </div>
    </div>
  )
}

export function guestStatus(g: Guest, d: Derived) {
  if (g.roomId != null) {
    const r = d.byId.get(g.roomId)!
    const e = d.eta.get(r.id)
    const late = lateBy(g, e)
    if (r.status === 'inspected') return { cls: 'ok', a: `Room ${r.id}`, b: 'ready now' }
    if (e && e.at == null) return { cls: 'late', a: `Room ${r.id}`, b: 'no attendant on it' }
    if (late) return { cls: 'late', a: `Room ${r.id}`, b: `~${fmtTime(e!.at!)} · ${late} min late` }
    const what = r.status === 'clean' ? 'inspect' : 'ready'
    return { cls: 'ok2', a: `Room ${r.id}`, b: `${what} ~${e && e.at != null ? fmtTime(e.at) : '?'}` }
  }
  return { cls: 'need', a: 'Needs room', b: g.needBy ? `by ${fmtTime(g.needBy)}` : 'from 1:00 pm' }
}

export function Arrivals() {
  const { s, d, dispatch } = useStore()
  const cells = useMemo(() => supplyDemand(s), [s])
  const early = s.guests.filter((g) => g.early)
  const placedEarly = early.filter((g) => g.roomId != null).length
  const placedAll = s.guests.filter((g) => g.roomId != null).length
  const list = useMemo(() => {
    let l = s.guests.filter((g) => (s.tab === 'early' ? g.early : !g.early))
    if (s.hideAssigned) l = l.filter((g) => g.roomId == null)
    if (s.tab === 'early') l = l.slice().sort((a, b) => a.rank! - b.rank!)
    else l = l.slice().sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.nights - a.nights)
    return l
  }, [s.guests, s.tab, s.hideAssigned])
  const acc = s.guests.filter((g) => g.accessible)

  return (
    <section className="panel arr" aria-label="Group arrivals">
      <div className="arr-h">
        <h2>{GROUP}</h2>
        <div className="sub">
          <span>Block of 46 · arrives from 1:00 pm</span>
          <span className="num" style={{ color: 'var(--text)', fontWeight: 650 }}>
            {placedAll}/46 placed
          </span>
        </div>
        <div className="sd">
          {cells.map((c) => (
            <CellView key={c.key} c={c} />
          ))}
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={s.tab === 'early'} className={`tab ${s.tab === 'early' ? 'on' : ''}`} onClick={() => dispatch({ type: 'setTab', tab: 'early' })}>
          Early requests{' '}
          <span className="num">
            {placedEarly}/{early.length}
          </span>
        </button>
        <button role="tab" aria-selected={s.tab === 'standard'} className={`tab ${s.tab === 'standard' ? 'on' : ''}`} onClick={() => dispatch({ type: 'setTab', tab: 'standard' })}>
          1 pm arrivals{' '}
          <span className="num">
            {placedAll - placedEarly}/{46 - early.length}
          </span>
        </button>
        <span className="sp" />
        <label className="chk">
          <input type="checkbox" checked={s.hideAssigned} onChange={(e) => dispatch({ type: 'hideAssigned', v: e.target.checked })} />
          Hide placed
        </label>
      </div>
      <div className="glist">
        {list.map((g) => {
          const st = guestStatus(g, d)
          return (
            <button key={g.id} className={`grow ${s.selGuest === g.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'selectGuest', id: g.id })} aria-pressed={s.selGuest === g.id}>
              <span className="rk num">{g.rank ?? '·'}</span>
              <span style={{ minWidth: 0, display: 'block' }}>
                <span className="gn">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                  {g.accessible && (
                    <span className="accb" title={g.need ?? 'Accessible room'}>
                      <AccIcon size={14} />
                    </span>
                  )}
                </span>
                <span className="gm">
                  <TierBadge tier={g.tier} />
                  <span>·</span>
                  <span>{TYPE_LABEL[g.type]}</span>
                </span>
              </span>
              <span className={`gs ${st.cls}`}>
                <b className="num">{st.a}</b>
                <span className="num">{st.b}</span>
              </span>
            </button>
          )
        })}
        {list.length === 0 && (
          <div className="empty" style={{ margin: 6 }}>
            Everyone in this list has a room.
          </div>
        )}
      </div>
      <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ color: 'var(--acc)', display: 'inline-flex' }}>
          <AccIcon size={13} />
        </span>
        {acc.length} accessible · {acc.filter((g) => g.roomId != null).length} placed · ranked by loyalty tier
      </div>
    </section>
  )
}
