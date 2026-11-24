import { ArrowLeft, Ban, CalendarRange, Car, Check, CircleAlert, Clock, Moon, Stethoscope, Sun, Users, Utensils, Wand2 } from 'lucide-react'
import {
  APPT_DAY, FAMILY_ORDER, PEOPLE, SUNDAYS, dayElig, dinnerAttendees, fmt, fmtLong, fmtRuns, fmtWithDay,
  gloriaWeekCount, isRideDay, loadOf, nightElig, stripOf, THANKSGIVING, weekOf, davidStretch, fmtRange, dow, inAway,
  type Elig, type Issue, type PersonId, type Plan,
} from './model'
import { Avatar, personVars, type Slot } from './ui'

// =====================================================================================
// To sort out
// =====================================================================================
interface TodoProps {
  plan: Plan
  issues: Issue[]
  onPlaceStretch: (start: number) => void
  onChooseStretch: () => void
  onMarisolNights: (nights: number[]) => void
  onRides: (rides: number[], mode: 'split' | 'marisol' | 'elena') => void
  onFill: (nights: number[]) => void
  onOpenDay: (i: number, slot: Slot) => void
  onAskTom: (sunday: number) => void
  onDismiss: (id: string) => void
  onAcceptAll: () => void
  onReview: () => void
}

export function TodoPanel(p: TodoProps) {
  const actionable = p.issues.filter((i) => i.id !== 'stuck').length
  return (
    <aside className="panel todo" aria-label="To sort out">
      <div className="panel-head">
        <h2>To sort out</h2>
        {p.issues.length > 0 && <span className="count">{p.issues.length}</span>}
        {actionable > 1 && (
          <button className="btn soft sm apply-all" onClick={p.onAcceptAll} title="Apply every recommended fix below">
            <Wand2 size={13} /> Apply all
          </button>
        )}
      </div>

      {p.issues.length === 0 ? (
        <div className="allset">
          <div className="allset-icon"><Check size={22} /></div>
          <h3>Every night and PT ride has someone</h3>
          <p>Nothing conflicts with what everyone told you. Look it over once more, then send it so they can confirm.</p>
          <button className="btn primary" onClick={p.onReview}>Review &amp; send</button>
        </div>
      ) : (
        <>
          <div className="cards">
            {p.issues.map((issue) => (
              <IssueCard key={issue.id + ('sunday' in issue ? issue.sunday : '')} issue={issue} {...p} />
            ))}
          </div>
        </>
      )}
    </aside>
  )
}

