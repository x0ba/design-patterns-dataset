import { PLAYERS, RAIN_DAYS, SATURDAY_PARTY } from '../data/content'
import { SESSIONS } from '../data/world'
import { TERRAIN_FILL } from './HexMap'
import { type Leg, type PrepCandidate, type RouteStats } from '../data/route'
import { cap, fmtDate, fmtMin, plural } from '../util'

export const ROUTE_META = {
  A: { name: 'Pilgrim’s Road & the Ashen Ford', short: 'Road and ford', color: '#8c2f2b', tag: 'Likely' },
  B: { name: 'Straight through the fen', short: 'Through the fen', color: '#2b5a8a', tag: 'Riskier' },
}

const signed = (n: number, unit: string) => (n === 0 ? `same ${unit}` : `${n > 0 ? '+' : '−'}${Math.abs(n)} ${unit}${Math.abs(n) === 1 ? '' : 's'}`)

function DayStrip({ st }: { st: RouteStats }) {
  const total = Math.max(st.days, st.supply)
  const cells: { day: number; leg?: Leg }[] = []
  for (let d = 1; d <= total; d++) cells.push({ day: d, leg: st.legs.find((l) => l.startDay <= d && d <= l.endDay) })
  return (
    <div className="strip" aria-label="Day-by-day travel strip">
      <div className="strip-cells">
        {cells.map(({ day, leg }) => (
          <div key={day} className={`sc ${leg ? '' : 'empty'} ${day > st.supply ? 'hungry' : ''}`} title={leg ? `Day ${day}: ${leg.hex} ${leg.terrain}` : `Day ${day}`}
            style={{ background: leg ? TERRAIN_FILL[leg.terrain] : undefined }}>
            {RAIN_DAYS.includes(day) && <span className="drops" />}
            <span className="dn mono">{day}</span>
          </div>
        ))}
      </div>
      <div className="strip-legend tiny muted">
        <span><i className="sw rain" /> rain</span>
        <span><i className="sw hun" /> after rations end</span>
        <span className="grow-s" />
        <span>Day {st.days} arrival · round trip ≈ {st.days + st.returnDays} d</span>
      </div>
    </div>
  )
}

