import { YEAR_MAX, YEAR_MIN } from '../search'
import { cx } from '../util'

interface Props {
  counts: Map<number, number>
  min: number
  max: number
  onChange: (min: number, max: number) => void
}

const PRESETS: { label: string; range: [number, number] }[] = [
  { label: '2016–2020', range: [2016, 2020] },
  { label: '2014–2022', range: [2014, 2022] },
  { label: 'Last 10 yrs', range: [2017, 2026] },
]

export function YearRange({ counts, min, max, onChange }: Props) {
  const years = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i)
  const peak = Math.max(1, ...years.map((y) => counts.get(y) ?? 0))
  const inRange = years.filter((y) => y >= min && y <= max).reduce((s, y) => s + (counts.get(y) ?? 0), 0)
  return (
    <div className="yr">
      <div className="yr-readout">
        <span className="yr-val">
          {min === max ? min : `${min} – ${max}`}
        </span>
        <span className="yr-n">{inRange} in range</span>
      </div>
      <div className="yr-hist" aria-hidden>
        {years.map((y) => {
          const n = counts.get(y) ?? 0
          return (
            <button
              key={y}
              tabIndex={-1}
              className={cx('yr-bar', y >= min && y <= max && 'in')}
              style={{ height: `${n ? 8 + (n / peak) * 92 : 2}%` }}
              title={`${y}: ${n} project${n === 1 ? '' : 's'}`}
              onClick={() => onChange(y, y)}
            />
          )
        })}
      </div>
      <div className="yr-sliders">
        <input
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX}
          value={min}
          aria-label="Earliest completion year"
          onChange={(e) => onChange(Math.min(Number(e.target.value), max), max)}
        />
        <input
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX}
          value={max}
          aria-label="Latest completion year"
          onChange={(e) => onChange(min, Math.max(Number(e.target.value), min))}
        />
      </div>
      <div className="yr-axis">
        <span>{YEAR_MIN}</span>
        <span>2010</span>
        <span>{YEAR_MAX}</span>
      </div>
      <div className="yr-presets">
        {PRESETS.map((p) => (
          <button key={p.label} className={cx('chip-btn', min === p.range[0] && max === p.range[1] && 'on')} onClick={() => onChange(p.range[0], p.range[1])}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
