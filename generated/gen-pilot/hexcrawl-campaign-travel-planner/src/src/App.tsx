import { useEffect, useMemo, useState } from 'react'
import HexMap from './components/HexMap'
import { Inspector, PartyCard, WeatherCard } from './components/LeftPanels'
import { PrepPanel, RoutePanel, SessionDrawer } from './components/RightPanels'
import { prepCandidates, routeStats, START, suggestRoute, TOWER } from './data/route'
import { neighbors } from './data/hexmath'
import { COUNTS, HEXES, SESSIONS } from './data/world'
import { LOCATIONS, PLAYERS, SATURDAY_PARTY } from './data/content'

const KEY = 'wayfarers-ledger-v1'
const DEFAULT_A = ['1004', '1104', '1204', '1305', '1405', '1406', '1407', '1408', '1409']
const DEFAULT_B = ['1004', '1105', '1205', '1306', '1307', '1407', '1408', '1409']
const DEFAULT_NOTES = {
  A: 'Most parties stick to the road, and Ilse’s Wardens sell a guide at the ford. The marsh slog at 1406 falls on days 6–8, after the rain. The rookery there was never keyed.',
  B: 'Shorter by a hex, but rain on days 2–3 lands on the 1306 slog and eats most of the saving. Runs past the Drowned Chapel and the Bogwife’s hummock.',
}

interface Persist { routes: { A: string[]; B: string[] }; notes: { A: string; B: string }; pins: string[]; forage: number; budget: number; active: 'A' | 'B' }

function load(): Persist {
  const def: Persist = { routes: { A: DEFAULT_A, B: DEFAULT_B }, notes: DEFAULT_NOTES, pins: [], forage: 0, budget: 4, active: 'A' }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return def
    return { ...def, ...JSON.parse(raw) }
  } catch { return def }
}

