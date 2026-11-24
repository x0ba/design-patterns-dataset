import React from 'react';
import { OFFICES, OfficeId, OPENINGS, SHIFTS, SINGLE_ONLY } from './data';
import {
  addDays,
  Attendance,
  deleShift,
  Evaluation,
  fmtDM,
  fmtTime,
  inRange,
  isClosed,
  iso,
  monShort,
  parse,
  timeRange,
  TODAY,
  TARGET,
  dowShort,
} from './logic';
import { SCHOOL_HOLIDAYS } from './data';
import type { Reservation } from './types';
import { Chip, OfficeBadge, StatusIcon } from './ui';
import * as I from './icons';

const WEEKS = 10;

export function Finder({
  evals,
  reservation,
  aId,
  bId,
  flashId,
  onSelect,
  attendance,
}: {
  evals: Map<string, Evaluation>;
  reservation: Reservation;
  aId: string;
  bId: string | null;
  flashId: string | null;
  onSelect: (id: string) => void;
  attendance: Attendance;
}) {
  const [offices, setOffices] = React.useState<Record<OfficeId, boolean>>({ harbor: true, northgate: true, linden: true });
  const [onlyWorkable, setOnlyWorkable] = React.useState(false);
  const [sort, setSort] = React.useState<'date' | 'fit'>('date');
  const listRef = React.useRef<HTMLDivElement>(null);

  const reservedId = reservation.kind === 'hold' || reservation.kind === 'booked' || reservation.kind === 'expired' ? reservation.openingId : null;

  const visible = OPENINGS.filter((o) => offices[o.office]).filter((o) => !onlyWorkable || evals.get(o.id)!.verdict !== 'no');
  const counts = (id: OfficeId) => OPENINGS.filter((o) => o.office === id && o.date < '2026-12-25').length;

  const byDate = new Map<string, Evaluation[]>();
  visible.forEach((o) => {
    const arr = byDate.get(o.date) || [];
    arr.push(evals.get(o.id)!);
    arr.sort((a, b) => a.opening.start.localeCompare(b.opening.start));
    byDate.set(o.date, arr);
  });

  const list = visible
    .map((o) => evals.get(o.id)!)
    .sort((a, b) => (sort === 'date' ? (a.opening.date + a.opening.start).localeCompare(b.opening.date + b.opening.start) : a.score - b.score));

  const workCount = OPENINGS.filter((o) => offices[o.office] && evals.get(o.id)!.verdict === 'works').length;
  const stdCount = OPENINGS.filter((o) => offices[o.office] && evals.get(o.id)!.verdict === 'works' && evals.get(o.id)!.recommended === 'standard').length;


  const pipLabel = (ev: Evaluation) => {
    const o = OFFICES[ev.opening.office];
    return `${o.name}, ${fmtDM(ev.dateObj)} ${timeRange(ev.opening)} — ${ev.headline}${ev.tradeoffs.length ? '; ' + ev.tradeoffs.map((t) => t.label).join(', ') : ''}`;
  };

  const roleOf = (id: string) => (id === aId ? 'A' : id === bId ? 'B' : null);

  return (
    <div className="finder">
      <div className="finder-head">
        <div>
          <h1>Book Ayo &amp; Temi’s passport visit</h1>
          <p className="lede">
            Family openings only: two back-to-back 20-minute slots, one per child. Every time is checked against{' '}
            {attendance === 'both' ? 'Dele’s shifts, ' : ''}school hours, your shift and processing time before {fmtDM(TARGET)}.
          </p>
        </div>
      </div>

      <div className="filters">
        <div className="office-toggles" role="group" aria-label="Offices">
          {(Object.keys(OFFICES) as OfficeId[]).map((id) => {
            const o = OFFICES[id];
            return (
              <button key={id} className={`otoggle ${offices[id] ? 'on' : ''}`} aria-pressed={offices[id]} onClick={() => setOffices({ ...offices, [id]: !offices[id] })}>
                <OfficeBadge letter={o.letter} />
                <span className="otext">
                  <strong>{o.name}</strong>
                  <span>
                    {o.km} km · {counts(id)} pre-Christmas
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="legend-row">
          <label className="switch">
          <input type="checkbox" checked={onlyWorkable} onChange={(e) => setOnlyWorkable(e.target.checked)} />
          <span className="track" />
          Hide times that don’t work
        </label>
      <div className="legend" aria-hidden>
        <span>
          <i className="lg lg-works" /> Works for everyone
        </span>
        <span>
          <i className="lg lg-check" /> Need Dele’s shift
        </span>
        <span>
          <i className="lg lg-no" /> Doesn’t work
        </span>
        <span>
          <i className="lg lg-hol" /> School holidays
        </span>
        <span>
          <i className="lg lg-closed" /> Registry closed
        </span>
        <span className="lg-std">
          <b>€</b>
          <span className="lg-std-txt">needs expedited</span>
        </span>
      </div>
      </div>

      <div className="cal" role="grid" aria-label="Family openings by week">
        <div className="cal-row cal-headrow" role="row">
          <div className="cal-wk" role="columnheader">
            Week · Dele
          </div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="cal-dow" role="columnheader">
              {d}
            </div>
          ))}
        </div>
        {Array.from({ length: WEEKS }).map((_, w) => {
          const mon = addDays(TODAY, w * 7);
          const sh = attendance === 'both' ? deleShift(mon) : null;
          return (
            <div className="cal-row" role="row" key={w}>
              <div className="cal-wk" role="rowheader">
                <div className="wk-date">
                  {fmtDM(mon)} – {fmtDM(addDays(mon, 6))}
                </div>
                {sh &&
                  (sh.kind === 'early' || sh.kind === 'late' ? (
                    <span className={`wk-shift ws-${sh.kind}`} title={`Dele: ${sh.label} shift ${fmtTime(sh.start)}–${fmtTime(sh.end)}, Mon–Sat`}>
                      {sh.label} {sh.start.slice(0, 2).replace(/^0/, '')}–{fmtTime(sh.end)}
                    </span>
                  ) : (
                    <span className="wk-shift ws-unknown">Not shared yet</span>
                  ))}
                {!sh && <span className="wk-shift ws-na">Not attending</span>}
              </div>
              {Array.from({ length: 7 }).map((__, di) => {
                const day = addDays(mon, di);
                const k = iso(day);
                const items = byDate.get(k) || [];
                const hol = inRange(day, SCHOOL_HOLIDAYS);
                const closed = isClosed(day) || di === 6;
                const single = SINGLE_ONLY.find((s) => s.date === k && offices[s.office]);
                const isToday = k === iso(TODAY);
                return (
                  <div
                    key={di}
                    role="gridcell"
                    className={`cal-cell ${hol ? 'hol' : ''} ${isClosed(day) ? 'closed' : ''} ${di === 6 ? 'sun' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <div className="cell-date">
                      {(day.getDate() === 1 || (w === 0 && di === 0)) && <span className="cell-mon">{monShort(day)}</span>}
                      {day.getDate()}
                      {isToday && <span className="today-tag">today</span>}
                    </div>
                    {isClosed(day) && di !== 6 && day.getDay() !== 6 && <div className="closed-txt">Closed</div>}
                    {items.map((ev) => {
                      const role = roleOf(ev.opening.id);
                      const isRes = ev.opening.id === reservedId;
                      return (
                        <button
                          key={ev.opening.id}
                          className={`pip v-${ev.verdict} ${role ? 'role-' + role : ''} ${isRes ? 'reserved r-' + reservation.kind : ''} ${flashId === ev.opening.id ? 'flash' : ''}`}
                          onClick={() => onSelect(ev.opening.id)}
                          title={pipLabel(ev)}
                          aria-label={pipLabel(ev)}
                        >
                          <span className="pip-l">{OFFICES[ev.opening.office].letter}</span>
                          <span className="pip-t">{fmtTime(ev.opening.start)}</span>
                          {ev.verdict !== 'no' && ev.recommended === 'expedited' && <span className="pip-exp" title="Needs expedited processing">€</span>}
                          {role && <span className="pip-role">{role}</span>}
                        </button>
                      );
                    })}
                    {single && items.length === 0 && (
                      <div className="single-only" title={single.note}>
                        singles only
                      </div>
                    )}
                    {!closed && items.length === 0 && !single && <div className="empty-dash" />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="list-head">
        <h2>
          {list.length} family openings{' '}
          <span className="muted">
            · {workCount} work for everyone, {stdCount} of them without expedited
          </span>
        </h2>
        <div className="sorter" role="group" aria-label="Sort">
          <button className={sort === 'date' ? 'on' : ''} onClick={() => setSort('date')}>
            Soonest
          </button>
          <button className={sort === 'fit' ? 'on' : ''} onClick={() => setSort('fit')}>
            Fewest trade-offs
          </button>
        </div>
      </div>

      <div className="olist" ref={listRef} role="list">
        {list.map((ev) => {
          const o = OFFICES[ev.opening.office];
          const role = roleOf(ev.opening.id);
          const isRes = ev.opening.id === reservedId;
          const proc = ev.recommended;
          return (
            <button
              key={ev.opening.id}
              data-id={ev.opening.id}
              role="listitem"
              className={`orow v-${ev.verdict} ${role ? 'sel role-' + role : ''}`}
              onClick={() => onSelect(ev.opening.id)}
            >
              <div className="orow-date">
                <span className="od-dow">{dowShort(ev.dateObj)}</span>
                <span className="od-d">{ev.dateObj.getDate()}</span>
                <span className="od-m">{monShort(ev.dateObj)}</span>
              </div>
              <div className="orow-main">
                <div className="orow-top">
                  <OfficeBadge letter={o.letter} />
                  <strong>{o.name}</strong>
                  <span className="muted">
                    {timeRange(ev.opening)} · {o.km} km
                  </span>
                  {isRes && (
                    <span className={`res-tag rt-${reservation.kind}`}>
                      {reservation.kind === 'hold' ? 'Your hold' : reservation.kind === 'booked' ? 'Your visit' : 'Hold expired'}
                    </span>
                  )}
                  {role && <span className={`role-tag rtag-${role}`}>{role}</span>}
                </div>
                <div className="orow-checks">
                  <span className={`ck ck-${ev.dele.status}`} title={ev.dele.detail}>
                    <StatusIcon status={ev.dele.status} size={12} /> Dele: {ev.dele.short}
                  </span>
                  <span className={`ck ck-${ev.kids.status}`} title={ev.kids.detail}>
                    <StatusIcon status={ev.kids.status} size={12} /> Kids: {ev.kids.short}
                  </span>
                  <span className={`ck ck-${ev.you.status}`} title={ev.you.detail}>
                    <StatusIcon status={ev.you.status} size={12} /> You: {ev.you.short}
                  </span>
                </div>
              </div>
              <div className="orow-proc">
                {proc === 'standard' && <Chip tone="ok">Standard OK</Chip>}
                {proc === 'expedited' && (
                  <Chip tone={ev.exp.status === 'tight' ? 'warn' : 'cost'}>Expedited +€{ev.extraCost}</Chip>
                )}
                {!proc && <Chip tone="bad">Too late</Chip>}
                <span className={`verdict vd-${ev.verdict}`}>{ev.headline}</span>
              </div>
              <I.Arrow size={14} className="orow-arrow" />
            </button>
          );
        })}
        {list.length === 0 && <div className="empty">No openings match. Turn an office back on or show all times.</div>}
      </div>
    </div>
  );
}
