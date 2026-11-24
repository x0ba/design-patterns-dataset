import { useEffect } from 'react';
import { PAPER, STAFF, TYPE_LABEL } from '../data';
import { addDays, cutoffFor, d, daysBetween, fDay, fLong, fStamp, fTime, iso, money } from '../dates';
import { STATUS_LONG, isValidPending } from '../logic';
import { useApp } from '../store';
import type { Insertion, StaffId } from '../types';
import { Avatar, Icon, StatusPill, Toggle } from './ui';

const INS_LABEL: Record<Insertion['state'], string> = {
  published: 'Ran',
  confirmed: 'Booked · confirmed',
  unconfirmed: 'Booked · no confirmation',
  not_published: 'Did not run',
  edition_cancelled: 'Edition cancelled',
};

export function NoticeDrawer() {
  const { state, derived, openId, openNotice, now, dispatch, nowIso, toast, setModal, messages } = useApp();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.modal') && openNotice(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [openNotice]);

  const n = openId ? state.notices.find((x) => x.id === openId) : undefined;
  if (!n) return null;
  const dv = derived.get(n.id)!;
  const m = dv.meeting;
  const today = iso(now);

  // ---- timeline geometry
  const start = [n.submitted.slice(0, 10), ...n.insertions.map((i) => i.date), today].sort()[0];
  const startD = addDays(start, -2);
  const end = addDays(m.date, 2);
  const span = daysBetween(startD, end);
  const pos = (x: string) => `${(daysBetween(startD, x) / span) * 100}%`;

  const feed = [
    ...n.activity.map((a) => ({ at: a.at, who: STAFF[a.who as StaffId]?.name ?? 'Proofrun', text: a.text, kind: 'clerk' as const, signal: false })),
    ...messages
      .filter((x) => x.noticeId === n.id)
      .map((x) => ({ at: x.at, who: 'AdDesk', text: x.subject, kind: 'paper' as const, signal: !!x.signal && x.signal !== 'proof_pending' && !x.subject.startsWith('Reminder:') })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const canAct = dv.status === 'at_risk' || dv.status === 'missed';

  return (
    <>
      <div className="drawer-back" onClick={() => openNotice(null)} />
      <aside className="drawer" role="dialog" aria-label={n.title}>
        <header className="dr-head">
          <div className="dr-tags">
            <StatusPill status={dv.status} />
            <span className="muted">{STATUS_LONG[dv.status] !== 'At risk' && STATUS_LONG[dv.status] !== 'On track' ? STATUS_LONG[dv.status] : ''}</span>
            <span className="dr-ad">{n.adNo}</span>
          </div>
          <button className="icon-btn" onClick={() => openNotice(null)} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="dr-scroll">
          <div className="dr-type">{TYPE_LABEL[n.type]}</div>
          <h2 className="dr-title">{n.title}</h2>
          <p className="dr-summary">{n.summary}</p>

          <div className={`dr-headline ${dv.status}`}>
            {dv.status === 'on_track' || dv.status === 'awaiting_affidavit' ? <Icon name="check" size={15} /> : <Icon name="alert" size={15} />}
            <span>{dv.headline}</span>
          </div>

          {canAct && (
            <div className="dr-actions">
              {dv.status === 'missed' ? (
                <button className="btn primary" onClick={() => setModal({ kind: 'reschedule', id: n.id })}>
                  Reschedule bid opening…
                </button>
              ) : (
                <button className="btn primary" onClick={() => setModal({ kind: 'rebook', id: n.id })}>
                  {dv.problemIndex >= 0 && n.insertions[dv.problemIndex].state === 'unconfirmed' ? 'Move to earlier edition…' : 'Rebook insertion…'}
                </button>
              )}
              <a className="btn ghost" href={`tel:${PAPER.phone.replace(/\D/g, '')}`}>
                <Icon name="phone" size={14} /> Legal desk {PAPER.phone}
              </a>
            </div>
          )}

          <dl className="facts">
            <div>
              <dt>Meeting</dt>
              <dd>
                <strong>{m.body}</strong>
                <br />
                {fLong(m.date)} · {m.time}
                <br />
                <span className="muted">{m.place}</span>
                {m.rescheduledFrom && <span className="moved">Moved from {fDay(m.rescheduledFrom)}</span>}
              </dd>
            </div>
            <div>
              <dt>Statutory rule</dt>
              <dd>
                <strong>
                  {n.statutoryDays} days · {n.requiredRuns} insertion{n.requiredRuns > 1 ? 's' : ''}
                </strong>
                <br />
                Last legal run date <strong>{fDay(dv.lastLegal)}</strong>
                <br />
                <span className="muted">{dv.status === 'missed'
                    ? 'Window closed'
                    : dv.slack === null
                      ? 'All insertions ran'
                      : dv.pending.length + dv.published.length < n.requiredRuns
                        ? `No valid run booked · ${dv.slack} days left to get one in`
                        : `${dv.slack} days slack on latest booking`}</span>
              </dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>
                {fStamp(new Date(n.submitted))}
                <br />
                <span className="muted">{money(n.cost)} · {n.requiredRuns > 1 ? `${money(n.cost / 2)} per insertion` : 'single insertion'}</span>
              </dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd className="owner-pick">
                <Avatar id={n.owner} size={24} />
                <select
                  value={n.owner}
                  onChange={(e) => {
                    dispatch({ type: 'reassign', id: n.id, owner: e.target.value as StaffId, at: nowIso });
                    toast(`Reassigned to ${STAFF[e.target.value as StaffId].name}.`);
                  }}
                  aria-label="Owner"
                >
                  {(Object.keys(STAFF) as StaffId[]).map((s) => (
                    <option key={s} value={s}>
                      {STAFF[s].name}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
          </dl>

          <section className="dr-sec">
            <h4>Deadline window</h4>
            <div className="ruler">
              <div className="ruler-track" />
              <div className="ruler-window" style={{ left: pos(startD), width: `calc(${pos(dv.lastLegal)} - ${pos(startD)})` }} />
              <div className="ruler-late" style={{ left: pos(dv.lastLegal), right: 0 }} />
              <div className="ruler-mark runby" style={{ left: pos(dv.lastLegal) }}>
                <span>Run by {fDay(dv.lastLegal)}</span>
              </div>
              <div className="ruler-mark meeting" style={{ left: pos(m.date) }}>
                <span>{m.short} {fDay(m.date)}</span>
              </div>
              {today >= startD && today <= end && (
                <div className="ruler-mark today" style={{ left: pos(today) }}>
                  <span>Today</span>
                </div>
              )}
              {n.insertions.map((ins, i) => (
                <div key={i} className={`ruler-ins ins-${ins.state}`} style={{ left: pos(ins.date) }} title={`${fDay(ins.date)} — ${INS_LABEL[ins.state]}`} />
              ))}
            </div>
            <div className="ruler-scale">
              <span>{fDay(startD)}</span>
              <span>{fDay(end)}</span>
            </div>
          </section>

          <section className="dr-sec">
            <h4>Insertions</h4>
            <ul className="ins-list">
              {n.insertions.map((ins, i) => {
                const valid = ins.state === 'published' || isValidPending(ins, dv.lastLegal);
                const cut = cutoffFor(ins.date);
                return (
                  <li key={i} className={`ins-row insrow-${ins.state}`}>
                    <div className="ir-date">
                      <strong>{fDay(ins.date)}</strong>
                      <span>{d(ins.date).getFullYear()}</span>
                    </div>
                    <div className="ir-body">
                      <div className="ir-state">
                        {INS_LABEL[ins.state]}
                        {!valid && ins.state !== 'not_published' && ins.state !== 'edition_cancelled' && <span className="late-tag">after run-by date</span>}
                      </div>
                      {ins.note && <div className="ir-note">{ins.note}</div>}
                      {(ins.state === 'unconfirmed' || ins.state === 'confirmed') && (
                        <div className="ir-note">
                          Paper cutoff {fDay(iso(cut))} {fTime(cut)}
                          {cut < now ? ' — passed' : ''}
                        </div>
                      )}
                    </div>
                    {ins.state === 'unconfirmed' && (
                      <button
                        className="btn sm"
                        onClick={() => {
                          dispatch({ type: 'confirm', id: n.id, index: i, at: nowIso });
                          toast(`${fDay(ins.date)} placement marked confirmed.`);
                        }}
                      >
                        Mark confirmed
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="dr-sec">
            <h4>Proof of publication</h4>
            <div className="proof-grid">
              <div className="proof-box">
                <div className="pb-row">
                  <span>Tear sheet</span>
                  <Toggle
                    on={n.tearSheet}
                    label="Tear sheet received"
                    onChange={(v) => {
                      dispatch({ type: 'tearSheet', id: n.id, value: v, at: nowIso });
                      toast(v ? 'Tear sheet logged.' : 'Tear sheet unmarked.');
                    }}
                  />
                </div>
                <div className="muted small">{n.tearSheet ? 'On file — usable as interim proof at the meeting.' : dv.published.length ? 'Not received yet.' : 'Due after first run.'}</div>
              </div>
              <div className="proof-box">
                <div className="pb-row">
                  <span>Affidavit of publication</span>
                  <span className={`aff-state ${n.affidavit}`}>{n.affidavit === 'received' ? 'Filed' : n.affidavit === 'awaiting' ? `${dv.affidavitAge}d outstanding` : 'Not yet due'}</span>
                </div>
                {n.affidavit === 'received' && <div className="muted small">Received {fDay(n.affidavitReceived!)}</div>}
                {n.affidavit === 'awaiting' && (
                  <>
                    <div className="muted small">
                      {n.affidavitRequested ? `Requested ${fDay(n.affidavitRequested)}. ` : 'Not yet requested. '}
                      Paper estimates Nov 20–24.
                    </div>
                    <div className="pb-actions">
                      <button
                        className="btn sm"
                        onClick={() => {
                          dispatch({ type: 'requestAffidavit', ids: [n.id], at: nowIso, day: today });
                          toast(`Affidavit requested for ${n.adNo}.`);
                        }}
                      >
                        {n.affidavitRequested ? 'Request again' : 'Request from paper'}
                      </button>
                      <button
                        className="btn sm primary"
                        onClick={() => {
                          dispatch({ type: 'receiveAffidavit', id: n.id, date: today, at: nowIso });
                          toast(`Affidavit filed for ${n.adNo}. Notice is complete.`);
                        }}
                      >
                        Log received today
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="dr-sec">
            <h4>History</h4>
            <ol className="feed">
              {feed.map((f, i) => (
                <li key={i} className={`${f.kind}${f.signal ? ' signal' : ''}`}>
                  <span className="f-at">{fStamp(new Date(f.at))}</span>
                  <span className="f-who">{f.who}</span>
                  <span className="f-text">{f.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>
    </>
  );
}
