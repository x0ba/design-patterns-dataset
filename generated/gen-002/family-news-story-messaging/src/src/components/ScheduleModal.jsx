import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Phone, Check, AlertTriangle, Download } from 'lucide-react';
import { Avatar } from './bits.jsx';
import { AVAIL, PEOPLE } from '../data.js';
import { TZ, et, fmtTime, tzName } from '../time.js';

const DAY_KEYS = Object.keys(AVAIL);
const FROM = 9 * 60, TO = 21 * 60, STEP = 30;
const CELLS = (TO - FROM) / STEP;
const PEOPLE_ORDER = ['N', 'S', 'K'];
const fmtMin = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const hourLabel = (m) => { const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`; };
const TOPICS = ['Go over the Dec. 1 hearing', 'Talk about the letter Mrs. Khoury got', 'Her Medicare plan before Dec. 7'];

const busyAt = (day, p, s, e) => (AVAIL[day][p].busy || []).filter((b) => s < b.to && e > b.from);
const unknownFor = (day, p) => !!AVAIL[day][p].unknown;

export default function ScheduleModal({ existing, onClose, onSend, jumpTo }) {
  const init = existing ? existing.call : null;
  const [day, setDay] = useState(init ? DAY_KEYS.find((k) => et(k + ' 00:00') <= init.start && init.start < et(k + ' 00:00') + 864e5) || DAY_KEYS[0] : DAY_KEYS[0]);
  const [start, setStart] = useState(init ? Math.round((init.start - et(day + ' 00:00')) / 60000) : 15 * 60);
  const [dur, setDur] = useState(init?.dur ?? 45);
  const [topics, setTopics] = useState(init?.topics ?? '');
  const dlg = useRef(null);

  useEffect(() => {
    dlg.current?.querySelector('select, button, input')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dlg.current) {
        const f = [...dlg.current.querySelectorAll('button:not([disabled]), select, input, textarea, [href]')];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const end = start + dur;
  const startMs = et(`${day} 00:00`) + start * 60000;

  const conflicts = PEOPLE_ORDER.flatMap((p) => busyAt(day, p, start, end).map((b) => ({ p, why: b.why })));
  const unknown = PEOPLE_ORDER.filter((p) => unknownFor(day, p));
  const fits = (s) => PEOPLE_ORDER.every((p) => busyAt(day, p, s, s + dur).length === 0);
  const suggestions = useMemo(() => {
    const out = [];
    for (let s = 11 * 60; s + dur <= TO && out.length < 3; s += 60) if (fits(s) && !PEOPLE_ORDER.some((p) => unknownFor(day, p))) out.push(s);
    return out;
    // eslint-disable-next-line
  }, [day, dur]);

  const addTopic = (t) => setTopics((x) => (x.includes(t) ? x : x ? `${x}; ${t}` : t));
  const starts = Array.from({ length: CELLS - dur / STEP + 1 }, (_, i) => FROM + i * STEP);

  const ok = conflicts.length === 0;
  const send = () => onSend({ start: startMs, dur, topics: topics.trim(), rsvp: { N: 'going', S: 'pending', K: 'pending' } });

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="sch-title" ref={dlg}>
        <header className="m-head">
          <div>
            <h2 id="sch-title">{existing ? 'Change the family call' : 'Set up a family call'}</h2>
            <p>Attached to “Council to weigh Warren Ave rezoning”. Everyone in Haddads will see the invite in that conversation.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="m-body">
          <div className="m-row">
            <fieldset className="days">
              <legend>Day</legend>
              {DAY_KEYS.map((k) => (
                <button key={k} className={'chip' + (day === k ? ' on' : '')} aria-pressed={day === k} onClick={() => { setDay(k); }}>
                  {AVAIL[k].label}{k === DAY_KEYS[0] ? ' · asked for' : ''}
                </button>
              ))}
            </fieldset>
            <div className="fld">
              <label htmlFor="sch-start">Start (Eastern)</label>
              <select id="sch-start" value={start} onChange={(e) => setStart(+e.target.value)}>
                {starts.map((s) => <option key={s} value={s}>{fmtMin(s)}</option>)}
                {!starts.includes(start) && <option value={start}>{fmtMin(start)}</option>}
              </select>
            </div>
            <div className="fld">
              <label htmlFor="sch-dur">Length</label>
              <select id="sch-dur" value={dur} onChange={(e) => setDur(+e.target.value)}>
                {[30, 45, 60].map((d) => <option key={d} value={d}>{d} minutes</option>)}
              </select>
            </div>
          </div>

          {/* availability grid */}
          <div className="grid-wrap">
            <div className="grid" style={{ '--cells': CELLS }}>
              <div className="g-label hdr">Eastern time</div>
              <div className="g-cells hdr">
                {Array.from({ length: CELLS / 2 }, (_, i) => <span key={i} style={{ gridColumn: `${i * 2 + 1} / span 2` }}>{hourLabel(FROM + i * 60)}</span>)}
              </div>
              <div className="g-label hdr karim">Karim’s clock (Arizona)</div>
              <div className="g-cells hdr karim">
                {Array.from({ length: CELLS / 2 }, (_, i) => <span key={i} style={{ gridColumn: `${i * 2 + 1} / span 2` }}>{hourLabel(FROM + i * 60 - 120)}</span>)}
              </div>
              {PEOPLE_ORDER.map((p) => (
                <div className="g-row" key={p}>
                  <div className="g-label"><Avatar id={p} size={22} /><span><b>{p === 'N' ? 'You' : PEOPLE[p].first}</b><small>{AVAIL[day][p].note}</small></span></div>
                  <div className="g-cells" role="group" aria-label={`${PEOPLE[p].first} availability`}>
                    {Array.from({ length: CELLS }, (_, i) => {
                      const s = FROM + i * STEP, b = busyAt(day, p, s, s + STEP)[0];
                      const cls = b ? 'busy' : unknownFor(day, p) ? 'unk' : 'free';
                      const inSel = s >= start && s < end;
                      return (
                        <button key={i} tabIndex={-1} className={`c ${cls}${inSel ? ' sel' : ''}${s === start ? ' first' : ''}${s < end && s + STEP >= end ? ' last' : ''}`}
                          title={`${fmtMin(s)} ET · ${b ? b.why : unknownFor(day, p) ? 'Hasn’t said' : 'Free'}`} onClick={() => setStart(Math.min(s, TO - dur))} aria-label={`${fmtMin(s)}: ${b ? b.why : unknownFor(day, p) ? 'no information' : 'free'}`} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="legend"><span><i className="free" />Free</span><span><i className="busy" />Busy</span><span><i className="unk" />Hasn’t said</span><span className="src">Based on what Samira and Karim wrote in this conversation.
              {' '}<button className="link-btn" onClick={() => { onClose(); jumpTo('w14.5'); }}>Samira’s voice note</button> · <button className="link-btn" onClick={() => { onClose(); jumpTo('w14.6'); }}>Karim’s message</button></span></div>
          </div>

          {/* suggestion + status */}
          <div className="m-two">
            <div>
              <h3 className="h">Times that work for all three</h3>
              {suggestions.length ? (
                <div className="sugg">
                  {suggestions.map((s) => (
                    <button key={s} className={'sug' + (s === start ? ' on' : '')} onClick={() => setStart(s)}>
                      <b>{fmtMin(s)}</b><small>Karim: {fmtMin(s - 120)}</small>
                    </button>
                  ))}
                </div>
              ) : <p className="muted">{unknown.length ? `${unknown.map((p) => PEOPLE[p].first).join(' and ')} haven’t said when they’re free this day, so there is nothing to match yet.` : 'No time works for everyone this day.'}</p>}
              <div className={'status ' + (ok && !unknown.length ? 'good' : ok ? 'maybe' : 'bad')} role="status">
                {ok && !unknown.length && <><Check size={16} />Everyone is free then.</>}
                {ok && unknown.length > 0 && <><AlertTriangle size={16} />Nothing conflicts, but {unknown.map((p) => PEOPLE[p].first).join(' and ')} haven’t said they’re free.</>}
                {!ok && <><AlertTriangle size={16} /><span>{conflicts.map((c, i) => <span key={i}>{i ? ' ' : ''}<b>{c.p === 'N' ? 'You' : PEOPLE[c.p].first}</b>: {c.why}.</span>)}</span></>}
              </div>
            </div>
            <div>
              <h3 className="h">What time it is for each person</h3>
              <ul className="zones">
                {PEOPLE_ORDER.map((p) => (
                  <li key={p} className={p === 'K' ? 'diff' : ''}>
                    <Avatar id={p} size={24} /><span>{p === 'N' ? 'You' : PEOPLE[p].first}<small>{PEOPLE[p].city}</small></span>
                    <b>{fmtTime(startMs, TZ[p])} <small>{tzName(startMs, TZ[p])}</small></b>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="fld wide">
            <label htmlFor="sch-topics">What to talk about <span className="muted">(optional, shown on the invite)</span></label>
            <input id="sch-topics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="e.g. Go over the Dec. 1 hearing" />
            <div className="chips tight">{TOPICS.map((t) => <button key={t} className="chip" onClick={() => addTopic(t)}>+ {t}</button>)}</div>
          </div>
        </div>

        <footer className="m-foot">
          <span className="m-sum"><Phone size={16} />{AVAIL[day].label}, <b>{fmtMin(start)} {tzName(startMs, TZ.N)}</b> · Karim <b>{fmtMin(start - 120)} {tzName(startMs, TZ.K)}</b> · {dur} min</span>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={send}>{existing ? 'Update invite' : 'Send invite to Haddads'}</button>
        </footer>
      </div>
    </div>
  );
}
