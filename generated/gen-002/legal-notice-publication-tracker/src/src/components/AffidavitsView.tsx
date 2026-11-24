import { useState } from 'react';
import { TYPE_LABEL } from '../data';
import { daysBetween, fDay, iso } from '../dates';
import { useApp } from '../store';
import { Avatar, Icon, Toggle } from './ui';

export function AffidavitsView() {
  const { state, derived, now, dispatch, nowIso, toast, openNotice } = useApp();
  const today = iso(now);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const awaiting = state.notices
    .filter((n) => derived.get(n.id)!.status === 'awaiting_affidavit')
    .sort((a, b) => (derived.get(b.id)!.affidavitAge ?? 0) - (derived.get(a.id)!.affidavitAge ?? 0));
  const received = state.notices
    .filter((n) => n.affidavit === 'received')
    .sort((a, b) => (b.affidavitReceived ?? '').localeCompare(a.affidavitReceived ?? ''));

  const oldest = awaiting.length ? derived.get(awaiting[0].id)!.affidavitAge : 0;
  const maxAge = Math.max(20, oldest ?? 0);
  const exposed = awaiting.filter((n) => !n.tearSheet && daysBetween(today, derived.get(n.id)!.meeting.date) <= 3);
  const allSel =awaiting.length > 0 && awaiting.every((n) => sel.has(n.id));

  const request = (ids: string[]) => {
    dispatch({ type: 'requestAffidavit', ids, at: nowIso, day: today });
    toast(`Affidavit request sent to the legal desk for ${ids.length} notice${ids.length > 1 ? 's' : ''}.`);
    setSel(new Set());
  };

  return (
    <div className="aff-page">
      <div className="page-head">
        <div>
          <h1>Affidavits of publication</h1>
          <p className="sub">
            {awaiting.length} notices ran but have no affidavit on file{awaiting.length ? ` · oldest ${oldest} days` : ''}. The paper says affidavits are delayed by the legal desk consolidation (est. Nov 20–24).
          </p>
        </div>
        <div className="head-actions">
          <button className="btn" disabled={sel.size === 0} onClick={() => request([...sel])}>
            <Icon name="send" size={14} /> Request selected ({sel.size})
          </button>
          <button className="btn primary" disabled={!awaiting.length} onClick={() => request(awaiting.map((n) => n.id))}>
            Request all outstanding
          </button>
        </div>
      </div>

      {exposed.length === 0 ? (
        <div className="aff-note">
          <Icon name="check" size={15} />
          <span>
            None of these threaten a hearing: every notice with a meeting in the next 3 days has a tear sheet on file, which the city attorney accepts as interim proof. Affidavits still need to be in the record for the minutes.
          </span>
        </div>
      ) : (
        <div className="aff-note warn">
          <Icon name="alert" size={15} />
          <span>
            No proof on file for a meeting within 3 days: {exposed.map((n) => n.title.split(',')[0]).join('; ')}. Get a tear sheet or affidavit before the meeting.
          </span>
        </div>
      )}

      <table className="ntable aff-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allSel}
                onChange={() => setSel(allSel ? new Set() : new Set(awaiting.map((n) => n.id)))}
              />
            </th>
            <th>Notice</th>
            <th style={{ width: 120 }}>Final run</th>
            <th style={{ width: 200 }}>Outstanding</th>
            <th style={{ width: 150 }}>Meeting</th>
            <th style={{ width: 100 }}>Tear sheet</th>
            <th style={{ width: 120 }}>Requested</th>
            <th style={{ width: 40 }} />
            <th style={{ width: 150 }} />
          </tr>
        </thead>
        <tbody>
          {awaiting.map((n) => {
            const dv = derived.get(n.id)!;
            const age = dv.affidavitAge ?? 0;
            const toMeeting = daysBetween(today, dv.meeting.date);
            return (
              <tr key={n.id}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${n.title}`}
                    checked={sel.has(n.id)}
                    onChange={() => {
                      const s = new Set(sel);
                      if (s.has(n.id)) s.delete(n.id);
                      else s.add(n.id);
                      setSel(s);
                    }}
                  />
                </td>
                <td>
                  <button className="t-title linkish" onClick={() => openNotice(n.id)}>
                    {n.title}
                  </button>
                  <div className="t-sub">
                    {TYPE_LABEL[n.type]} · {n.adNo} · {n.requiredRuns} insertion{n.requiredRuns > 1 ? 's' : ''}
                  </div>
                </td>
                <td>{fDay(dv.finalRun!)}</td>
                <td>
                  <div className="age">
                    <div className="age-bar">
                      <span className={age > 14 ? 'late' : age > 7 ? 'warn' : ''} style={{ width: `${(age / maxAge) * 100}%` }} />
                    </div>
                    <span className={`age-n${age > 14 ? ' late' : ''}`}>{age} days</span>
                  </div>
                </td>
                <td>
                  <div className="t-strong">{fDay(dv.meeting.date)}</div>
                  <div className={`t-sub${toMeeting <= 3 ? ' warn-text' : ''}`}>
                    {dv.meeting.short} · {toMeeting === 0 ? 'today' : toMeeting === 1 ? 'tomorrow' : `in ${toMeeting} days`}
                  </div>
                </td>
                <td>
                  <Toggle
                    on={n.tearSheet}
                    label="Tear sheet received"
                    onChange={(v) => {
                      dispatch({ type: 'tearSheet', id: n.id, value: v, at: nowIso });
                      toast(v ? `Tear sheet logged for ${n.adNo}.` : `Tear sheet unmarked for ${n.adNo}.`);
                    }}
                  />
                </td>
                <td className="small">{n.affidavitRequested ? fDay(n.affidavitRequested) : <span className="muted">Not yet</span>}</td>
                <td>
                  <Avatar id={n.owner} size={22} />
                </td>
                <td>
                  <button
                    className="btn sm"
                    onClick={() => {
                      dispatch({ type: 'receiveAffidavit', id: n.id, date: today, at: nowIso });
                      toast(`Affidavit filed for ${n.adNo}.`);
                    }}
                  >
                    Log received
                  </button>
                </td>
              </tr>
            );
          })}
          {awaiting.length === 0 && (
            <tr>
              <td colSpan={9} className="empty">
                All published notices have an affidavit on file.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>On file</h2>
        <span className="muted">{received.length} affidavits filed for active notices</span>
      </div>
      <div className="filed">
        {received.map((n) => {
          const dv = derived.get(n.id)!;
          return (
            <button key={n.id} className="filed-item" onClick={() => openNotice(n.id)}>
              <Icon name="affidavit" size={16} />
              <div>
                <div className="t-title">{n.title}</div>
                <div className="t-sub">
                  Ran {fDay(dv.finalRun!)} · filed {fDay(n.affidavitReceived!)} · {daysBetween(dv.finalRun!, n.affidavitReceived!)}-day turnaround
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
