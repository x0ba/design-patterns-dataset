import { memo, type ReactNode } from 'react'
import { hashStr, mulberry32 } from '../data/rng'
import type { Project, Sheet } from '../data/types'
import { FIRM_SHORT } from '../data/vocab'

const INK = '#23262a'
const W = 360
const H = 240
const TB = 66 // title block width

function wrap(s: string, n: number) {
  const out: string[] = []
  let line = ''
  for (const w of s.split(' ')) {
    if ((line + ' ' + w).trim().length > n) {
      out.push(line.trim())
      line = w
    } else line += ' ' + w
  }
  if (line.trim()) out.push(line.trim())
  return out
}

function notesFor(p: Project) {
  const panel = (p.panel ?? p.materials[0]).toUpperCase()
  const support = (p.support ?? 'Steel support framing').toUpperCase()
  const struct = p.materials.find((m) => m.includes('concrete'))?.toUpperCase() ?? 'STRUCTURAL SLAB'
  return [panel, support, struct, 'SS THRU-BOLT W/ NEOPRENE ISOLATOR', '1/2" SEALANT JOINT W/ BACKER ROD', 'SLOTTED CLIP — ±3/4" ADJ.', 'DRIP EDGE, MATCH PANEL FINISH']
}

interface Props {
  sheet: Sheet
  project: Project
  detailed?: boolean
  className?: string
}

