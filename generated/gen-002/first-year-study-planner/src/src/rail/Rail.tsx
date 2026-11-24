import { useMemo, useState } from 'react';
import { CHECKIN, COACHING, courseById, type CourseId } from '../data';
import { NOW, TODAY, daysBetween, fmtDay } from '../dates';
import { Icon } from '../Icon';
import { checklist } from '../checklist';
import { ARTICLES, CATEGORIES, articleById, type Article, type Block } from '../help';
import { useStore, type State } from '../store';

export function Rail() {
  const { s, d } = useStore();
  const steps = checklist(s);
  const done = steps.filter((x) => x.done).length;
  return (
    <aside className="rail" aria-label="Side panel">
      <div className="rail-tabs" role="tablist">
        <button role="tab" aria-selected={s.rail === 'checklist'} className={s.rail === 'checklist' ? 'on' : ''} onClick={() => d({ type: 'rail', tab: 'checklist' })}>
          Check-in list <span className="tab-count">{done}/7</span>
        </button>
        <button role="tab" aria-selected={s.rail === 'help'} className={s.rail === 'help' ? 'on' : ''} onClick={() => d({ type: 'help', article: s.helpArticle })}>
          <Icon name="help" size={14} /> Help
        </button>
        <button className="icon-btn rail-close" aria-label="Hide side panel" title="Hide side panel" onClick={() => d({ type: 'railOpen', open: false })}>
          <Icon name="x" size={15} />
        </button>
      </div>
      <div className="rail-body">{s.rail === 'checklist' ? <CheckinRail /> : <HelpRail />}</div>
    </aside>
  );
}

