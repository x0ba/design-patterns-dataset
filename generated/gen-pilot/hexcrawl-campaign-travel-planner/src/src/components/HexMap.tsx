import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COLS, ROWS, SQRT3, allHexIds, center, hexPoints, parseHex } from '../data/hexmath'
import { HEXES, LAIR_REACH } from '../data/world'
import { FACTIONS, LOCATIONS } from '../data/content'
import { PLAYER_HEXES } from '../data/route'
import type { Loc, Terrain } from '../data/types'

const S = 40
export const WORLD_W = S * (1.5 * (COLS - 1) + 2)
export const WORLD_H = S * SQRT3 * (ROWS + 1)

export const TERRAIN_FILL: Record<Terrain, string> = {
  plains: '#ebe2b9', forest: '#b4c595', marsh: '#a3bcae', hills: '#d6bf90',
  mountains: '#bdb7ab', river: '#9ec6d6', road: '#e4d5a6',
}
const INK = 'rgba(52,44,32,0.55)'

function Glyph({ t, x, y }: { t: Terrain; x: number; y: number }) {
  const p = { fill: 'none', stroke: INK, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (t) {
    case 'forest':
      return <g transform={`translate(${x},${y})`}><path {...p} d="M-9,6 L-4.5,-4 L0,6 M0,6 L4.5,-6 L9,6 M-4.5,-4 l0,0" /></g>
    case 'marsh':
      return <g transform={`translate(${x},${y})`}><path {...p} d="M-11,-3 q3,-3 5.5,0 t5.5,0 t5.5,0 M-9,4 q3,-3 5.5,0 t5.5,0 t5,0" /></g>
    case 'hills':
      return <g transform={`translate(${x},${y})`}><path {...p} d="M-12,6 q6,-14 12,0 M-2,6 q6,-10 12,0" /></g>
    case 'mountains':
      return <g transform={`translate(${x},${y})`}><path {...p} d="M-12,7 L-5,-6 L0,2 L5,-9 L12,7 Z" fill="rgba(255,255,255,0.35)" /></g>
    case 'river':
      return <g transform={`translate(${x},${y})`}><path {...p} stroke="#3c7a96" d="M-12,-2 q3,-4 6,0 t6,0 t6,0 M-12,5 q3,-4 6,0 t6,0 t6,0" /></g>
    case 'road':
      return <g transform={`translate(${x},${y})`}><path {...p} stroke="#8a6a3a" strokeDasharray="3 3.5" d="M-14,0 L14,0" /></g>
    default:
      return <g transform={`translate(${x},${y})`}><path {...p} strokeWidth={1.2} d="M-8,3 l2,-3 M-1,5 l2,-3 M6,2 l2,-3" /></g>
  }
}

function Marker({ loc, x, y, dim, factionColor }: { loc: Loc; x: number; y: number; dim: boolean; factionColor?: string }) {
  const o = dim ? 0.62 : 1
  const ink = '#2a2520'
  const dash = dim ? '2.5 2' : undefined
  const g = (children: React.ReactNode) => <g transform={`translate(${x},${y})`} opacity={o}>{children}</g>
  switch (loc.kind) {
    case 'lair':
      return g(<>
        <circle r={9.5} fill="#9a2f2a" stroke="#fff6e8" strokeWidth={1.6} strokeDasharray={dash} />
        <text y={4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="#fff6e8" fontFamily="var(--mono)">{loc.threat}</text>
      </>)
    case 'camp':
      return g(<>
        <path d="M-9,7 L0,-8 L9,7 Z" fill={factionColor} stroke="#fff6e8" strokeWidth={1.6} strokeDasharray={dash} />
        <path d="M0,-8 L0,7" stroke="#fff6e8" strokeWidth={1.2} />
      </>)
    case 'settlement':
      return g(<>
        <path d="M-8,6 L-8,-1 L0,-8 L8,-1 L8,6 Z" fill="#f6efdd" stroke={ink} strokeWidth={1.6} strokeDasharray={dash} />
        <rect x={-2} y={0} width={4} height={6} fill={ink} />
      </>)
    case 'ruin':
      return g(<>
        <path d="M-7,7 L-7,-3 L-3,-8 L-1,-3 L1,-6 L3,-2 L7,-2 L7,7 Z" fill="#f0e6d0" stroke={ink} strokeWidth={1.5} strokeDasharray={dash} />
      </>)
    case 'shrine':
      return g(<path d="M0,-9 L7,0 L0,9 L-7,0 Z" fill="#f6efdd" stroke={ink} strokeWidth={1.6} strokeDasharray={dash} />)
    case 'hazard':
      return g(<>
        <path d="M0,-8 L9,7 L-9,7 Z" fill="#f3c24b" stroke={ink} strokeWidth={1.5} strokeDasharray={dash} />
        <text y={5.5} textAnchor="middle" fontSize={10} fontWeight={800} fill={ink}>!</text>
      </>)
    default:
      return g(<>
        <circle r={5.5} fill="#f6efdd" stroke={ink} strokeWidth={1.6} strokeDasharray={dash} />
        <circle r={1.8} fill={ink} />
      </>)
  }
}

export interface MapProps {
  routeA: string[]
  routeB: string[]
  active: 'A' | 'B'
  mode: 'inspect' | 'trace'
  selected: string | null
  fog: boolean
  sites: boolean
  reach: boolean
  filterPlayer: string | null
  sessionPath: string[] | null
  pins: string[]
  runsOut: { hex: string; day: number } | null
  onHex: (id: string) => void
  fitSignal: { id: number; box: 'region' | 'all' | 'route' }
}

export default function HexMap(props: MapProps) {
  const { routeA, routeB, active, mode, selected, fog, sites, reach, filterPlayer, sessionPath, pins, runsOut, onHex, fitSignal } = props
  const wrap = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 700 })
  const [view, setView] = useState({ cx: 0, cy: 0, k: 1 })
  const [hover, setHover] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null)

  useLayoutEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const fitBox = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const k = Math.min(size.w / (x1 - x0), size.h / (y1 - y0))
    setView({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, k })
  }, [size.w, size.h])

  useEffect(() => {
    if (size.w < 50) return
    const hexBox = (ids: string[], pad: number) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const id of ids) { const c = center(id, S); x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y) }
      fitBox(x0 - pad, y0 - pad, x1 + pad, y1 + pad)
    }
    if (fitSignal.box === 'all') fitBox(0, 0, WORLD_W, WORLD_H)
    else if (fitSignal.box === 'route') hexBox([...routeA, ...routeB], S * 2.4)
    else hexBox(['0802', '1802', '0811', '1811'], S * 1.2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal.id, size.w > 50])

  const onWheel = (e: React.WheelEvent) => {
    const rect = wrap.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    setView((v) => {
      const k = Math.max(0.45, Math.min(2.6, v.k * Math.exp(-e.deltaY * 0.0015)))
      const wx = v.cx + (mx - size.w / 2) / v.k, wy = v.cy + (my - size.h / 2) / v.k
      return { k, cx: wx - (mx - size.w / 2) / k, cy: wy - (my - size.h / 2) / k }
    })
  }
  useEffect(() => {
    const el = wrap.current!
    const stop = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', stop, { passive: false })
    return () => el.removeEventListener('wheel', stop)
  }, [])

  const ids = useMemo(() => allHexIds(), [])
  const radiusPx = S * view.k
  const showCoords = radiusPx >= 24
  const showNames = radiusPx >= 27

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
    if (d.moved) setView((v) => ({ ...v, cx: d.cx - dx / v.k, cy: d.cy - dy / v.k }))
  }
  const onUp = () => { setTimeout(() => { drag.current = null }, 0) }

  const zoomBy = (f: number) => setView((v) => ({ ...v, k: Math.max(0.45, Math.min(2.6, v.k * f)) }))

  const line = (r: string[]) => r.map((h) => { const c = center(h, S); return `${c.x},${c.y}` }).join(' ')
  const sess = sessionPath ? new Set(sessionPath) : null
  const reachMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const [h, arr] of LAIR_REACH) m.set(h, Math.max(...arr.map((a) => a.threat)))
    return m
  }, [])
  const locsByHex = useMemo(() => {
    const m = new Map<string, Loc>()
    for (const l of LOCATIONS) m.set(l.hex, l)
    return m
  }, [])
  const factionColor = (l: Loc) => FACTIONS.find((f) => f.id === l.faction)?.color

  const activeR = active === 'A' ? routeA : routeB
  const hoverHex = hover ? HEXES.get(hover) : null

  return (
    <div className="map-wrap" ref={wrap} data-mode={mode}>
      <svg width={size.w} height={size.h} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHover(null) }} onWheel={onWheel} role="img" aria-label="Hex map of the Ashen March">
        <defs>
          <pattern id="rumor-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#8b7f69" strokeWidth="1.2" opacity="0.35" />
          </pattern>
        </defs>
        <g transform={`translate(${size.w / 2 - view.cx * view.k} ${size.h / 2 - view.cy * view.k}) scale(${view.k})`}>
          {ids.map((id) => {
            const h = HEXES.get(id)!
            const c = center(id, S)
            const unknown = h.know === 'unknown', rum = h.know === 'rumored'
            const dimPlayer = filterPlayer ? !PLAYER_HEXES[filterPlayer].has(id) : false
            return (
              <g key={id} onClick={() => { if (!drag.current?.moved) onHex(id) }} onPointerEnter={() => setHover(id)} className="hex">
                <polygon points={hexPoints(c.x, c.y, S - 0.6)} fill={TERRAIN_FILL[h.terrain]} stroke="rgba(70,58,38,0.35)" strokeWidth={0.8} />
                <Glyph t={h.terrain} x={c.x} y={c.y - 3} />
                {fog && unknown && <polygon points={hexPoints(c.x, c.y, S - 0.6)} fill="#f3eee3" opacity={0.64} />}
                {fog && rum && <>
                  <polygon points={hexPoints(c.x, c.y, S - 0.6)} fill="#f3eee3" opacity={0.28} />
                  <polygon points={hexPoints(c.x, c.y, S - 0.6)} fill="url(#rumor-hatch)" />
                </>}
                {fog && h.know === 'explored' && <polygon points={hexPoints(c.x, c.y, S - 0.6)} fill="none" stroke="rgba(52,44,32,0.7)" strokeWidth={1.4} />}
                {reach && reachMap.has(id) && <polygon points={hexPoints(c.x, c.y, S - 0.6)} fill="#9a2f2a" opacity={0.04 + reachMap.get(id)! * 0.028} />}
                {dimPlayer && <polygon points={hexPoints(c.x, c.y, S - 0.6)} fill="#f3eee3" opacity={0.72} />}
                {sess?.has(id) && <polygon points={hexPoints(c.x, c.y, S - 3)} fill="rgba(43,90,138,0.18)" stroke="#2b5a8a" strokeWidth={2} />}
              </g>
            )
          })}

          {/* routes */}
          {[{ r: routeB, key: 'B' as const }, { r: routeA, key: 'A' as const }].map(({ r, key }) => (
            <g key={key} opacity={active === key ? 1 : 0.5} pointerEvents="none">
              <polyline points={line(r)} fill="none" stroke="#fff8ea" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
              <polyline points={line(r)} fill="none" stroke={key === 'A' ? '#8c2f2b' : '#2b5a8a'} strokeWidth={4.5}
                strokeDasharray={key === 'B' ? '11 7' : undefined} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          ))}
          {activeR.slice(1).map((h, i) => {
            const c = center(h, S)
            const col = active === 'A' ? '#8c2f2b' : '#2b5a8a'
            return (
              <g key={h} pointerEvents="none">
                <circle cx={c.x + S * 0.52} cy={c.y - S * 0.52} r={8.5} fill={col} stroke="#fff8ea" strokeWidth={1.6} />
                <text x={c.x + S * 0.52} y={c.y - S * 0.52 + 3.6} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#fff8ea" fontFamily="var(--mono)">{i + 1}</text>
              </g>
            )
          })}
          {(() => { const c = center(routeA[0] ?? '1004', S); return <circle cx={c.x} cy={c.y} r={13} fill="none" stroke="#26221d" strokeWidth={2.4} pointerEvents="none" /> })()}

          {/* sites */}
          {sites && ids.map((id) => {
            const loc = locsByHex.get(id)
            if (!loc) return null
            const h = HEXES.get(id)!
            const c = center(id, S)
            return (
              <g key={loc.id} pointerEvents="none">
                <Marker loc={loc} x={c.x} y={c.y + 3} dim={h.know !== 'explored'} factionColor={factionColor(loc)} />
                {showNames && (
                  <text x={c.x} y={c.y + S * 0.72} textAnchor="middle" fontSize={10.5} fill="#2a2520" className="map-name" opacity={h.know === 'explored' ? 1 : 0.7}>{loc.name}</text>
                )}
              </g>
            )
          })}

          {showCoords && ids.map((id) => {
            const c = center(id, S)
            const h = HEXES.get(id)!
            return <text key={id} x={c.x} y={c.y - S * 0.62} textAnchor="middle" fontSize={9.5} className="map-coord" fill={h.know === 'unknown' ? 'rgba(52,44,32,0.4)' : 'rgba(40,34,26,0.78)'} pointerEvents="none">{id}</text>
          })}

          {/* pins */}
          {pins.map((p) => {
            const c = center(p, S)
            return (
              <g key={p} transform={`translate(${c.x - S * 0.55},${c.y - S * 0.5})`} pointerEvents="none">
                <path d="M0,-9 L2.6,-3 L9,-2.6 L4,1.8 L5.6,8.2 L0,4.8 L-5.6,8.2 L-4,1.8 L-9,-2.6 L-2.6,-3 Z" fill="#d9a21a" stroke="#5b3d00" strokeWidth={1.3} />
              </g>
            )
          })}

          {runsOut && (() => {
            const c = center(runsOut.hex, S)
            return (
              <g pointerEvents="none">
                <circle cx={c.x - S * 0.5} cy={c.y + S * 0.35} r={9} fill="#c9791a" stroke="#fff8ea" strokeWidth={1.6} />
                <path d={`M${c.x - S * 0.5 - 4},${c.y + S * 0.35 - 4} l8,8 m0,-8 l-8,8`} stroke="#fff8ea" strokeWidth={2} strokeLinecap="round" />
              </g>
            )
          })()}

          {selected && (() => {
            const c = center(selected, S)
            return <polygon points={hexPoints(c.x, c.y, S - 1.5)} fill="none" stroke="#1d4f91" strokeWidth={3.4} pointerEvents="none" />
          })()}
          {hover && hover !== selected && (() => {
            const c = center(hover, S)
            return <polygon points={hexPoints(c.x, c.y, S - 1.5)} fill="rgba(255,255,255,0.18)" stroke="#26221d" strokeWidth={1.6} pointerEvents="none" />
          })()}
        </g>
      </svg>

      <div className="map-zoom">
        <button onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(0.8)} aria-label="Zoom out">−</button>
      </div>
      {hoverHex && (
        <div className="map-hover">
          <b className="mono">{hoverHex.id}</b> {hoverHex.terrain} · <span className={`k-${hoverHex.know}`}>{hoverHex.know}</span>
          {(() => { const l = locsByHex.get(hoverHex.id); return l && (hoverHex.know === 'explored' || true) ? <> · {l.name}</> : null })()}
        </div>
      )}
    </div>
  )
}

export { parseHex }
