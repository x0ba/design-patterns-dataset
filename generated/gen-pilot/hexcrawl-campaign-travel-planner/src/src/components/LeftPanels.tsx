import { FACTIONS, PLAYERS, RAIN_DAYS, RATIONS, SATURDAY_PARTY, WEATHER } from '../data/content'
import { SESSIONS } from '../data/world'
import { HEXES, LAIR_REACH, LOC_BY_HEX } from '../data/world'
import { BASE_COST, ASSUMED, PLAYER_HEXES, legCost } from '../data/route'
import { LOCATIONS } from '../data/content'
import { cap, fmtDate, plural } from '../util'
import type { Loc } from '../data/types'

const AVATAR: Record<string, string> = { priya: '#4f7a4a', sam: '#a2762b', kofi: '#6b4f8c', lena: '#2f6f8f' }

export function PartyCard({ forage, setForage }: { forage: number; setForage: (n: number) => void }) {
  const party = SATURDAY_PARTY.map((id) => PLAYERS.find((p) => p.id === id)!)
  return (
    <section className="card">
      <header className="card-h"><h2>Saturday’s party</h2><span className="muted">Session 23</span></header>
      <ul className="party">
        {party.map((p) => {
          const n = SESSIONS.filter((s) => s.players.includes(p.id)).length
          const hexes = PLAYER_HEXES[p.id].size
          return (
            <li key={p.id}>
              <span className="avatar" style={{ background: AVATAR[p.id] }}>{p.name[0]}</span>
              <span className="p-main"><b>{p.name}</b><span className="muted"> {p.cls} {p.lvl}</span></span>
              <span className="p-stat muted" title={`${n} sessions, ${hexes} distinct hexes entered`}>{plural(n, 'session')} · {hexes} hex</span>
            </li>
          )
        })}
      </ul>
      <div className="rations">
        <div>
          <div className="eyebrow">Rations</div>
          <div className="big-num">{RATIONS}<span className="unit"> days</span></div>
        </div>
        <div className="forage">
          <div className="eyebrow">Forage allowance</div>
          <div className="stepper">
            <button onClick={() => setForage(Math.max(0, forage - 1))} aria-label="Less forage">−</button>
            <span className="mono">+{forage} d</span>
            <button onClick={() => setForage(Math.min(10, forage + 1))} aria-label="More forage">+</button>
          </div>
          <div className="muted tiny">DM ruling · Priya’s Survival</div>
        </div>
      </div>
    </section>
  )
}

const Icon = ({ kind }: { kind: 'clear' | 'cloud' | 'rain' }) => (
  <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden>
    {kind === 'clear' && <g stroke="#b9801a" strokeWidth="1.8" strokeLinecap="round" fill="none"><circle cx="13" cy="11" r="4.5" fill="#f1c24b" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1={13 + 7.5 * Math.cos((a * Math.PI) / 180)} y1={11 + 7.5 * Math.sin((a * Math.PI) / 180)} x2={13 + 9.5 * Math.cos((a * Math.PI) / 180)} y2={11 + 9.5 * Math.sin((a * Math.PI) / 180)} />)}</g>}
    {kind === 'cloud' && <path d="M7 16 a4 4 0 0 1 0-8 a5 5 0 0 1 9.5-1 a4.2 4.2 0 0 1 1 9 Z" fill="#cfc9bb" stroke="#7d7566" strokeWidth="1.5" />}
    {kind === 'rain' && <g><path d="M7 12 a4 4 0 0 1 0-8 a5 5 0 0 1 9.5-1 a4.2 4.2 0 0 1 1 9 Z" fill="#a9b9c4" stroke="#4b6a7d" strokeWidth="1.5" /><g stroke="#2f6f8f" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="15" x2="6.5" y2="19" /><line x1="13" y1="15" x2="11.5" y2="19" /><line x1="18" y1="15" x2="16.5" y2="19" /></g></g>}
  </svg>
)

export function WeatherCard() {
  const marshRain = legCost('marsh', 2).cost
  return (
    <section className="card">
      <header className="card-h"><h2>Weather · in-game week</h2></header>
      <div className="wx">
        {WEATHER.map((w) => (
          <div key={w.day} className={`wx-d ${RAIN_DAYS.includes(w.day) ? 'rain' : ''}`}>
            <div className="eyebrow">Day {w.day}</div>
            <Icon kind={w.kind} />
            <div className="tiny muted">{w.label}</div>
          </div>
        ))}
      </div>
      <p className="note tiny">Rain on days 2–3. A marsh hex overlapping a rain day costs <b>+1 day</b> ({BASE_COST.marsh} → {marshRain}). After day 7: assumed dry.</p>
    </section>
  )
}

export function Pips({ n }: { n: number }) {
  return <span className="pips" aria-label={`Threat ${n} of 5`}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>
}

const KIND_LABEL: Record<string, string> = { settlement: 'Settlement', ruin: 'Ruin', shrine: 'Shrine', landmark: 'Landmark', hazard: 'Hazard', lair: 'Lair', camp: 'Faction camp' }
const PREP_LABEL: Record<string, string> = { ready: 'Prepped', sketched: 'Sketched', bare: 'Unprepped' }

