import React from 'react';
import { Icon } from './ui.jsx';
import { PROGRAMS, VOLUNTEER } from './data.js';
import { timeLabel, minutesUntil, relMinutes } from './logic.js';

const shortName = { knit: 'Knitting', yoga: 'Chair Yoga', lunch: 'Lunch', teen: 'Homework Club' };

export default function Desk({ now, counts, queue, onQuickSignIn, activity, stats, lunchSent, onSendLunch }) {
  return (
    <aside className="desk" aria-label="Desk volunteer panel">
      <div className="desk-head">
        <span className="avatar" aria-hidden="true">{VOLUNTEER.initials}</span>
        <div>
          <p className="desk-kicker">Desk volunteer view</p>
          <p className="desk-name">{VOLUNTEER.name} <span className="role-pill">{VOLUNTEER.role}</span></p>
          <p className="desk-sub">On shift until {VOLUNTEER.shiftEnds} · can update records with a reason</p>
        </div>
      </div>

      <section className="desk-section">
        <h2 className="desk-h">
          <span>Waiting to sign in</span>
          <span className="count-pill">{queue.length}</span>
        </h2>
        {queue.length === 0 ? (
          <p className="desk-empty">Nobody waiting.</p>
        ) : (
          <ul className="queue">
            {queue.map((q) => (
              <li key={q.id} className="queue-item">
                <div className="q-main">
                  <p className="q-name">{q.name} <span className="q-id">#{q.memberId}</span></p>
                  <p className="q-progs">{q.programs.map((p) => shortName[p]).join(' + ')}</p>
                  <p className="q-note">{q.note}</p>
                </div>
                <button type="button" className="btn desk-btn" onClick={() => onQuickSignIn(q)}>
                  Sign in
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="desk-tip">Signing in regulars here won't interrupt the form on screen.</p>
      </section>

      <section className="desk-section">
        <h2 className="desk-h"><span>Today · Tuesday</span></h2>
        <ul className="today">
          {PROGRAMS.map((p) => {
            const c = counts[p.id];
            const until = minutesUntil(now, p.start);
            const pct = Math.min(100, Math.round((c / p.capacity) * 100));
            if (p.isMeal) {
              const cut = minutesUntil(now, p.mealCutoff);
              return (
                <li key={p.id} className="today-item">
                  <div className="ti-top">
                    <span className="ti-name"><Icon name="utensils" size={16} /> {p.name}</span>
                    <span className="ti-time">{timeLabel(p.start)}</span>
                  </div>
                  <div className="ti-meal">
                    <span><strong>{c}</strong> meals so far</span>
                    {lunchSent ? (
                      <span className="sent"><Icon name="check" size={14} /> Sent to kitchen {lunchSent}</span>
                    ) : (
                      <button type="button" className="btn tiny" onClick={onSendLunch}><Icon name="send" size={14} /> Send count</button>
                    )}
                  </div>
                  {!lunchSent && <p className={`ti-note ${cut <= 30 ? 'urgent' : ''}`}>Kitchen needs the count by {timeLabel(p.mealCutoff)} ({relMinutes(cut).replace('in ', '')} left)</p>}
                </li>
              );
            }
            return (
              <li key={p.id} className="today-item">
                <div className="ti-top">
                  <span className="ti-name">{p.name}</span>
                  <span className="ti-time">{timeLabel(p.start)}</span>
                </div>
                <div className="bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
                <div className="ti-bottom">
                  <span><strong>{c}</strong> of {p.capacity} signed in</span>
                  <span className={until <= 15 && until > -5 ? 'soon' : ''}>{relMinutes(until)}</span>
                </div>
                {p.guardianUnder && <p className="ti-note">Under-{p.guardianUnder}s need a guardian on file</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="desk-section grow">
        <h2 className="desk-h"><span>Recent at the desk</span></h2>
        <ul className="activity">
          {activity.slice(0, 4).map((a, i) => (
            <li key={`${a.time}-${i}`}><span className="a-time">{a.time}</span> <span>{a.text}</span></li>
          ))}
        </ul>
      </section>

      <footer className="desk-foot">
        <span><strong>{stats.active.toLocaleString()}</strong> active members</span>
        <span><strong>{stats.lapsed.toLocaleString()}</strong> lapsed records</span>
      </footer>
    </aside>
  );
}