function SheetImageInner({ sheet, project, detailed = false, className }: Props) {
  const r = mulberry32(hashStr(sheet.id))
  const uid = sheet.id.replace(/[^a-z0-9]/gi, '')
  const notes = notesFor(project)
  const t = sheet.title.toLowerCase()
  const area = { x: 8, y: 8, w: W - TB - 16, h: H - 16 }

  let body: ReactNode
  if (sheet.kind === 'Elevation') body = elevation(area, project, r, uid, sheet.scale)
  else if (sheet.kind === 'Schedule') body = schedule(area, project, r)
  else if (sheet.kind === 'Section' || t.includes('section')) body = section(area, notes, r, uid, detailed)
  else if (t.includes('corner') || t.includes('return') || t.includes('core')) body = planDetail(area, notes, r, uid, detailed)
  else body = details(area, notes, r, uid, detailed)

  const titleLines = wrap(sheet.title.toUpperCase(), 17).slice(0, 4)
  const projLines = wrap(project.name.toUpperCase(), 19).slice(0, 3)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Sheet ${sheet.number}: ${sheet.title}`}>
      <defs>
        <pattern id={`hatch-${uid}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke={INK} strokeWidth="0.35" />
        </pattern>
        <pattern id={`conc-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.45" fill={INK} />
          <circle cx="6" cy="5" r="0.35" fill={INK} />
          <path d="M4 7 l1 -1.2 l1 1.2 z" fill="none" stroke={INK} strokeWidth="0.3" />
        </pattern>
        <pattern id={`ins-${uid}`} width="6" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 2 Q1.5 0 3 2 T6 2" fill="none" stroke={INK} strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="#fbfaf7" />
      <rect x={4} y={4} width={W - 8} height={H - 8} fill="none" stroke={INK} strokeWidth={0.8} />
      <g>{body}</g>
      {/* title block */}
      <g transform={`translate(${W - TB - 4},4)`} fontFamily="Helvetica Neue, Arial, sans-serif" fill={INK}>
        <rect width={TB} height={H - 8} fill="none" stroke={INK} strokeWidth={0.8} />
        <text x={6} y={14} fontSize={9} fontWeight={700} letterSpacing={1}>
          {FIRM_SHORT}
        </text>
        <text x={6} y={21} fontSize={3.2}>
          HALVORSEN KESSLER LINDQVIST
        </text>
        <line x1={0} y1={27} x2={TB} y2={27} stroke={INK} strokeWidth={0.4} />
        {projLines.map((l, i) => (
          <text key={i} x={6} y={35 + i * 5} fontSize={3.6} fontWeight={600}>
            {l}
          </text>
        ))}
        <text x={6} y={36 + projLines.length * 5 + 2} fontSize={3.4}>
          PROJECT NO. {project.id}
        </text>
        <line x1={0} y1={62} x2={TB} y2={62} stroke={INK} strokeWidth={0.4} />
        {['ISSUED FOR CONSTRUCTION', sheet.issued].map((l, i) => (
          <text key={i} x={6} y={70 + i * 5} fontSize={3.3}>
            {l}
          </text>
        ))}
        {[0, 1, 2].map((i) => (
          <line key={i} x1={6} y1={88 + i * 7} x2={TB - 6} y2={88 + i * 7} stroke={INK} strokeWidth={0.25} />
        ))}
        <line x1={0} y1={118} x2={TB} y2={118} stroke={INK} strokeWidth={0.4} />
        {titleLines.map((l, i) => (
          <text key={i} x={6} y={128 + i * 6} fontSize={4.4} fontWeight={600}>
            {l}
          </text>
        ))}
        <text x={6} y={160} fontSize={3.3}>
          SCALE: {sheet.scale}
        </text>
        <line x1={0} y1={192} x2={TB} y2={192} stroke={INK} strokeWidth={0.4} />
        <text x={6} y={222} fontSize={17} fontWeight={700}>
          {sheet.number}
        </text>
      </g>
    </svg>
  )
}

export const SheetImage = memo(SheetImageInner)

type Area = { x: number; y: number; w: number; h: number }

function label(x: number, y: number, n: string, title: string, scale = '') {
  return (
    <g fontFamily="Helvetica Neue, Arial, sans-serif" fill={INK}>
      <circle cx={x + 5} cy={y} r={5} fill="none" stroke={INK} strokeWidth={0.6} />
      <line x1={x} y1={y} x2={x + 10} y2={y} stroke={INK} strokeWidth={0.4} />
      <text x={x + 5} y={y - 1.2} fontSize={3.6} textAnchor="middle" fontWeight={700}>
        {n}
      </text>
      <text x={x + 13} y={y + 1} fontSize={4} fontWeight={700}>
        {title}
      </text>
      {scale && (
        <text x={x + 13} y={y + 6} fontSize={3}>
          {scale}
        </text>
      )}
    </g>
  )
}

function leader(x1: number, y1: number, x2: number, y2: number, text: string, show: boolean, anchor: 'start' | 'end' = 'start') {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={0.35} />
      <circle cx={x1} cy={y1} r={0.7} fill={INK} />
      {show ? (
        <text x={x2 + (anchor === 'start' ? 1.5 : -1.5)} y={y2 + 1.2} fontSize={3.1} fontFamily="Helvetica Neue, Arial, sans-serif" fill={INK} textAnchor={anchor}>
          {text}
        </text>
      ) : (
        <line x1={x2 + (anchor === 'start' ? 1.5 : -1.5)} y1={y2} x2={x2 + (anchor === 'start' ? 26 : -26)} y2={y2} stroke={INK} strokeWidth={0.9} opacity={0.5} />
      )}
    </g>
  )
}

function spandrelDetail(ox: number, oy: number, s: number, notes: string[], uid: string, show: boolean) {
  // section through precast spandrel, girt and screen panel
  return (
    <g transform={`translate(${ox},${oy}) scale(${s})`}>
      <rect x={0} y={10} width={22} height={60} fill={`url(#conc-${uid})`} stroke={INK} strokeWidth={0.7} />
      <rect x={-30} y={60} width={52} height={10} fill={`url(#conc-${uid})`} stroke={INK} strokeWidth={0.7} />
      <rect x={22} y={24} width={3} height={8} fill={INK} />
      <rect x={22} y={52} width={3} height={8} fill={INK} />
      <path d={`M25 26 h10 v4 h-7 v24 h7 v4 h-10 z`} fill="none" stroke={INK} strokeWidth={0.8} />
      <line x1={38} y1={4} x2={38} y2={84} stroke={INK} strokeWidth={1.3} />
      {Array.from({ length: 14 }, (_, i) => (
        <line key={i} x1={37.2} y1={7 + i * 5.6} x2={38.8} y2={7 + i * 5.6} stroke="#fbfaf7" strokeWidth={0.9} />
      ))}
      <line x1={22} y1={28} x2={40} y2={28} stroke={INK} strokeWidth={0.5} strokeDasharray="1 0.8" />
      <line x1={22} y1={56} x2={40} y2={56} stroke={INK} strokeWidth={0.5} strokeDasharray="1 0.8" />
      {leader(38, 14, 52, 8, notes[0], show)}
      {leader(31, 30, 52, 20, notes[1], show)}
      {leader(10, 44, -14, 36, notes[2], show, 'end')}
      {leader(24, 56, 52, 64, notes[3], show)}
      {leader(38, 82, 52, 78, notes[6], show)}
      <g stroke={INK} strokeWidth={0.3}>
        <line x1={22} y1={92} x2={38} y2={92} />
        <line x1={22} y1={89} x2={22} y2={95} />
        <line x1={38} y1={89} x2={38} y2={95} />
      </g>
      {show && (
        <text x={30} y={98} fontSize={3} textAnchor="middle" fontFamily="Helvetica Neue, Arial, sans-serif" fill={INK}>
          6 1/2"
        </text>
      )}
    </g>
  )
}

function details(a: Area, notes: string[], r: () => number, uid: string, show: boolean) {
  const n2 = r() < 0.5
  return (
    <g>
      {spandrelDetail(a.x + 52, a.y + 12, 1.55, notes, uid, show)}
      {label(a.x + 10, a.y + a.h - 14, '1', 'SECTION AT SPANDREL', '3" = 1\'-0"')}
      <g transform={`translate(${a.x + 200},${a.y + 30})`}>
        <rect x={0} y={0} width={60} height={40} fill="none" stroke={INK} strokeWidth={0.7} />
        <rect x={4} y={4} width={52} height={32} fill={`url(#hatch-${uid})`} stroke={INK} strokeWidth={0.4} />
        <circle cx={10} cy={10} r={2} fill="none" stroke={INK} strokeWidth={0.6} />
        <circle cx={50} cy={10} r={2} fill="none" stroke={INK} strokeWidth={0.6} />
        <circle cx={10} cy={30} r={2} fill="none" stroke={INK} strokeWidth={0.6} />
        <circle cx={50} cy={30} r={2} fill="none" stroke={INK} strokeWidth={0.6} />
        {n2 && <line x1={30} y1={-6} x2={30} y2={46} stroke={INK} strokeWidth={0.4} strokeDasharray="4 1 1 1" />}
        {leader(50, 10, 66, 0, notes[5], show)}
        {leader(56, 30, 66, 48, notes[4], show)}
      </g>
      {label(a.x + 190, a.y + a.h - 14, '2', n2 ? 'CLIP PLATE — ELEVATION' : 'EMBED PLATE', '6" = 1\'-0"')}
    </g>
  )
}

function planDetail(a: Area, notes: string[], _r: () => number, uid: string, show: boolean) {
  const ox = a.x + 70
  const oy = a.y + 40
  return (
    <g>
      <path d={`M${ox} ${oy} h90 v22 h-68 v80 h-22 z`} fill={`url(#conc-${uid})`} stroke={INK} strokeWidth={0.8} />
      <path d={`M${ox - 10} ${oy - 10} h110 M${ox - 10} ${oy - 10} v120`} stroke={INK} strokeWidth={1.6} fill="none" />
      <path d={`M${ox - 4} ${oy - 4} h104 M${ox - 4} ${oy - 4} v114`} stroke={INK} strokeWidth={0.4} fill="none" strokeDasharray="2 1" />
      {[20, 50, 80].map((d) => (
        <rect key={d} x={ox + d} y={oy - 8} width={3} height={8} fill={INK} />
      ))}
      {[30, 70].map((d) => (
        <rect key={d} x={ox - 8} y={oy + d} width={8} height={3} fill={INK} />
      ))}
      {leader(ox + 60, oy - 10, ox + 120, oy - 26, notes[0], show)}
      {leader(ox + 21, oy - 4, ox + 120, oy - 14, notes[1], show)}
      {leader(ox + 40, oy + 12, ox + 120, oy + 40, notes[2], show)}
      {leader(ox - 10, oy - 10, ox - 30, oy - 26, 'CORNER CLOSURE, BENT PLATE', show, 'end')}
      {label(a.x + 10, a.y + a.h - 14, '1', 'PLAN DETAIL AT CORNER', '3" = 1\'-0"')}
    </g>
  )
}

function section(a: Area, notes: string[], r: () => number, uid: string, show: boolean) {
  const ox = a.x + 40
  const base = a.y + a.h - 40
  const fl = 3 + Math.floor(r() * 3)
  const fh = (a.h - 70) / fl
  return (
    <g>
      <rect x={a.x + 10} y={base} width={a.w - 20} height={14} fill={`url(#hatch-${uid})`} />
      <line x1={a.x + 10} y1={base} x2={a.x + a.w - 10} y2={base} stroke={INK} strokeWidth={1} />
      {Array.from({ length: fl }, (_, i) => (
        <g key={i}>
          <rect x={ox} y={base - (i + 1) * fh} width={150} height={4} fill={`url(#conc-${uid})`} stroke={INK} strokeWidth={0.6} />
          <rect x={ox + 150} y={base - (i + 1) * fh - 8} width={5} height={12} fill={`url(#conc-${uid})`} stroke={INK} strokeWidth={0.6} />
          <text x={ox - 4} y={base - (i + 1) * fh + 3} fontSize={3} textAnchor="end" fontFamily="Helvetica Neue, Arial, sans-serif" fill={INK}>
            {show ? `LEVEL ${i + 2}` : ''}
          </text>
        </g>
      ))}
      {[0, 75, 145].map((x) => (
        <rect key={x} x={ox + x} y={base - fl * fh} width={5} height={fl * fh} fill="none" stroke={INK} strokeWidth={0.6} />
      ))}
      <line x1={ox + 164} y1={base - fl * fh - 8} x2={ox + 164} y2={base} stroke={INK} strokeWidth={1.4} />
      {leader(ox + 164, base - fl * fh + 10, ox + 180, base - fl * fh, notes[0], show)}
      {leader(ox + 155, base - fh - 4, ox + 180, base - fh + 6, notes[1], show)}
      {label(a.x + 10, a.y + 12, '1', 'BUILDING SECTION AT SCREEN', '1 1/2" = 1\'-0"')}
    </g>
  )
}

function elevation(a: Area, p: Project, r: () => number, uid: string, scale: string) {
  const cols = 6
  const rows = Math.min(Math.max(p.levels, 3), 6)
  const ox = a.x + 16
  const oy = a.y + 30
  const cw = (a.w - 40) / cols
  const rh = (a.h - 70) / rows
  const perf = p.materials.includes('Perforated metal') || p.materials.includes('Expanded metal mesh') || p.materials.includes('Folded steel plate')
  const seed = hashStr(p.id) % 100
  return (
    <g>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <g key={i}>
          <line x1={ox + i * cw} y1={oy - 14} x2={ox + i * cw} y2={oy + rows * rh + 6} stroke={INK} strokeWidth={0.3} strokeDasharray="4 1 1 1" />
          <circle cx={ox + i * cw} cy={oy - 19} r={4.2} fill="none" stroke={INK} strokeWidth={0.5} />
          <text x={ox + i * cw} y={oy - 17.6} fontSize={3.8} textAnchor="middle" fontFamily="Helvetica Neue, Arial, sans-serif" fill={INK}>
            {i + 1}
          </text>
        </g>
      ))}
      {Array.from({ length: rows }, (_, j) =>
        Array.from({ length: cols }, (_, i) => {
          const x = ox + i * cw + 1
          const y = oy + j * rh + 1
          return (
            <g key={`${i}-${j}`}>
              <rect x={x} y={y} width={cw - 2} height={rh - 2} fill="none" stroke={INK} strokeWidth={0.6} />
              {perf &&
                Array.from({ length: 7 }, (_, u) =>
                  Array.from({ length: 4 }, (_, v) => {
                    const gu = (i * 7 + u) / (cols * 7)
                    const gv = (j * 4 + v) / (rows * 4)
                    const f = p.pattern === 'perf-gradient' ? 0.5 + 0.3 * Math.sin(gu * 7 + seed / 16 + Math.sin(gv * 3) * 1.6) + 0.2 * Math.cos(gv * 5 - gu * 2.4) : 0.6
                    return <circle key={`${u}-${v}`} cx={x + 3 + u * ((cw - 6) / 6)} cy={y + 3 + v * ((rh - 6) / 3)} r={0.3 + Math.max(0, f) * 1.1} fill={INK} />
                  }),
                )}
              {!perf && <rect x={x + 3} y={y + 3} width={cw - 8} height={rh - 8} fill={`url(#hatch-${uid})`} opacity={0.6} />}
              {r() < 0.12 && (
                <text x={x + 2} y={y + rh - 4} fontSize={2.8} fontFamily="Helvetica Neue, Arial, sans-serif" fill={INK}>
                  {`P-${String.fromCharCode(65 + j)}${i + 1}`}
                </text>
              )}
            </g>
          )
        }),
      )}
      <line x1={a.x + 6} y1={oy + rows * rh + 8} x2={a.x + a.w - 6} y2={oy + rows * rh + 8} stroke={INK} strokeWidth={1.1} />
      {label(a.x + 10, a.y + a.h - 10, '1', 'SCREEN ELEVATION — NORTH', scale)}
    </g>
  )
}