function LocCard({ loc, know }: { loc: Loc; know: string }) {
  const f = FACTIONS.find((x) => x.id === loc.faction)
  return (
    <div className="loc">
      <div className="loc-h">
        <b>{loc.name}</b>
        <span className="chips">
          <span className={`chip kind-${loc.kind}`}>{KIND_LABEL[loc.kind]}</span>
          <span className={`chip prep-${loc.prep}`}>{PREP_LABEL[loc.prep]}</span>
        </span>
      </div>
      {loc.threat && <div className="threat-row"><span className="eyebrow">Threat</span><Pips n={loc.threat} /><span className="muted tiny">reach {loc.radius} hex{loc.radius === 1 ? '' : 'es'}</span></div>}
      {f && <div className="tiny"><span className="dot" style={{ background: f.color }} /> <b>{f.name}</b> — {f.stance}</div>}
      <p>{loc.blurb}</p>
      {loc.encounter && <p className="enc"><span className="eyebrow">Prepared encounter</span>{loc.encounter}</p>}
      <div className="tiny muted">Players: {know === 'explored' ? 'know this site' : know === 'rumored' ? 'have only heard of the area' : 'don’t know it exists'}</div>
    </div>
  )
}

export function Inspector({ hex, pinned, onPin, canPin, onTrace, active }: {
  hex: string | null; pinned: boolean; onPin: () => void; canPin: boolean; onTrace: () => void; active: 'A' | 'B'
}) {
  if (!hex) return <section className="card grow"><header className="card-h"><h2>Hex inspector</h2></header><p className="muted pad">Select a hex on the map.</p></section>
  const h = HEXES.get(hex)!
  const locs = LOC_BY_HEX.get(hex) ?? []
  const reach = LAIR_REACH.get(hex) ?? []
  const sess = SESSIONS.filter((s) => s.path.includes(hex) && hex !== '1004')
  const base = BASE_COST[h.terrain]
  const wet = legCost(h.terrain, 2).cost
  return (
    <section className="card grow inspector">
      <header className="card-h">
        <h2>Hex inspector</h2>
        <span className={`chip know-${h.know}`}>{cap(h.know)}</span>
      </header>
      <div className="insp-title">
        <span className="hexid mono">{h.id}</span>
        <span>
          <b className="terr-name">{cap(h.terrain)}</b>
          <span className="muted"> · {base} day{base === 1 ? '' : 's'}{wet !== base ? ` (${wet} in rain)` : ''}</span>
          {ASSUMED.includes(h.terrain) && <span className="tiny muted block">Cost assumed — not in your ruleset yet</span>}
        </span>
      </div>
      <div className="insp-actions">
        <button className="btn sm" onClick={onTrace}>Route {active} → here</button>
        <button className={`btn sm ${pinned ? 'gold' : ''}`} onClick={onPin} disabled={!pinned && !canPin} title={!pinned && !canPin ? 'Three picks already' : ''}>{pinned ? '★ Prep pick' : '☆ Pin for prep'}</button>
      </div>

      {h.know === 'rumored' && h.rumor && (
        <div className="rumor">
          <div className="eyebrow">What the players have heard</div>
          <p>“{h.rumor.text}”</p>
          <div className="tiny muted">{h.rumor.source}</div>
          {h.rumor.dmNote && <div className="dm-note"><span className="eyebrow">DM only</span>{h.rumor.truth !== 'seen' && <b>{h.rumor.truth === 'true' ? 'Accurate. ' : h.rumor.truth === 'partly' ? 'Partly true. ' : 'False. '}</b>}{h.rumor.dmNote}</div>}
        </div>
      )}
      {h.know === 'unknown' && <p className="muted tiny">No party has entered or sighted this hex.{locs.length ? ' DM-only content is keyed here.' : ''}</p>}
      {h.know === 'explored' && (
        <div className="seen">
          <div className="eyebrow">Entered by</div>
          {hex === '1004' ? <p className="tiny muted">Home base: every expedition leaves from here.</p> : sess.length === 0 ? <p className="tiny muted">Explored.</p> : (
            <ul>{sess.slice().reverse().slice(0, 4).map((s) => (
              <li key={s.n}><span className="mono">#{s.n}</span> <span className="muted">{fmtDate(s.date, false)}</span> {s.players.map((p) => PLAYERS.find((x) => x.id === p)!.name).join(', ')}</li>
            ))}{sess.length > 4 && <li className="muted">+ {sess.length - 4} earlier</li>}</ul>
          )}
          <div className="seenby">{SATURDAY_PARTY.map((p) => <span key={p} className={`sb ${PLAYER_HEXES[p].has(hex) ? 'y' : ''}`} title={PLAYERS.find((x) => x.id === p)!.name}>{PLAYERS.find((x) => x.id === p)!.name[0]}</span>)}<span className="tiny muted">Saturday party members who’ve been here</span></div>
        </div>
      )}
      {reach.length > 0 && (
        <div className="reach tiny"><span className="eyebrow">In lair territory</span>
          {reach.map((r) => { const l = LOCATIONS.find((x) => x.id === r.locId)!; return <span key={r.locId} className="chip lairchip">{l.name} · {r.threat}</span> })}
        </div>
      )}
      {locs.map((l) => <LocCard key={l.id} loc={l} know={h.know} />)}
      {locs.length === 0 && <p className="tiny muted">Nothing keyed in this hex.</p>}
    </section>
  )
}
