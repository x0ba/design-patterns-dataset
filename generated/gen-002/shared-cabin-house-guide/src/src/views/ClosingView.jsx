import { useMemo } from 'react';
import { STEPS, STEP_GROUPS, STEP_BY_N } from '../data/steps.js';
import { PIN_BY_ID, pinLocation, notesForPins, pinPlaceLabel } from '../lib/lookup.js';
import { FLOORS, ROOM_LABEL, BOATHOUSE_REF } from '../data/property.js';
import { useAppState } from '../state.jsx';
import { useGo } from '../lib/router.js';
import { useNow, isoToDate } from '../lib/useNow.js';
import { fmtDateTime, untilFreeze, FREEZE_AT, fmtDate, fmtTime } from '../lib/clock.js';
import { describeFrom } from '../lib/geo.js';
import { TypeChip, PhotoTile } from '../components/ui.jsx';
import PlanView from '../components/PlanView.jsx';

export default function ClosingView({ segments }) {
  const { stepsDone, toggleStep, location, setLocation, notes } = useAppState();
  const go = useGo();
  const now = useNow();

  const doneCount = Object.keys(stepsDone).length;
  const firstOpen = STEPS.find((s) => !stepsDone[s.n])?.n ?? 22;
  const requested = Number(segments[1]);
  const n = requested >= 1 && requested <= 22 ? requested : firstOpen;
  const step = STEP_BY_N[n];
  const pins = step.pins.map((id) => PIN_BY_ID[id]);
  const lookalikes = (step.lookalikes || []).map((id) => PIN_BY_ID[id]);
  const relatedNotes = useMemo(() => notesForPins(step.pins, notes).slice(0, 2), [step, notes]);
  const groupOf = STEP_GROUPS.find((g) => n >= g.steps[0] && n <= g.steps[1]);

  // Mini plan: show the floor of the step's first in-building pin.
  const planPin = pins.find((p) => p.loc !== 'site') || null;
  const planFloor = planPin ? FLOORS[planPin.loc] : null;
  const isDone = Boolean(stepsDone[n]);
  const pct = Math.round((doneCount / STEPS.length) * 100);

  const here = (p) => p.loc !== 'site' && location.floor === p.loc && location.room === p.room;

  const locationValue = location.floor === 'site' ? 'site' : `${location.floor}:${location.room}`;
  const onLocationChange = (value) => {
    if (value === 'site') setLocation({ floor: 'site', room: null });
    else {
      const [floor, room] = value.split(':');
      setLocation({ floor, room });
    }
  };

  const select = (num) => go(`closing/${num}`);

  return (
    <div className="closing">
      <div className="freeze-banner" role="status">
        <div className="freeze-icon" aria-hidden="true">❄</div>
        <div className="freeze-body">
          <strong>Hard freeze forecast Tuesday night, 17 Nov.</strong>
          <span>
            Forecast low 8 °F, with the freeze starting {fmtDate(FREEZE_AT)} at {fmtTime(FREEZE_AT)}. Water must be off and drained before then.
          </span>
        </div>
        <div className="freeze-count">
          <span className="freeze-count-big">{untilFreeze(now)}</span>
          <span className="freeze-count-small">until freeze</span>
        </div>
      </div>

      <div className="closing-grid">
        {/* ---------- left: the 22-step list ---------- */}
        <section className="card steps-card" aria-label="Fall closing steps">
          <header className="steps-head">
            <div>
              <div className="eyebrow">Fall closing · 22 steps</div>
              <h2>{doneCount} of 22 done</h2>
              <p className="muted small">
                Started Sat 14 Nov by Ellen. Last closed Sun 19 Oct 2025 by Pete.
              </p>
            </div>
            <div className="progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          </header>

          <div className="step-scroll">
            {STEP_GROUPS.map((g) => (
              <div className="step-group" key={g.id}>
                <div className="group-label">{g.label}</div>
                <ol className="step-list">
                  {STEPS.filter((s) => s.n >= g.steps[0] && s.n <= g.steps[1]).map((s) => {
                    const done = stepsDone[s.n];
                    const cls = [
                      'step-row',
                      done ? 'is-done' : '',
                      s.n === n ? 'is-sel' : '',
                      !done && s.n === firstOpen ? 'is-now' : '',
                    ].join(' ');
                    return (
                      <li key={s.n}>
                        <button type="button" className={cls} onClick={() => select(s.n)} aria-current={s.n === n ? 'step' : undefined}>
                          <span className="step-num">{done ? '✓' : s.n}</span>
                          <span className="step-main">
                            <span className="step-title">{s.title}</span>
                            <span className="step-where">
                              {s.pins.map((id) => PIN_BY_ID[id]).map((p) => pinPlaceLabel(p)).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}
                            </span>
                          </span>
                          <span className="step-tags">
                            {s.changedNote && <span className="tag-changed">changed 2025</span>}
                            {!done && s.n === firstOpen && <span className="tag-now">next</span>}
                            {done && <span className="step-by">{done.by}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- right: the selected step ---------- */}
        <section className="card step-detail" aria-label={`Step ${n}`}>
          <div className="step-body">
          <div className="detail-top">
            <div>
              <div className="eyebrow">Step {n} of 22 · {groupOf?.label}</div>
              <h2 className="step-h">{step.title}</h2>
            </div>
            <div className="location-pick">
              <label htmlFor="here-select">You are in</label>
              <select id="here-select" value={locationValue} onChange={(e) => onLocationChange(e.target.value)}>
                {Object.values(FLOORS).map((f) => (
                  <optgroup key={f.id} label={f.label}>
                    {f.rooms.map((r) => (
                      <option key={r.id} value={`${f.id}:${r.id}`}>{r.name}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="site">Outside, on the property</option>
              </select>
            </div>
          </div>

          <p className="step-how">{step.how}</p>

          {step.changedNote && (
            <div className="callout callout-amber">
              <strong>Changed in 2025.</strong> {step.changedNote} <span className="muted">Pete’s note, Oct 2025.</span>
            </div>
          )}

          {step.lookNote && (
            <div className="callout callout-blue">
              <strong>Two valves look alike.</strong> {step.lookNote}
            </div>
          )}

          <div className="where-grid">
            <div className="where-list">
              <h3 className="section-h">Where to go</h3>
              {pins.map((p) => (
                <article className={`pin-card${here(p) ? ' is-here' : ''}`} key={p.id}>
                  <div className="pin-card-top">
                    <TypeChip type={p.type} small />
                    <span className="pin-id">{p.id}</span>
                    {here(p) && <span className="here-badge">You are here</span>}
                  </div>
                  <h4>{p.title}</h4>
                  <p className="pin-loc">{pinLocation(p)}</p>
                  <p className="pin-notes">{p.notes}</p>
                  <button type="button" className="btn btn-ghost" onClick={() => (p.loc === 'site' ? go('map', { pin: p.id }) : go(`plans/${p.loc}`, { pin: p.id }))}>
                    Show on plan
                  </button>
                </article>
              ))}

              {lookalikes.length > 0 && (
                <div className="lookalikes">
                  <h3 className="section-h">Not this one</h3>
                  {lookalikes.map((p) => (
                    <p key={p.id} className="muted small">
                      <strong>{p.id}</strong> · {p.title}. {p.notes}
                    </p>
                  ))}
                </div>
              )}

              {relatedNotes.length > 0 && (
                <div className="family-notes">
                  <h3 className="section-h">From the family</h3>
                  {relatedNotes.map((note) => (
                    <blockquote key={note.id}>
                      <div className="note-meta">{note.by} · {fmtDateTime(isoToDate(note.at))}</div>
                      {note.body}
                    </blockquote>
                  ))}
                  <button type="button" className="link" onClick={() => go('notes')}>All notes</button>
                </div>
              )}
            </div>

            <div className="where-plan">
              {planFloor ? (
                <>
                  <h3 className="section-h">{planFloor.label} · {planPin ? ROOM_LABEL[planPin.room] : ''}</h3>
                  <PlanView
                    floor={planFloor}
                    pins={pins.filter((p) => p.loc === planFloor.id)}
                    selectedId={planPin?.id}
                    onPin={(p) => go(`plans/${p.loc}`, { pin: p.id })}
                    onRoom={(roomId) => setLocation({ floor: planFloor.id, room: roomId })}
                    userRoom={location.floor === planFloor.id ? location.room : null}
                    highlightRoom={planPin?.room}
                    compact
                  />
                  <p className="muted small">Click a room to say where you are. Click a pin to open its plan.</p>
                </>
              ) : (
                <>
                  <h3 className="section-h">On the property</h3>
                  <div className="site-facts">
                    {pins.map((p) => (
                      <div key={p.id} className="site-fact">
                        <strong>{p.id} · {p.title}</strong>
                        <span>{describeFrom(BOATHOUSE_REF, p)} of the boathouse</span>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost" onClick={() => go('map', { pin: pins[0].id })}>
                      Open property map
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          </div>

          <footer className="step-foot">
            <button type="button" className="btn btn-ghost" disabled={n <= 1} onClick={() => select(n - 1)}>
              ← Step {Math.max(n - 1, 1)}
            </button>
            <button
              type="button"
              className={`btn ${isDone ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => toggleStep(n, 'Ellen', now)}
            >
              {isDone ? `Undo: step ${n} marked done` : `Mark step ${n} done`}
            </button>
            <button type="button" className="btn btn-ghost" disabled={n >= 22} onClick={() => select(n + 1)}>
              Step {Math.min(n + 1, 22)} →
            </button>
          </footer>
          <p className="muted small done-line">
            {isDone
              ? <>Done by {stepsDone[n].by}, {fmtDateTime(isoToDate(stepsDone[n].at))}.</>
              : <>Not done yet.{firstOpen === n ? ' This is the next step on the list.' : ''}</>}
          </p>
        </section>
      </div>
    </div>
  );
}
