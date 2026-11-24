import { useId, useRef } from 'react'
import type { Callout, Photo } from './types'

/* ---------- seven-segment digits for the gauge display ---------- */

const SEGS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
  '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
}

function bar(x: number, y: number, len: number, t: number, horiz: boolean): string {
  const h = t / 2
  const pts = horiz
    ? [[x + h, y], [x + len - h, y], [x + len, y + h], [x + len - h, y + t], [x + h, y + t], [x, y + h]]
    : [[x + h, y], [x + t, y + h], [x + t, y + len - h], [x + h, y + len], [x, y + len - h], [x, y + h]]
  return pts.map((p) => p.join(',')).join(' ')
}

function Digit({ ch, x, on, off }: { ch: string; x: number; on: string; off: string }) {
  const W = 38, H = 68, t = 7, g = 1.5
  const horizLen = W - 2 * g - 2
  const vertLen = H / 2 - t / 2 - 2 * g
  const geo: Record<string, string> = {
    a: bar(g + 1, 0, horizLen, t, true),
    g: bar(g + 1, H / 2 - t / 2, horizLen, t, true),
    d: bar(g + 1, H - t, horizLen, t, true),
    f: bar(0, g + t / 2, vertLen, t, false),
    b: bar(W - t, g + t / 2, vertLen, t, false),
    e: bar(0, H / 2 + g, vertLen, t, false),
    c: bar(W - t, H / 2 + g, vertLen, t, false),
  }
  const lit = SEGS[ch] ?? ''
  return (
    <g transform={`translate(${x} 0) skewX(-5)`}>
      {Object.entries(geo).map(([k, pts]) => (
        <polygon key={k} points={pts} fill={lit.includes(k) ? on : off} />
      ))}
    </g>
  )
}

function Readout({ text, pitch = 50 }: { text: string; pitch?: number }) {
  let x = 0
  const out = []
  for (const ch of text) {
    if (ch === '.') {
      out.push(<circle key={`dp${x}`} cx={x - 5} cy={63} r={4.6} fill="#1c2619" />)
      x += 8
    } else {
      out.push(<Digit key={x} ch={ch} x={x} on="#1c2619" off="rgba(60,75,50,0.13)" />)
      x += pitch
    }
  }
  return <>{out}</>
}

