import { useEffect, useMemo, useRef, useState } from 'react';
import { courseById, TYPE_META, type CourseId, type Item, type ItemType, type SyllabusStep } from '../data';
import { DAY_SHORT, TERM, fmtDay, fmtRange, fmtTime } from '../dates';
import { Icon } from '../Icon';
import { generate, seriesLabel, type Draft, blankDraft } from '../logic';
import { uid, useHL, useStore } from '../store';
import { RepeatBuilder } from './RepeatBuilder';

const STEPS = ['Check the basics', 'Count what\'s on it', 'Add items', 'Review & finish'];
const COUNT_TYPES: ItemType[] = ['reading', 'assignment', 'exam', 'quiz'];

export function SyllabusView({ courseId }: { courseId: CourseId }) {
  const { s, d } = useStore();
  const course = courseById(courseId);
  const syl = s.syllabi[courseId];
  const step = syl.status === 'done' ? 3 : syl.step;

  return (
    <div className="page syllabus">
      <header className="course-head" style={{ ['--c' as string]: course.color, ['--t' as string]: course.tint }}>
        <div className="course-head-main">
          <div className="course-chip">{course.code}</div>
          <div>
            <h1>{course.name}</h1>
            <div className="course-meta">
              <span>{course.instructor}</span>
              <span>
                {course.days.map((x) => DAY_SHORT[x]).join(' & ')} · {fmtRange(course.start, course.end)}
              </span>
              <span>{course.room}</span>
              {course.note && <span className="meta-note">{course.note}</span>}
            </div>
          </div>
        </div>
        <div className={`syl-pill ${syl.status}`}>
          {syl.status === 'done' ? 'Syllabus entered' : syl.status === 'in-progress' ? 'Syllabus in progress' : 'Syllabus not started'}
        </div>
      </header>

      <ol className="stepper" aria-label="Syllabus steps">
        {STEPS.map((label, i) => {
          const state = i < step || syl.status === 'done' ? 'done' : i === step ? 'current' : 'todo';
          const reachable = i <= Math.max(step, syl.counts ? 2 : syl.step) || syl.status === 'done';
          return (
            <li key={label} className={`step ${state}`}>
              <button disabled={!reachable} onClick={() => d({ type: 'syllabusStep', courseId, step: i as SyllabusStep })} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="step-num">{state === 'done' ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 0 && <Basics courseId={courseId} />}
      {step === 1 && <Counts courseId={courseId} />}
      {step === 2 && <AddItems courseId={courseId} />}
      {step === 3 && <Review courseId={courseId} />}
    </div>
  );
}

// ── Step 1: basics ───────────────────────────────────────────
function Basics({ courseId }: { courseId: CourseId }) {
  const { d } = useStore();
  const c = courseById(courseId);
  return (
    <section className="card step-card">
      <h2>Does this match the top of your {c.code} syllabus?</h2>
      <p className="muted">You entered these when you added your courses. If the syllabus says something different, the syllabus wins.</p>
      <dl className="basics">
        <div><dt>Course</dt><dd>{c.code} · {c.name}</dd></div>
        <div><dt>Instructor</dt><dd>{c.instructor}</dd></div>
        <div><dt>Meets</dt><dd>{c.days.map((x) => DAY_SHORT[x]).join(', ')} · {fmtRange(c.start, c.end)}</dd></div>
        <div><dt>Room</dt><dd>{c.room}</dd></div>
        <div><dt>Credits</dt><dd>{c.credits}</dd></div>
      </dl>
      <div className="row-end">
        <button className="btn primary" onClick={() => d({ type: 'syllabusStep', courseId, step: 1 })}>
          Yes, that's right <Icon name="arrowR" />
        </button>
      </div>
    </section>
  );
}

// ── Step 2: counts ───────────────────────────────────────────
function Counts({ courseId }: { courseId: CourseId }) {
  const { s, d } = useStore();
  const c = courseById(courseId);
  const [counts, setCounts] = useState<Partial<Record<ItemType, number>>>(s.syllabi[courseId].counts ?? { reading: 0, assignment: 0, exam: 0, quiz: 0 });
  return (
    <section className="card step-card">
      <h2>Count what the {c.code} syllabus lists</h2>
      <p className="muted">
        Skim the schedule and grading sections and count each kind of item. This becomes your progress bar, so you'll know when nothing is missing.{' '}
        <button className="link" onClick={() => d({ type: 'help', article: 'syllabus-find' })}>Where are the dates in a syllabus?</button>
      </p>
      <div className="counts-grid">
        {COUNT_TYPES.map((t) => (
          <div className="count-box" key={t}>
            <div className="count-label">
              <span className="type-ico">{TYPE_META[t].icon}</span> {TYPE_META[t].plural}
            </div>
            <div className="count-hint">{TYPE_META[t].hint}</div>
            <div className="stepper-input">
              <button aria-label={`Fewer ${TYPE_META[t].plural}`} onClick={() => setCounts({ ...counts, [t]: Math.max(0, (counts[t] ?? 0) - 1) })}>−</button>
              <input
                type="number"
                min={0}
                value={counts[t] ?? 0}
                onChange={(e) => setCounts({ ...counts, [t]: Math.max(0, Number(e.target.value) || 0) })}
                aria-label={`Number of ${TYPE_META[t].plural}`}
              />
              <button aria-label={`More ${TYPE_META[t].plural}`} onClick={() => setCounts({ ...counts, [t]: (counts[t] ?? 0) + 1 })}>+</button>
            </div>
          </div>
        ))}
      </div>
      {courseId === 'math095' && (
        <div className="callout tip">
          <Icon name="info" />
          <div>Weekly online homework counts as assignments. MATH 095 has one due every Sunday, so that's about 15 for the term.</div>
        </div>
      )}
      <div className="row-between">
        <button className="btn ghost" onClick={() => d({ type: 'syllabusStep', courseId, step: 0 })}>
          <Icon name="chevronL" /> Back
        </button>
        <button
          className="btn primary"
          onClick={() => {
            d({ type: 'syllabus', courseId, patch: { counts, step: 2, status: 'in-progress' } });
          }}
        >
          Next: add items <Icon name="arrowR" />
        </button>
      </div>
    </section>
  );
}

// ── Step 3: add items ────────────────────────────────────────
function useCourseItems(courseId: CourseId) {
  const { s } = useStore();
  return useMemo(() => s.items.filter((i) => i.courseId === courseId).sort((a, b) => a.date.localeCompare(b.date)), [s.items, courseId]);
}

function Tally({ courseId }: { courseId: CourseId }) {
  const { s, d } = useStore();
  const items = useCourseItems(courseId);
  const counts = s.syllabi[courseId].counts ?? {};
  const types = COUNT_TYPES.filter((t) => (counts[t] ?? 0) > 0 || items.some((i) => i.type === t && !i.lockedBy));
  return (
    <div className="tally" data-guide="tally">
      {types.map((t) => {
        const have = items.filter((i) => i.type === t && !i.lockedBy).length;
        const want = counts[t] ?? 0;
        const pct = want ? Math.min(100, (have / want) * 100) : 100;
        const done = want > 0 && have >= want;
        return (
          <div key={t} className={`tally-box${done ? ' done' : ''}`}>
            <div className="tally-top">
              <span>{TYPE_META[t].plural}</span>
              {done && <Icon name="check" size={14} stroke={3} />}
            </div>
            <div className="tally-num">
              <strong>{have}</strong> <span>of {want || '?'}</span>
            </div>
            <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
      <button className="tally-edit link" onClick={() => d({ type: 'syllabusStep', courseId, step: 1 })}>
        Change counts
      </button>
    </div>
  );
}

function AddItems({ courseId }: { courseId: CourseId }) {
  const { s, d } = useStore();
  const course = courseById(courseId);
  const items = useCourseItems(courseId);
  const counts = s.syllabi[courseId].counts ?? {};
  const manualReadings = items.filter((i) => i.type === 'reading' && !i.seriesId);
  const draft = s.drafts[courseId];
  const showNudge = draft.repeat === 'none' && manualReadings.length >= 2 && (counts.reading ?? 0) > manualReadings.length + 2;
  const [nudgeHidden, setNudgeHidden] = useState(false);

  return (
    <>
      <Tally courseId={courseId} />

      {showNudge && !nudgeHidden && (
        <div className="callout nudge" role="note">
          <span className="nudge-ico"><Icon name="repeat" size={18} /></span>
          <div className="nudge-body">
            <strong>Typing readings one at a time?</strong> You've entered {manualReadings.length} by hand and your syllabus has {counts.reading}. Since they follow your class days ({seriesLabel({ ...draft, days: course.days })}), you can add the rest in one step.
          </div>
          <div className="nudge-actions">
            <button
              className="btn primary sm"
              onClick={() => {
                d({ type: 'draft', courseId, patch: { repeat: 'weekly', type: 'reading', days: [...course.days], naming: courseId === 'psy101' ? 'chapter' : draft.naming } });
              }}
            >
              Add the rest at once
            </button>
            <button className="btn ghost sm" onClick={() => d({ type: 'help', article: 'repeating' })}>
              Show me how
            </button>
          </div>
          <button className="callout-x" aria-label="Hide tip" onClick={() => setNudgeHidden(true)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <AddForm courseId={courseId} />
      <ItemList courseId={courseId} items={items} />

      <div className="row-between page-foot">
        <button className="btn ghost" onClick={() => d({ type: 'syllabusStep', courseId, step: 1 })}>
          <Icon name="chevronL" /> Back
        </button>
        <button className="btn primary" onClick={() => d({ type: 'syllabusStep', courseId, step: 3 })}>
          Next: review <Icon name="arrowR" />
        </button>
      </div>
    </>
  );
}

function AddForm({ courseId }: { courseId: CourseId }) {
  const { s, d, toast, flash } = useStore();
  const hl = useHL();
  const course = courseById(courseId);
  const draft = s.drafts[courseId];
  const set = (patch: Partial<Draft>) => d({ type: 'draft', courseId, patch });
  const [typeHelp, setTypeHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = s.items.filter((i) => i.courseId === courseId);
  const examDates = items.filter((i) => i.type === 'exam').map((i) => i.date);
  const gen = useMemo(() => (draft.repeat === 'weekly' ? generate(draft, examDates) : null), [draft, examDates.join()]);
  const looksLikeReading = draft.type !== 'reading' && /^\s*read(ing)?\b/i.test(draft.title);
  const timeIsClass = draft.time === course.start;

  const add = () => {
    setError(null);
    if (draft.repeat === 'none') {
      if (!draft.title.trim()) return setError('Give it a name, like "Ch. 2" or "Short paper 2".');
      if (!draft.date) return setError('Pick a date.');
      if (draft.date < TERM.start || draft.date > TERM.end) return setError(`That date is outside ${TERM.name} (Aug 24 – Dec 11).`);
      const item: Item = { id: uid('it'), courseId, type: draft.type, title: draft.title.trim(), date: draft.date, time: draft.time, remind: draft.type !== 'reading' };
      d({ type: 'addItems', items: [item] });
      toast(`Added "${item.title}" · ${fmtDay(item.date)}`, { undoable: true });
      set({ title: '' });
      return;
    }
    if (!gen || gen.items.length === 0) return setError('Pick at least one day so there is something to add.');
    const seriesId = uid('series');
    const newItems: Item[] = gen.items.map((g) => ({
      id: uid('it'),
      courseId,
      type: draft.type,
      title: g.title,
      date: g.date,
      time: draft.time,
      remind: draft.type !== 'reading',
      seriesId,
    }));
    const first = gen.items[0].title;
    const last = gen.items[gen.items.length - 1].title;
    const label = draft.naming === 'same' ? `${draft.title.trim() || TYPE_META[draft.type].label}` : `${first} → ${last}`;
    d({ type: 'addItems', items: newItems, series: { id: seriesId, courseId, type: draft.type, label, days: draft.days, count: newItems.length } });
    toast(`Added ${newItems.length} ${TYPE_META[draft.type].plural.toLowerCase()} to ${course.code}`, { undoable: true });
    d({ type: 'resetDraft', courseId, draft: { ...blankDraft(course), type: draft.type === 'reading' ? 'assignment' : draft.type, date: '2026-09-01' } });
    setTimeout(() => flash(`series-${seriesId}`), 50);
  };

  return (
    <section className="card add-form" aria-labelledby="add-h">
      <div className="card-head">
        <h2 id="add-h">Add {draft.repeat === 'weekly' ? 'a repeating set of items' : 'the next item'}</h2>
        <span className="draft-note"><Icon name="check" size={12} stroke={3} /> Draft saved, even if you open Help or switch pages</span>
      </div>

      {/* Type */}
      <div className={`field${hl('type')}`} data-guide="type">
        <div className="label-row">
          <label id="type-label">What kind of item is it?</label>
          <button className={`which-btn${typeHelp ? ' on' : ''}`} onClick={() => setTypeHelp((x) => !x)} aria-expanded={typeHelp}>
            <Icon name="help" size={14} /> Reading or assignment? Which one?
          </button>
        </div>
        <div className="seg" role="radiogroup" aria-labelledby="type-label">
          {(Object.keys(TYPE_META) as ItemType[]).map((t) => (
            <button key={t} role="radio" aria-checked={draft.type === t} className={draft.type === t ? 'on' : ''} onClick={() => set({ type: t })}>
              <span className="type-ico">{TYPE_META[t].icon}</span> {TYPE_META[t].label}
            </button>
          ))}
        </div>
        <div className="field-hint">{TYPE_META[draft.type].hint}</div>
        {looksLikeReading && (
          <div className="smart-hint">
            <Icon name="sparkle" size={14} />
            <span>
              "{draft.title.trim()}" sounds like a <strong>reading</strong>: something you read before class, with nothing to turn in.
            </span>
            <button className="btn sm" onClick={() => set({ type: 'reading' })}>Make it a reading</button>
          </div>
        )}
        {typeHelp && <TypePopover onClose={() => setTypeHelp(false)} onPick={(t) => { set({ type: t }); setTypeHelp(false); }} courseId={courseId} />}
      </div>

      {/* Name / date / time */}
      <div className={`field-row${hl('basics')}`} data-guide="basics">
        {draft.repeat === 'weekly' && (draft.naming === 'chapter' || draft.naming === 'chapter-read') ? (
          <div className="field grow">
            <label>Names</label>
            <div className="fake-input">Made from the chapter numbers below</div>
          </div>
        ) : (
          <div className="field grow">
            <label htmlFor="f-title">{draft.repeat === 'weekly' ? (draft.naming === 'numbered' ? 'Name (we add 1, 2, 3…)' : 'Name') : 'Name'}</label>
            <input
              id="f-title"
              value={draft.title}
              placeholder={draft.type === 'reading' ? 'e.g. Ch. 2' : draft.type === 'exam' ? 'e.g. Exam 1' : 'e.g. Short paper 2'}
              onChange={(e) => set({ title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="f-date">{draft.repeat === 'weekly' ? 'First date' : draft.type === 'reading' ? 'Read by' : 'Date'}</label>
          <input id="f-date" type="date" min={TERM.start} max={TERM.end} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="f-time">Due</label>
          <select
            id="f-time"
            value={timeIsClass ? 'class' : draft.time === '23:59' ? 'night' : 'other'}
            onChange={(e) => set({ time: e.target.value === 'class' ? course.start : e.target.value === 'night' ? '23:59' : '17:00' })}
          >
            <option value="class">When class starts ({fmtTime(course.start)})</option>
            <option value="night">11:59 pm (online)</option>
            <option value="other">Another time…</option>
          </select>
        </div>
        {!timeIsClass && draft.time !== '23:59' && (
          <div className="field">
            <label htmlFor="f-time2">Time</label>
            <input id="f-time2" type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
          </div>
        )}
      </div>

      {/* Repeat */}
      <div className={`field${hl('repeat')}`} data-guide="repeat">
        <div className="label-row">
          <label htmlFor="f-repeat">Repeats</label>
          <button className="link sm" onClick={() => d({ type: 'help', article: 'repeating' })}>
            How do repeating items work?
          </button>
        </div>
        <div className="repeat-toggle" role="radiogroup" id="f-repeat">
          <button role="radio" aria-checked={draft.repeat === 'none'} className={draft.repeat === 'none' ? 'on' : ''} onClick={() => set({ repeat: 'none' })}>
            <strong>Doesn't repeat</strong>
            <span>One date, like a paper or an exam</span>
          </button>
          <button
            role="radio"
            aria-checked={draft.repeat === 'weekly'}
            className={draft.repeat === 'weekly' ? 'on' : ''}
            onClick={() => set({ repeat: 'weekly' })}
          >
            <strong><Icon name="repeat" size={14} /> Every week, on certain days</strong>
            <span>Like a reading every Tue & Thu, or homework every Sunday</span>
          </button>
        </div>
      </div>

      {draft.repeat === 'weekly' && gen && <RepeatBuilder courseId={courseId} gen={gen} />}

      {error && (
        <div className="form-error" role="alert">
          <Icon name="info" size={14} /> {error}
        </div>
      )}

      <div className="form-actions">
        <button
          className="btn ghost"
          onClick={() => {
            d({ type: 'resetDraft', courseId, draft: { ...blankDraft(course), date: draft.date } });
            setError(null);
          }}
        >
          Clear form
        </button>
        <button className={`btn primary${hl('submit')}`} data-guide="submit" onClick={add} disabled={draft.repeat === 'weekly' && (!gen || gen.items.length === 0)}>
          <Icon name="plus" />
          {draft.repeat === 'weekly' && gen
            ? `Add ${gen.items.length} ${gen.items.length === 1 ? TYPE_META[draft.type].label.toLowerCase() : TYPE_META[draft.type].plural.toLowerCase()}`
            : `Add ${TYPE_META[draft.type].label.toLowerCase()}`}
        </button>
      </div>
    </section>
  );
}

function TypePopover({ onClose, onPick, courseId }: { onClose: () => void; onPick: (t: ItemType) => void; courseId: CourseId }) {
  const { d } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(t) && !t.closest('.which-btn')) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);
  const psy = courseId === 'psy101';
  return (
    <div className="popover type-pop" ref={ref} role="dialog" aria-label="Which type should I pick?">
      <div className="pop-head">
        <strong>The quick test: do you turn something in?</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={14} /></button>
      </div>
      <div className="pop-compare">
        <button className="pop-opt" onClick={() => onPick('reading')}>
          <span className="pop-q">No, I just read it</span>
          <span className="pop-type">📖 Reading</span>
          <span className="pop-ex">{psy ? 'Dr. Kim\'s chapter readings before each Tue & Thu class' : 'Pages or a chapter to read before class'}</span>
          <span className="pop-what">Shows as prep before class. No reminder.</span>
        </button>
        <button className="pop-opt" onClick={() => onPick('assignment')}>
          <span className="pop-q">Yes, I turn it in</span>
          <span className="pop-type">📝 Assignment</span>
          <span className="pop-ex">{psy ? 'The 3 short papers' : 'Papers, worksheets, MATH 095 online homework'}</span>
          <span className="pop-what">Gets a due-date reminder.</span>
        </button>
      </div>
      <div className="pop-foot">
        <span>Tests are <strong>Exams</strong> (big) or <strong>Quizzes</strong> (short). Picked wrong? You can change it later.</span>
        <button className="link sm" onClick={() => { d({ type: 'help', article: 'reading-vs-assignment' }); onClose(); }}>
          Full explanation
        </button>
      </div>
    </div>
  );
}

// ── Item list ────────────────────────────────────────────────
function ItemList({ courseId, items }: { courseId: CourseId; items: Item[] }) {
  const { s, d, toast } = useStore();
  const hl = useHL();
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const series = s.series.filter((x) => x.courseId === courseId);
  const groups: ItemType[] = ['exam', 'assignment', 'quiz', 'reading', 'other'];

  if (items.length === 0)
    return (
      <section className="card empty">
        <Icon name="book" size={22} />
        <div>
          <strong>Nothing entered yet.</strong>
          <p className="muted">Start with the exams. They're the dates you least want to miss.</p>
        </div>
      </section>
    );

  return (
    <section className="card item-list" aria-labelledby="list-h">
      <div className="card-head">
        <h2 id="list-h">What you've entered</h2>
        <span className="muted sm">{items.length} items</span>
      </div>
      {groups.map((g) => {
        const gi = items.filter((i) => i.type === g);
        if (!gi.length) return null;
        const singles = gi.filter((i) => !i.seriesId);
        const gSeries = series.filter((x) => gi.some((i) => i.seriesId === x.id));
        return (
          <div className="group" key={g}>
            <div className="group-head">
              <span className="type-ico">{TYPE_META[g].icon}</span> {TYPE_META[g].plural} <span className="muted">({gi.length})</span>
            </div>
            <ul className="rows">
              {singles.map((i) => (
                <ItemRow key={i.id} item={i} />
              ))}
              {gSeries.map((sr) => {
                const si = gi.filter((i) => i.seriesId === sr.id);
                const open = openSeries === sr.id;
                return (
                  <li key={sr.id} className={`series-row${hl(`series-${sr.id}`)}`} data-guide={`series-${sr.id}`}>
                    <div className="row">
                      <button className="series-toggle" onClick={() => setOpenSeries(open ? null : sr.id)} aria-expanded={open}>
                        <Icon name={open ? 'chevronD' : 'chevronR'} size={14} />
                      </button>
                      <span className="row-date">
                        <Icon name="repeat" size={13} /> {sr.days.map((x) => DAY_SHORT[x]).join(' & ')}
                      </span>
                      <span className="row-title">
                        {sr.label} <span className="badge">{si.length} items</span>
                      </span>
                      <span className="row-sub">
                        {fmtDay(si[0].date)} – {fmtDay(si[si.length - 1].date)}
                      </span>
                      <button
                        className="icon-btn danger"
                        title="Delete the whole series"
                        aria-label={`Delete series ${sr.label}`}
                        onClick={() => {
                          d({ type: 'removeSeries', id: sr.id });
                          toast(`Deleted ${si.length} ${TYPE_META[sr.type].plural.toLowerCase()}`, { undoable: true });
                        }}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                    {open && (
                      <ul className="rows nested">
                        {si.map((i) => (
                          <ItemRow key={i.id} item={i} />
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function ItemRow({ item }: { item: Item }) {
  const { d, toast } = useStore();
  return (
    <li className="row">
      <span className="row-date">{fmtDay(item.date)}</span>
      <span className="row-title">
        {item.title}
        {item.lockedBy && (
          <span className="badge lock">
            <Icon name="lock" size={11} /> from {item.lockedBy}
          </span>
        )}
      </span>
      <span className="row-sub">{item.time === '23:59' ? '11:59 pm' : item.time ? `${item.type === 'reading' ? 'before class' : 'at'} ${fmtTime(item.time)}` : ''}</span>
      {item.type !== 'reading' ? (
        <button
          className={`icon-btn bell${item.remind ? ' on' : ''}`}
          onClick={() => d({ type: 'toggleRemind', id: item.id })}
          aria-pressed={!!item.remind}
          title={item.remind ? 'Reminder on. Click to turn off.' : 'No reminder. Click to turn on.'}
          aria-label={`${item.remind ? 'Turn off' : 'Turn on'} reminder for ${item.title}`}
        >
          <Icon name={item.remind ? 'bell' : 'bellOff'} size={15} />
        </button>
      ) : (
        <span className="icon-spacer" />
      )}
      {item.lockedBy ? (
        <span className="icon-spacer" />
      ) : (
        <button
          className="icon-btn danger"
          aria-label={`Delete ${item.title}`}
          title="Delete"
          onClick={() => {
            d({ type: 'removeItem', id: item.id });
            toast(`Deleted "${item.title}"`, { undoable: true });
          }}
        >
          <Icon name="trash" size={15} />
        </button>
      )}
    </li>
  );
}

// ── Step 4: review ───────────────────────────────────────────
function Review({ courseId }: { courseId: CourseId }) {
  const { s, d, toast } = useStore();
  const c = courseById(courseId);
  const syl = s.syllabi[courseId];
  const items = useCourseItems(courseId).filter((i) => !i.lockedBy);
  const counts = syl.counts ?? {};
  const rows = COUNT_TYPES.filter((t) => (counts[t] ?? 0) > 0 || items.some((i) => i.type === t)).map((t) => ({
    t,
    have: items.filter((i) => i.type === t).length,
    want: counts[t] ?? 0,
  }));
  const missing = rows.filter((r) => r.have < r.want);
  const exams = items.filter((i) => i.type === 'exam');
  const [ack, setAck] = useState(false);

  if (syl.status === 'done')
    return (
      <section className="card step-card done-card">
        <div className="done-ico"><Icon name="check" size={22} stroke={3} /></div>
        <h2>{c.code} syllabus is in</h2>
        <p className="muted">{items.length} items entered. You can still add or change things any time as dates move.</p>
        <div className="row-end">
          <button className="btn ghost" onClick={() => d({ type: 'syllabus', courseId, patch: { status: 'in-progress', step: 2 } })}>
            <Icon name="pencil" /> Edit items
          </button>
          <button className="btn primary" onClick={() => d({ type: 'nav', view: { name: 'checklist' } })}>
            Back to checklist <Icon name="arrowR" />
          </button>
        </div>
      </section>
    );

  return (
    <section className="card step-card">
      <h2>Check it against the {c.code} syllabus</h2>
      <p className="muted">Here's what you entered next to what you counted.</p>
      <table className="review">
        <thead>
          <tr><th>Type</th><th>Syllabus lists</th><th>You entered</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.t} className={r.have >= r.want ? 'ok' : 'short'}>
              <td><span className="type-ico">{TYPE_META[r.t].icon}</span> {TYPE_META[r.t].plural}</td>
              <td>{r.want}</td>
              <td>{r.have}</td>
              <td>{r.have >= r.want ? <span className="ok-text"><Icon name="check" size={14} stroke={3} /> All in</span> : <span className="short-text">{r.want - r.have} missing</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {exams.length > 0 && exams.some((e) => !e.remind) && (
        <div className="callout tip">
          <Icon name="bell" />
          <div>
            {exams.filter((e) => !e.remind).length} of {exams.length} exams have no reminder yet. That's step 5 on Ms. Ortega's checklist.
          </div>
          <button
            className="btn sm"
            onClick={() => {
              d({ type: 'remindAllExams' });
              toast('Reminders on for every exam: 1 week and 1 day before', { undoable: true });
            }}
          >
            Turn on for all exams
          </button>
        </div>
      )}
      {missing.length > 0 && (
        <label className="check-line">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>My syllabus doesn't have dates for the missing items yet. I'll add them later.</span>
        </label>
      )}
      <div className="row-between">
        <button className="btn ghost" onClick={() => d({ type: 'syllabusStep', courseId, step: 2 })}>
          <Icon name="chevronL" /> {missing.length ? 'Go back and add the missing items' : 'Back'}
        </button>
        <button
          className="btn primary"
          disabled={missing.length > 0 && !ack}
          onClick={() => {
            d({ type: 'syllabus', courseId, patch: { status: 'done', step: 3 } });
            toast(`${c.code} syllabus done. That's one more toward "Import every syllabus".`, { undoable: true });
          }}
        >
          <Icon name="check" /> Finish {c.code}
        </button>
      </div>
    </section>
  );
}
