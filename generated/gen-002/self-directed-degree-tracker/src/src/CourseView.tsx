import { useEffect, useRef, useState } from 'react';
import { Course, HourEntry, ProblemSet, RULES, TODAY } from './data';
import { duplicateGroups, expectedHours, fmtDate, fmtH, hoursByActivity, isDone, pct, totalHours } from './logic';
import { Icon, StatusPill } from './ui';
import type { Actions } from './App';

interface Props {
  course: Course;
  all: Record<string, Course>;
  actions: Actions;
  focus: { key: string; n: number } | null;
}

export function CourseView({ course: c, all, actions, focus }: Props) {
  const refs = {
    sets: useRef<HTMLElement>(null),
    hours: useRef<HTMLElement>(null),
    exams: useRef<HTMLElement>(null),
    chapters: useRef<HTMLElement>(null),
  };
  const [lit, setLit] = useState<string | null>(null);

  useEffect(() => {
    if (!focus) return;
    const el = refs[focus.key as keyof typeof refs]?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setLit(focus.key);
    const t = setTimeout(() => setLit(null), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.n]);

  const detailed = c.chapters.length > 0;
  const hours = totalHours(c);
  const [lo, hi] = expectedHours(c);
  const attempted = c.problemSets.reduce((s, p) => s + p.attempted, 0);
  const correct = c.problemSets.reduce((s, p) => s + p.correct, 0);
  const dupes = duplicateGroups(c);
  const doneCh = c.chapters.filter((x) => x.done).length;

  return (
    <div className="course">
      <div className="crumbs">
        <button className="link" onClick={() => actions.select('overview')}>
          Degree requirements
        </button>
        <Icon name="chevron" size={12} />
        <span>{c.code}</span>
      </div>
      <div className="course-head">
        <div>
          <div className="course-code">
            {c.code} · {c.credits} credits
          </div>
          <h1>{c.title}</h1>
          <div className="course-meta">
            <StatusPill status={c.status} />
            {c.prereqs.length > 0 && (
              <span>
                Requires{' '}
                {c.prereqs.map((p, i) => (
                  <span key={p}>
                    {i > 0 && ', '}
                    <button className="link" onClick={() => actions.select(p)}>
                      {p} {all[p]?.title}
                    </button>
                  </span>
                ))}
              </span>
            )}
            {c.startedOn && <span>Started {fmtDate(c.startedOn)}</span>}
            {c.completedOn && isDone(c.status) && <span>Completed {fmtDate(c.completedOn)}</span>}
          </div>
        </div>
      </div>
      {c.catalogNote && (
        <p className="catalog">
          <span className="catalog-label">Catalog description</span>
          {c.catalogNote}
        </p>
      )}

      {c.status === 'not-started' ? (
        <NotStarted c={c} all={all} actions={actions} />
      ) : (
        <>
          <div className="stats">
            {detailed && (
              <button className="stat" onClick={() => actions.flash('chapters')}>
                <span className="stat-label">Chapters</span>
                <span className="stat-val">
                  {doneCh}
                  <small>/{c.chapters.length}</small>
                </span>
                <span className="stat-sub">{c.chapters.filter((x) => !x.done).map((x) => `Ch. ${x.n}`).join(', ') || 'all'} {c.chapters.some((x) => !x.done) ? 'skipped' : 'covered'}</span>
              </button>
            )}
            <button className={'stat' + (dupes.length ? ' stat-warn' : '')} onClick={() => actions.flash('sets')}>
              <span className="stat-label">Problem sets</span>
              <span className="stat-val">{c.problemSets.length}</span>
              <span className="stat-sub">{dupes.length ? `incl. ${dupes.reduce((s, g) => s + g.length - 1, 0)} duplicate` : `${correct}/${attempted} correct · ${pct(correct, attempted)}%`}</span>
            </button>
            <button className={'stat' + (c.exams.length === 0 ? ' stat-fail' : '')} onClick={() => actions.flash('exams')}>
              <span className="stat-label">Timed exams</span>
              <span className="stat-val">{c.exams.length}</span>
              <span className="stat-sub">{c.exams.length ? c.exams.map((e) => `${e.score}%`).join(' · ') : 'none on record'}</span>
            </button>
            <button className={'stat' + (hours < lo ? ' stat-warn' : '')} onClick={() => actions.flash('hours')}>
              <span className="stat-label">Hours</span>
              <span className="stat-val">
                {fmtH(hours).replace(' h', '')}
                <small> h</small>
              </span>
              <span className="stat-sub">
                expected {lo}–{hi} h
              </span>
            </button>
          </div>

          {c.legacyNote && c.exams.length === 0 && (
            <div className="callout callout-fail">
              <Icon name="info" />
              <div>
                <strong>No exam on record.</strong> {c.legacyNote}
                {c.notableSessions?.filter((s) => s.examLike).map((s) => (
                  <div key={s.date} className="callout-sub">
                    Your hours log has a {s.hours} h session on {fmtDate(s.date)}: “{s.label}”.
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={() => actions.openExam(c.id)}>
                Log the exam
              </button>
            </div>
          )}

          <Section title="Resources" count={c.resources.length}>
            <div className="resources">
              {c.resources.map((r) => (
                <div className="res" key={r.id}>
                  <span className={`res-icon res-${r.kind}`}>
                    <Icon name={r.kind === 'textbook' ? 'book' : r.kind} size={18} />
                  </span>
                  <div className="res-body">
                    <div className="res-title">{r.title}</div>
                    <div className="res-by">{r.byline}</div>
                    <div className="res-meta">{r.meta}</div>
                  </div>
                  <div className="res-side">
                    <span className={'tag' + (r.role === 'Primary' ? ' tag-strong' : '')}>{r.role}</span>
                    <span className="res-progress">{r.progress}</span>
                    {r.lectures && (
                      <span className="res-hours">
                        <Icon name="clock" size={12} /> {fmtH(r.lectures.hoursLogged)} logged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {detailed && (
            <Section title="Chapters covered" count={`${doneCh} of ${c.chapters.length}`} innerRef={refs.chapters} lit={lit === 'chapters'} hint="Click to toggle">
              <div className="chapters">
                {c.chapters.map((ch) => {
                  const inCatalog = c.catalogTopics.some((t) => t.chapters.includes(ch.n));
                  return (
                    <button key={ch.n} className={'chapter' + (ch.done ? ' done' : '')} onClick={() => actions.toggleChapter(c.id, ch.n)} aria-pressed={ch.done}>
                      <span className="ch-box">{ch.done && <Icon name="check" size={12} />}</span>
                      <span className="ch-n">{ch.n}</span>
                      <span className="ch-title">{ch.title}</span>
                      {!inCatalog && <span className="ch-tag" title="Not part of the catalog description">not in catalog</span>}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Problem sets" count={c.problemSets.length} innerRef={refs.sets} lit={lit === 'sets'} hint="Self-graded against the solutions manual">
            {detailed ? <SetsTable c={c} actions={actions} /> : <SetsSummary c={c} />}
          </Section>

          <Section
            title="Timed exams"
            count={c.exams.length}
            innerRef={refs.exams}
            lit={lit === 'exams'}
            hint={`Your rule: ${RULES.examMin}% minimum on every exam`}
            action={
              <button className="btn btn-sm" onClick={() => actions.openExam(c.id)}>
                <Icon name="plus" size={14} /> Log exam
              </button>
            }
          >
            {c.exams.length === 0 ? (
              <div className="empty">No timed exams logged for {c.code}.</div>
            ) : (
              <div className="exams">
                {c.exams.map((e) => (
                  <div className="exam" key={e.id}>
                    <div className={'exam-score' + (e.score >= RULES.examMin ? ' ok' : ' low')}>
                      {e.score}
                      <small>%</small>
                    </div>
                    <div className="exam-body">
                      <div className="exam-title">
                        {e.title}
                        {e.pointsPossible && (
                          <span className="muted">
                            {' '}
                            · {e.pointsEarned}/{e.pointsPossible} pts
                          </span>
                        )}
                      </div>
                      <div className="exam-src">{e.source}</div>
                      <div className="exam-meta">
                        <span>
                          <Icon name="clock" size={12} /> {e.timeLimitMin} min limit
                        </span>
                        <span>Taken {fmtDate(e.date)}</span>
                        <span>{e.conditions}</span>
                      </div>
                    </div>
                    <button className="icon-btn" title="Remove exam" onClick={() => actions.removeExam(c.id, e.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Hours" count={fmtH(hours)} innerRef={refs.hours} lit={lit === 'hours'} hint={`${RULES.hoursPerCreditMin}–${RULES.hoursPerCreditMax} h per credit`}>
            <HoursBlock c={c} actions={actions} />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, count, children, innerRef, lit, hint, action }: { title: string; count?: string | number; children: React.ReactNode; innerRef?: React.RefObject<HTMLElement>; lit?: boolean; hint?: string; action?: React.ReactNode }) {
  return (
    <section className={'section' + (lit ? ' lit' : '')} ref={innerRef}>
      <div className="section-head">
        <h2>
          {title} {count !== undefined && <span className="count">{count}</span>}
        </h2>
        {hint && <span className="hint">{hint}</span>}
        {action && <div className="section-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function AccBar({ a, b }: { a: number; b: number }) {
  const p = pct(a, b);
  return (
    <span className="acc">
      <span className="acc-track">
        <span className="acc-fill" style={{ width: p + '%' }} />
      </span>
      <span className="acc-num">{p}%</span>
    </span>
  );
}

function SetsSummary({ c }: { c: Course }) {
  const a = c.problemSets.reduce((s, p) => s + p.attempted, 0);
  const k = c.problemSets.reduce((s, p) => s + p.correct, 0);
  return (
    <div className="sets-summary">
      <div>
        <strong>{c.problemSets.length}</strong> sets logged
      </div>
      <div>
        <strong>{a}</strong> problems attempted
      </div>
      <div>
        <strong>{k}</strong> correct
      </div>
      <AccBar a={k} b={a} />
    </div>
  );
}

function SetsTable({ c, actions }: { c: Course; actions: Actions }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProblemSet | null>(null);
  const [adding, setAdding] = useState(false);
  const dupes = duplicateGroups(c);
  const dupIds = new Set(dupes.flat().map((p) => p.id));
  const totalA = c.problemSets.reduce((s, p) => s + p.attempted, 0);
  const totalC = c.problemSets.reduce((s, p) => s + p.correct, 0);
  const invalid = draft && (draft.correct > draft.attempted || draft.attempted <= 0 || draft.correct < 0);

  return (
    <div className="table-wrap">
      <table className="sets fixed">
        <colgroup>
          <col style={{ width: 34 }} />
          <col style={{ width: 82 }} />
          <col />
          <col style={{ width: 86 }} />
          <col style={{ width: 70 }} />
          <col style={{ width: 112 }} />
          <col style={{ width: 62 }} />
          <col style={{ width: 92 }} />
          <col style={{ width: 70 }} />
        </colgroup>
        <thead>
          <tr>
            <th className="c-ch">Ch.</th>
            <th>Sections</th>
            <th>Topic</th>
            <th className="num">Attempted</th>
            <th className="num">Correct</th>
            <th className="c-acc">Accuracy</th>
            <th>Worked</th>
            <th>Logged</th>
            <th className="c-act" />
          </tr>
        </thead>
        <tbody>
          {c.problemSets.map((p) => {
            const isDup = dupIds.has(p.id);
            const group = dupes.find((g) => g.some((x) => x.id === p.id));
            const lastOfGroup = group && group[group.length - 1].id === p.id;
            const isEditing = editing === p.id && draft;
            return (
              <FragmentRows key={p.id}>
                <tr className={(isDup ? 'dup ' : '') + (p.keptIntentionally ? 'kept ' : '') + (isEditing ? 'editing' : '')}>
                  <td className="c-ch">{p.chapter}</td>
                  <td className="sec">{p.sections}</td>
                  <td className="topic" title={p.title}>
                    {p.keptIntentionally && <span className="tag tag-soft">repeat</span>}
                    {p.title}
                  </td>
                  {isEditing ? (
                    <>
                      <td className="num">
                        <input type="number" min={1} value={draft.attempted} onChange={(e) => setDraft({ ...draft, attempted: +e.target.value })} aria-label="Attempted" />
                      </td>
                      <td className="num">
                        <input type="number" min={0} value={draft.correct} onChange={(e) => setDraft({ ...draft, correct: +e.target.value })} aria-label="Correct" />
                      </td>
                      <td className="c-acc">{invalid ? <span className="err">More than attempted</span> : <AccBar a={draft.correct} b={draft.attempted} />}</td>
                    </>
                  ) : (
                    <>
                      <td className="num">{p.attempted}</td>
                      <td className="num">{p.correct}</td>
                      <td className="c-acc">
                        <AccBar a={p.correct} b={p.attempted} />
                      </td>
                    </>
                  )}
                  <td className="nowrap">{fmtDate(p.date, false)}</td>
                  <td className="nowrap logged">
                    <span className="via" title={`Logged from ${p.via.toLowerCase()}`}>
                      <Icon name={p.via === 'Phone' ? 'phone' : 'desktop'} size={13} />
                    </span>
                    {p.loggedAt.split(', ')[1] ?? p.loggedAt}
                  </td>
                  <td className="c-act">
                    {isEditing ? (
                      <span className="row-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={!!invalid}
                          onClick={() => {
                            actions.saveSet(c.id, draft);
                            setEditing(null);
                            actions.toast(`Updated Ch. ${draft.chapter} set to ${draft.correct}/${draft.attempted}.`);
                          }}
                        >
                          Save
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="row-actions">
                        <button
                          className="icon-btn"
                          title="Edit scores"
                          onClick={() => {
                            setEditing(p.id);
                            setDraft({ ...p });
                          }}
                        >
                          <Icon name="pencil" size={15} />
                        </button>
                        <button className="icon-btn danger" title="Remove problem set" onClick={() => actions.removeSet(c.id, p.id)}>
                          <Icon name="trash" size={15} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
                {isDup && lastOfGroup && group && (
                  <tr className="dup-resolve">
                    <td colSpan={9}>
                      <div className="dup-box">
                        <Icon name="alert" size={16} />
                        <div className="dup-text">
                          <strong>Looks like the same set entered twice.</strong> Both rows: Ch. {p.chapter} §{p.sections}, {p.correct}/{p.attempted}, worked {fmtDate(p.date, false)}. Logged {group.map((g) => `${g.loggedAt.split(', ')[1]} from ${g.via.toLowerCase()}`).join(' and ')}.
                        </div>
                        <button className="btn btn-sm btn-warn" onClick={() => actions.removeSet(c.id, group[group.length - 1].id)}>
                          Remove the {group[group.length - 1].loggedAt.split(', ')[1]} entry
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => actions.keepBoth(c.id, group.map((g) => g.id))}>
                          Keep both — I did it twice
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </FragmentRows>
            );
          })}
          {adding && <AddSetRow c={c} onDone={() => setAdding(false)} actions={actions} />}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td colSpan={2}>
              {!adding && (
                <button className="link add-link" onClick={() => setAdding(true)}>
                  <Icon name="plus" size={13} /> Add problem set
                </button>
              )}
            </td>
            <td className="num strong">{totalA}</td>
            <td className="num strong">{totalC}</td>
            <td className="c-acc">
              <AccBar a={totalC} b={totalA} />
            </td>
            <td colSpan={3} className="muted small">
              {dupes.length ? 'Totals include the duplicate' : 'Totals'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function AddSetRow({ c, onDone, actions }: { c: Course; onDone: () => void; actions: Actions }) {
  const [ch, setCh] = useState(c.chapters.find((x) => x.done)?.n ?? 1);
  const [sections, setSections] = useState('');
  const [att, setAtt] = useState<number | ''>('');
  const [cor, setCor] = useState<number | ''>('');
  const [date, setDate] = useState(TODAY);
  const ok = att !== '' && cor !== '' && att > 0 && cor >= 0 && cor <= att && sections.trim();
  return (
    <tr className="add-row">
      <td className="c-ch">
        <select value={ch} onChange={(e) => setCh(+e.target.value)} aria-label="Chapter">
          {c.chapters.map((x) => (
            <option key={x.n} value={x.n}>
              {x.n}
            </option>
          ))}
        </select>
      </td>
      <td colSpan={2}>
        <input placeholder="Sections, e.g. 9.A–9.B" value={sections} onChange={(e) => setSections(e.target.value)} autoFocus />
      </td>
      <td className="num">
        <input type="number" min={1} value={att} onChange={(e) => setAtt(e.target.value === '' ? '' : +e.target.value)} aria-label="Attempted" />
      </td>
      <td className="num">
        <input type="number" min={0} value={cor} onChange={(e) => setCor(e.target.value === '' ? '' : +e.target.value)} aria-label="Correct" />
      </td>
      <td className="c-acc">{att !== '' && cor !== '' && cor > att ? <span className="err">More than attempted</span> : att && cor !== '' ? <AccBar a={+cor} b={+att} /> : null}</td>
      <td colSpan={2}>
        <input type="date" value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} aria-label="Date worked" />
      </td>
      <td className="c-act">
        <span className="row-actions">
          <button
            className="btn btn-sm btn-primary"
            disabled={!ok}
            onClick={() => {
              const title = c.chapters.find((x) => x.n === ch)?.title ?? '';
              const now = new Date();
              actions.addSet(c.id, {
                id: 'n' + now.getTime(),
                chapter: ch,
                title,
                sections: sections.trim(),
                attempted: +att,
                correct: +cor,
                date,
                loggedAt: `${fmtDate(TODAY, false)}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
                via: 'Desktop',
              });
              onDone();
            }}
          >
            Add
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onDone}>
            Cancel
          </button>
        </span>
      </td>
    </tr>
  );
}

function HoursBlock({ c, actions }: { c: Course; actions: Actions }) {
  const hours = totalHours(c);
  const [lo, hi] = expectedHours(c);
  const scaleMax = Math.max(hi * 1.1, hours * 1.05);
  const by = hoursByActivity(c);
  const [form, setForm] = useState<{ date: string; hours: string; activity: HourEntry['activity']; note: string }>({ date: TODAY, hours: '', activity: 'Reading', note: '' });
  const [showForm, setShowForm] = useState(false);
  const maxWeek = Math.max(...(c.weekly?.map((w) => w.hours) ?? [1]));

  const suggestions = c.resources
    .filter((r) => r.lectures)
    .map((r) => {
      const l = r.lectures!;
      const est = (l.watched * l.minutesEach) / 60;
      const missing = Math.round((est - l.hoursLogged) * 2) / 2;
      return { r, est, missing };
    })
    .filter((s) => s.missing >= 0.5);

  const colors: Record<string, string> = { Reading: 'var(--c-read)', 'Problem sets': 'var(--c-sets)', Lectures: 'var(--c-lect)', Exams: 'var(--c-exam)', Review: 'var(--c-rev)' };

  return (
    <div className="hours">
      <div className="range">
        <div className="range-track">
          <div className="range-band" style={{ left: `${(lo / scaleMax) * 100}%`, width: `${((hi - lo) / scaleMax) * 100}%` }}>
            <span>
              expected {lo}–{hi} h
            </span>
          </div>
          <div className="range-stack" style={{ width: `${(hours / scaleMax) * 100}%` }}>
            {Object.entries(by)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => (
                <span key={k} style={{ width: `${(v / hours) * 100}%`, background: colors[k] }} title={`${k}: ${fmtH(v)}`} />
              ))}
          </div>
          <div className="range-marker" style={{ left: `${(hours / scaleMax) * 100}%` }}>
            <span>{fmtH(hours)}</span>
          </div>
        </div>
        <div className="legend">
          {Object.entries(by).map(([k, v]) => (
            <span key={k} className={v === 0 ? 'zero' : ''}>
              <i style={{ background: colors[k] }} />
              {k} <strong>{fmtH(v)}</strong>
            </span>
          ))}
          <span className="legend-gap">{hours < lo ? `${fmtH(lo - hours)} short of the minimum` : hours > hi ? 'Above the expected range' : 'Within range'}</span>
        </div>
      </div>

      {c.weekly && (
        <div className="weekly">
          <div className="sub-h">Sessions logged by week</div>
          <div className="bars">
            {c.weekly.map((w) => (
              <div className="bar-col" key={w.week} title={`Week of ${fmtDate(w.week)}: ${fmtH(w.hours)}`}>
                <span className="bar-val">{w.hours}</span>
                <span className="bar" style={{ height: `${(w.hours / maxWeek) * 64}px` }} />
                <span className="bar-lbl">{fmtDate(w.week, false).replace(' ', ' ')}</span>
              </div>
            ))}
          </div>
          <div className="small muted">Average {fmtH(Math.round((c.weekly.reduce((s, w) => s + w.hours, 0) / c.weekly.length) * 10) / 10)} per week over {c.weekly.length} weeks</div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="suggest">
          <div className="sub-h">Time you may not have logged</div>
          {suggestions.map(({ r, missing }) => (
            <div className="suggest-row" key={r.id}>
              <span className={`res-icon res-${r.kind} sm`}>
                <Icon name={r.kind === 'textbook' ? 'book' : r.kind} size={14} />
              </span>
              <div className="suggest-text">
                <strong>{r.title}</strong> — {r.lectures!.watched} {r.kind === 'video' ? 'videos' : 'lectures'} marked watched, {fmtH(r.lectures!.hoursLogged)} logged.
                <span className="muted">
                  {' '}
                  At ~{r.lectures!.minutesEach} min each that’s about {fmtH(missing)}.
                </span>
              </div>
              <button
                className="btn btn-sm"
                onClick={() =>
                  actions.addHours(
                    c.id,
                    { id: 'h' + Date.now(), date: TODAY, hours: missing, activity: 'Lectures', note: `${r.title} — ${r.lectures!.watched} ${r.kind === 'video' ? 'videos' : 'lectures'}, estimated` },
                    r.id,
                  )
                }
              >
                <Icon name="plus" size={13} /> Add {fmtH(missing)}
              </button>
            </div>
          ))}
        </div>
      )}

      {c.extraHours.length > 0 && (
        <div className="extra">
          <div className="sub-h">Added during this review</div>
          {c.extraHours.map((h) => (
            <div className="extra-row" key={h.id}>
              <span className="extra-h">+{fmtH(h.hours)}</span>
              <span className="tag">{h.activity}</span>
              <span className="extra-note">{h.note || '—'}</span>
              <span className="muted small">{fmtDate(h.date)}</span>
              <button className="icon-btn" title="Remove" onClick={() => actions.removeHours(c.id, h.id)}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isDone(c.status) &&
        (showForm ? (
          <form
            className="hours-form"
            onSubmit={(e) => {
              e.preventDefault();
              const h = parseFloat(form.hours);
              if (!(h > 0)) return;
              actions.addHours(c.id, { id: 'h' + Date.now(), date: form.date, hours: h, activity: form.activity, note: form.note.trim() });
              setForm({ ...form, hours: '', note: '' });
              setShowForm(false);
            }}
          >
            <label>
              Date
              <input type="date" value={form.date} max={TODAY} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label>
              Hours
              <input type="number" step="0.25" min="0.25" max="24" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="2.5" autoFocus />
            </label>
            <label>
              Activity
              <select value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value as HourEntry['activity'] })}>
                {['Reading', 'Problem sets', 'Lectures', 'Exams', 'Review'].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="grow">
              Note
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What you worked on" />
            </label>
            <button className="btn btn-primary" type="submit" disabled={!(parseFloat(form.hours) > 0)}>
              Add hours
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button className="link add-link" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={13} /> Log a session you missed
          </button>
        ))}
    </div>
  );
}

function NotStarted({ c, all, actions }: { c: Course; all: Record<string, Course>; actions: Actions }) {
  return (
    <div className="notstarted">
      <div className="sub-h">Prerequisites</div>
      {c.prereqs.map((p) => {
        const pc = all[p];
        const ok = isDone(pc.status);
        return (
          <button key={p} className="prereq-row" onClick={() => actions.select(p)}>
            <span className={'cicon ' + (ok ? 'cicon-pass' : 'cicon-warn')}>
              <Icon name={ok ? 'check' : 'clock'} size={14} />
            </span>
            <span className="nav-code">{pc.code}</span> {pc.title}
            <span className="muted small"> — {ok ? 'done' : pc.status === 'review' ? 'in completion review' : pc.status.replace('-', ' ')}</span>
          </button>
        );
      })}
      <p className="muted small">Nothing logged yet. Resources, problem sets and exams will appear here once you start.</p>
    </div>
  );
}
