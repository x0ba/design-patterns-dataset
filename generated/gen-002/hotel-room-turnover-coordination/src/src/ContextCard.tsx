import { useState } from 'react'
import { ArrowLeft, UserMinus, X, Zap, Lock, CheckCheck, RotateCcw, ArrowRightLeft } from 'lucide-react'
import { useStore } from './store'
import { ACTOR_INFO, Act, AccIcon, StatusIcon, TierBadge, useActor } from './ui'
import { assignBlocker, candidatesFor, isDone, MAX_LIST, type Candidate } from './logic'
import { STATUS_LABEL, STATUS_SHORT, TYPE_LABEL, ago, fmtTime } from './format'
import type { Guest, Room } from './types'
import { guestStatus } from './Arrivals'

function etaText(c: { at: number | null; kind: string }) {
  if (c.kind === 'ready') return 'ready now'
  if (c.at == null) return 'no attendant yet'
  return `ready ~${fmtTime(c.at)}`
}

function SwitchNote({ who, why }: { who: 'marisol' | 'kenji'; why: string }) {
  const { actor, switchTo } = useActor()
  if (actor === who) return null
  return (
    <div className="note">
      <Lock size={12} />
      <span>{why}</span>
      <button className="linkbtn" onClick={() => switchTo(who)}>
        Hand controls to {ACTOR_INFO[who].name.split(' ')[0]}
      </button>
    </div>
  )
}

function GuestHead({ g, compact }: { g: Guest; compact?: boolean }) {
  const { s, dispatch } = useStore()
  if (compact) {
    return (
      <div className="gstrip">
        <button
          className="btn sm ico"
          title="Back to this guest's rooms"
          onClick={() => dispatch({ type: 'selectRoom', id: s.selRoom })}
          style={{ background: 'rgba(255,255,255,0.08)', border: 0 }}
        >
          <ArrowLeft size={14} />
        </button>
        <span style={{ minWidth: 0 }}>
          <small style={{ color: 'var(--muted)' }}>Placing guest</small>
          <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</b>
        </span>
      </div>
    )
  }
  return null
}

function CandidateRow({ c, g }: { c: Candidate; g: Guest }) {
  const { s, dispatch } = useStore()
  const { isKenji } = useActor()
  const r = c.room
  const late = g.needBy && c.eta.at != null && c.eta.at > g.needBy
  const unattended = c.eta.kind === 'unattended'
  return (
    <div className="cand">
      <button className="big num" onClick={() => dispatch({ type: 'selectRoom', id: r.id })} title="Open room details" style={{ textAlign: 'center' }}>
        {r.id}
      </button>
      <button style={{ textAlign: 'left', minWidth: 0 }} onClick={() => dispatch({ type: 'selectRoom', id: r.id })}>
        <div className="l1">
          <span className={`sw t-${r.status}`} style={{ width: 16, height: 16 }}>
            <StatusIcon status={r.status} size={10} />
          </span>
          {STATUS_SHORT[r.status]}
          {r.rush != null && <Zap size={12} fill="var(--rush)" color="var(--rush)" />}
        </div>
        <div className="l2 num" style={{ color: unattended ? 'var(--bad)' : late ? 'var(--warn)' : undefined }}>
          {late && c.eta.at != null ? `~${fmtTime(c.eta.at)} · ${Math.round(c.eta.at - g.needBy!)} min late` : etaText(c.eta)}
        </div>
      </button>
      <div style={{ display: 'flex', gap: 5 }}>
        {(r.status === 'dirty' || r.status === 'clean') && (
          <button
            className={`btn sm ico ${r.rush != null ? 'on' : ''}`}
            title={r.status === 'clean' ? 'Inspect this room first' : 'Clean this room first'}
            aria-pressed={r.rush != null}
            onClick={() => dispatch({ type: 'rush', room: r.id })}
          >
            <Zap size={13} fill={r.rush != null ? 'currentColor' : 'none'} />
          </button>
        )}
        <Act allowed={isKenji} lockedHint="Only the front desk can assign" className="sm pri" onClick={() => dispatch({ type: 'assign', room: r.id, guest: g.id })}>
          Assign
        </Act>
      </div>
    </div>
  )
}

