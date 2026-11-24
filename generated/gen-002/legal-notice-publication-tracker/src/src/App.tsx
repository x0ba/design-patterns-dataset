import { useEffect, useMemo, useRef, useState } from 'react';
import { PAPER, STAFF } from './data';
import { cutoffFor, fDuration, fLong, fTime, iso, nextBookableEdition, fDay } from './dates';
import { alerts } from './logic';
import { useApp } from './store';
import { Icon, Avatar } from './components/ui';
import { Overview } from './components/Overview';
import { CalendarView } from './components/CalendarView';
import { AffidavitsView } from './components/AffidavitsView';
import { MessagesView } from './components/MessagesView';
import { AlertsView } from './components/AlertsView';
import { NoticeDrawer } from './components/NoticeDrawer';
import { RebookModal, RescheduleModal } from './components/Modals';

export type View = 'overview' | 'calendar' | 'affidavits' | 'messages' | 'alerts';

export default function App() {
  const { state, derived, now, modal, toasts, messages } = useApp();
  const [view, setView] = useState<View>('overview');
  const [msgFilter, setMsgFilter] = useState<'all' | 'threats' | 'routine'>('all');

  const counts = useMemo(() => {
    const c = { missed: 0, at_risk: 0, unconfirmed: 0, awaiting_affidavit: 0, on_track: 0 };
    derived.forEach((d) => c[d.status]++);
    return c;
  }, [derived]);

  const unreadAlerts = messages.filter((m) => alerts(m, state.alerts) && !state.readMsgs.has(m.id)).length;
  const next = nextBookableEdition(now);
  const cutoff = cutoffFor(next.date);
  const cutoffToday = iso(cutoff) === iso(now);

  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [view]);

  const go = (v: View, f?: 'all' | 'threats' | 'routine') => {
    setView(v);
    if (f) setMsgFilter(f);
  };

  const nav: { id: View; label: string; icon: string; badge?: number; tone?: string }[] = [
    { id: 'overview', label: 'Since Friday', icon: 'overview', badge: counts.at_risk + counts.missed, tone: 'risk' },
    { id: 'calendar', label: 'Publication calendar', icon: 'calendar' },
    { id: 'affidavits', label: 'Affidavits', icon: 'affidavit', badge: counts.awaiting_affidavit },
    { id: 'messages', label: 'Paper messages', icon: 'inbox', badge: messages.length - state.readMsgs.size },
    { id: 'alerts', label: 'Alert rules', icon: 'sliders' },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
              <rect width="32" height="32" rx="7" fill="#e9b65a" />
              <path d="M9 7.5h10l4 4V25H9z" fill="none" stroke="#1c2a3a" strokeWidth="2" />
              <path d="M12.5 17.5l3 3 5-6" fill="none" stroke="#1c2a3a" strokeWidth="2.2" />
            </svg>
          </div>
          <div>
            <div className="brand-name">Proofrun Notices</div>
            <div className="brand-sub">City of Bellmont · Clerk</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map((n) => (
            <button key={n.id} className={`nav-item${view === n.id ? ' active' : ''}`} onClick={() => go(n.id)}>
              <Icon name={n.icon} size={17} />
              <span>{n.label}</span>
              {n.id === 'alerts' && state.alerts.mode === 'all' && <span className="nav-flag" title="Alerts set to every status change">Noisy</span>}
              {!!n.badge && n.id !== 'alerts' && <span className={`nav-badge${n.tone ? ' ' + n.tone : ''}`}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="side-section">
          <div className="side-label">Newspaper of record</div>
          <div className="paper-card">
            <div className="paper-name">
              <Icon name="paper" size={15} /> {PAPER.name}
            </div>
            <dl>
              <dt>Prints</dt>
              <dd>Tue · Wed · Thu · Sat</dd>
              <dt>Legal cutoff</dt>
              <dd>
                12:00 PM, 2 business days prior <span className="changed">changed Nov 14</span>
              </dd>
              <dt>Legal desk</dt>
              <dd>{PAPER.phone}</dd>
            </dl>
          </div>
        </div>

        <div className="side-section team">
          <div className="side-label">Team</div>
          {(Object.keys(STAFF) as (keyof typeof STAFF)[]).map((id) => (
            <div key={id} className="team-row">
              <Avatar id={id} size={22} />
              <div>
                <div className="team-name">{STAFF[id].first}{id === 'gloria' ? ' (you)' : ''}</div>
                <div className="team-covers">{STAFF[id].covers}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-date">
            <strong>{fLong(iso(now)).replace(/, \d{4}$/, '')}</strong>
            <span>{fTime(now)}</span>
          </div>
          <div className={`cutoff-tick${cutoffToday ? ' hot' : ''}`} title="Earliest Courier-Ledger edition you can still get a notice into">
            <Icon name="clock" size={15} />
            Next legal cutoff: <strong>{fDay(next.date)} edition</strong>
            <span className="sep">·</span>
            {cutoffToday ? 'today' : fDay(iso(cutoff))} {fTime(cutoff)}
            <span className="cd">{fDuration(cutoff.getTime() - now.getTime())} left</span>
          </div>
          <div className="topbar-right">
            <button className="bell" onClick={() => go('messages', state.alerts.mode === 'all' ? 'all' : 'threats')} title="Unread alerts under your current alert rules">
              <Icon name="bell" size={18} />
              {unreadAlerts > 0 && <span className={`bell-count${unreadAlerts > 20 ? ' noisy' : ''}`}>{unreadAlerts}</span>}
            </button>
            <div className="me">
              <Avatar id="gloria" size={30} />
              <div>
                <div className="me-name">Gloria Haddad</div>
                <div className="me-title">Deputy City Clerk</div>
              </div>
            </div>
          </div>
        </header>

        <main className="content" ref={contentRef}>
          {view === 'overview' && <Overview counts={counts} go={go} />}
          {view === 'calendar' && <CalendarView />}
          {view === 'affidavits' && <AffidavitsView />}
          {view === 'messages' && <MessagesView filter={msgFilter} setFilter={setMsgFilter} go={go} />}
          {view === 'alerts' && <AlertsView go={go} />}
        </main>
      </div>

      <NoticeDrawer />
      {modal?.kind === 'rebook' && <RebookModal id={modal.id} />}
      {modal?.kind === 'reschedule' && <RescheduleModal id={modal.id} />}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone ?? 'ok'}`}>
            <Icon name={t.tone === 'warn' ? 'alert' : 'check'} size={16} />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