function IssueCard({ issue, plan, ...a }: { issue: Issue } & TodoProps) {
  if (issue.id === 'stretch') {
    const b = issue.best
    return (
      <article className="card urgent">
        <h3><CalendarRange size={15} /> Place David's 6-night stretch</h3>
        <p>
          Marisol is away Dec 4–8, Tom can't do weekdays and Elena doesn't do Tuesdays
          {b.solo.length > 0 && <> — so <b>{fmtWithDay(b.solo[0])}</b> has nobody else</>}.
        </p>
        <p>
          <b>{fmtRange(b.start, b.end)}</b> fills {b.fills.length} nights
          {b.rides.length > 0 && <> and the {b.rides.map((d) => fmt(d)).join(' + ')} PT rides</>}
          {b.replaces.length === 0 ? ', bumping no one.' : `, but bumps ${b.replaces.length} planned night${b.replaces.length > 1 ? 's' : ''}.`}
        </p>
        <div className="actions">
          <button className="btn primary sm" onClick={() => a.onPlaceStretch(b.start)}>Place {fmtRange(b.start, b.end)}</button>
          <button className="btn ghost sm" onClick={a.onChooseStretch}>Choose dates</button>
        </div>
      </article>
    )
  }

  if (issue.id === 'marisol-nights') {
    const n = issue.nights
    const allTue = n.every((i) => dow(i) === 2)
    const after = loadOf('marisol', plan).nights + n.length
    return (
      <article className="card">
        <h3><Moon size={15} /> {n.length} {allTue ? 'Tuesday ' : ''}night{n.length > 1 ? 's' : ''} only Marisol can take</h3>
        <p>
          <b>{fmtRuns(n)}.</b> {allTue ? "Elena doesn't do Tuesdays and Tom can't do weekdays." : 'Nobody else is free.'} That would put Marisol at {after} nights.
        </p>
        <div className="actions">
          <button className="btn primary sm" onClick={() => a.onMarisolNights(n)}>Assign to Marisol</button>
          <button className="btn ghost sm" onClick={() => a.onOpenDay(n[0], 'night')}>Review</button>
        </div>
      </article>
    )
  }

  if (issue.id === 'rides') {
    const r = issue.rides
    const names = r.map((d) => fmtWithDay(d))
    const elenaRide = r.find((d) => plan.nights[d - 1] === 'elena') ?? r[r.length - 1]
    const heavy = issue.marisolRides + r.length > 8
    return (
      <article className="card">
        <h3><Car size={15} /> {r.length} PT ride{r.length > 1 ? 's' : ''} still open</h3>
        <p>
          <b>{names.join(' and ')}.</b> Only Marisol and David are free weekday mornings, and Marisol has {issue.marisolRides} rides already
          {heavy ? <> ({issue.marisolRides + r.length} of 12 with {r.length > 1 ? 'both' : 'this one'})</> : ''}.
          {heavy && <> Elena could take <b>{fmt(elenaRide)}</b> with a morning off{plan.nights[elenaRide - 1] === 'elena' ? ', since she is there the night before' : ''}.</>}
        </p>
        <div className="actions">
          {heavy && r.length > 1 ? (
            <>
              <button className="btn primary sm" onClick={() => a.onRides(r, 'split')}>Split with Elena</button>
              <button className="btn ghost sm" onClick={() => a.onRides(r, 'marisol')}>Marisol takes both</button>
            </>
          ) : heavy ? (
            <>
              <button className="btn primary sm" onClick={() => a.onRides(r, 'elena')}>Elena takes it</button>
              <button className="btn ghost sm" onClick={() => a.onRides(r, 'marisol')}>Marisol takes it</button>
            </>
          ) : (
            <button className="btn primary sm" onClick={() => a.onRides(r, 'marisol')}>Assign to Marisol</button>
          )}
        </div>
      </article>
    )
  }

  if (issue.id === 'fill') {
    return (
      <article className="card">
        <h3><Users size={15} /> {issue.nights.length} night{issue.nights.length > 1 ? 's' : ''} have someone free</h3>
        <p><b>{fmtRuns(issue.nights)}.</b> Pick who in the calendar, or give each night to whoever has the fewest so far.</p>
        <div className="actions">
          <button className="btn primary sm" onClick={() => a.onFill(issue.nights)}>Fill fairly</button>
          <button className="btn ghost sm" onClick={() => a.onOpenDay(issue.nights[0], 'night')}>Review</button>
        </div>
      </article>
    )
  }

  if (issue.id === 'stuck') {
    const first = issue.nights[0] ?? issue.rides[0]
    return (
      <article className="card danger">
        <h3><CircleAlert size={15} /> Nobody can take {fmtRuns([...issue.nights, ...issue.rides])}</h3>
        <p>Everyone is blocked on {issue.nights.length ? 'those nights' : 'those rides'}. Open the day to see why, or move David's stretch.</p>
        <div className="actions">
          <button className="btn primary sm" onClick={() => a.onOpenDay(first, issue.nights.length ? 'night' : 'ride')}>Open {fmt(first)}</button>
          <button className="btn ghost sm" onClick={a.onChooseStretch}>Move stretch</button>
        </div>
      </article>
    )
  }

  // dinner
  const att = dinnerAttendees(plan, issue.sunday)
  const why = [inAway(issue.sunday) ? 'Marisol is away' : null, "Tom isn't on the rota that weekend"].filter(Boolean).join(' and ')
  return (
    <article className="card soft">
      <h3><Utensils size={15} /> Sunday dinner {fmt(issue.sunday)} looks thin</h3>
      <p>
        {att.length === 1 ? 'Only Elena' : `${att.length} of 4 siblings`} would be there. {why}. Ruth wants the family dinner to keep going.
      </p>
      <div className="actions">
        <button className="btn primary sm" onClick={() => a.onAskTom(issue.sunday)}>Ask Tom to come</button>
        <button className="btn ghost sm" onClick={() => a.onDismiss(`dinner-${issue.sunday}`)}>Fine as is</button>
      </div>
    </article>
  )
}

