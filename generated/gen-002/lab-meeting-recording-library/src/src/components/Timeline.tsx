import { useRef, useState } from 'react'
import type { Recording } from '../data/types'
import { DECISIONS, MENTIONS, chapterAt, type Ranges } from '../lib/derived'
import { clock } from '../lib/format'

interface Props {
  rec: Recording
  t: number | null
  playing?: boolean
  heard: Ranges
  onSeek: (t: number) => void
  variant: 'bar' | 'page' | 'mini'
  markers?: boolean
}

export function Timeline({ rec, t, playing, heard, onSeek, variant, markers = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [drag, setDrag] = useState(false)
  const D = rec.duration
  const pct = (x: number) => `${(x / D) * 100}%`
  const at = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect()
    return Math.min(D - 0.5, Math.max(0, ((e.clientX - b.left) / b.width) * D))
  }
  const interactive = variant !== 'mini'
  const mentions = markers ? MENTIONS.filter((m) => m.rec === rec.id) : []
  const decisions = markers ? DECISIONS[rec.id] : []

  return (
    <div
      className={`tl tl-${variant}${drag ? ' dragging' : ''}${playing ? ' playing' : ''}`}
      ref={ref}
      onPointerDown={
        interactive
          ? (e) => {
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
              setDrag(true)
              onSeek(at(e))
            }
          : undefined
      }
      onPointerMove={
        interactive
          ? (e) => {
              const x = at(e)
              setHover(x)
              if (drag) onSeek(x)
            }
          : undefined
      }
      onPointerUp={interactive ? () => setDrag(false) : undefined}
      onPointerLeave={interactive ? () => !drag && setHover(null) : undefined}
      role={interactive ? 'slider' : undefined}
      aria-label={interactive ? `Seek in ${rec.title} ${rec.date}` : undefined}
      aria-valuemin={0}
      aria-valuemax={Math.round(D)}
      aria-valuenow={t != null ? Math.round(t) : 0}
      aria-valuetext={t != null ? clock(t) : undefined}
    >
      {markers && variant !== 'mini' && (
        <div className="tl-marks">
          {decisions.map((d) => (
            <span key={d.id} className="mk mk-dec" style={{ left: pct(d.t) }} title={`Decision · ${clock(d.t)} · ${d.label}`} />
          ))}
          {mentions.map((m) => (
            <span key={m.id} className="mk mk-me" style={{ left: pct(m.t) }} title={`Your name · ${clock(m.t)}`} />
          ))}
        </div>
      )}
      <div className="tl-track">
        {rec.chapters.map((c) => {
          const len = c.end - c.start
          return (
            <div key={c.id} className={`tl-seg v-${c.verdict}`} style={{ left: pct(c.start), width: pct(len) }}>
              {heard.map((r, i) => {
                const a = Math.max(r[0], c.start)
                const b = Math.min(r[1], c.end)
                return b > a ? <i key={i} className="heard" style={{ left: `${((a - c.start) / len) * 100}%`, width: `${((b - a) / len) * 100}%` }} /> : null
              })}
              {variant === 'page' && <span className="tl-label">{c.title}</span>}
            </div>
          )
        })}
        {t != null && <div className="tl-head" style={{ left: pct(t) }} />}
      </div>
      {hover != null && interactive && (
        <div className="tl-tip" style={{ left: `clamp(70px, ${pct(hover)}, calc(100% - 70px))` }}>
          <b>{clock(hover)}</b> {chapterAt(rec, hover).title}
        </div>
      )}
    </div>
  )
}
