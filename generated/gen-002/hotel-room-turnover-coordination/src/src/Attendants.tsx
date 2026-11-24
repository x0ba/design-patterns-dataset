import { Zap, Wrench } from 'lucide-react'
import { useStore } from './store'
import { fmtTime } from './format'
import { DMITRI } from './data'

export function Attendants() {
  const { s, d, dispatch } = useStore()
  const totalDone = [...d.att.values()].reduce((n, a) => n + a.done, 0)
  const total = [...d.att.values()].reduce((n, a) => n + a.total, 0)
  return (
    <section className="panel att" aria-label="Attendants">
      <div className="ph">
        <span>Attendants · today's lists</span>
        <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'var(--text)' }} className="num">
          {totalDone}/{total} rooms done
        </span>
      </div>
      <div className="ahead">
        <span />
        <span>Name</span>
        <span>Progress</span>
        <span>Now</span>
        <span>Next up</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {s.attendants.map((a) => {
          const st = d.att.get(a.id)!
          const pct = st.total ? (st.done / st.total) * 100 : 0
          const idle = s.now - a.lastSeen
          let now = ''
          let warn = false
          if (a.presence === 'active') now = st.current ? `Cleaning ${st.current.id}` : a.where ? `Near ${a.where}` : 'On phone'
          else if (a.presence === 'break') {
            now = `Break · back ${a.backAt ? fmtTime(a.backAt) : '?'}`
            warn = true
          } else {
            now = `Idle ${Math.floor(idle)} min`
            warn = true
          }
          const next = st.next
          return (
            <button key={a.id} className={`arow ${s.attFilter === a.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAtt', id: a.id })} title="Show only this attendant's rooms on the board" aria-pressed={s.attFilter === a.id}>
              <span className={`pdot ${a.presence}`} title={a.presence === 'active' ? 'On phone' : a.presence === 'break' ? 'On break' : 'Not on phone'} />
              <span className={`aname ${a.presence === 'active' ? '' : 'off'}`}>{a.name}</span>
              <span className="bar">
                <span className="trk">
                  <i style={{ width: pct + '%', background: a.presence === 'active' ? 'var(--ok)' : 'var(--dim)' }} />
                </span>
                <span className="cnt num">
                  {st.done}/{st.total}
                </span>
              </span>
              <span className={`astat ${warn ? 'warn' : ''}`}>{now}</span>
              <span className="anext">
                {next ? (
                  <>
                    <b className="num">{next.id}</b>
                    {next.rush != null && <Zap size={11} fill="var(--rush)" color="var(--rush)" />}
                  </>
                ) : (
                  <span style={{ color: 'var(--dim)' }}>—</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function OutOfOrder() {
  const { s, dispatch } = useStore()
  const list = s.rooms.filter((r) => r.status === 'ooo').sort((a, b) => (a.ooo!.estAt ?? 99999) - (b.ooo!.estAt ?? 99999))
  return (
    <section className="panel ooo" aria-label="Out of order rooms">
      <div className="ph">
        <span>Out of order · {list.length}</span>
      </div>
      <div className="olist">
        {list.map((r) => (
          <button key={r.id} className={`orow ${s.selRoom === r.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'selectRoom', id: r.id })}>
            <div className="r1">
              <span className="rn num">{r.id}</span>
              <span style={{ fontSize: 12.5 }}>{r.ooo!.reason}</span>
            </div>
            <div className="r2">
              <span>
                <b>{r.ooo!.who}</b>
                {s.dmitriAt === r.id && r.ooo!.who === DMITRI ? ' · on site' : ''}
              </span>
              <span>
                back <b className="num">{r.ooo!.estLabel}</b>
              </span>
            </div>
          </button>
        ))}
        {list.length === 0 && <div className="empty">No rooms out of order.</div>}
      </div>
      <div className="mtech">
        <Wrench size={13} />
        <span>
          <b style={{ color: 'var(--text)' }}>{DMITRI}</b> on phone{s.dmitriAt ? <> · at room <b className="num" style={{ color: 'var(--text)' }}>{s.dmitriAt}</b></> : null}
        </span>
      </div>
    </section>
  )
}