function GuestView({ g }: { g: Guest }) {
  const { s, d, dispatch } = useStore()
  const { isKenji, isMarisol } = useActor()
  const cands = g.roomId == null ? candidatesFor(s, d, g) : []
  const placed = g.roomId != null ? d.byId.get(g.roomId)! : null
  const st = guestStatus(g, d)
  return (
    <>
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <span>{g.early ? `Early request #${g.rank}` : 'Arriving from 1 pm'}</span>
        <button className="linkbtn" style={{ color: 'var(--muted)', textDecoration: 'none' }} onClick={() => dispatch({ type: 'selectGuest', id: g.id })} aria-label="Clear guest">
          <X size={14} />
        </button>
      </div>
      <div>
        <h3>{g.name}</h3>
        <div className="sub">{g.org}</div>
      </div>
      <div className="chips">
        <span className="chip">
          <TierBadge tier={g.tier} /> · {g.nights} nights
        </span>
        <span className="chip">{TYPE_LABEL[g.type]}</span>
        {g.needBy && <span className="chip warn num">needs it by {fmtTime(g.needBy)}</span>}
        {g.accessible && (
          <span className="chip acc">
            <AccIcon size={12} /> {g.need ?? 'Accessible'}
          </span>
        )}
      </div>

      {placed ? (
        <>
          <button className={`spill t-${placed.status}`} style={{ width: '100%', textAlign: 'left' }} onClick={() => dispatch({ type: 'selectRoom', id: placed.id })}>
            <StatusIcon status={placed.status} size={16} />
            <span>
              Room {placed.id}
              <small className="num">
                {STATUS_LABEL[placed.status]} · {st.b}
              </small>
            </span>
          </button>
          <div className="actions">
            {placed.status === 'clean' && (
              <Act allowed={isMarisol} lockedHint="Only Marisol can mark inspected" className="ok" onClick={() => dispatch({ type: 'inspect', room: placed.id })}>
                <CheckCheck size={14} /> Mark inspected
              </Act>
            )}
            {(placed.status === 'dirty' || placed.status === 'clean') && (
              <button className={`btn ${placed.rush != null ? 'on' : ''}`} onClick={() => dispatch({ type: 'rush', room: placed.id })} aria-pressed={placed.rush != null}>
                <Zap size={13} fill={placed.rush != null ? 'currentColor' : 'none'} /> {placed.status === 'clean' ? 'Inspect first' : 'Clean first'}
              </button>
            )}
            <Act allowed={isKenji} lockedHint="Only the front desk can release a room" onClick={() => dispatch({ type: 'unassign', guest: g.id })}>
              <UserMinus size={13} /> Release room
            </Act>
          </div>
          {placed.status === 'clean' && <SwitchNote who="marisol" why="Inspection is Marisol-only." />}
        </>
      ) : (
        <>
          <div className="ph" style={{ marginTop: 2 }}>
            <span>Best rooms · earliest ready first</span>
            <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0 }} className="num">
              {cands.length} fit
            </span>
          </div>
          {cands.length === 0 ? (
            <div className="empty">
              No {g.accessible ? 'accessible ' : ''}
              {TYPE_LABEL[g.type].toLowerCase()} room is turning or ready right now. Check the out-of-order list for one that may be back soon.
            </div>
          ) : (
            <div className="cands">
              {cands.slice(0, 4).map((c) => (
                <CandidateRow key={c.room.id} c={c} g={g} />
              ))}
            </div>
          )}
          {cands.length > 4 && <div className="note">{cands.length - 4} more fit and are ringed on the board.</div>}
          <SwitchNote who="kenji" why="Assigning a room is front-desk-only." />
        </>
      )}
    </>
  )
}

