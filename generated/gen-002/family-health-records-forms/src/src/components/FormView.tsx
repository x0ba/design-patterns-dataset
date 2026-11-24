import { useMemo } from 'react';
import { useStore } from '../lib/store';
import {
  buildFields,
  countFields,
  openItems,
  SECTIONS,
  TODO_LABELS,
  type FormField,
  type SectionId,
} from '../lib/formModel';
import { CAMP, PERSON } from '../lib/seed';
import { daysBetween, longDate, NOW_ISO, NOW_MINUTES, shortDate, timeLabel } from '../lib/dates';
import { useOpenFix } from './fixContext';
import { StatusPill, type Tone } from './ui';

function hoursLeftLabel(): string {
  const minutes = daysBetween(NOW_ISO, CAMP.dueDate) * 24 * 60 + CAMP.dueMinutes - NOW_MINUTES;
  if (minutes <= 0) return 'Past due';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, '0')} min left`;
}

export function FormView() {
  const { state, dispatch } = useStore();
  const fields = useMemo(() => buildFields(state), [state]);
  const counts = countFields(fields);
  const open = openItems(fields);
  const submitted = state.camp.submittedRef !== null;

  const bySection = (id: SectionId) => fields.filter((f) => f.section === id);

  const jumpTo = (id: SectionId) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pct = (n: number) => `${(n / counts.total) * 100}%`;

  return (
    <div className="form-page">
      <div className="page-head">
        <div>
          <nav className="crumbs" aria-label="Breadcrumb">
            <span>Forms</span>
            <span aria-hidden="true">/</span>
            <span>Camp Ridgeline</span>
          </nav>
          <h1>{CAMP.name}</h1>
          <p className="page-meta">
            Camper <b>{PERSON.legalName}</b> · {shortDate(CAMP.start)} to {shortDate(CAMP.end)} · Health form
          </p>
        </div>
        <div className="due-box" aria-live="polite">
          {submitted ? (
            <>
              <StatusPill tone="ok">Submitted</StatusPill>
              <span className="due-sub">Reference {state.camp.submittedRef}</span>
            </>
          ) : (
            <>
              <div className="due-label">Due {longDate(CAMP.dueDate)}</div>
              <div className="due-time">
                {timeLabel(CAMP.dueMinutes)} · <span className="due-left">{hoursLeftLabel()}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <section className="progress" aria-label="Form progress">
        <div className="progress-bar" role="img" aria-label={`${counts.filled} filled, ${counts.review} need review, ${counts.empty} empty`}>
          <span className="seg seg-ok" style={{ width: pct(counts.filled) }} />
          <span className="seg seg-warn" style={{ width: pct(counts.review) }} />
          <span className="seg seg-empty" style={{ width: pct(counts.empty) }} />
        </div>
        <div className="progress-legend">
          <span>
            <i className="dot dot-ok" /> <b>{counts.filled}</b> filled from stored data
          </span>
          <span>
            <i className="dot dot-warn" /> <b>{counts.review}</b> need review
          </span>
          <span>
            <i className="dot dot-empty" /> <b>{counts.empty}</b> empty
          </span>
          <span className="progress-total">{counts.total} fields in 6 sections</span>
        </div>
      </section>

      <div className="form-layout">
        <nav className="sec-nav" aria-label="Form sections">
          {SECTIONS.map((s) => {
            const list = bySection(s.id);
            const done = list.every((f) => f.status === 'filled');
            const issues = list.filter((f) => f.status !== 'filled').length;
            return (
              <button key={s.id} className="sec-nav-item" onClick={() => jumpTo(s.id)}>
                <span className="sec-letter">{s.id}</span>
                <span className="sec-nav-text">
                  <span className="sec-nav-title">{s.title}</span>
                  <span className="sec-nav-sub">
                    {done ? (
                      <span className="ok-text">All {list.length} filled</span>
                    ) : (
                      <span className="warn-text">
                        {issues} to fix of {list.length}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sections">
          {SECTIONS.map((s) => {
            const list = bySection(s.id);
            const filled = list.filter((f) => f.status === 'filled').length;
            return (
              <section key={s.id} className="sec-card" id={`sec-${s.id}`} aria-labelledby={`sec-title-${s.id}`}>
                <header className="sec-head">
                  <h2 id={`sec-title-${s.id}`}>
                    <span className="sec-letter">{s.id}</span>
                    {s.title}
                  </h2>
                  <span className="sec-count">
                    {filled} of {list.length} filled
                  </span>
                </header>
                <ul className="rows">
                  {list.map((f) => (
                    <FieldRow key={f.id} field={f} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className="side" aria-label="Before you sign">
          <div className="side-card">
            <h3>Before you sign</h3>
            <p className="side-lede">
              {open.length === 0
                ? 'Every field is complete. Review the form, then sign.'
                : `${open.length} ${open.length === 1 ? 'item' : 'items'} left. Camp won’t accept the form until they’re done.`}
            </p>

            {open.length > 0 && (
              <ol className="todo">
                {open.map((f) => (
                  <TodoItem key={f.id} field={f} />
                ))}
              </ol>
            )}

            <button
              className="btn primary block"
              disabled={open.length > 0 || submitted}
              onClick={() => dispatch({ type: 'navigate', view: 'review' })}
            >
              {submitted ? 'Already submitted' : 'Review and sign'}
            </button>
            {open.length > 0 && <p className="side-foot">Clear all {open.length} to continue.</p>}
          </div>

          <div className="side-card side-card-quiet">
            <div className="eyebrow">Source of stored values</div>
            <p className="small muted">
              Values come from Imani’s health record. Edits made in the fix dialogs update that record too, so they
              stay correct for the next form.
            </p>
            <button className="btn ghost small" onClick={() => {
                dispatch({ type: 'setRecordsTab', tab: 'immunizations' });
                dispatch({ type: 'navigate', view: 'records' });
              }}>
              Open health record
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function sevTone(f: FormField): Tone {
  if (f.status === 'filled') return 'ok';
  if (f.severity === 'problem') return 'bad';
  if (f.status === 'review') return 'warn';
  return 'empty';
}

function sevLabel(f: FormField): string {
  if (f.severity === 'problem') return 'Flagged problem';
  if (f.severity === 'confirm') return 'Confirm';
  return 'Blank';
}

function FieldRow({ field: f }: { field: FormField }) {
  const openFix = useOpenFix();
  const pillTone = f.status === 'filled' ? 'ok' : sevTone(f);
  const pillText =
    f.status === 'filled' ? 'Filled' : f.severity === 'problem' ? 'Flagged' : f.severity === 'confirm' ? 'Confirm' : 'Empty';

  return (
    <li className={`row row-${f.status}`} data-field={f.id}>
      <div className="row-main">
        <div className="row-label">
          <span className="row-id">{f.id}</span>
          <div>
            <div className="row-name">{f.label}</div>
            <div className="row-source">{f.source}</div>
          </div>
        </div>
        <div className={`row-value${f.value === null ? ' is-blank' : ''}`}>
          {f.value ?? 'Not on file'}
        </div>
        <div className="row-status">
          <StatusPill tone={pillTone}>{pillText}</StatusPill>
          {f.fix && f.fixLabel && (
            <button className="btn small" onClick={() => openFix(f.fix!)}>
              {f.fixLabel}
            </button>
          )}
        </div>
      </div>
      {f.issue && (
        <p className={`row-issue row-issue-${f.severity ?? 'blank'}`}>
          <span className="row-issue-tag">{sevLabel(f)}</span>
          {f.issue}
        </p>
      )}
    </li>
  );
}

function TodoItem({ field: f }: { field: FormField }) {
  const openFix = useOpenFix();
  return (
    <li className={`todo-item todo-${f.severity ?? 'blank'}`}>
      <span className="todo-mark" aria-hidden="true">
        {f.severity === 'problem' ? '!' : f.severity === 'confirm' ? '?' : ''}
      </span>
      <div className="todo-text">
        <div className="todo-title">{TODO_LABELS[f.id] ?? f.label}</div>
        <div className="todo-sub">{sevLabel(f)}</div>
      </div>
      {f.fix && (
        <button className="btn small" onClick={() => openFix(f.fix!)}>
          {f.fixLabel}
        </button>
      )}
    </li>
  );
}