export function RoutePanel(props: {
  active: 'A' | 'B'
  setActive: (r: 'A' | 'B') => void
  stats: { A: RouteStats; B: RouteStats }
  mode: 'inspect' | 'trace'
  setMode: (m: 'inspect' | 'trace') => void
  onUndo: () => void
  onClear: () => void
  onSuggest: (m: 'fast' | 'safe') => void
  note: string
  setNote: (s: string) => void
  selected: string | null
  onSelect: (h: string) => void
}) {
  const { active, setActive, stats, mode, setMode, onUndo, onClear, onSuggest, note, setNote, selected, onSelect } = props
  const st = stats[active]
  const other = stats[active === 'A' ? 'B' : 'A']
  const meta = ROUTE_META[active]
  const hungry = st.surplus < 0
  return (
    <section className="card route">
      <div className="tabs" role="tablist">
        {(['A', 'B'] as const).map((r) => (
          <button key={r} role="tab" aria-selected={active === r} className={`tab ${active === r ? 'on' : ''}`} onClick={() => setActive(r)} style={{ ['--rc' as string]: ROUTE_META[r].color }}>
            <span className="rl">{r}</span>
            <span className="tn"><b>{ROUTE_META[r].short}</b><span className="tiny muted">{ROUTE_META[r].tag} · {stats[r].days} d · {plural(stats[r].hexes, 'hex', 'hexes')}</span></span>
          </button>
        ))}
      </div>

      <div className="stats">
        <div className="stat"><div className="eyebrow">Days</div><div className="big-num">{st.days}</div>
          <div className="tiny muted">{st.rainExtraDays > 0 ? `incl. +${st.rainExtraDays} rain` : 'no rain delay'}</div></div>
        <div className="stat"><div className="eyebrow">Hexes</div><div className="big-num">{st.hexes}</div>
          <div className="tiny muted">{st.exploredCount} explored</div></div>
        <div className={`stat ${hungry ? 'bad' : ''}`}><div className="eyebrow">Rations</div><div className="big-num">{hungry ? `−${-st.surplus}` : st.surplus}<span className="unit"> d</span></div>
          <div className="tiny">{hungry ? <b>shortfall</b> : <span className="muted">spare on arrival</span>}</div></div>
        <div className="stat"><div className="eyebrow">Lair reach</div><div className="big-num">{st.lairHexes}<span className="unit">/{st.hexes}</span></div>
          <div className="tiny muted">peak threat {st.peakThreat}</div></div>
      </div>

      <DayStrip st={st} />

      <div className="vs">
        <span className="eyebrow">vs Route {active === 'A' ? 'B' : 'A'}</span>
        <span>{signed(st.hexes - other.hexes, 'hex')}</span>·<span>{signed(st.days - other.days, 'day')}</span>·<span>{signed(st.lairHexes - other.lairHexes, 'lair-reach hex')}</span>
      </div>
      {hungry && <div className="warn tiny">Rations run out on day {st.runsOutDay}{st.runsOutHex ? ` inside ${st.runsOutHex}` : ''}.</div>}

      <div className="actions">
        <button className={`btn ${mode === 'trace' ? 'on' : ''}`} onClick={() => setMode(mode === 'trace' ? 'inspect' : 'trace')}>{mode === 'trace' ? 'Done tracing' : `Trace route ${active}`}</button>
        <button className="btn ghost" onClick={onUndo} title="Remove last hex">Undo</button>
        <button className="btn ghost" onClick={onClear} title="Reset to Greyhollow only">Clear</button>
        <span className="grow-s" />
        <button className="btn ghost" onClick={() => onSuggest('fast')} title="Fewest days, rain-aware">Fastest</button>
        <button className="btn ghost" onClick={() => onSuggest('safe')} title="Trades days for avoiding lair reach">Safest</button>
      </div>

      <div className="legs" role="list">
        <div className="legs-h tiny muted"><span /><span>Hex</span><span>Days</span><span>Known</span><span>Sites on / beside</span></div>
        {st.legs.length === 0 && <p className="muted pad">Route is empty — click hexes on the map in trace mode.</p>}
        {st.legs.map((l, i) => (
          <button key={l.hex + i} role="listitem" className={`leg ${selected === l.hex ? 'sel' : ''}`} onClick={() => onSelect(l.hex)}>
            <span className="step" style={{ background: meta.color }}>{i + 1}</span>
            <span className="lh"><b className="mono">{l.hex}</b><span className="tiny muted">{cap(l.terrain)}</span></span>
            <span className="ld">
              <b>{l.cost}d</b>{l.rainExtra > 0 && <span className="chip rainchip">+1 rain</span>}
              <span className="tiny muted block">Day {l.startDay === l.endDay ? l.startDay : `${l.startDay}–${l.endDay}`}</span>
            </span>
            <span className="lk">
              <span className={`kdot k-${l.know}`} /><span className="tiny">{cap(l.know)}</span>
              <span className="seenby mini">{SATURDAY_PARTY.map((p) => <span key={p} className={`sb ${l.seenBy.includes(p) ? 'y' : ''}`}>{PLAYERS.find((x) => x.id === p)!.name[0]}</span>)}</span>
            </span>
            <span className="lf">
              {l.on.map((o) => <span key={o.id} className={`feat on kind-${o.kind}`}>{o.name}{o.threat ? ` · ${o.threat}` : ''}</span>)}
              {l.lairs.length > 0 && l.on.every((o) => o.kind !== 'lair') && <span className="feat lair">Lair reach · {Math.max(...l.lairs.map((x) => x.threat))}</span>}
              {l.near.filter((n) => !l.on.includes(n)).slice(0, 3).map((n) => <span key={n.id} className="feat near">{n.name}</span>)}
              {l.on.length === 0 && l.near.length === 0 && l.lairs.length === 0 && <span className="tiny muted">Nothing keyed</span>}
            </span>
          </button>
        ))}
      </div>

      <label className="note-box">
        <span className="eyebrow">Route {active} note</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What happens if they pick this one?" />
      </label>
    </section>
  )
}