export function CheckinCountdown({ done }: { done: number }) {
  const days = daysBetween(TODAY, CHECKIN.date);
  return (
    <div className="countdown">
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="27" cy="27" r="23" fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle
          cx="27"
          cy="27"
          r="23"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(done / 7) * 144.5} 144.5`}
          transform="rotate(-90 27 27)"
        />
        <text x="27" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)">
          {done}/7
        </text>
      </svg>
      <div>
        <div className="cd-label">{CHECKIN.label}</div>
        <div className="cd-date">Tue, Sep 1 · 11:59 pm</div>
        <div className={`cd-days${days <= 2 ? ' soon' : ''}`}>
          {days} days left · {7 - done} step{7 - done === 1 ? '' : 's'} to go
        </div>
      </div>
    </div>
  );
}

function CheckinRail() {
  const { s, d, toast } = useStore();
  const steps = checklist(s);
  const done = steps.filter((x) => x.done).length;
  const firstOpen = steps.findIndex((x) => !x.done);
  const here = s.view.name === 'course' ? 'syllabi' : s.view.name === 'week' ? 'week' : null;

  return (
    <div className="checkin-rail" data-tour="checklist-rail">
      <div className="rail-section">
        <div className="eyebrow">Ms. Ortega's setup checklist</div>
        <CheckinCountdown done={done} />
      </div>
      <ol className="mini-steps">
        {steps.map((st, i) => (
          <li key={st.id} className={`${st.done ? 'done' : ''}${i === firstOpen ? ' next' : ''}`}>
            <span className="ms-dot">{st.done ? <Icon name="check" size={11} stroke={3.5} /> : i + 1}</span>
            <div className="ms-body">
              <div className="ms-title">
                {st.title}
                {here === st.id && !st.done && <span className="here-tag">You're here</span>}
              </div>
              <div className="ms-detail">{st.detail}</div>
              {st.progress && !st.done && st.progress[1] > 0 && (
                <div className="bar thin"><span style={{ width: `${(st.progress[0] / st.progress[1]) * 100}%` }} /></div>
              )}
              {!st.done && st.action && here !== st.id && (
                <button
                  className="link sm"
                  onClick={() => {
                    if (st.action!.view) d({ type: 'nav', view: st.action!.view });
                    if (st.action!.kind === 'share') d({ type: 'modal', modal: 'share' });
                    if (st.action!.kind === 'reminders') {
                      d({ type: 'remindAllExams' });
                      toast('Reminders on for every exam: 1 week and 1 day before', { undoable: true });
                    }
                  }}
                >
                  {st.action.label} →
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="rail-note">
        <Icon name="info" size={13} /> Steps check themselves off. You can share before everything's done. Ms. Ortega sees updates as you make them.
      </p>
      <button className="btn ghost sm full" onClick={() => d({ type: 'nav', view: { name: 'checklist' } })}>
        Open full checklist
      </button>
    </div>
  );
}

// ── Help ─────────────────────────────────────────────────────

function contextKey(s: State): Article['context'][number] {
  return s.view.name === 'course' ? 'syllabus' : s.view.name === 'week' ? 'week' : 'checklist';
}

function articleText(a: Article): string {
  return [a.title, ...a.body.map((b) => ('p' in b ? b.p : 'tip' in b ? b.tip : 'steps' in b ? b.steps.join(' ') : b.compare.map((c) => Object.values(c).join(' ')).join(' ')))].join(' ').toLowerCase();
}

function HelpRail() {
  const { s, d } = useStore();
  const art = s.helpArticle ? articleById(s.helpArticle) : null;
  if (art) return <ArticleView article={art} />;

  const q = s.helpQuery.trim().toLowerCase();
  const ctx = contextKey(s);
  const order: Record<string, string[]> = {
    syllabus: ['reading-vs-assignment', 'repeating', 'syllabus-find', 'due-times', 'syllabus-count'],
    week: ['plan-week', 'study-hours', 'work-and-school', 'prep-time', 'busy-week'],
    checklist: ['gs-checklist', 'checkin', 'exam-reminders', 'plan-week', 'share'],
  };
  const forPage = (order[ctx] ?? []).map((id) => articleById(id)!).filter(Boolean);
  const words = q.split(/\s+/).map((w) => w.replace(/s$/, ''));
  const results = q
    ? ARTICLES.filter((a) => words.every((w) => articleText(a).includes(w))).sort(
        (a, b) => words.filter((w) => b.title.toLowerCase().includes(w)).length - words.filter((w) => a.title.toLowerCase().includes(w)).length,
      )
    : [];

  return (
    <div className="help-rail">
      <div className="search">
        <Icon name="search" size={15} />
        <input
          type="search"
          placeholder="Search 26 how-to articles"
          value={s.helpQuery}
          onChange={(e) => d({ type: 'helpQuery', query: e.target.value })}
          aria-label="Search help"
          autoFocus
        />
      </div>

      {q ? (
        <div className="rail-section">
          <div className="eyebrow">{results.length} result{results.length === 1 ? '' : 's'}</div>
          <ArticleList list={results} />
          {results.length === 0 && (
            <p className="muted sm">
              Nothing matches "{s.helpQuery}". Try "repeat", "reading", or "reminder", or ask a peer coach below.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="rail-section">
            <div className="eyebrow">Help for this page</div>
            <ArticleList list={forPage} />
          </div>
          <CoachingCard />
          <BrowseAll />
        </>
      )}
      {q && <CoachingCard />}
    </div>
  );
}

function ArticleList({ list }: { list: Article[] }) {
  const { d } = useStore();
  return (
    <ul className="art-list">
      {list.map((a) => (
        <li key={a.id}>
          <button onClick={() => d({ type: 'help', article: a.id })}>
            <span className="art-ico">{a.walkthrough ? <Icon name="play" size={12} /> : <Icon name="book" size={13} />}</span>
            <span className="art-title">
              {a.title}
              <span className="art-meta">
                {a.walkthrough ? 'Walkthrough · ' : ''}
                {a.minutes} min
              </span>
            </span>
            <Icon name="chevronR" size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function BrowseAll() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="rail-section">
      <div className="eyebrow">All {ARTICLES.length} articles</div>
      <ul className="cats">
        {CATEGORIES.map((c) => {
          const list = ARTICLES.filter((a) => a.category === c);
          const isOpen = open === c;
          return (
            <li key={c}>
              <button className="cat-btn" onClick={() => setOpen(isOpen ? null : c)} aria-expanded={isOpen}>
                <Icon name={isOpen ? 'chevronD' : 'chevronR'} size={14} />
                <span>{c}</span>
                <span className="muted sm">{list.length}</span>
              </button>
              {isOpen && <ArticleList list={list} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function coachingStatus() {
  const day = NOW.getDay();
  const mins = NOW.getHours() * 60 + NOW.getMinutes();
  const openNow = COACHING.days.includes(day) && mins >= 600 && mins < 1080;
  return openNow ? 'Open now until 6 pm' : 'Closed now · opens Mon 10 am';
}

function CoachingCard() {
  const { s, d } = useStore();
  const booked = s.blocks.find((b) => b.kind === 'coaching');
  return (
    <div className="coach-card">
      <div className="coach-top">
        <span className="coach-ico"><Icon name="users" size={18} /></span>
        <div>
          <strong>Rather ask a person?</strong>
          <div className="sm">Peer coaches can enter a syllabus with you, side by side.</div>
        </div>
      </div>
      <div className="coach-meta">
        <div><Icon name="clock" size={13} /> {COACHING.hours}</div>
        <div><Icon name="flag" size={13} /> {COACHING.where}</div>
        <div className="coach-status"><span className="dot-closed" /> {coachingStatus()}</div>
      </div>
      {booked ? (
        <div className="coach-booked">
          <Icon name="check" size={13} stroke={3} /> Drop-in planned {fmtDay(booked.date!)}. It's on your week.
        </div>
      ) : (
        <button className="btn sm full" onClick={() => d({ type: 'modal', modal: 'coaching' })}>
          Put a drop-in visit on my week
        </button>
      )}
    </div>
  );
}

// ── Article ──────────────────────────────────────────────────
function ArticleView({ article }: { article: Article }) {
  const { s, d } = useStore();
  const related = ARTICLES.filter((a) => a.category === article.category && a.id !== article.id).slice(0, 3);
  const onCourse = s.view.name === 'course' && s.syllabi[s.view.courseId].step === 2 && s.syllabi[s.view.courseId].status !== 'done';

  return (
    <div className="article">
      <button className="link back" onClick={() => d({ type: 'help', article: null })}>
        <Icon name="chevronL" size={14} /> All help
      </button>
      <div className="eyebrow">
        {article.category} · {article.walkthrough ? 'Walkthrough · ' : ''}
        {article.minutes} min
      </div>
      <h2>{article.title}</h2>

      {article.walkthrough && onCourse && s.view.name === 'course' ? (
        <>
          <p>{(article.body[0] as { p: string }).p}</p>
          <LiveWalkthrough courseId={s.view.courseId} />
          {article.body.slice(2).map((b, i) => <BodyBlock key={i} b={b} />)}
        </>
      ) : (
        <>
          {article.body.map((b, i) => <BodyBlock key={i} b={b} />)}
          {article.walkthrough && (
            <button className="btn primary sm" onClick={() => d({ type: 'nav', view: { name: 'course', courseId: 'psy101' } })}>
              Try it in PSY 101 <Icon name="arrowR" />
            </button>
          )}
        </>
      )}

      <div className="art-foot">
        <div className="eyebrow">Still stuck?</div>
        <p className="sm">
          Peer coaches: {COACHING.hours}, {COACHING.where}. <span className="muted">{coachingStatus()}.</span>
        </p>
        {related.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginTop: 14 }}>Related</div>
            <ArticleList list={related} />
          </>
        )}
      </div>
    </div>
  );
}

function BodyBlock({ b }: { b: Block }) {
  if ('p' in b) return <p>{b.p}</p>;
  if ('tip' in b)
    return (
      <div className="art-tip">
        <Icon name="sparkle" size={14} /> <span>{b.tip}</span>
      </div>
    );
  if ('steps' in b)
    return (
      <ol className="art-steps">
        {b.steps.map((x, i) => <li key={i}>{x}</li>)}
      </ol>
    );
  return (
    <div className="art-compare">
      {b.compare.map((c) => (
        <div key={c.type} className="ac-row">
          <div className="ac-type">{c.type}</div>
          <div className="ac-what">{c.what}</div>
          <div className="ac-ex">e.g. {c.example}</div>
          <div className="ac-pl">{c.planner}</div>
        </div>
      ))}
    </div>
  );
}

function LiveWalkthrough({ courseId }: { courseId: CourseId }) {
  const { s, d, flash } = useStore();
  const course = courseById(courseId);
  const draft = s.drafts[courseId];
  const hasReadings = (s.syllabi[courseId].counts?.reading ?? 0) > 0;
  const seriesDone = s.series.some((x) => x.courseId === courseId);
  const set = (patch: Partial<typeof draft>) => d({ type: 'draft', courseId, patch });

  const steps = useMemo(
    () => [
      {
        title: hasReadings ? 'Make the first one a Reading' : 'Fill in the first one',
        body: hasReadings
          ? `Your draft "${draft.title || 'untitled'}" is set to ${draft.type === 'reading' ? 'Reading' : `${draft.type[0].toUpperCase()}${draft.type.slice(1)}`}. Readings are things you read before class, with nothing to turn in.`
          : 'Pick a type, give it a name, and choose the first date.',
        done: seriesDone || (hasReadings ? draft.type === 'reading' : !!draft.title && !!draft.date),
        show: 'type',
        doIt: hasReadings && draft.type !== 'reading' ? () => set({ type: 'reading' }) : undefined,
        doLabel: 'Switch to Reading',
      },
      {
        title: 'Change "Repeats" to every week',
        body: 'Your first date stays the same. Firstweek copies it forward.',
        done: seriesDone || draft.repeat === 'weekly',
        show: 'repeat',
        doIt: draft.repeat !== 'weekly' ? () => set({ repeat: 'weekly' }) : undefined,
        doLabel: 'Turn on repeating',
      },
      {
        title: `Pick the days and how they're numbered`,
        body: `${course.code} meets ${course.days.map((x) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x]).join(' & ')}, so those are picked for you.${courseId === 'psy101' ? ' Dr. Kim spends 2 classes on each chapter: Ch. 2 to Ch. 15, 2 sessions each.' : ''}`,
        done: seriesDone || (draft.repeat === 'weekly' && draft.days.length > 0),
        show: 'days',
      },
      {
        title: 'Check the count, then add them',
        body: 'The preview lists every date and skips Thanksgiving. If the total matches your syllabus, you\'re set.',
        done: seriesDone,
        show: draft.repeat === 'weekly' ? 'preview' : 'repeat',
      },
    ],
    [draft, seriesDone, hasReadings, course, courseId],
  );
  const current = steps.findIndex((x) => !x.done);

  return (
    <ol className="live-steps">
      {steps.map((st, i) => (
        <li key={i} className={st.done ? 'done' : i === current ? 'current' : ''}>
          <span className="ls-dot">{st.done ? <Icon name="check" size={11} stroke={3.5} /> : i + 1}</span>
          <div>
            <div className="ls-title">{st.title}</div>
            {(i === current || (!st.done && i < current + 1)) && <div className="ls-body">{st.body}</div>}
            {i === current && (
              <div className="ls-actions">
                <button className="btn sm" onClick={() => flash(st.show)}>
                  <Icon name="eye" size={13} /> Show me
                </button>
                {st.doIt && (
                  <button className="btn primary sm" onClick={() => { st.doIt!(); flash(st.show); }}>
                    {st.doLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
      {current === -1 && (
        <li className="ls-finished">
          <Icon name="check" size={14} stroke={3} /> Done. Your readings are in, and you can delete the whole set in one click from the list if something's off.
        </li>
      )}
    </ol>
  );
}