function schedule(a: Area, p: Project, r: () => number) {
  const ox = a.x + 10
  const oy = a.y + 16
  const rows = 14
  const types = ['A', 'B', 'C', 'D', 'E', 'F']
  return (
    <g fontFamily="Helvetica Neue, Arial, sans-serif" fill={INK}>
      <text x={ox} y={oy - 4} fontSize={4.4} fontWeight={700}>
        PANEL SCHEDULE
      </text>
      <rect x={ox} y={oy} width={120} height={rows * 9 + 9} fill="none" stroke={INK} strokeWidth={0.6} />
      {['TYPE', 'SIZE', 'OPEN %', 'QTY'].map((h, i) => (
        <text key={h} x={ox + 3 + i * 30} y={oy + 6} fontSize={3.2} fontWeight={700}>
          {h}
        </text>
      ))}
      {Array.from({ length: rows }, (_, j) => (
        <g key={j}>
          <line x1={ox} y1={oy + 9 + j * 9} x2={ox + 120} y2={oy + 9 + j * 9} stroke={INK} strokeWidth={0.25} />
          <text x={ox + 3} y={oy + 15 + j * 9} fontSize={3}>{`P-${types[j % 6]}${Math.floor(j / 6) + 1}`}</text>
          <text x={ox + 33} y={oy + 15 + j * 9} fontSize={3}>{`4'-0" × ${8 + (j % 4) * 2}'-0"`}</text>
          <text x={ox + 63} y={oy + 15 + j * 9} fontSize={3}>{`${18 + ((j * 7) % 25)}%`}</text>
          <text x={ox + 93} y={oy + 15 + j * 9} fontSize={3}>{`${20 + Math.floor(r() * 140)}`}</text>
        </g>
      ))}
      <g transform={`translate(${ox + 136},${oy})`}>
        <text x={0} y={-4} fontSize={4.4} fontWeight={700}>
          PERFORATION MAP
        </text>
        <rect width={130} height={86} fill="none" stroke={INK} strokeWidth={0.6} />
        {Array.from({ length: 26 }, (_, i) =>
          Array.from({ length: 17 }, (_, j) => {
            const u = i / 26
            const v = j / 17
            const f = 0.5 + 0.3 * Math.sin(u * 7 + (hashStr(p.id) % 100) / 16 + Math.sin(v * 3) * 1.6) + 0.2 * Math.cos(v * 5 - u * 2.4)
            return <circle key={`${i}-${j}`} cx={3 + i * 4.9 + (j % 2) * 2.4} cy={3 + j * 4.9} r={0.25 + Math.max(0, Math.min(1, f)) * 1.8} fill={INK} />
          }),
        )}
        <text x={0} y={96} fontSize={3}>
          HOLE Ø 3/16" – 9/16", 60° STAGGER. OPEN AREA {p.openArea ?? 'PER PANEL TYPE'}
        </text>
      </g>
    </g>
  )
}
