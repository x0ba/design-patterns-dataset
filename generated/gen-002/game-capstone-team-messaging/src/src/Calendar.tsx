import { SLOTS, WEEK } from './data'
import type { Slot } from './data/types'
import { IconCheck } from './icons'
import { clock, slotLabel } from './time'

const START = 12 * 60
const END = 19 * 60
const ROW = 23 // px per half hour
const rows = (END - START) / 30

type Mode = 'mentor' | 'office' | 'view'

export function Calendar({ mode, selected, onSelect }: { mode: Mode; selected?: string; onSelect: (id: string) => void }) {
  const hours: number[] = []
  for (let t = START; t < END; t += 60) hours.push(t)
  return (
    <div className="cal" role="group" aria-label="Availability this week, Pacific time">
      <div className="cal-head">
        <span />
        {WEEK.map((d) => (
          <div key={d.label} className="cal-day">
            <b>{d.label}</b>
            <span>Nov {d.date}</span>
          </div>
        ))}
      </div>
      <div className="cal-body" style={{ height: rows * ROW }}>
        <div className="cal-axis">
          {hours.map((t) => (
            <span key={t} style={{ top: ((t - START) / 30) * ROW - 6 }}>{clock(t, false)}</span>
          ))}
        </div>
        {WEEK.map((d, di) => (
          <div key={d.label} className="cal-col">
            {hours.map((t) => (
              <i key={t} className="cal-line" style={{ top: ((t - START) / 30) * ROW }} />
            ))}
            {SLOTS.filter((s) => s.day === di).map((s) => (
              <SlotCell key={s.id} slot={s} mode={mode} selected={selected} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SlotCell({ slot, mode, selected, onSelect }: { slot: Slot; mode: Mode; selected?: string; onSelect: (id: string) => void }) {
  const top = ((slot.start - START) / 30) * ROW
  const height = ((slot.end - slot.start) / 30) * ROW
  const active = mode === slot.kind
  const isSel = selected === slot.id
  const label = slot.kind === 'mentor' ? clock(slot.start, false, true) : 'Office hours'
  const cls = ['cal-slot', `k-${slot.kind}`, active ? 'is-active' : 'is-dim', isSel ? 'is-selected' : ''].join(' ')
  const title =
    slot.kind === 'mentor'
      ? `Dana is free · ${slotLabel(slot.day, slot.start, slot.end, true)}`
      : `Prof. Halvorsen's office hours · ${slotLabel(slot.day, slot.start, slot.end, true)}`
  if (!active) {
    return (
      <div className={cls} style={{ top, height: height - 2 }} title={title}>
        <span>{label}</span>
      </div>
    )
  }
  return (
    <button
      type="button"
      className={cls}
      style={{ top, height: height - 2 }}
      title={title}
      aria-pressed={isSel}
      aria-label={`${title}${isSel ? ', selected' : ''}`}
      onClick={() => onSelect(slot.id)}
    >
      <span>{isSel && <IconCheck width={12} height={12} />}{label}</span>
    </button>
  )
}