export function PrepPanel({ cands, pins, togglePin, budget, setBudget, onSelect, selected }: {
  cands: PrepCandidate[]; pins: string[]; togglePin: (h: string) => void; budget: number; setBudget: (n: number) => void
  onSelect: (h: string) => void; selected: string | null
}) {
  const picked = pins.map((p) => cands.find((c) => c.hex === p)).filter(Boolean) as PrepCandidate[]
  const mins = picked.reduce((a, c) => a + c.minutes, 0)
  const over = mins > budget * 60
  const list = cands.slice(0, 5)
  return (
    <section className="card prep">
      <header className="card-h"><h2>Where to spend prep time</h2><span className="muted">{pins.length} of 3 picked</span></header>
      <ul className="cands">
        {list.map((c, i) => {
          const on = pins.includes(c.hex)
          return (
            <li key={c.hex} className={`${on ? 'picked' : ''} ${selected === c.hex ? 'sel' : ''}`}>
              <button className={`star ${on ? 'on' : ''}`} onClick={() => togglePin(c.hex)} disabled={!on && pins.length >= 3} aria-label={on ? `Unpin ${c.title}` : `Pin ${c.title}`} aria-pressed={on}>{on ? '★' : '☆'}</button>
              <button className="cand-main" onClick={() => onSelect(c.hex)}>
                <span className="cand-t"><span className="rank mono">{i + 1}</span><b>{c.title}</b><span className="mono muted tiny">{c.hex}</span></span>
                <span className="cand-r tiny muted">{c.reasons.slice(0, 2).join(' · ')}</span>
              </button>
              <span className="est tiny muted">{fmtMin(c.minutes)}</span>
            </li>
          )
        })}
      </ul>
      <footer className={`prep-f ${over ? 'over' : ''}`}>
        <span>Picks need <b>{fmtMin(mins)}</b> of</span>
        <span className="stepper"><button onClick={() => setBudget(Math.max(1, budget - 0.5))} aria-label="Less prep time">−</button><span className="mono">{budget} h</span><button onClick={() => setBudget(Math.min(12, budget + 0.5))} aria-label="More prep time">+</button></span>
        <span>left{over ? ' · over budget' : ''}</span>
      </footer>
    </section>
  )
}

export function SessionDrawer({ open, onClose, focus, setFocus }: { open: boolean; onClose: () => void; focus: number | null; setFocus: (n: number | null) => void }) {
  if (!open) return null
  return (
    <aside className="drawer" aria-label="Session log">
      <header className="card-h"><h2>Session log · {SESSIONS.length} expeditions</h2><button className="btn ghost sm" onClick={onClose}>Close</button></header>
      <p className="tiny muted pad">Pick a session to outline the hexes it entered on the map.</p>
      <ol className="sess">
        {SESSIONS.slice().reverse().map((s) => (
          <li key={s.n}>
            <button className={focus === s.n ? 'on' : ''} onClick={() => setFocus(focus === s.n ? null : s.n)}>
              <span className="sn mono">#{s.n}</span>
              <span className="sm">
                <b>{s.title}</b>
                <span className="tiny muted">{fmtDate(s.date)} · {plural(s.path.length - 1, 'hex', 'hexes')} · {s.players.map((p) => PLAYERS.find((x) => x.id === p)!.name).join(', ')}</span>
                <span className="tiny">{s.summary}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  )
}
