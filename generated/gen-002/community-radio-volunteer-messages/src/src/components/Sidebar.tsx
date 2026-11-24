import { useEffect, useState } from 'react';
import { shows } from '../data';
import { needsReply, now, unreadCount, useStore, View } from '../store';
import { Avatar, Icon, slotLabel, volById } from '../util';

function onAirNow() {
  const n = now();
  const day = (n.getDay() + 6) % 7;
  const h = n.getHours() + n.getMinutes() / 60;
  const s = shows.find((x) => x.day === day && h >= x.start && h < x.end);
  const next = shows
    .filter((x) => x.day === day && x.start > h)
    .sort((a, b) => a.start - b.start)[0] ?? shows.find((x) => x.day === (day + 1) % 7);
  return { s, next };
}

export function Sidebar() {
  const { s, d } = useStore();
  const [, tick] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => tick((x) => x + 1), 30000);
    return () => window.clearInterval(i);
  }, []);

  const needs = s.threads.filter(needsReply).length;
  const unread = s.threads.reduce((a, t) => a + unreadCount(t), 0);
  const { s: live, next } = onAirNow();
  const openIssues = s.issues.filter((i) => !i.resolved);
  const resolved = s.issues.filter((i) => i.resolved);

  const nav: { id: View; label: string; icon: string; badge?: number }[] = [
    { id: 'inbox', label: 'Inbox', icon: 'inbox', badge: unread || undefined },
    { id: 'schedule', label: 'Schedule', icon: 'calendar' },
    { id: 'volunteers', label: 'Volunteers', icon: 'people' },
    { id: 'replies', label: 'Saved replies', icon: 'bookmark' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Icon name="radio" size={18} stroke={2} /></div>
        <div>
          <div className="brand-name">Airshift</div>
          <div className="brand-station">KRVT 92.7 FM</div>
        </div>
      </div>

      <nav className="nav">
        {nav.map((n) => (
          <button key={n.id} className={`nav-item ${s.view === n.id ? 'active' : ''}`}
            onClick={() => (n.id === 'inbox' ? d({ type: 'filter', filter: s.filter }) : d({ type: 'view', view: n.id }))}>
            <Icon name={n.icon} size={17} />
            <span>{n.label}</span>
            {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
          </button>
        ))}
      </nav>

      <div className="side-section">
        <div className="side-label">Waiting on you</div>
        <button className={`side-link ${s.view === 'inbox' && s.filter === 'needs' && !s.issueFilter ? 'active' : ''}`}
          onClick={() => d({ type: 'filter', filter: 'needs' })}>
          <span className="dot amber" /> Needs a reply <span className="side-count">{needs}</span>
        </button>
      </div>

      <div className="side-section">
        <div className="side-label">Open issues</div>
        {openIssues.length === 0 && <div className="side-empty">Nothing open. Nice.</div>}
        {openIssues.map((iss) => {
          const done = iss.checklist.filter((c) => c.done).length;
          return (
            <button key={iss.id}
              className={`issue-link ${s.view === 'inbox' && s.issueFilter === iss.id ? 'active' : ''}`}
              onClick={() => {
                d({ type: 'issueFilter', issueId: iss.id });
                if (!iss.threadIds.includes(s.activeThreadId)) d({ type: 'open', threadId: iss.threadIds[0] });
              }}>
              <span className={`issue-icon ${iss.kind}`}>
                <Icon name={iss.kind === 'incident' ? 'wave' : 'sun'} size={14} stroke={2} />
              </span>
              <span className="issue-text">
                <span className="issue-title">{iss.title}</span>
                <span className="issue-sub">{iss.subtitle}</span>
                <span className="progress"><span style={{ width: `${(done / iss.checklist.length) * 100}%` }} /></span>
              </span>
            </button>
          );
        })}
        {resolved.length > 0 && (
          <div className="side-resolved">
            {resolved.map((r) => (
              <button key={r.id} className="side-link small" onClick={() => d({ type: 'resolveIssue', issueId: r.id, resolved: false })}
                title="Reopen">
                <Icon name="check" size={13} /> <s>{r.title}</s>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="side-spacer" />

      <div className="onair">
        <div className="onair-head">
          <span className="onair-dot" /> On air now
        </div>
        {live ? (
          <>
            <div className="onair-show">{live.name}</div>
            <div className="onair-meta">{volById(live.hostIds[0])?.name} · until {slotLabel(live.start, live.end).split('–')[1]}</div>
          </>
        ) : (
          <>
            <div className="onair-show">Automation</div>
            <div className="onair-meta">Next: {next?.name}</div>
          </>
        )}
      </div>

      <div className="me">
        <Avatar id="dev" size={30} />
        <div>
          <div className="me-name">Dev Raman</div>
          <div className="me-role">Volunteer coordinator</div>
        </div>
      </div>
    </aside>
  );
}
