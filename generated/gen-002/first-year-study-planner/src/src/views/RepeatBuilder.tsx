import { courseById, TYPE_META, type CourseId } from '../data';
import { DAY_SHORT, fmtDay, TERM } from '../dates';
import { Icon } from '../Icon';
import { seriesTitle, type Draft, type GenResult, type Naming } from '../logic';
import { useHL, useStore } from '../store';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function RepeatBuilder({ courseId, gen }: { courseId: CourseId; gen: GenResult }) {
  const { s, d } = useStore();
  const hl = useHL();
  const course = courseById(courseId);
  const draft = s.drafts[courseId];
  const set = (patch: Partial<Draft>) => d({ type: 'draft', courseId, patch });
  const chapterMode = draft.naming === 'chapter' || draft.naming === 'chapter-read';
  const items = s.items.filter((i) => i.courseId === courseId);
  const sameType = items.filter((i) => i.type === draft.type && !i.lockedBy);
  const manual = sameType.filter((i) => !i.seriesId);
  const syllabusCount = s.syllabi[courseId].counts?.[draft.type] ?? 0;
  const total = sameType.length + gen.items.length;
  const typeLabel = TYPE_META[draft.type].plural.toLowerCase();
  const typedChapters = manual
    .map((i) => /Ch\.\s*(\d+)/.exec(i.title)?.[1])
    .filter(Boolean)
    .map(Number);
  const lastTypedCh = typedChapters.length ? Math.max(...typedChapters) : null;

  const namings: { id: Naming; label: string; example: string }[] = [
    { id: 'chapter', label: 'By chapter', example: seriesTitle({ ...draft, naming: 'chapter' }, 0) + ', ' + seriesTitle({ ...draft, naming: 'chapter' }, 1) + '…' },
    { id: 'chapter-read', label: 'By chapter, with "Read"', example: seriesTitle({ ...draft, naming: 'chapter-read' }, 0) + '…' },
    { id: 'numbered', label: 'Numbered', example: `${draft.title.trim() || 'Homework'} 1, 2, 3…` },
    { id: 'same', label: 'Same name each time', example: draft.title.trim() || 'Online homework' },
  ];

  // Merge generated and skipped dates into one chronological preview
  const preview = [
    ...gen.items.map((g) => ({ ...g, skipped: null as string | null })),
    ...gen.skipped.map((x) => ({ title: '', date: x.date, skipped: x.reason })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const matches = syllabusCount > 0 && total === syllabusCount;
  const over = syllabusCount > 0 && total > syllabusCount;

  return (
    <div className="repeat-builder">
      <div className="rb-left">
        <div className={`field${hl('days')}`} data-guide="days">
          <label>Repeat on</label>
          <div className="day-chips" role="group" aria-label="Days of the week">
            {ORDER.map((x) => {
              const on = draft.days.includes(x);
              const isClass = course.days.includes(x);
              return (
                <button
                  key={x}
                  className={`day-chip${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => set({ days: on ? draft.days.filter((y) => y !== x) : [...draft.days, x] })}
                >
                  {DAY_SHORT[x]}
                  {isClass && <span className="class-dot" style={on ? undefined : { background: course.color }} title={`${course.code} meets this day`} />}
                </button>
              );
            })}
          </div>
          <div className="field-hint">
            <span className="class-dot inline" style={{ background: course.color }} /> = {course.code} meets that day. Starts {fmtDay(draft.date)} (the first date above).
          </div>
        </div>

        <div className={`field${hl('naming')}`} data-guide="naming">
          <label>How are they named?</label>
          <div className="naming">
            {namings.map((n) => (
              <button key={n.id} className={`naming-opt${draft.naming === n.id ? ' on' : ''}`} aria-pressed={draft.naming === n.id} onClick={() => set({ naming: n.id })}>
                <span className="radio" />
                <span>
                  <strong>{n.label}</strong>
                  <span className="muted">{n.example}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {chapterMode ? (
          <div className="field-row tight">
            <div className="field">
              <label htmlFor="rb-from">From chapter</label>
              <input id="rb-from" type="number" min={1} max={40} value={draft.chapterFrom} onChange={(e) => set({ chapterFrom: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
            <div className="field">
              <label htmlFor="rb-to">To chapter</label>
              <input id="rb-to" type="number" min={draft.chapterFrom} max={40} value={draft.chapterTo} onChange={(e) => set({ chapterTo: Math.max(draft.chapterFrom, Number(e.target.value) || draft.chapterFrom) })} />
            </div>
            <div className="field">
              <label>Class sessions per chapter</label>
              <div className="seg small">
                {[1, 2, 3].map((n) => (
                  <button key={n} className={draft.perChapter === n ? 'on' : ''} aria-pressed={draft.perChapter === n} onClick={() => set({ perChapter: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="field-row tight">
            <div className="field">
              <label htmlFor="rb-until">Last date</label>
              <input id="rb-until" type="date" min={draft.date} max={TERM.end} value={draft.until} onChange={(e) => set({ until: e.target.value })} />
            </div>
          </div>
        )}

        {lastTypedCh !== null && chapterMode && draft.type === 'reading' && (
          <div className={`callout mini ${draft.chapterFrom === lastTypedCh + 1 ? 'ok' : 'warn'}`}>
            <Icon name={draft.chapterFrom === lastTypedCh + 1 ? 'check' : 'info'} size={14} />
            {draft.chapterFrom === lastTypedCh + 1 ? (
              <span>You already typed Ch. {lastTypedCh} ({manual.length} readings), so this picks up at Ch. {draft.chapterFrom}. Nothing gets doubled.</span>
            ) : (
              <span>
                You already typed up to Ch. {lastTypedCh}.{' '}
                <button className="link sm" onClick={() => set({ chapterFrom: lastTypedCh + 1 })}>Start at Ch. {lastTypedCh + 1}</button>
              </span>
            )}
          </div>
        )}

        <div className="field">
          <label>Skip</label>
          <label className="check-line">
            <input type="checkbox" checked={draft.skipClosures} onChange={(e) => set({ skipClosures: e.target.checked })} />
            <span>Days campus is closed (Labor Day, Veterans Day, Thanksgiving)</span>
          </label>
          <label className="check-line">
            <input type="checkbox" checked={draft.skipExams} onChange={(e) => set({ skipExams: e.target.checked })} />
            <span>{course.code} exam days</span>
          </label>
        </div>
      </div>

      <div className={`rb-right${hl('preview')}`} data-guide="preview">
        <div className="rb-count">
          <div className="rb-big">{gen.items.length}</div>
          <div>
            <strong>{typeLabel} will be added</strong>
            {gen.items.length > 0 && (
              <div className="muted sm">
                {fmtDay(gen.items[0].date)} → {fmtDay(gen.items[gen.items.length - 1].date)}
              </div>
            )}
          </div>
        </div>

        {syllabusCount > 0 && (
          <div className={`rb-check ${matches ? 'ok' : over ? 'warn' : 'short'}`}>
            <Icon name={matches ? 'check' : 'info'} size={14} stroke={matches ? 3 : 2} />
            <span>
              {sameType.length > 0 ? `${sameType.length} already in + ${gen.items.length} new = ` : ''}
              <strong>{total} {typeLabel}</strong>.{' '}
              {matches ? 'Matches your syllabus count.' : over ? `That's ${total - syllabusCount} more than the ${syllabusCount} on your syllabus.` : `Your syllabus lists ${syllabusCount}.`}
            </span>
          </div>
        )}
        {gen.overflow > 0 && (
          <div className="rb-check warn">
            <Icon name="info" size={14} />
            <span>
              {gen.overflow} won't fit before classes end on Fri, Dec 11. Try fewer skipped days or fewer sessions per chapter.
            </span>
          </div>
        )}

        <ol className="rb-preview" aria-label="Preview">
          {preview.map((p, i) =>
            p.skipped ? (
              <li key={`s-${p.date}`} className="skip">
                <span className="pv-date">{fmtDay(p.date)}</span>
                <span className="pv-title">Skipped: {p.skipped}</span>
              </li>
            ) : (
              <li key={`${p.date}-${i}`}>
                <span className="pv-date">{fmtDay(p.date)}</span>
                <span className="pv-title">{p.title}</span>
              </li>
            ),
          )}
          {preview.length === 0 && <li className="skip">Pick at least one day to see the dates.</li>}
        </ol>
      </div>
    </div>
  );
}