export default function App() {
  const init = useMemo(load, [])
  const [routes, setRoutes] = useState(init.routes)
  const [notes, setNotes] = useState(init.notes)
  const [pins, setPins] = useState<string[]>(init.pins)
  const [forage, setForage] = useState(init.forage)
  const [budget, setBudget] = useState(init.budget)
  const [active, setActive] = useState<'A' | 'B'>(init.active)
  const [mode, setMode] = useState<'inspect' | 'trace'>('inspect')
  const [selected, setSelected] = useState<string | null>(TOWER)
  const [fog, setFog] = useState(true)
  const [sites, setSites] = useState(true)
  const [reach, setReach] = useState(true)
  const [filterPlayer, setFilterPlayer] = useState<string | null>(null)
  const [sessionFocus, setSessionFocus] = useState<number | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [fit, setFit] = useState<{ id: number; box: 'region' | 'all' | 'route' }>({ id: 0, box: 'region' })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ routes, notes, pins, forage, budget, active }))
  }, [routes, notes, pins, forage, budget, active])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const stats = useMemo(() => ({ A: routeStats(routes.A, forage), B: routeStats(routes.B, forage) }), [routes, forage])
  const cands = useMemo(() => prepCandidates(routes.A, routes.B, forage), [routes, forage])
  const activeStats = stats[active]
  const setRoute = (r: 'A' | 'B', v: string[]) => setRoutes((p) => ({ ...p, [r]: v }))

  const traceTo = (target: string, r: 'A' | 'B' = active) => {
    const cur = routes[r].length ? routes[r] : [START]
    const last = cur[cur.length - 1]
    const idx = cur.indexOf(target)
    if (target === last && cur.length > 1) { setRoute(r, cur.slice(0, -1)); setToast(`Route ${r}: removed ${target}`); return }
    if (idx >= 0) { setRoute(r, cur.slice(0, idx + 1)); setToast(`Route ${r}: trimmed back to ${target}`); return }
    if (neighbors(last).includes(target)) { setRoute(r, [...cur, target]); setToast(`Route ${r}: + ${target} (${HEXES.get(target)!.terrain})`); return }
    const path = suggestRoute(last, target, 'fast')
    setRoute(r, [...cur, ...path.slice(1)])
    setToast(`Route ${r}: added ${path.length - 1} hexes by the fastest way to ${target}`)
  }

  const onHex = (id: string) => {
    setSelected(id)
    if (mode === 'trace') traceTo(id)
  }
  const togglePin = (h: string) => setPins((p) => (p.includes(h) ? p.filter((x) => x !== h) : p.length >= 3 ? p : [...p, h]))
  const suggest = (m: 'fast' | 'safe') => {
    const p = suggestRoute(START, TOWER, m)
    setRoute(active, p)
    setToast(`Route ${active}: ${m === 'fast' ? 'fastest' : 'safest'} way is ${p.length - 1} hexes`)
  }
  const sessionPath = sessionFocus ? SESSIONS.find((s) => s.n === sessionFocus)?.path ?? null : null
  const runsOut = activeStats.runsOutHex ? { hex: activeStats.runsOutHex, day: activeStats.runsOutDay! } : null
  const lairs = LOCATIONS.filter((l) => l.kind === 'lair').length
  const camps = LOCATIONS.filter((l) => l.kind === 'camp').length

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><path d="M16 2l12 7v14l-12 7-12-7V9z" fill="#8c2f2b" /><path d="M16 9l6 3.5v7L16 23l-6-3.5v-7z" fill="#f4efe4" /></svg>
          <span className="brand-t">Wayfarer’s Ledger</span>
        </div>
        <div className="region"><b>The Ashen March</b><span className="muted"> · 432 hexes</span></div>
        <div className="plan">
          <span className="eyebrow">Saturday’s plan</span>
          <span className="ellip">Greyhollow <span className="mono">1004</span> → tower <span className="mono">1409</span>, across the Mirefen</span>
        </div>
        <div className="top-stats">
          <span><b>{COUNTS.explored}</b> explored</span>
          <span><b>{COUNTS.rumored}</b> rumored</span>
          <span><b>{COUNTS.unknown}</b> unknown</span>
          <span className="sep" />
          <span><b>{LOCATIONS.length}</b> keyed · <b>{lairs}</b> lairs · <b>{camps}</b> camps</span>
        </div>
        <button className="btn" onClick={() => setDrawer((d) => !d)}>Session log · {SESSIONS.length}</button>
      </header>

      <aside className="left">
        <PartyCard forage={forage} setForage={setForage} />
        <WeatherCard />
        <Inspector hex={selected} pinned={!!selected && pins.includes(selected)} canPin={pins.length < 3}
          onPin={() => selected && togglePin(selected)} onTrace={() => selected && (traceTo(selected), setMode('inspect'))} active={active} />
      </aside>

      <main className="center">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Map mode">
            <button className={mode === 'inspect' ? 'on' : ''} onClick={() => setMode('inspect')}>Inspect</button>
            <button className={mode === 'trace' ? 'on' : ''} onClick={() => setMode('trace')}>Trace {active}</button>
          </div>
          <div className="chips-t" role="group" aria-label="Map layers">
            <label className={fog ? 'on' : ''}><input type="checkbox" checked={fog} onChange={(e) => setFog(e.target.checked)} />Knowledge</label>
            <label className={sites ? 'on' : ''}><input type="checkbox" checked={sites} onChange={(e) => setSites(e.target.checked)} />Sites</label>
            <label className={reach ? 'on' : ''}><input type="checkbox" checked={reach} onChange={(e) => setReach(e.target.checked)} />Lair reach</label>
          </div>
          <label className="sel-w">Seen by
            <select value={filterPlayer ?? ''} onChange={(e) => setFilterPlayer(e.target.value || null)}>
              <option value="">Anyone</option>
              {SATURDAY_PARTY.map((id) => <option key={id} value={id}>{PLAYERS.find((p) => p.id === id)!.name}</option>)}
            </select>
          </label>
          <span className="grow-s" />
          <div className="seg" role="group" aria-label="Zoom to">
            <button onClick={() => setFit((f) => ({ id: f.id + 1, box: 'route' }))}>Routes</button>
            <button onClick={() => setFit((f) => ({ id: f.id + 1, box: 'region' }))}>Frontier</button>
            <button onClick={() => setFit((f) => ({ id: f.id + 1, box: 'all' }))}>All</button>
          </div>
        </div>
        <HexMap routeA={routes.A} routeB={routes.B} active={active} mode={mode} selected={selected} fog={fog} sites={sites} reach={reach}
          filterPlayer={filterPlayer} sessionPath={sessionPath} pins={pins} runsOut={runsOut} onHex={onHex} fitSignal={fit} />
        {toast && <div className="toast" role="status">{toast}</div>}
        {sessionFocus && <div className="focus-banner">Showing session #{sessionFocus}: {SESSIONS.find((s) => s.n === sessionFocus)!.title} <button onClick={() => setSessionFocus(null)}>Clear</button></div>}
        <footer className="legend" title="* River and mountain costs are not in the ruleset; 2 and 3 are assumed.">
          {([['plains', 1], ['road', 1], ['forest', 2], ['hills', 2], ['marsh', 3], ['river', '2*'], ['mountains', '3*']] as const).map(([t, c]) => (
            <span key={t} className="lg"><i className="sw" style={{ background: `var(--t-${t})` }} />{t} {c}</span>
          ))}
          <span className="lg"><i className="sw solid" />explored</span>
          <span className="lg"><i className="sw hatch" />rumored</span>
          <span className="lg"><i className="sw fogged" />unknown</span>
        </footer>
      </main>

      <aside className="right">
        <RoutePanel active={active} setActive={setActive} stats={stats} mode={mode} setMode={setMode}
          onUndo={() => routes[active].length > 1 && traceTo(routes[active][routes[active].length - 1])}
          onClear={() => { setRoute(active, [START]); setToast(`Route ${active} cleared`) }}
          onSuggest={suggest} note={notes[active]} setNote={(s) => setNotes((n) => ({ ...n, [active]: s }))}
          selected={selected} onSelect={setSelected} />
        <PrepPanel cands={cands} pins={pins} togglePin={togglePin} budget={budget} setBudget={setBudget} onSelect={setSelected} selected={selected} />
        <SessionDrawer open={drawer} onClose={() => setDrawer(false)} focus={sessionFocus} setFocus={setSessionFocus} />
      </aside>
    </div>
  )
}
