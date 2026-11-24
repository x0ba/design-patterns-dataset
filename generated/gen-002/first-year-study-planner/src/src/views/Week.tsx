import { useMemo } from 'react';
import { COURSES, courseById, TYPE_META, type Item } from '../data';
import { DAY_SHORT, TERM, TODAY, closureOn, fmtDay, fmtRange, fmtShort, fmtTime, parse, toMin, weekOf } from '../dates';
import { Icon } from '../Icon';
import { eventsForDate, findPrepSlot, minutes, weekDates, type CalEvent } from '../logic';
import { uid, useStore } from '../store';

const START_H = 7;
const END_H = 23;
const ROW = 42;

export function WeekView({ week }: { week: number }) {
  const { s, d, toast } = useStore();
  const dates = weekDates(week);
  const curWeek = weekOf(TODAY);
  const planned = s.plannedWeeks.includes(week);

  const events = useMemo(() => dates.map((dt) => eventsForDate(dt, s.blocks)), [dates.join(), s.blocks]);
  const due = s.items.filter((i) => i.date >= dates[0] && i.date <= dates[6]).sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));
  const prepFor = (id: string) => s.blocks.find((b) => b.forItemId === id);
  const unscheduled = due.filter((i) => !prepFor(i.id) && i.date >= TODAY);
  const mathMissing = s.items.filter((i) => i.courseId === 'math095').length === 0;

  const all = events.flat();
  const sum = (k: CalEvent['kind'][]) => all.filter((e) => k.includes(e.kind)).reduce((a, e) => a + minutes(e), 0) / 60;
  const classH = sum(['class']);
  const workH = sum(['work']);
  const studyH = sum(['study', 'prep', 'coaching']);

  const schedule = (item: Item) => {
    const slot = findPrepSlot(item, s.blocks, '2026-08-31' > TODAY ? '2026-08-31' : TODAY);
    if (!slot) {
      toast(`No free time found before "${item.title}" is due. Try a peer coach drop-in to sort out this week.`, { tone: 'info' });
      return;
    }
    const c = courseById(item.courseId);
    d({
      type: 'addBlock',
      block: { id: uid('prep'), kind: 'prep', title: item.title, sub: `${c.code} ${item.type === 'reading' ? 'reading' : 'prep'}`, date: slot.date, start: slot.start, end: slot.end, forItemId: item.id },
    });
    toast(`Scheduled ${fmtDay(slot.date)}, ${fmtRange(slot.start, slot.end)} for "${item.title}"`, { undoable: true });
  };

  const scheduleAll = () => {
    // schedule sequentially so slots don't collide
    let blocks = s.blocks;
    const added = [];
    for (const item of unscheduled) {
      const slot = findPrepSlot(item, blocks, '2026-08-31');
      if (!slot) continue;
      const c = courseById(item.courseId);
      const b = { id: uid('prep'), kind: 'prep' as const, title: item.title, sub: `${c.code} ${item.type === 'reading' ? 'reading' : 'prep'}`, date: slot.date, start: slot.start, end: slot.end, forItemId: item.id };
      blocks = [...blocks, b];
      added.push(b);
    }
    added.forEach((b) => d({ type: 'addBlock', block: b }));
    toast(`Found time for ${added.length} item${added.length === 1 ? '' : 's'}`, { undoable: false });
  };

  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);

  return (
    <div className="page week-page">
      <header className="week-head">
        <div className="week-nav">
          <button className="icon-btn" disabled={week <= 1} onClick={() => d({ type: 'nav', view: { name: 'week', week: week - 1 } })} aria-label="Previous week">
            <Icon name="chevronL" />
          </button>
          <div>
            <h1>
              Week {week} <span className="muted">· {fmtShort(dates[0])} – {fmtShort(dates[6])}</span>
            </h1>
            <div className="muted sm">
              {week === curWeek ? 'This week (ends tonight)' : week === curWeek + 1 ? 'Starts tomorrow' : week < curWeek ? 'Past week' : `${week - curWeek} weeks from now`}
              {planned && <span className="planned-tag"><Icon name="check" size={12} stroke={3} /> Planned</span>}
            </div>
          </div>
          <button className="icon-btn" disabled={week >= TERM.weeks} onClick={() => d({ type: 'nav', view: { name: 'week', week: week + 1 } })} aria-label="Next week">
            <Icon name="chevronR" />
          </button>
        </div>
        <div className="legend">
          <span><i className="lg class" /> Class</span>
          <span><i className="lg work" /> Work</span>
          <span><i className="lg study" /> Study block</span>
          <span><i className="lg prep" /> Prep time</span>
          <span><i className="lg coaching" /> Peer coach</span>
        </div>
      </header>

      {week >= curWeek && (
        <section className="plan-strip card">
          <div className="ps-col">
            <div className="ps-h"><span className="ps-n done"><Icon name="check" size={11} stroke={3} /></span> Fixed times</div>
            <div className="ps-hours">
              <div><strong>{classH.toFixed(classH % 1 ? 1 : 0)}</strong> h class</div>
              <div><strong>{workH}</strong> h work</div>
              <div><strong>{studyH.toFixed(studyH % 1 ? 1 : 0)}</strong> h study</div>
            </div>
            <div className="muted sm">
              A common guideline is 2 h of study per class hour. With 18 h of work, start where you can.{' '}
              <button className="link sm" onClick={() => d({ type: 'help', article: 'study-hours' })}>Read more</button>
            </div>
          </div>
          <div className="ps-col grow">
            <div className="ps-h">
              <span className={`ps-n${unscheduled.length === 0 && due.length ? ' done' : ''}`}>{unscheduled.length === 0 && due.length ? <Icon name="check" size={11} stroke={3} /> : 2}</span>
              Give each due item a time to work on it
              {unscheduled.length > 1 && (
                <button className="btn sm ps-all" onClick={scheduleAll}>
                  <Icon name="sparkle" size={13} /> Find time for all {unscheduled.length}
                </button>
              )}
            </div>
            <ul className="due-list">
              {due.length === 0 && <li className="muted">Nothing due this week yet. Add your syllabi so their dates show up here.</li>}
              {due.map((i) => {
                const c = courseById(i.courseId);
                const p = prepFor(i.id);
                return (
                  <li key={i.id}>
                    <span className="course-dot" style={{ background: c.color }} />
                    <span className="dl-title">
                      <span className="dl-name"><strong>{c.code}</strong> {i.title}</span>
                      <span className="muted sm">{TYPE_META[i.type].label} · due {DAY_SHORT[parse(i.date).getDay()]} {i.time === '23:59' ? '11:59 pm' : fmtTime(i.time ?? '09:00')}</span>
                    </span>
                    {p ? (
                      <span className="dl-sched">
                        <Icon name="clock" size={12} /> {DAY_SHORT[parse(p.date!).getDay()]} {fmtRange(p.start, p.end)}
                        <button className="icon-btn xs" aria-label="Remove prep time" onClick={() => d({ type: 'removeBlock', id: p.id })}>
                          <Icon name="x" size={12} />
                        </button>
                      </span>
                    ) : i.date < TODAY ? (
                      <span className="muted sm">past</span>
                    ) : (
                      <button className="btn sm" onClick={() => schedule(i)}>Schedule</button>
                    )}
                  </li>
                );
              })}
              {mathMissing && (
                <li className="dl-missing">
                  <Icon name="info" size={13} />
                  <span>MATH 095 online homework (due Sundays) isn't in your plan yet.</span>
                  <button className="link sm" onClick={() => d({ type: 'nav', view: { name: 'course', courseId: 'math095' } })}>Add MATH 095 syllabus</button>
                </li>
              )}
            </ul>
          </div>
          <div className="ps-col ps-finish">
            <div className="ps-h"><span className={`ps-n${planned ? ' done' : ''}`}>{planned ? <Icon name="check" size={11} stroke={3} /> : 3}</span> Mark it planned</div>
            {planned ? (
              <>
                <p className="sm">Week {week} is planned. {week === 2 ? 'That checks off step 6 for Ms. Ortega.' : ''}</p>
                <button className="link sm" onClick={() => d({ type: 'planWeek', week, planned: false })}>Undo</button>
              </>
            ) : (
              <>
                <p className="muted sm">{unscheduled.length ? `${unscheduled.length} item${unscheduled.length === 1 ? '' : 's'} still need a time.` : 'Everything due has a time.'}</p>
                <button
                  className={`btn${unscheduled.length === 0 ? ' primary' : ''}`}
                  onClick={() => {
                    d({ type: 'planWeek', week, planned: true });
                    toast(`Week ${week} planned${week === 2 ? ': step 6 done' : ''}`, { undoable: true });
                  }}
                >
                  <Icon name="flag" size={14} /> Mark Week {week} planned
                </button>
              </>
            )}
          </div>
        </section>
      )}

      <div className="cal card" role="grid" aria-label={`Week ${week} calendar`}>
        <div className="cal-head" role="row">
          <div className="cal-gutter" />
          {dates.map((dt) => {
            const closed = closureOn(dt);
            return (
              <div key={dt} className={`cal-day-h${dt === TODAY ? ' today' : ''}${dt < TODAY ? ' past' : ''}`} role="columnheader">
                <span className="cdh-dow">{DAY_SHORT[parse(dt).getDay()]}</span>
                <span className="cdh-num">{parse(dt).getDate()}</span>
                {closed && <span className="cdh-closed">{closed.label}</span>}
              </div>
            );
          })}
        </div>
        <div className="cal-due" role="row">
          <div className="cal-gutter sm">Due</div>
          {dates.map((dt) => (
            <div key={dt} className="cal-due-cell">
              {s.items
                .filter((i) => i.date === dt)
                .map((i) => {
                  const c = courseById(i.courseId);
                  return (
                    <span key={i.id} className={`due-chip ${i.type}`} style={{ ['--c' as string]: c.color, ['--t' as string]: c.tint }} title={`${c.code} ${i.title}`}>
                      {TYPE_META[i.type].icon} {i.title}
                    </span>
                  );
                })}
            </div>
          ))}
        </div>
        <div className="cal-body" style={{ height: (END_H - START_H) * ROW }}>
          <div className="cal-gutter hours">
            {hours.map((h) => (
              <div key={h} className="hour-label" style={{ top: (h - START_H) * ROW }}>
                {fmtTime(`${String(h).padStart(2, '0')}:00`)}
              </div>
            ))}
          </div>
          {dates.map((dt, di) => (
            <div key={dt} className={`cal-col${dt < TODAY ? ' past' : ''}`}>
              {hours.map((h) => (
                <div key={h} className="hour-line" style={{ top: (h - START_H) * ROW }} />
              ))}
              {events[di].map((e) => {
                const top = ((toMin(e.start) - START_H * 60) / 60) * ROW;
                const h = (minutes(e) / 60) * ROW;
                const block = e.blockId ? s.blocks.find((b) => b.id === e.blockId) : undefined;
                const item = block?.forItemId ? s.items.find((i) => i.id === block.forItemId) : undefined;
                const c = e.courseId ? courseById(e.courseId) : item ? courseById(item.courseId) : undefined;
                return (
                  <div
                    key={e.id}
                    className={`ev ${e.kind}${h < 40 ? ' short' : ''}`}
                    style={{ top, height: Math.max(h - 2, 16), ['--c' as string]: c?.color, ['--t' as string]: c?.tint }}
                    title={`${e.title} · ${fmtRange(e.start, e.end)}${e.sub ? ` · ${e.sub}` : ''}`}
                  >
                    <span className="ev-title">{e.title}</span>
                    <span className="ev-time">{fmtRange(e.start, e.end)}</span>
                    {e.sub && h >= 56 && <span className="ev-sub">{e.sub}</span>}
                    {(e.kind === 'prep' || e.kind === 'coaching') && block && (
                      <button className="ev-x" aria-label={`Remove ${e.title}`} onClick={() => d({ type: 'removeBlock', id: block.id })}>
                        <Icon name="x" size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
              {dt === TODAY && <div className="now-line" style={{ top: ((19 * 60 + 42 - START_H * 60) / 60) * ROW }} />}
            </div>
          ))}
        </div>
      </div>
      <p className="muted sm cal-foot">
        Courses: {COURSES.map((c) => c.code).join(', ')}. Classes skip campus closures automatically. Work shifts don't.
      </p>
    </div>
  );
}
