import { useMemo } from 'react'
import { UserCheck, Zap } from 'lucide-react'
import { useStore } from './store'
import { candidatesFor } from './logic'
import { STATUS_LABEL, STATUS_ORDER, STATUS_SHORT, TYPE_LABEL, fmtTime } from './format'
import { AccIcon, StatusIcon, Swatch } from './ui'
import type { CSSProperties } from 'react'

const FLOORS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]

export function Board() {
  const { s, d, dispatch } = useStore()
  const guest = s.selGuest ? d.guestById.get(s.selGuest) ?? null : null
  const cand = useMemo(() => {
    const m = new Map<number, 'now' | 'soon'>()
    if (guest && guest.roomId == null) {
      for (const c of candidatesFor(s, d, guest)) m.set(c.room.id, c.eta.kind === 'ready' ? 'now' : 'soon')
    }
    return m
  }, [s, d, guest])
  const planning = !!guest && guest.roomId == null

  return (
    <section className="panel board" aria-label="Room board">
      <div className="legend" role="group" aria-label="Filter rooms by status">
        {STATUS_ORDER.map((st) => (
          <button key={st} className={`lg ${s.statusFilter === st ? 'on' : ''}`} onClick={() => dispatch({ type: 'setFilter', status: st })} aria-pressed={s.statusFilter === st}>
            <Swatch status={st} />
            {STATUS_SHORT[st]} <b className="num">{d.counts[st]}</b>
          </button>
        ))}
      </div>
      <div className="markers">
        <span>
          <span style={{ color: 'var(--acc)', display: 'inline-flex' }}>
            <AccIcon size={12} />
          </span>
          Accessible
        </span>
        <span>
          <span className="hold" style={{ display: 'inline-flex' }}>
            <UserCheck size={12} strokeWidth={2.6} />
          </span>
          Assigned to a guest
        </span>
        <span>
          <span style={{ background: 'var(--rush)', color: '#1b1500', borderRadius: '50%', width: 13, height: 13, display: 'inline-grid', placeItems: 'center' }}>
            <Zap size={9} strokeWidth={3} fill="currentColor" />
          </span>
          Moved to front of line
        </span>
        <span>
          <span style={{ width: 13, height: 13, borderRadius: 4, boxShadow: '0 0 0 2px #fff', display: 'inline-block', margin: '0 2px' }} />
          Changed in last 5 min
        </span>
        {planning && (
          <span style={{ marginLeft: 'auto', color: '#7dffb8', fontWeight: 600 }}>
            {cand.size} rooms fit {guest!.name.split(' ').slice(-1)[0]}
          </span>
        )}
      </div>

      <div className="floors">
        {FLOORS.map((f) => (
          <div className="frow" key={f}>
            <div className="fl num">{f}</div>
            {s.rooms
              .slice((f - 3) * 18, (f - 3) * 18 + 18)
              .map((r) => {
                const age = s.now - r.last.at
                const recent = age < 5
                const c = cand.get(r.id)
                const isSel = s.selRoom === r.id
                const guestOfRoom = r.guestId ? d.guestById.get(r.guestId) : null
                const goldRoom = !!guest && guest.roomId === r.id
                let dim = false
                if (s.statusFilter && r.status !== s.statusFilter) dim = true
                if (s.attFilter && r.attendant !== s.attFilter) dim = true
                if (planning && !c) dim = true
                const cls = ['tile', `t-${r.status}`]
                if (dim && !isSel) cls.push('dim')
                if (recent) cls.push('recent')
                if (c === 'now') cls.push('cand-now')
                if (c === 'soon') cls.push('cand-soon')
                if (goldRoom) cls.push('gold-room')
                if (isSel) cls.push('sel')
                const e = d.eta.get(r.id)
                const title = [
                  `${r.id} · ${TYPE_LABEL[r.type]}${r.accessible ? ' · accessible' : ''}`,
                  STATUS_LABEL[r.status],
                  `${r.last.verb} by ${r.last.by}, ${fmtTime(r.last.at)}`,
                  guestOfRoom ? `Assigned to ${guestOfRoom.name}` : '',
                  c && e ? (c === 'now' ? 'Ready now' : `Ready ~${e.at != null ? fmtTime(e.at) : 'unknown'}`) : '',
                ]
                  .filter(Boolean)
                  .join('\n')
                return (
                  <button
                    key={r.id}
                    className={cls.join(' ')}
                    style={{ '--a': recent ? Math.max(0.25, 1 - age / 5) : 0 } as CSSProperties}
                    onClick={() => dispatch({ type: 'selectRoom', id: r.id })}
                    title={title}
                    aria-label={`Room ${r.id}, ${STATUS_LABEL[r.status]}${r.accessible ? ', accessible' : ''}${guestOfRoom ? ', assigned to ' + guestOfRoom.name : ''}`}
                    aria-pressed={isSel}
                  >
                    {r.rush != null && (
                      <span className="rushb" aria-hidden>
                        <Zap size={9} strokeWidth={3} fill="currentColor" />
                      </span>
                    )}
                    <span className="num">{r.id}</span>
                    <span className="row2">
                      <span className="slot" style={{ color: r.accessible ? (r.status === 'occupied' ? 'var(--acc)' : '#bfe0ff') : undefined }}>
                        {r.accessible && <AccIcon size={11} />}
                      </span>
                      <span className="slot">
                        <StatusIcon status={r.status} size={11} />
                      </span>
                      <span className="slot hold">{r.guestId && <UserCheck size={11} strokeWidth={2.8} />}</span>
                    </span>
                  </button>
                )
              })}
          </div>
        ))}
      </div>
    </section>
  )
}
