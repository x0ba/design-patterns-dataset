import { Car, Clock, Drumstick, House, Moon, PlaneTakeoff, Stethoscope, Sun, Utensils, X } from 'lucide-react'
import {
  APPT_DAY, NIGHTS, PEOPLE, RIDE_DAYS, SUNDAYS, THANKSGIVING, dayNum, dinnerAttendees, fmt, fmtLong, inAway,
  isRideDay, monShort, nightElig, openNights, openRides, weekOf, type PersonId, type Plan,
} from './model'
import { Avatar, personVars, type Slot } from './ui'

interface Props {
  plan: Plan
  selected: number | null
  focus: PersonId | null
  onSelect: (i: number, slot: Slot) => void
  onClearFocus: () => void
}

const HEAD = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function Chip({ kind, who, timeOff, onClick, label }: { kind: 'night' | 'ride'; who: PersonId | null; timeOff?: boolean; onClick: () => void; label: string }) {
  const Icon = kind === 'night' ? Moon : Car
  return (
    <button
      type="button"
      className={`chip ${who ? 'chip-on' : 'chip-open'}`}
      style={who ? personVars(who) : undefined}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
    >
      <Icon size={13} className="chip-kind" aria-hidden="true" />
      <span className="chip-name">{who ? PEOPLE[who].first : 'Open'}</span>
      {timeOff && <Clock size={11} className="chip-pto" aria-label="Takes time off work" />}
    </button>
  )
}

function DayCell({ i, plan, selected, focus, onSelect }: { i: number; selected: boolean } & Omit<Props, 'onClearFocus' | 'selected'>) {
  const night = plan.nights[i]
  const ride = plan.rides[i] ?? null
  const hasRide = isRideDay(i)
  const away = inAway(i)
  const dim = focus ? nightElig(focus, i, plan).level === 'no' : false
  const lit = focus && !dim
  const dinner = SUNDAYS.includes(i) ? dinnerAttendees(plan, i).length : null
  const first = i === 0 || dayNum(i) === 1
  const checkin = plan.checkins.includes(i)
  const timeOff = (who: PersonId | null) => who === 'elena'
  const open = !night || (hasRide && !ride)

  return (
    <div
      className={`cell ${selected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''} ${lit ? 'is-lit' : ''} ${open ? 'has-open' : ''} wd${(6 + i) % 7}`}
      style={lit && focus ? personVars(focus) : undefined}
      onClick={() => onSelect(i, null)}
      role="group"
      aria-label={`${fmtLong(i)}. Night: ${night ? PEOPLE[night].first : 'open'}.${hasRide ? ` PT ride: ${ride ? PEOPLE[ride].first : 'open'}.` : ''}`}
    >
      <div className="cell-top">
        <span className="dnum">{dayNum(i)}</span>
        {first && <span className="dmon">{monShort(i)}</span>}
      </div>

      {hasRide && (
        <Chip kind="ride" who={ride} timeOff={timeOff(ride)} label={`PT ride ${fmt(i)} 10:30am: ${ride ? PEOPLE[ride].first : 'open'}. Edit`} onClick={() => onSelect(i, 'ride')} />
      )}

      <div className="notes">
        {i === 0 && (
          <div className="note note-home">
            <House size={11} /> Ruth comes home
          </div>
        )}
        {i === APPT_DAY && (
          <button type="button" className="note note-appt" onClick={(e) => { e.stopPropagation(); onSelect(i, 'appt') }} aria-label={`Surgeon follow-up 2:15pm, companion ${plan.appt ? PEOPLE[plan.appt].first : 'needed'}`}>
            <Stethoscope size={11} /> Surgeon 2:15
            {plan.appt ? <Avatar p={plan.appt} size={14} /> : <span className="av-open sm" />}
          </button>
        )}
        {i === THANKSGIVING && (
          <div className="note note-holiday">
            <Drumstick size={11} /> Thanksgiving
          </div>
        )}
        {checkin && (
          <div className="note note-check" style={personVars('gloria')}>
            <Sun size={11} /> Gloria midday
          </div>
        )}
        {dinner !== null && (
          <div className={`note note-dinner ${dinner < 3 ? 'thin' : ''}`}>
            <Utensils size={11} /> Dinner · {dinner} of 4
          </div>
        )}
        {away && (
          <div className="note note-away" style={personVars('marisol')}>
            <PlaneTakeoff size={11} /> Marisol away
          </div>
        )}
      </div>

      <Chip kind="night" who={night} timeOff={false} label={`Overnight ${fmt(i)}: ${night ? PEOPLE[night].first : 'open'}. Edit`} onClick={() => onSelect(i, 'night')} />
    </div>
  )
}

export function Calendar({ plan, selected, focus, onSelect, onClearFocus }: Props) {
  const weeks = [0, 1, 2, 3]
  return (
    <section className="cal" aria-label="Rotation calendar">
      <div className="cal-tools">
        <div className="legend" aria-hidden="true">
          <span><Moon size={12} /> Overnight</span>
          <span><Car size={12} /> PT ride · 10:30am</span>
          <span><Sun size={12} /> Check-in</span>
          <span><Clock size={12} /> Takes time off work</span>
        </div>
        {focus && (
          <div className="focus-chip" style={personVars(focus)}>
            <Avatar p={focus} size={16} />
            Showing nights {PEOPLE[focus].first} can do
            <button onClick={onClearFocus} aria-label="Clear highlight">
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="cal-head" aria-hidden="true">
        {HEAD.map((h) => (
          <div key={h} className={h === 'Sat' || h === 'Sun' ? 'we' : ''}>{h}</div>
        ))}
      </div>

      {weeks.map((w) => {
        const days = Array.from({ length: 7 }, (_, k) => w * 7 + k).filter((i) => i < NIGHTS)
        const oN = openNights(plan).filter((i) => weekOf(i) === w).length
        const oR = openRides(plan).filter((d) => weekOf(d) === w && RIDE_DAYS.includes(d)).length
        return (
          <div key={w} className="week">
            <div className="weekbar">
              <b>Week {w + 1}</b>
              <span>{fmt(days[0])} – {fmt(days[days.length - 1])}</span>
              {oN + oR === 0 ? (
                <em className="wk ok">All covered</em>
              ) : (
                <em className="wk gap">
                  {oN > 0 && `${oN} night${oN > 1 ? 's' : ''}`}
                  {oN > 0 && oR > 0 && ' · '}
                  {oR > 0 && `${oR} ride${oR > 1 ? 's' : ''}`} open
                </em>
              )}
            </div>
            <div className="week-grid">
              {days.map((i) => (
                <DayCell key={i} i={i} plan={plan} selected={selected === i} focus={focus} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
