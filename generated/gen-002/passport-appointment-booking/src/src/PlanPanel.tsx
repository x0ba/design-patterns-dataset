import React from 'react';
import { CHILDREN, DELE_ROTA, DELE_ROTA_SHARED, MARISOL_WORK, SCHOOL_HOURS, SCHOOL_NAME, SHIFTS, TRIP_LABEL } from './data';
import { addDays, Attendance, daysBetween, fmtDM, fmtLong, fmtShort, fmtTime, mailRenewalPostBy, parse, TARGET, TODAY, TRIP } from './logic';
import * as I from './icons';

export function PlanPanel({
  attendance,
  setAttendance,
  toast,
}: {
  attendance: Attendance;
  setAttendance: (a: Attendance) => void;
  toast: (s: string) => void;
}) {
  const daysToTrip = daysBetween(TODAY, TRIP);
  const postBy = mailRenewalPostBy();
  return (
    <div className="plan" id="plan">
      <section className="card trip-card">
        <div className="eyebrow">
          <I.Plane size={14} /> {TRIP_LABEL}
        </div>
        <div className="trip-date">{fmtLong(TRIP)}</div>
        <div className="trip-meta">
          <span>
            <strong>{daysToTrip} days</strong> from today
          </span>
          <span className="sep">·</span>
          <span>tickets non-refundable</span>
        </div>
        <div className="trip-target">
          Aim to have all passports by <strong>{fmtShort(TARGET)}</strong> — a week’s margin for post delays.
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">Who needs passports</h3>
        <ul className="people">
          {CHILDREN.map((c) => (
            <li key={c.id}>
              <span className={`pavatar pa-${c.id}`}>{c.name[0]}</span>
              <div>
                <div className="pname">
                  {c.name} <span className="muted">· age {c.age}</span>
                </div>
                <div className="psub">{c.kind} · in person</div>
              </div>
              <span className="tag tag-visit">At visit</span>
            </li>
          ))}
          <li>
            <span className="pavatar pa-me">M</span>
            <div>
              <div className="pname">
                You <span className="muted">· renewal</span>
              </div>
              <div className="psub">Eligible to renew by mail</div>
            </div>
            <span className="tag tag-mail">By mail</span>
          </li>
        </ul>
        <div className="mail-note">
          <I.Mail size={14} />
          <div>
            Post your renewal by <strong>{fmtShort(postBy)}</strong> to stay on standard processing.{' '}
            <button className="link" onClick={() => toast('Mail renewal pack (form R-2 + checklist) saved to Downloads.')}>
              Get renewal pack
            </button>
            <div className="tiny muted">While it’s in the post, your civil-ID card works as ID at the kids’ visit.</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">Who’s going with the kids</h3>
        <p className="tiny muted" style={{ marginTop: 0 }}>
          Children under 16 need both parents present, or one parent with the other’s signed consent.
        </p>
        <div className="seg" role="radiogroup" aria-label="Attendance">
          <button role="radio" aria-checked={attendance === 'both'} className={attendance === 'both' ? 'on' : ''} onClick={() => setAttendance('both')}>
            <strong>You &amp; Dele</strong>
            <span>Must fit his shifts</span>
          </button>
          <button role="radio" aria-checked={attendance === 'consent'} className={attendance === 'consent' ? 'on' : ''} onClick={() => setAttendance('consent')}>
            <strong>You + consent form</strong>
            <span>Dele signs form PC-3</span>
          </button>
        </div>
        {attendance === 'consent' && (
          <div className="consent-note">
            Bring PC-3 signed by Dele and a copy of his civil-ID card. Shifts are ignored when matching times.
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Schedules we’re matching</h3>
        <div className="sched">
          <div className="sched-row">
            <span className="sw sw-dele" />
            <div>
              <div className="sname">Dele’s shifts</div>
              <div className="tiny muted">Shared {DELE_ROTA_SHARED} · Mon–Sat, Sundays off</div>
              <div className="rota">
                {Object.entries(DELE_ROTA).map(([wk, k]) => (
                  <div key={wk} className={`rota-wk rk-${k}`} title={`${SHIFTS[k].label} ${fmtTime(SHIFTS[k].start)}–${fmtTime(SHIFTS[k].end)}`}>
                    <span>{fmtDM(parse(wk))}</span>
                    <strong>{SHIFTS[k].label}</strong>
                  </div>
                ))}
                <div className="rota-wk rk-unknown">
                  <span>{fmtDM(addDays(parse('2026-12-14'), 7))}+</span>
                  <strong>?</strong>
                </div>
              </div>
              <div className="tiny muted">
                Early {fmtTime(SHIFTS.early.start)}–{fmtTime(SHIFTS.early.end)} · Late {fmtTime(SHIFTS.late.start)}–{fmtTime(SHIFTS.late.end)}
              </div>
            </div>
          </div>
          <div className="sched-row">
            <span className="sw sw-school" />
            <div>
              <div className="sname">{SCHOOL_NAME}</div>
              <div className="tiny muted">
                Mon–Fri {fmtTime(SCHOOL_HOURS.start)}–{fmtTime(SCHOOL_HOURS.end)} · holidays 21 Dec – 4 Jan
              </div>
            </div>
          </div>
          <div className="sched-row">
            <span className="sw sw-you" />
            <div>
              <div className="sname">Your dispatch shift</div>
              <div className="tiny muted">
                School days {fmtTime(MARISOL_WORK.start)}–{fmtTime(MARISOL_WORK.end)} · off in school holidays
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="notice">
        <I.Alert size={14} />
        <div>
          <strong>Holiday closure 24 Dec – 1 Jan.</strong> Offices are closed and processing pauses, so every application in progress then takes 9 days
          longer.
        </div>
      </section>
    </div>
  );
}
