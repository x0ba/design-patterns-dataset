import { memo, type ReactNode } from 'react'
import { hashStr, mulberry32 } from '../data/rng'
import type { Pattern, Project } from '../data/types'

const SKIES = [
  ['#c9d3d8', '#eceeec'],
  ['#b8c2c7', '#dfe2e0'],
  ['#d9cbb8', '#efe9df'],
]

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`
}

interface Props {
  p: Project
  variant?: number
  className?: string
}

/** Drawn facade "photo": an elevation study of the project's envelope system. */
function ProjectImageInner({ p, variant = 0, className }: Props) {
  const uid = `${p.id}-${variant}`.replace(/[^a-z0-9-]/gi, '')
  const r = mulberry32(hashStr(uid))
  const night = variant === 3
  const close = variant === 1
  const [skyTop, skyBot] = night ? ['#1d2430', '#3a3f4a'] : SKIES[p.sky % 3]
  const W = 320
  const H = 200
  const ground = 172
  const floors = Math.min(Math.max(p.levels, 1), 8)
  const fh = Math.min(19, 120 / floors)
  const top = ground - floors * fh - 6
  const x0 = variant === 2 ? 118 : 26 + Math.floor(r() * 10)
  const x1 = variant === 2 ? 304 : 294 - Math.floor(r() * 10)

  const fill = patternFill(p.pattern, p.body, uid, close ? 2.2 : 1, night)

  let facade: ReactNode
  if (p.pattern === 'perf-gradient') {
    facade = gradientPerf(x0, top, x1, ground - 4, close ? 9 : 5.2, p.body, night, hashStr(p.id))
  } else {
    facade = <rect x={x0} y={top} width={x1 - x0} height={ground - 4 - top} fill={`url(#pt-${uid})`} />
  }

  if (close) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={`${p.name}, facade close-up`}>
        <defs>{fill.def}</defs>
        <rect width={W} height={H} fill={shade(p.body, -0.25)} />
        {p.pattern === 'perf-gradient' ? gradientPerf(-10, -10, W + 10, H + 10, 11, p.body, false, hashStr(p.id)) : <rect width={W} height={H} fill={`url(#pt-${uid})`} />}
        {[0.33, 0.66].map((k) => (
          <line key={k} x1={W * k} y1={0} x2={W * k} y2={H} stroke={shade(p.body, -0.35)} strokeWidth={1.5} />
        ))}
        <line x1={0} y1={H * 0.52} x2={W} y2={H * 0.52} stroke={shade(p.body, -0.35)} strokeWidth={1.5} />
        <defs>
          <linearGradient id={`lg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#000" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#lg-${uid})`} />
      </svg>
    )
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={`${p.name}, exterior`}>
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBot} />
        </linearGradient>
        {fill.def}
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${uid})`} />
      {/* background trees / context */}
      {Array.from({ length: 7 }, (_, i) => {
        const cx = 10 + i * 50 + r() * 20
        const rad = 12 + r() * 14
        return <circle key={i} cx={cx} cy={ground - rad * 0.6} r={rad} fill={night ? '#20262c' : '#9aa596'} opacity={0.55} />
      })}
      {variant === 2 && (
        <g>
          <polygon points={`${x0 - 92},${top + 14} ${x0},${top} ${x0},${ground - 4} ${x0 - 92},${ground - 2}`} fill={shade(p.body, -0.22)} />
          <polygon points={`${x0 - 92},${top + 14} ${x0},${top} ${x0},${ground - 4} ${x0 - 92},${ground - 2}`} fill={`url(#pt-${uid})`} opacity={0.55} />
        </g>
      )}
      {/* structure behind screen */}
      <rect x={x0} y={top} width={x1 - x0} height={ground - top} fill={night ? '#e9c27a' : shade(p.body, -0.32)} />
      {Array.from({ length: floors }, (_, i) => (
        <rect key={i} x={x0} y={top + i * fh + fh - 3} width={x1 - x0} height={3} fill={night ? '#6b5432' : shade(p.body, -0.15)} />
      ))}
      {facade}
      {/* parapet + base */}
      <rect x={x0 - 2} y={top - 4} width={x1 - x0 + 4} height={4} fill={shade(p.body, -0.4)} />
      {p.type === 'Parking' && <rect x={x0 + (x1 - x0) * 0.08} y={ground - 22} width={34} height={18} fill={night ? '#f3d9a0' : '#2b2f33'} />}
      <rect x={0} y={ground} width={W} height={H - ground} fill={night ? '#22262b' : '#8d8c86'} />
      <rect x={0} y={ground} width={W} height={2} fill={night ? '#3a3f45' : '#6f6e69'} />
      {/* street trees + figures for scale */}
      {[0.18, 0.62, 0.9].map((k, i) => (
        <g key={i} transform={`translate(${W * k},${ground})`}>
          <rect x={-1} y={-20} width={2} height={20} fill="#4a4237" />
          <circle cx={0} cy={-26} r={9 + i} fill={night ? '#151a1e' : '#6f7d63'} />
        </g>
      ))}
      {[0.35, 0.41, 0.77].map((k, i) => (
        <g key={`f${i}`} transform={`translate(${W * k},${ground})`} fill={night ? '#0f1114' : '#33302c'}>
          <circle cx={0} cy={-11} r={1.6} />
          <rect x={-1.4} y={-9.5} width={2.8} height={9.5} rx={1} />
        </g>
      ))}
    </svg>
  )
}