function Picker({ room, onDone }: { room: Room; onDone: () => void }) {
  const { s, d, dispatch } = useStore()
  return (
    <div className="picker" role="listbox" aria-label="Move to attendant">
      {s.attendants.map((a) => {
        const st = d.att.get(a.id)!
        const full = st.total >= MAX_LIST
        const same = a.id === room.attendant
        return (
          <button
            key={a.id}
            disabled={full || same}
            onClick={() => {
              dispatch({ type: 'reassign', room: room.id, to: a.id })
              onDone()
            }}
            title={full ? `Already at ${MAX_LIST} rooms` : undefined}
          >
            <span className={`pdot ${a.presence}`} />
            <span style={{ fontWeight: 600 }}>
              {a.name} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{a.presence === 'active' ? '' : a.presence === 'break' ? '· on break' : '· not on phone'}</span>
            </span>
            <span className="num" style={{ color: full ? 'var(--warn)' : 'var(--muted)' }}>
              {st.total}/{MAX_LIST}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function RoomView({ r }: { r: Room }) {
  const { s, d, dispatch } = useStore()
  const { isKenji, isMarisol } = useActor()
  const [moving, setMoving] = useState(false)
  const guest = s.selGuest ? d.guestById.get(s.selGuest) ?? null : null
  const roomGuest = r.guestId ? d.guestById.get(r.guestId) ?? null : null
  const att = s.attendants.find((a) => a.id === r.attendant)!
  const eta = d.eta.get(r.id)
  const blocker = guest ? assignBlocker(r, guest) : null
  const canMove = r.onList && r.status !== 'cleaning' && !isDone(r) && r.status !== 'ooo'
  const stale = r.status === 'cleaning' && r.startedAt != null && s.now - r.startedAt > 25
  const assignable = r.status === 'dirty' || r.status === 'cleaning' || r.status === 'clean' || r.status === 'inspected'

  return (
    <>
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <span>Room</span>
        <button className="linkbtn" style={{ color: 'var(--muted)', textDecoration: 'none' }} onClick={() => dispatch({ type: 'selectRoom', id: r.id })} aria-label="Close room details">
          <X size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h3 className="num" style={{ fontSize: 26, letterSpacing: '-0.03em' }}>
          {r.id}
        </h3>
        <div className="chips">
          <span className="chip">{TYPE_LABEL[r.type]}</span>
          <span className="chip">Floor {r.floor}</span>
          {r.accessible && (
            <span className="chip acc">
              <AccIcon size={12} /> Accessible
            </span>
          )}
        </div>
      </div>
      <div className={`spill t-${r.status}`} style={{ animation: 'none' }}>
        <StatusIcon status={r.status} size={16} />
        <span>
          {STATUS_LABEL[r.status]}
          {r.status === 'ooo' && r.ooo && <small>{r.ooo.reason}</small>}
          {r.status !== 'ooo' && eta && eta.kind !== 'ready' && assignable && <small className="num">{etaText(eta)}</small>}
        </span>
      </div>

      <dl className="kv" style={{ margin: 0 }}>
        <dt>Last change</dt>
        <dd className="num">
          {r.last.verb} · {r.last.by}, {fmtTime(r.last.at)}
          <span style={{ color: 'var(--muted)', fontWeight: 450 }}> · {ago(s.now, r.last.at)}</span>
        </dd>
        {r.status === 'ooo' && r.ooo ? (
          <>
            <dt>Working on it</dt>
            <dd>{r.ooo.who}</dd>
            <dt>Back</dt>
            <dd className="num">est. {r.ooo.estLabel}</dd>
          </>
        ) : (
          <>
            <dt>Attendant</dt>
            <dd style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`pdot ${att.presence}`} />
              {att.name}
              {att.presence !== 'active' && <span style={{ color: 'var(--warn)', fontWeight: 500 }}>{att.presence === 'break' ? 'on break' : 'not on phone'}</span>}
              {canMove && (
                <button className={`btn sm ${moving ? 'on' : ''}`} style={{ marginLeft: 'auto', ...(moving ? {} : {}) }} onClick={() => (isMarisol ? setMoving((v) => !v) : dispatch({ type: 'reassign', room: r.id, to: att.id }))} aria-label="Move to another attendant" title={isMarisol ? 'Move to another attendant' : 'Only Marisol can move rooms'}>
                  {!isMarisol && <Lock size={11} />}
                  <ArrowRightLeft size={12} /> Move
                </button>
              )}
            </dd>
          </>
        )}
        {roomGuest && (
          <>
            <dt>Guest</dt>
            <dd>
              {roomGuest.name} <span style={{ color: 'var(--muted)', fontWeight: 450 }}>· {roomGuest.tier}</span>
            </dd>
          </>
        )}
      </dl>
      {stale && (
        <div className="chip warn" style={{ alignSelf: 'flex-start' }}>
          Cleaning for {Math.floor(s.now - r.startedAt!)} min with no update
        </div>
      )}
      {r.status === 'ooo' && r.ooo?.note && <div className="note">{r.ooo.note}</div>}
      {moving && isMarisol && <Picker room={r} onDone={() => setMoving(false)} />}

      <div className="actions">
        {guest && guest.roomId == null && !r.guestId && assignable && !blocker && (
          <Act allowed={isKenji} lockedHint="Only the front desk can assign" className="pri" onClick={() => dispatch({ type: 'assign', room: r.id, guest: guest.id })}>
            Assign to {guest.name.split(' ').slice(-1)[0]}
          </Act>
        )}
        {r.status === 'clean' && (
          <>
            <Act allowed={isMarisol} lockedHint="Only Marisol can mark inspected" className="ok" onClick={() => dispatch({ type: 'inspect', room: r.id })}>
              <CheckCheck size={14} /> Mark inspected
            </Act>
            <Act allowed={isMarisol} lockedHint="Only Marisol can send a room back" className="sm" onClick={() => dispatch({ type: 'sendBack', room: r.id })}>
              <RotateCcw size={12} /> Send back
            </Act>
          </>
        )}
        {(r.status === 'dirty' || r.status === 'clean') && (
          <button className={`btn ${r.rush != null ? 'on' : ''}`} aria-pressed={r.rush != null} onClick={() => dispatch({ type: 'rush', room: r.id })}>
            <Zap size={13} fill={r.rush != null ? 'currentColor' : 'none'} /> {r.status === 'clean' ? 'Inspect first' : 'Clean first'}
          </button>
        )}
        {r.guestId && roomGuest && (
          <Act allowed={isKenji} lockedHint="Only the front desk can release a room" onClick={() => dispatch({ type: 'unassign', guest: roomGuest.id })}>
            <UserMinus size={13} /> Release
          </Act>
        )}
      </div>

      {guest && guest.roomId == null && !r.guestId && assignable && blocker && <div className="note">Can't take {guest.name.split(' ').slice(-1)[0]}: {blocker.toLowerCase()}.</div>}
      {guest && guest.roomId == null && !r.guestId && assignable && !blocker && <SwitchNote who="kenji" why="Assigning is front-desk-only." />}
      {r.status === 'clean' && <SwitchNote who="marisol" why="Inspection is Marisol-only." />}
      {!guest && !r.guestId && assignable && <div className="note">Pick a guest on the right to see if this room fits.</div>}
      {(r.status === 'occupied' || r.status === 'dueout') && !r.guestId && <div className="note">{r.status === 'dueout' ? 'Guest has not checked out yet, so it can’t be assigned.' : 'Stayover guest in house.'}</div>}
    </>
  )
}

export function ContextCard() {
  const { s, d } = useStore()
  const guest = s.selGuest ? d.guestById.get(s.selGuest) ?? null : null
  const room = s.selRoom != null ? d.byId.get(s.selRoom) ?? null : null
  return (
    <section className="panel ctx" aria-label="Details" aria-live="polite">
      {guest && room && <GuestHead g={guest} compact />}
      {room ? (
        <RoomView key={room.id} r={room} />
      ) : guest ? (
        <GuestView key={guest.id} g={guest} />
      ) : (
        <>
          <div className="ph">Details</div>
          <div className="empty">Tap a guest to see which rooms fit, or tap any room on the board.</div>
          <dl className="kv" style={{ margin: 0, gridTemplateColumns: '78px 1fr' }}>
            <dt>Marisol</dt>
            <dd>Inspect, send back, move rooms between attendants</dd>
            <dt>Kenji</dt>
            <dd>Assign and release guests</dd>
            <dt>Either</dt>
            <dd>Move a room to the front of the line</dd>
          </dl>
        </>
      )}
    </section>
  )
}