// =====================================================================================
// Family
// =====================================================================================
interface FamilyProps {
  plan: Plan
  focus: PersonId | null
  onFocus: (p: PersonId | null) => void
  onEditStretch: () => void
  sent: { confirmed: PersonId[]; affected: PersonId[] } | null
  onConfirm: (p: PersonId) => void
}

function flagFor(p: PersonId, plan: Plan): string | null {
  const l = loadOf(p, plan)
  const all = (['elena', 'marisol', 'tom', 'david'] as PersonId[]).map((x) => loadOf(x, plan).nights)
  if (p === 'elena' && l.nights >= 9 && l.nights === Math.max(...all)) return 'Most nights of anyone, and she works full time'
  if (l.rides >= 9) return `${l.rides} of 12 rides — heavy for one person`
  return null
}

export function FamilyPanel({ plan, focus, onFocus, onEditStretch, sent, onConfirm }: FamilyProps) {
  const stretch = davidStretch(plan)
  return (
    <aside className="panel side" aria-label="Family">
      <div className="panel-head">
        <h2>Family</h2>
        <span className="hint">Tap someone to see their nights</span>
      </div>

      <ul className="fam">
        {FAMILY_ORDER.map((id) => {
          const P = PEOPLE[id]
          const l = loadOf(id, plan)
          const flag = flagFor(id, plan)
          const isOn = focus === id
          return (
            <li key={id} className={`fam-row ${isOn ? 'on' : ''}`} style={personVars(id)}>
              <button
                className="fam-main"
                onClick={() => id !== 'gloria' && onFocus(isOn ? null : id)}
                aria-pressed={id === 'gloria' ? undefined : isOn}
                disabled={id === 'gloria'}
              >
                <Avatar p={id} size={30} />
                <div className="fam-text">
                  <div className="fam-name">
                    <b>{P.full}</b>
                    <span className="fam-role">{P.role}</span>
                  </div>
                  <div className="fam-avail">{P.availability}</div>
                </div>
              </button>

              {id !== 'gloria' ? (
                <>
                  <div className="strip" aria-hidden="true">
                    {stripOf(id, plan).map((t, i) => (
                      <i key={i} className={`tick ${t}`} title={`${fmtWithDay(i)} · ${t === 'mine' ? 'assigned' : t === 'free' ? 'free' : 'unavailable'}`} style={i > 0 && i % 7 === 0 ? { marginLeft: 5 } : undefined} />
                    ))}
                  </div>
                  <div className="fam-stats">
                    <span><b>{l.nights}</b> night{l.nights === 1 ? '' : 's'}</span>
                    <span><b>{l.rides}</b> ride{l.rides === 1 ? '' : 's'}</span>
                    {l.roadHrs > 0 && <span title="Driving time, counting each separate trip">~{Math.round(l.roadHrs)} hrs on the road</span>}
                  </div>
                  {id === 'david' && (
                    <div className="fam-extra">
                      {stretch ? (
                        <>Stretch set: <b>{fmtRange(stretch.start, stretch.end)}</b> <button className="link" onClick={onEditStretch}>Change</button></>
                      ) : (
                        <>6-night stretch not placed yet <button className="link" onClick={onEditStretch}>Place</button></>
                      )}
                    </div>
                  )}
                  {flag && <div className="fam-flag"><CircleAlert size={12} /> {flag}</div>}
                </>
              ) : (
                <div className="fam-stats">
                  <span><b>{plan.checkins.length}</b> midday check-ins placed</span>
                  <span>Tue &amp; Thu</span>
                </div>
              )}

              {sent && (
                <div className="fam-sent">
                  {id === 'elena' ? null : sent.confirmed.includes(id) && !sent.affected.includes(id) ? (
                    <span className="pill good"><Check size={12} /> Confirmed</span>
                  ) : sent.affected.includes(id) ? (
                    <span className="pill warn">Needs the update</span>
                  ) : (
                    <>
                      <span className="pill wait"><Clock size={12} /> Awaiting reply</span>
                      <button className="link" onClick={() => onConfirm(id)}>Mark confirmed</button>
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <Wishes plan={plan} />
    </aside>
  )
}

function Wishes({ plan }: { plan: Plan }) {
  return (
    <section className="wishes" aria-label="Ruth's wishes">
      <h3>Ruth's wishes</h3>
      <div className="wish">
        <Check size={14} className="ok" />
        <div>
          <b>No overnights by grandkids under 18</b>
          <span>Theo (16) offered Friday nights. He's kept off the rota — invite him to Sunday dinner instead.</span>
        </div>
      </div>
      <div className="wish">
        <Utensils size={14} className="ok" />
        <div>
          <b>Sunday family dinner continues</b>
          <span className="dinners">
            {SUNDAYS.map((s) => {
              const n = dinnerAttendees(plan, s).length
              return (
                <em key={s} className={n < 3 ? 'thin' : ''}>{fmt(s)} · {n}/4</em>
              )
            })}
          </span>
        </div>
      </div>
      <div className="wish">
        <Sun size={14} className="ok" />
        <div>
          <b>Daily check-in</b>
          <span>The overnight host checks in each morning; Gloria adds a midday visit twice a week.</span>
        </div>
      </div>
    </section>
  )
}

// =====================================================================================
// Day detail
// =====================================================================================
interface DayProps {
  i: number
  slot: Slot
  plan: Plan
  onBack: () => void
  onAssignNight: (i: number, p: PersonId | null) => void
  onAssignRide: (i: number, p: PersonId | null) => void
  onAssignAppt: (p: PersonId | null) => void
  onToggleCheckin: (i: number) => void
}

function Row({ p, elig, current, meta, onPick, special }: { p: PersonId; elig: Elig; current: boolean; meta?: string; onPick: () => void; special?: string }) {
  const disabled = elig.level === 'no'
  return (
    <li>
      <button
        className={`opt ${current ? 'cur' : ''} ${elig.level}`}
        style={personVars(p)}
        disabled={disabled}
        onClick={onPick}
        aria-pressed={current}
      >
        <Avatar p={p} size={26} />
        <span className="opt-text">
          <b>{PEOPLE[p].first}</b>
          <span className="opt-why">
            {elig.level === 'warn' && <Clock size={11} />}
            {elig.level === 'no' && <Ban size={11} />}
            {elig.text}
          </span>
        </span>
        <span className="opt-end">
          {current ? <Check size={16} /> : special ? <em>{special}</em> : meta ? <em>{meta}</em> : null}
        </span>
      </button>
    </li>
  )
}

export function DayPanel({ i, slot, plan, onBack, onAssignNight, onAssignRide, onAssignAppt, onToggleCheckin }: DayProps) {
  const night = plan.nights[i]
  const ride = plan.rides[i] ?? null
  const hasRide = isRideDay(i)
  const hasAppt = i === APPT_DAY
  const stretch = davidStretch(plan)
  const gc = gloriaWeekCount(plan, i)
  const checked = plan.checkins.includes(i)

  const nightMeta = (p: PersonId) => {
    const n = loadOf(p, plan).nights
    return night === p ? '' : `${n} → ${n + 1} nights`
  }
  const rideMeta = (p: PersonId) => {
    const n = loadOf(p, plan).rides
    return ride === p ? '' : `${n} → ${n + 1} rides`
  }

  return (
    <aside className="panel side day" aria-label={`Details for ${fmtLong(i)}`}>
      <button className="back" onClick={onBack}><ArrowLeft size={14} /> Family</button>
      <h2 className="day-title">{fmtLong(i)}</h2>
      <div className="day-tags">
        {i === 0 && <span className="tag">Ruth comes home from rehab</span>}
        {dow(i) === 0 && <span className="tag">Sunday family dinner · {dinnerAttendees(plan, i).length} of 4 siblings</span>}
        {inAway(i) && <span className="tag away">Marisol away Dec 4–8</span>}
        {hasAppt && <span className="tag">Surgeon follow-up 2:15pm</span>}
        {i === THANKSGIVING && <span className="tag">Thanksgiving</span>}
      </div>

      <section className={`sec ${slot === 'night' ? 'hot' : ''}`}>
        <div className="sec-head">
          <h3><Moon size={14} /> Overnight</h3>
          <span>{night ? `${PEOPLE[night].first} · 6pm → morning` : 'Open · 6pm → morning'}</span>
        </div>
        <ul className="opts">
          {(['elena', 'marisol', 'tom', 'david'] as PersonId[]).map((p) => {
            const el = nightElig(p, i, plan)
            const isDavidPick = p === 'david' && !stretch && el.level !== 'no'
            return (
              <Row
                key={p}
                p={p}
                elig={el}
                current={night === p}
                meta={nightMeta(p)}
                special={isDavidPick ? 'Pick dates' : undefined}
                onPick={() => onAssignNight(i, p)}
              />
            )
          })}
          <li className="opt-static">
            <span className="av kid">T</span>
            <span className="opt-text">
              <b>Theo &amp; Nora</b>
              <span className="opt-why"><Ban size={11} /> Under 18 — Ruth prefers no overnights</span>
            </span>
          </li>
        </ul>
        {night && <button className="link clear" onClick={() => onAssignNight(i, null)}>Clear this night</button>}
      </section>

      {hasRide && (
        <section className={`sec ${slot === 'ride' ? 'hot' : ''}`}>
          <div className="sec-head">
            <h3><Car size={14} /> PT ride · 10:30am</h3>
            <span>{ride ? PEOPLE[ride].first : 'Open'}</span>
          </div>
          <p className="sec-note">Lakeshore Rehab · leave ~10:00, 25 min each way, 45-min session, home by ~11:45.</p>
          <ul className="opts">
            {(['marisol', 'david', 'elena', 'tom'] as PersonId[]).map((p) => (
              <Row key={p} p={p} elig={dayElig(p, i, plan, 'ride')} current={ride === p} meta={rideMeta(p)} onPick={() => onAssignRide(i, p)} />
            ))}
          </ul>
          {ride && <button className="link clear" onClick={() => onAssignRide(i, null)}>Clear this ride</button>}
        </section>
      )}

      {hasAppt && (
        <section className={`sec ${slot === 'appt' ? 'hot' : ''}`}>
          <div className="sec-head">
            <h3><Stethoscope size={14} /> Surgeon follow-up · 2:15pm</h3>
            <span>{plan.appt ? PEOPLE[plan.appt].first : 'Needs someone'}</span>
          </div>
          <p className="sec-note">Same day as PT — whoever goes should hear the surgeon's instructions firsthand.</p>
          <ul className="opts">
            {(['elena', 'marisol', 'david', 'tom'] as PersonId[]).map((p) => (
              <Row key={p} p={p} elig={dayElig(p, i, plan, 'appt')} current={plan.appt === p} onPick={() => onAssignAppt(p)} />
            ))}
          </ul>
        </section>
      )}

      <section className={`sec ${slot === 'check' ? 'hot' : ''}`}>
        <div className="sec-head">
          <h3><Sun size={14} /> Midday check-in</h3>
          <span>{checked ? 'Gloria' : 'None planned'}</span>
        </div>
        <ul className="opts">
          <li>
            <button
              className={`opt ${checked ? 'cur' : ''}`}
              style={personVars('gloria')}
              disabled={!checked && gc >= 2}
              onClick={() => onToggleCheckin(i)}
              aria-pressed={checked}
            >
              <Avatar p="gloria" size={26} />
              <span className="opt-text">
                <b>Gloria</b>
                <span className="opt-why">
                  {!checked && gc >= 2 ? <><Ban size={11} /> Already has 2 this week</> : `${gc} of 2 this week (week ${weekOf(i) + 1})`}
                </span>
              </span>
              <span className="opt-end">{checked ? <Check size={16} /> : null}</span>
            </button>
          </li>
        </ul>
      </section>

    </aside>
  )
}