/* ---------- the two tablet "photos" ---------- */

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4a535b" />
        <stop offset="1" stopColor="#1d2226" />
      </linearGradient>
      <linearGradient id={`${id}steel`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#454c53" />
        <stop offset=".18" stopColor="#aab2b9" />
        <stop offset=".4" stopColor="#eef1f3" />
        <stop offset=".62" stopColor="#b6bec4" />
        <stop offset=".86" stopColor="#6a727a" />
        <stop offset="1" stopColor="#3c4248" />
      </linearGradient>
      <linearGradient id={`${id}steelV`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dfe4e8" />
        <stop offset=".5" stopColor="#9aa3ab" />
        <stop offset="1" stopColor="#5d656c" />
      </linearGradient>
      <linearGradient id={`${id}dark`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#101316" />
        <stop offset=".3" stopColor="#38404a" />
        <stop offset=".5" stopColor="#59636d" />
        <stop offset=".75" stopColor="#272e35" />
        <stop offset="1" stopColor="#0d1013" />
      </linearGradient>
      <linearGradient id={`${id}nut`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#6c6454" />
        <stop offset=".3" stopColor="#cbbf9f" />
        <stop offset=".5" stopColor="#f1e8d0" />
        <stop offset=".75" stopColor="#a89c80" />
        <stop offset="1" stopColor="#5a5343" />
      </linearGradient>
      <linearGradient id={`${id}plate`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d4dade" />
        <stop offset="1" stopColor="#7d858c" />
      </linearGradient>
      <linearGradient id={`${id}case`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#323a42" />
        <stop offset="1" stopColor="#171b1f" />
      </linearGradient>
      <radialGradient id={`${id}vig`} cx=".5" cy=".5" r=".75">
        <stop offset=".55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".5" />
      </radialGradient>
      <filter id={`${id}blur`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <filter id={`${id}soft`}>
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id={`${id}grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </defs>
  )
}

function Finish({ id }: { id: string }) {
  return (
    <>
      <rect width="600" height="300" filter={`url(#${id}grain)`} opacity=".16" style={{ mixBlendMode: 'overlay' }} />
      <rect width="600" height="300" fill={`url(#${id}vig)`} />
    </>
  )
}

function ChuckArt() {
  const id = useId().replace(/:/g, '')
  const u = (n: string) => `url(#${id}${n})`
  return (
    <svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Photo of the capper chuck assembly with the height gauge standing beneath it" className="art">
      <Defs id={id} />
      <rect width="600" height="300" fill={u('bg')} />
      <g filter={u('blur')}>
        <rect x="-30" y="-20" width="200" height="340" fill="#5d6973" />
        <rect x="138" y="-20" width="22" height="340" fill="#93a0ab" />
        <rect x="500" y="30" width="110" height="230" fill="#b8651f" opacity=".55" />
        <rect x="170" y="150" width="120" height="100" fill="#2a3138" opacity=".7" />
        <rect x="0" y="40" width="600" height="26" fill="#2b3238" opacity=".8" />
      </g>
      {/* bottle support plate */}
      <polygon points="0,246 600,246 600,300 0,300" fill={u('plate')} />
      <polygon points="0,246 600,246 600,254 0,254" fill="#eef2f4" opacity=".55" />
      <ellipse cx="372" cy="262" rx="70" ry="7" fill="#000" opacity=".28" filter={u('soft')} />
      {/* chuck assembly */}
      <rect x="233" y="-10" width="34" height="54" fill={u('steel')} />
      <rect x="222" y="34" width="56" height="9" rx="2" fill={u('steel')} />
      {/* lock nut */}
      <rect x="216" y="42" width="68" height="40" rx="5" fill={u('nut')} />
      <path d="M238.7 42v40M261.3 42v40" stroke="#3c3626" strokeOpacity=".35" strokeWidth="1.5" />
      <rect x="216" y="42" width="68" height="4" rx="2" fill="#fff" opacity=".35" />
      {/* threaded section */}
      <rect x="236" y="82" width="28" height="30" fill={u('steel')} />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="236" x2="264" y1={85 + i * 3.7} y2={86.5 + i * 3.7} stroke="#2e353b" strokeOpacity=".45" strokeWidth="1.2" />
      ))}
      {/* height scale collar */}
      <rect x="212" y="112" width="76" height="24" rx="3" fill={u('dark')} />
      {Array.from({ length: 13 }, (_, i) => (
        <line key={i} x1={218 + i * 5.4} x2={218 + i * 5.4} y1="114" y2={i % 4 === 0 ? 126 : 121} stroke="#e8edf0" strokeOpacity=".75" strokeWidth="1.2" />
      ))}
      {/* chuck body */}
      <rect x="222" y="136" width="56" height="32" fill={u('dark')} />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={228 + i * 5.5} x2={228 + i * 5.5} y1="138" y2="166" stroke="#000" strokeOpacity=".35" />
      ))}
      <polygon points="210,168 290,168 276,200 224,200" fill={u('steel')} />
      <rect x="224" y="200" width="52" height="8" rx="2" fill={u('dark')} />
      <ellipse cx="250" cy="208" rx="26" ry="3" fill="#000" opacity=".35" />
      {/* height gauge HG-02 */}
      <rect x="322" y="246" width="100" height="14" rx="2" fill={u('steel')} />
      <rect x="352" y="150" width="24" height="98" fill={u('steel')} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="352" x2={i % 2 ? 358 : 362} y1={156 + i * 7.5} y2={156 + i * 7.5} stroke="#1b2024" strokeOpacity=".55" />
      ))}
      <rect x="262" y="208" width="104" height="8" fill={u('steelV')} />
      <rect x="250" y="204" width="18" height="12" rx="2" fill={u('dark')} />
      <rect x="330" y="150" width="96" height="54" rx="7" fill={u('case')} stroke="#0b0d0f" />
      <rect x="338" y="158" width="64" height="26" rx="3" fill="#aeb99d" />
      <g transform="translate(345 162) scale(.265)">
        <Readout text="142.5" pitch={50} />
      </g>
      <circle cx="412" cy="170" r="5" fill="#d9671a" />
      <rect x="338" y="189" width="20" height="8" rx="2" fill="#5a636c" />
      <rect x="362" y="189" width="20" height="8" rx="2" fill="#5a636c" />
      <rect x="386" y="189" width="20" height="8" rx="2" fill="#5a636c" />
      <Finish id={id} />
    </svg>
  )
}

