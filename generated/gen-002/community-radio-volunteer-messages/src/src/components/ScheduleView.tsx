import { useState } from 'react';
import { Show, WEEK_START, shows } from '../data';
import { now, useStore } from '../store';
import { Avatar, DAYS, DAYS_LONG, Icon, hourLabel, slotLabel, volById } from '../util';

const START_H = 5;
const END_H = 24;
const ROW = 36;

export function ScheduleView() {
  const { s, d } = useStore();
  const [sel, setSel] = useState<string>('farm');
  const n = now();
  const todayIdx = (n.getDay() + 6) % 7;
  const nowH = n.getHours() + n.getMinutes() / 60;
  const selected = shows.find((x) => x.id === sel)!;
  const coverOpen = s.issues.find((i) => i.id === 'cover-farm' && !i.resolved) && !s.scheduleOverrides.farm;

  const dateFor = (day: number) => {
    const dt = new Date(WEEK_START);
    dt.setDate(WEEK_START.getDate() + day);
    return dt;
  };

  const status = (sh: Show) => {
    if (sh.id === 'farm') {
      if (s.scheduleOverrides.farm) return { kind: 'covered', text: `${volById(s.scheduleOverrides.farm)!.name} covering` };
      return { kind: 'needs', text: 'Needs cover' };
    }
    return null;
  };

  return (
    <div className="schedule-wrap">
      <section className="schedule">
        <header className="page-head">
          <div>
            <h1>Weekly schedule</h1>
            <div className="page-sub">Week of Nov 16–22 · 23 live shows · automation fills the gaps</div>
          </div>
          <div className="legend">
            <span><i className="lg live" /> Live show</span>
            <span><i className="lg needs" /> Needs cover</span>
            <span><i className="lg covered" /> Fill-in confirmed</span>
            <span><i className="lg auto" /> Automation</span>
          </div>
        </header>

        <div className="grid">
          <div className="grid-hours">
            <div className="grid-dayhead" />
            {Array.from({ length: END_H - START_H }, (_, i) => (
              <div key={i} className="hour" style={{ height: ROW }}>{hourLabel(START_H + i)}</div>
            ))}
          </div>
          {DAYS.map((dn, day) => {
            const dt = dateFor(day);
            return (
              <div key={dn} className={`grid-col ${day === todayIdx ? 'today' : ''}`}>
                <div className="grid-dayhead">
                  <span>{dn}</span> <b>{dt.getDate()}</b>
                  {day === todayIdx && <em>Today</em>}
                </div>
                <div className="grid-body" style={{ height: ROW * (END_H - START_H) }}>
                  {Array.from({ length: END_H - START_H }, (_, i) => (
                    <div key={i} className="grid-line" style={{ top: i * ROW }} />
                  ))}
                  {shows.filter((x) => x.day === day).map((sh) => {
                    const st = status(sh);
                    const host = volById(sh.hostIds[0])!;
                    const past = day < todayIdx || (day === todayIdx && sh.end <= nowH);
                    return (
                      <button key={sh.id}
                        className={`block ${st?.kind ?? ''} ${sel === sh.id ? 'sel' : ''} ${past ? 'past' : ''} ${sh.end - sh.start < 2 ? 'short' : ''}`}
                        style={{ top: (sh.start - START_H) * ROW + 1, height: (sh.end - sh.start) * ROW - 3 }}
                        onClick={() => setSel(sh.id)}>
                        <span className="block-name">{sh.name}</span>
                        <span className="block-host">{st ? st.text : host.name}</span>
                        {sh.end - sh.start >= 2 && <span className="block-time">{slotLabel(sh.start, sh.end)}</span>}
                      </button>
                    );
                  })}
                  {day === todayIdx && nowH >= START_H && (
                    <div className="now-line" style={{ top: (nowH - START_H) * ROW }}><span /></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="context">
        <div className="card">
          <div className="card-kicker"><Icon name="radio" size={13} /> {selected.genre}</div>
          <div className="card-title">{selected.name}</div>
          <div className="card-sub">{DAYS_LONG[selected.day]}s · {slotLabel(selected.start, selected.end)} · this week {dateFor(selected.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <p className="person-note">{selected.blurb}</p>

          {selected.id === 'farm' && (
            <div className={`sched-alert ${s.scheduleOverrides.farm ? 'ok' : ''}`}>
              {s.scheduleOverrides.farm ? (
                <><Icon name="check" size={14} /> <span>{volById(s.scheduleOverrides.farm)!.name} is covering for Joy this Saturday.</span></>
              ) : (
                <><Icon name="alert" size={14} /> <span>Joy is out sick. No one is covering yet.</span></>
              )}
              {coverOpen && (
                <button className="btn primary sm" onClick={() => d({ type: 'open', threadId: 'th-joy' })}>Find cover</button>
              )}
            </div>
          )}

          <div className="mini-label">People</div>
          <ul className="members">
            {[
              ...(selected.id === 'farm' && s.scheduleOverrides.farm ? [{ id: s.scheduleOverrides.farm, r: 'Covering Nov 21' }] : []),
              ...selected.hostIds.map((id) => ({ id, r: selected.id === 'farm' && s.issues.some((i) => i.id === 'cover-farm' && !i.resolved) ? 'Host · out sick' : 'Host' })),
              ...(selected.boardOpId ? [{ id: selected.boardOpId, r: 'Board op' }] : []),
            ].map(({ id, r }) => {
              const v = volById(id)!;
              return (
                <li key={id}>
                  <button className="member" onClick={() => d({ type: 'startDm', volId: id })} title={`Message ${v.name}`}>
                    <Avatar id={id} size={26} />
                    <span className="member-name">{v.name}</span>
                    <span className="member-meta">{r}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!selected.boardOpId && <p className="mini-hint">Host runs their own board.</p>}
          {selected.id === 'nightmarket' && (
            <div className="sched-alert">
              <Icon name="wave" size={14} /> <span>11 min of dead air last Thursday (Nov 12).</span>
              <button className="btn outline sm" onClick={() => d({ type: 'open', threadId: 'th-lourdes' })}>View</button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