export const ProjectImage = memo(ProjectImageInner)

function gradientPerf(x0: number, y0: number, x1: number, y1: number, step: number, body: string, night: boolean, seed: number) {
  const dots: ReactNode[] = []
  const w = x1 - x0
  const h = y1 - y0
  const ph = (seed % 100) / 100
  const cols = Math.floor(w / step)
  const rows = Math.floor(h / step)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = i / cols
      const v = j / rows
      // cedar-bough-like flowing field: overlapping sine waves
      const f = 0.5 + 0.28 * Math.sin(u * 7 + ph * 6 + Math.sin(v * 3) * 1.6) + 0.22 * Math.cos(v * 5 - u * 2.4)
      const rad = step * (0.12 + 0.34 * Math.max(0, Math.min(1, f)))
      dots.push(<circle key={`${i}-${j}`} cx={x0 + i * step + step / 2 + (j % 2 ? step / 2 : 0)} cy={y0 + j * step + step / 2} r={rad} />)
    }
  }
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} fill={body} />
      <g fill={night ? '#f2cf86' : shade(body, -0.42)}>{dots}</g>
    </g>
  )
}

function patternFill(pattern: Pattern, body: string, uid: string, k: number, night: boolean) {
  const id = `pt-${uid}`
  const hole = night ? '#f0c878' : shade(body, -0.42)
  const s = (n: number) => n * k
  let el: ReactNode
  switch (pattern) {
    case 'perf-round':
    case 'perf-gradient':
      el = (
        <pattern id={id} width={s(5)} height={s(5)} patternUnits="userSpaceOnUse">
          <rect width={s(5)} height={s(5)} fill={body} />
          <circle cx={s(2.5)} cy={s(2.5)} r={s(1.3)} fill={hole} />
        </pattern>
      )
      break
    case 'perf-square':
      el = (
        <pattern id={id} width={s(9)} height={s(6)} patternUnits="userSpaceOnUse">
          <rect width={s(9)} height={s(6)} fill={shade(body, -0.3)} />
          <rect width={s(5)} height={s(6)} fill={body} />
          <rect x={s(1)} y={s(1.5)} width={s(1.6)} height={s(1.6)} fill={hole} />
          <rect x={s(3)} y={s(3.5)} width={s(1.6)} height={s(1.6)} fill={hole} />
          <rect x={s(5)} width={s(1)} height={s(6)} fill={shade(body, 0.12)} />
        </pattern>
      )
      break
    case 'mesh':
      el = (
        <pattern id={id} width={s(8)} height={s(4)} patternUnits="userSpaceOnUse">
          <rect width={s(8)} height={s(4)} fill={hole} />
          <path d={`M0 ${s(2)} L${s(4)} 0 L${s(8)} ${s(2)} L${s(4)} ${s(4)} Z`} fill="none" stroke={body} strokeWidth={s(1.1)} />
        </pattern>
      )
      break
    case 'folded':
      el = (
        <pattern id={id} width={s(28)} height={s(6)} patternUnits="userSpaceOnUse">
          <rect width={s(14)} height={s(6)} fill={shade(body, 0.14)} />
          <rect x={s(14)} width={s(14)} height={s(6)} fill={shade(body, -0.12)} />
          <circle cx={s(3.5)} cy={s(3)} r={s(1)} fill={hole} />
          <circle cx={s(10.5)} cy={s(3)} r={s(1)} fill={hole} />
          <circle cx={s(17.5)} cy={s(3)} r={s(1.25)} fill={hole} />
          <circle cx={s(24.5)} cy={s(3)} r={s(1.25)} fill={hole} />
        </pattern>
      )
      break
    case 'cable':
      el = (
        <pattern id={id} width={s(6)} height={s(6)} patternUnits="userSpaceOnUse">
          <rect width={s(6)} height={s(6)} fill="none" />
          <line x1={s(3)} y1={0} x2={s(3)} y2={s(6)} stroke={shade(body, 0.1)} strokeWidth={s(0.6)} />
        </pattern>
      )
      break
    case 'green':
      el = (
        <pattern id={id} width={s(14)} height={s(12)} patternUnits="userSpaceOnUse">
          <rect width={s(14)} height={s(12)} fill={night ? '#2a3a2c' : '#5e7656'} />
          <circle cx={s(3)} cy={s(3)} r={s(3.4)} fill={night ? '#344a36' : '#728c62'} />
          <circle cx={s(10)} cy={s(8)} r={s(3.8)} fill={night ? '#22331f' : '#4f6849'} />
          <circle cx={s(11)} cy={s(1)} r={s(2)} fill={night ? '#3d553e' : '#88a072'} />
        </pattern>
      )
      break
    case 'precast':
      el = (
        <pattern id={id} width={s(40)} height={s(19)} patternUnits="userSpaceOnUse">
          <rect width={s(40)} height={s(19)} fill={body} />
          <rect x={s(3)} y={s(4)} width={s(34)} height={s(8)} fill={hole} />
          <line x1={s(40)} y1={0} x2={s(40)} y2={s(19)} stroke={shade(body, -0.2)} strokeWidth={s(0.8)} />
        </pattern>
      )
      break
    case 'brick':
      el = (
        <pattern id={id} width={s(8)} height={s(4)} patternUnits="userSpaceOnUse">
          <rect width={s(8)} height={s(4)} fill={shade(body, 0.2)} />
          <rect x={s(0.3)} y={s(0.3)} width={s(7.4)} height={s(1.5)} fill={body} />
          <rect x={s(-3.7)} y={s(2.3)} width={s(7.4)} height={s(1.5)} fill={shade(body, -0.05)} />
          <rect x={s(4.3)} y={s(2.3)} width={s(7.4)} height={s(1.5)} fill={shade(body, 0.03)} />
        </pattern>
      )
      break
    case 'glass':
      el = (
        <pattern id={id} width={s(16)} height={s(19)} patternUnits="userSpaceOnUse">
          <rect width={s(16)} height={s(19)} fill={night ? '#e4c483' : body} />
          <rect width={s(16)} height={s(4)} fill={shade(body, -0.25)} />
          <rect width={s(1)} height={s(19)} fill={shade(body, -0.35)} />
          <rect x={s(2)} y={s(5)} width={s(6)} height={s(12)} fill="#fff" opacity={night ? 0.1 : 0.18} />
        </pattern>
      )
      break
    case 'timber':
      el = (
        <pattern id={id} width={s(4)} height={s(10)} patternUnits="userSpaceOnUse">
          <rect width={s(4)} height={s(10)} fill={shade(body, -0.25)} />
          <rect width={s(2.6)} height={s(10)} fill={body} />
        </pattern>
      )
      break
    case 'terracotta':
      el = (
        <pattern id={id} width={s(10)} height={s(4)} patternUnits="userSpaceOnUse">
          <rect width={s(10)} height={s(4)} fill={night ? '#e2bd78' : '#4f5a60'} />
          <rect y={s(0.5)} width={s(10)} height={s(1.8)} fill={body} />
        </pattern>
      )
      break
    case 'zinc':
      el = (
        <pattern id={id} width={s(7)} height={s(19)} patternUnits="userSpaceOnUse">
          <rect width={s(7)} height={s(19)} fill={body} />
          <rect width={s(0.8)} height={s(19)} fill={shade(body, 0.18)} />
          <rect x={s(2)} y={s(6)} width={s(3)} height={s(7)} fill={hole} opacity={0.8} />
        </pattern>
      )
      break
    default:
      el = (
        <pattern id={id} width={s(20)} height={s(10)} patternUnits="userSpaceOnUse">
          <rect width={s(20)} height={s(10)} fill={body} />
          <rect x={s(0.2)} y={s(0.2)} width={s(19.6)} height={s(9.6)} fill="none" stroke={shade(body, -0.12)} strokeWidth={s(0.4)} />
          <rect x={s(6)} y={s(3)} width={s(8)} height={s(4)} fill={hole} opacity={0.75} />
        </pattern>
      )
  }
  return { def: el }
}