function GaugeArt() {
  const id = useId().replace(/:/g, '')
  const u = (n: string) => `url(#${id}${n})`
  return (
    <svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Close-up photo of the height gauge display reading 142.5 millimetres" className="art">
      <Defs id={id} />
      <rect width="600" height="300" fill={u('bg')} />
      <g filter={u('blur')}>
        <rect x="170" y="-30" width="260" height="90" fill="#aab3ba" opacity=".7" />
        <rect x="-20" y="250" width="640" height="70" fill="#9ca5ac" />
        <rect x="-10" y="60" width="90" height="200" fill="#5d6973" />
        <rect x="520" y="40" width="100" height="220" fill="#b8651f" opacity=".5" />
      </g>
      <ellipse cx="300" cy="284" rx="190" ry="12" fill="#000" opacity=".35" filter={u('soft')} />
      {/* display housing */}
      <rect x="128" y="22" width="344" height="256" rx="20" fill={u('case')} stroke="#0a0c0e" strokeWidth="2" />
      <rect x="134" y="28" width="332" height="244" rx="15" fill="none" stroke="#fff" strokeOpacity=".1" />
      <rect x="156" y="38" width="86" height="22" rx="3" fill="#d9671a" />
      <text x="165" y="54" fontFamily="'IBM Plex Mono', monospace" fontWeight="700" fontSize="15" fill="#fff">HG-02</text>
      {/* LCD */}
      <rect x="156" y="70" width="288" height="124" rx="8" fill="#0d1012" />
      <rect x="162" y="76" width="276" height="112" rx="5" fill="#b4c1a3" />
      <rect x="162" y="76" width="276" height="112" rx="5" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="3" />
      <g transform="translate(196 92)">
        <Readout text="142.5" pitch={52} />
      </g>
      <text x="408" y="160" fontFamily="'IBM Plex Mono', monospace" fontWeight="700" fontSize="17" fill="#1c2619">mm</text>
      <path d="M170 82L430 82" stroke="#fff" strokeOpacity=".22" strokeWidth="2" />
      {/* buttons */}
      {[['ZERO', 164], ['mm/in', 258], ['HOLD', 352]].map(([label, x]) => (
        <g key={label}>
          <rect x={x as number} y="212" width="82" height="36" rx="7" fill="#434c55" stroke="#0b0d0f" />
          <rect x={x as number} y="212" width="82" height="8" rx="4" fill="#fff" opacity=".12" />
          <text x={(x as number) + 41} y="236" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontWeight="600" fontSize="13" fill="#e3e8ec">{label}</text>
        </g>
      ))}
      <Finish id={id} />
    </svg>
  )
}

export function PhotoArt({ photo }: { photo: Photo }) {
  if (photo.kind === 'chuck') return <ChuckArt />
  if (photo.kind === 'gauge') return <GaugeArt />
  if (photo.src) return <img src={photo.src} alt={photo.caption} className="art" draggable={false} />
  return <div className="art art-missing">Photo is no longer on this screen</div>
}

/* ---------- photo with callout markup ---------- */

interface FrameProps {
  photo: Photo
  callouts: Callout[]
  numbers: Record<string, number>
  selectedId?: string | null
  highlightStepId?: string | null
  placing?: boolean
  readOnly?: boolean
  large?: boolean
  onSelectPhoto?: () => void
  onSelectCallout?: (id: string) => void
  onMoveCallout?: (id: string, x: number, y: number) => void
  onPlace?: (x: number, y: number) => void
}

export function PhotoFrame(p: FrameProps) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<string | null>(null)

  const pct = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect()
    return {
      x: Math.min(96, Math.max(4, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(94, Math.max(6, ((e.clientY - r.top) / r.height) * 100)),
    }
  }

  return (
    <div
      ref={ref}
      className={`pframe${p.placing ? ' placing' : ''}${p.large ? ' large' : ''}`}
      onPointerDown={(e) => {
        if (p.placing && p.onPlace) {
          const { x, y } = pct(e)
          p.onPlace(x, y)
          e.stopPropagation()
        } else {
          p.onSelectPhoto?.()
        }
      }}
    >
      <PhotoArt photo={p.photo} />
      {p.callouts.map((c) => {
        const dim = p.highlightStepId !== undefined && p.highlightStepId !== null && c.stepId !== p.highlightStepId
        return (
          <div
            key={c.id}
            className={`callout ${({ l: 'left', r: 'right', t: 'above', b: 'below' } as const)[c.side ?? (c.x > 55 ? 'l' : 'r')]}${p.selectedId === c.id ? ' sel' : ''}${dim ? ' dim' : ''}`}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
          >
            <span
              className="ring"
              onPointerDown={(e) => {
                if (p.readOnly) return
                e.stopPropagation()
                p.onSelectCallout?.(c.id)
                drag.current = c.id
                ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => {
                if (drag.current !== c.id) return
                const { x, y } = pct(e)
                p.onMoveCallout?.(c.id, Math.round(x * 10) / 10, Math.round(y * 10) / 10)
              }}
              onPointerUp={() => {
                drag.current = null
              }}
              onPointerCancel={() => {
                drag.current = null
              }}
            />
            <span className="pill">
              <b>{p.numbers[c.id]}</b>
              {c.label}
            </span>
          </div>
        )
      })}
      <span className="ptag">{p.photo.file}</span>
      {p.placing && <span className="place-hint">Tap the spot to mark</span>}
    </div>
  )
}
