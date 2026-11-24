import { CAPITAL, COUNTIES, W, H } from '../data/geo.js'
import { TOWNS } from '../data/gen.js'
import { STATUS } from '../utils.js'

const OUTLINE = '30,70 180,28 420,40 640,22 860,58 960,150 972,330 946,520 870,640 640,676 420,664 200,676 66,610 28,430 40,250'
const R = (min) => min / 0.4
export default function MapView({ rows, hotId, onHover, onOpen, shortlistIds, maxDrive, refLoc }) {
  const ring = (m) => <circle key={m} cx={CAPITAL.x} cy={CAPITAL.y} r={R(m)} className={'ring' + (m === maxDrive ? ' ring-main' : '')} />
  return (
    <div className="map-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="map" role="img" aria-label="Map of candidates relative to the Capitol">
        <polygon points={OUTLINE} className="state" />
        {TOWNS.filter((t) => t.seat).map((t) => <circle key={t.name} cx={t.x} cy={t.y} r="2.2" className="seat" />)}
        {[30, 60, 90, 120].map(ring)}
        {[30, 60, 90, 120].map((m) => <text key={m} x={CAPITAL.x + R(m) * 0.707 + 3} y={CAPITAL.y - R(m) * 0.707 - 3} className="ring-l">{m} min</text>)}
        <g>
          <circle cx={CAPITAL.x} cy={CAPITAL.y} r="9" className="cap" />
          <text x={CAPITAL.x + 14} y={CAPITAL.y + 4} className="cap-l">Capitol, Ellery</text>
        </g>
        {refLoc && <g><rect x={refLoc.x - 6} y={refLoc.y - 6} width="12" height="12" transform={`rotate(45 ${refLoc.x} ${refLoc.y})`} className="refpin" /><text x={refLoc.x + 12} y={refLoc.y - 8} className="ref-l">{refLoc.name.replace(' County Courthouse', '')} (reference)</text></g>}
        {rows.map((r, i) => {
          const l = r.loc, on = hotId === l.id, sl = shortlistIds.has(l.id)
          return (
            <g key={l.id} className={'pin st-' + STATUS[l.contact.status].cls + (on ? ' hot' : '') + (sl ? ' sl' : '')} transform={`translate(${l.x} ${l.y})`} onMouseEnter={() => onHover(l.id)} onMouseLeave={() => onHover(null)} onClick={() => onOpen(l.id)} tabIndex="0" onKeyDown={(e) => e.key === 'Enter' && onOpen(l.id)} role="button" aria-label={`${i + 1}. ${l.name}`}>
              <circle r={on ? 15 : 12} />
              <text y="4" textAnchor="middle">{i + 1}</text>
            </g>
          )
        })}
      </svg>
      <div className="map-legend">
        <span><i className="lg lg-ok" />Owner active</span><span><i className="lg lg-warn" />Unresponsive</span><span><i className="lg lg-bad" />Declined</span><span><i className="lg lg-sl" />Shortlisted</span>
        <span className="dim">Rings are straight-line estimates of drive time; listed times use road routing.</span>
      </div>
    </div>
  )
}
