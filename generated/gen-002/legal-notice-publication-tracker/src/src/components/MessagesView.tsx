import { useEffect, useMemo, useState } from 'react';
import { PAPER } from '../data';
import { fDayTime, fStamp, iso, fDay } from '../dates';
import { SIGNAL_LABEL, alerts, isRepeat, isThreat } from '../logic';
import { useApp } from '../store';
import { Icon, Segmented, StatusPill } from './ui';
import type { View } from '../App';

type F = 'all' | 'threats' | 'routine';

export function MessagesView({ filter, setFilter, go }: { filter: F; setFilter: (f: F) => void; go: (v: View) => void }) {
  const { messages, state, dispatch, derived, openNotice } = useApp();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const cfg = state.alerts;
  // classification always uses the threat signals, regardless of the alert mode
  const threatCfg = { ...cfg, mode: 'threats' as const };

  const cats = useMemo(() => [...new Set(messages.map((m) => m.category))].sort(), [messages]);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return messages
      .filter((m) => (filter === 'all' ? true : filter === 'threats' ? isThreat(m, threatCfg) : !isThreat(m, threatCfg)))
      .filter((m) => cat === 'all' || m.category === cat)
      .filter((m) => !ql || `${m.subject} ${m.body}`.toLowerCase().includes(ql))
      .sort((a, b) => b.at.localeCompare(a.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, filter, cat, q, cfg]);

  const [selId, setSelId] = useState<string | undefined>(list[0]?.id);
  const sel = list.find((m) => m.id === selId) ?? list[0];
  useEffect(() => {
    if (sel && !state.readMsgs.has(sel.id)) dispatch({ type: 'read', ids: [sel.id] });
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const threatN = messages.filter((m) => isThreat(m, threatCfg)).length;
  const unreadInList = list.filter((m) => !state.readMsgs.has(m.id));

  // group by day
  const groups: { day: string; items: typeof list }[] = [];
  for (const m of list) {
    const day = m.at.slice(0, 10);
    const g = groups.at(-1);
    if (g && g.day === day) g.items.push(m);
    else groups.push({ day, items: [m] });
  }

  const notice = sel?.noticeId ? state.notices.find((n) => n.id === sel.noticeId) : undefined;
  const dv = notice ? derived.get(notice.id) : undefined;

  return (
    <div className="msg-page">
      <div className="page-head">
        <div>
          <h1>Paper messages</h1>
          <p className="sub">
            Everything {PAPER.system} sent since Friday. Proofrun reads each one against your notices’ legal deadlines.{' '}
            {cfg.mode === 'all' ? (
              <>
                <strong>All {messages.length} were pushed to you as alerts.</strong>{' '}
                <button className="link" onClick={() => go('alerts')}>
                  Change alert rules
                </button>
              </>
            ) : (
              <>Only threats are pushed as alerts.</>
            )}
          </p>
        </div>
      </div>

      <div className="msg-layout">
        <div className="msg-list-wrap">
          <div className="msg-tools">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: <>All <span className="seg-n">{messages.length}</span></> },
                { value: 'threats', label: <>Affects a hearing <span className="seg-n hot">{threatN}</span></> },
                { value: 'routine', label: <>Routine <span className="seg-n">{messages.length - threatN}</span></> },
              ]}
            />
            <div className="msg-tools-row">
              <label className="search">
                <Icon name="search" size={14} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" />
              </label>
              <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
                <option value="all">All categories</option>
                {cats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button className="btn sm ghost" disabled={!unreadInList.length} onClick={() => dispatch({ type: 'read', ids: unreadInList.map((m) => m.id) })}>
                Mark {unreadInList.length} read
              </button>
            </div>
          </div>
          <div className="msg-list">
            {groups.map((g) => (
              <div key={g.day}>
                <div className="msg-day">{fDay(g.day)}</div>
                {g.items.map((m) => {
                  const threat = isThreat(m, threatCfg);
                  return (
                    <button
                      key={m.id}
                      className={`msg-row${sel?.id === m.id ? ' on' : ''}${threat ? ' threat' : ''}${state.readMsgs.has(m.id) ? '' : ' unread'}`}
                      onClick={() => setSelId(m.id)}
                    >
                      <span className="mr-time">{fDayTime(new Date(m.at)).split(' ').slice(1).join(' ')}</span>
                      <span className="mr-main">
                        <span className="mr-subj">{m.subject}</span>
                        <span className="mr-cat">
                          {m.category}
                          {isRepeat(m) ? ' · repeat' : ''}
                          {alerts(m, cfg) ? <span className="mr-alerted" title="Sent to you as an alert under current rules"> · alerted</span> : ''}
                        </span>
                      </span>
                      {threat && <Icon name="alert" size={14} className="mr-icon" />}
                    </button>
                  );
                })}
              </div>
            ))}
            {list.length === 0 && <p className="empty">No messages match.</p>}
          </div>
        </div>

        {sel && (
          <article className="msg-detail">
            <div className="md-meta">
              <span className="md-from">
                <Icon name="paper" size={14} /> {PAPER.system} · {PAPER.name}
              </span>
              <span>{fStamp(new Date(sel.at))}</span>
            </div>
            <h2>{sel.subject}</h2>
            <div className="md-cat">{sel.category}</div>
            <p className="md-body">{sel.body}</p>

            <div className={`md-read ${isThreat(sel, threatCfg) ? 'threat' : 'routine'}`}>
              <div className="md-read-h">
                {isThreat(sel, threatCfg) ? <Icon name="alert" size={15} /> : <Icon name="check" size={15} />}
                {isThreat(sel, threatCfg) ? 'Threatens a hearing date' : 'Routine — no deadline impact'}
              </div>
              <p>
                {sel.analysis ??
                  (sel.noticeId && dv
                    ? `Confirms normal progress. ${notice!.adNo} is ${dv.status.replace('_', ' ')} with a run-by date of ${fDay(dv.lastLegal)}.`
                    : 'Account-level notice. Nothing on your notices changes.')}
              </p>
              {sel.signal && (
                <div className="md-rule">
                  Rule: {SIGNAL_LABEL[sel.signal]}
                  {isRepeat(sel) ? ' (repeat — suppressed)' : ''}
                  {!cfg.signals[sel.signal] ? ' (this rule is off)' : ''}
                </div>
              )}
            </div>

            {notice && dv && (
              <div className="md-notice">
                <div className="md-n-top">
                  <StatusPill status={dv.status} small />
                  <span className="muted small">{notice.adNo}</span>
                </div>
                <div className="t-title">{notice.title}</div>
                <div className="t-sub">
                  {dv.meeting.body} · {fDay(dv.meeting.date)} · run by {fDay(dv.lastLegal)}
                </div>
                <button className="btn sm" onClick={() => openNotice(notice.id)}>
                  Open notice <Icon name="arrow" size={13} />
                </button>
              </div>
            )}
            <div className="md-foot muted small">Message ID {sel.id.toUpperCase()}-{iso(new Date(sel.at)).replace(/-/g, '')}</div>
          </article>
        )}
      </div>
    </div>
  );
}
