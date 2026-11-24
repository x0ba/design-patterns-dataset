import { useStore, type View } from './store';
import { COMMUNITY, ME, MOVE_IN, NEXT_SESSION_AT, LEADERS, GROUPS } from './data/community';
import { HELD_POSTS, QUESTIONS, SCAM_MESSAGES, SCAM_ACCOUNTS, UNVERIFIED } from './data/cases';
import { Avatar, ToastHost, dur, hhmm, useNow } from './components/ui';
import { wbSteps, scamSteps, piiSteps, stateOf, heldDone, questionsAssigned, accountsDone } from './progress';
import CatchUp from './views/CatchUp';
import Reports from './views/Reports';
import HeldPosts from './views/HeldPosts';
import Questions from './views/Questions';
import Accounts from './views/Accounts';
import Leaders from './views/Leaders';
import Groups from './views/Groups';
import AlertRules from './views/AlertRules';
import ActivityLog from './views/ActivityLog';

function Sidebar() {
  const s = useStore();
  const needsMe = [stateOf(wbSteps(s)), stateOf(scamSteps(s)), stateOf(piiSteps(s))].filter((x) => x !== 'done').length + (accountsDone(s) < UNVERIFIED.length ? 1 : 0);
  const openReports = (stateOf(wbSteps(s)) === 'open' ? 1 : 0) + (stateOf(scamSteps(s)) === 'done' ? 0 : 4) + (stateOf(piiSteps(s)) === 'done' ? 0 : 2);
  const heldScamPending = SCAM_MESSAGES.filter((m) => m.state === 'held' && !s.scam.removed.includes(m.id)).length;
  const heldOpen = HELD_POSTS.length - heldDone(s) + heldScamPending;
  const qOpen = QUESTIONS.length - questionsAssigned(s);
  const acctOpen = UNVERIFIED.length - accountsDone(s) + SCAM_ACCOUNTS.filter((a) => !s.scam.suspended.includes(a.id)).length;
  const onShift = LEADERS.filter((l) => l.status === 'shift').length;

  const item = (v: View, label: string, count?: number, tone?: 'red' | 'plain') => (
    <button className={`nav-item${s.view === v ? ' on' : ''}`} onClick={() => s.go(v)}>
      <span>{label}</span>
      {count !== undefined && count > 0 && <span className={`nav-count${tone === 'red' ? ' red' : ''}`}>{count}</span>}
    </button>
  );
  return (
    <aside className="sidebar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="7" fill="#1f4f4a" /><path d="M9 22 16 9l7 13" stroke="#f4efe4" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div>
          <div className="brand-name">Arrivals Commons</div>
          <div className="brand-sub">Watch · staff console</div>
        </div>
      </div>
      <div className="community-card">
        <div className="cc-title">{COMMUNITY.name}</div>
        <div className="cc-line"><b>{COMMUNITY.joined.toLocaleString()}</b> of {COMMUNITY.confirmed.toLocaleString()} confirmed joined</div>
        <div className="cc-bar"><span style={{ width: `${(COMMUNITY.joined / COMMUNITY.confirmed) * 100}%` }} /></div>
        <div className="cc-line muted">{GROUPS.length} groups · {GROUPS.reduce((a, g) => a + g.posts24h, 0).toLocaleString()} posts in 24h</div>
      </div>
      <nav className="nav">
        <div className="nav-label">Triage</div>
        {item('catchup', 'Catch-up since 9:00', needsMe, 'red')}
        {item('reports', 'Student reports', openReports)}
        {item('held', 'Held posts', heldOpen)}
        {item('questions', 'Unanswered > 6h', qOpen)}
        {item('accounts', 'New unverified accounts', acctOpen)}
        <div className="nav-label">Team & community</div>
        {item('leaders', `Orientation leaders`)}
        {item('groups', 'Groups')}
        <div className="nav-label">Settings</div>
        {item('rules', 'Alert rules')}
        {item('log', 'Activity log')}
      </nav>
      <div className="sidebar-foot">
        <div className="sf-row"><span className="dot dot-shift" /> {onShift} leaders on shift now</div>
        <button className="sf-link" onClick={() => s.go('leaders')}>See who covers what →</button>
      </div>
    </aside>
  );
}

function TopBar() {
  const now = useNow();
  const rulesSaved = useStore((s) => s.rulesSavedAt);
  const days = Math.ceil((MOVE_IN - now) / 86400000) - 0;
  const untilSession = NEXT_SESSION_AT - now;
  return (
    <header className="topbar">
      <div className="tb-date">
        <span className="tb-day">Thu Aug 13</span>
        <span className="tb-time mono">{hhmm(now)}</span>
        <span className="tb-sep" />
        <span className="tb-movein">Move-in in <b>{days} days</b></span>
      </div>
      <div className="tb-right">
        <div className={`tb-next${untilSession < 30 * 60000 ? ' soon' : ''}`}>
          {untilSession > 0
            ? <>Next: <b>Session D</b> at 13:30 · in <span className="mono">{dur(untilSession)}</span></>
            : <>In Session D · alerts follow your in-session rules</>}
        </div>
        <div className="tb-rules">{rulesSaved ? <><span className="dot dot-shift" /> New alert rules since {hhmm(rulesSaved)}</> : <><span className="dot dot-warn" /> Alerts: every report pings you</>}</div>
        <div className="tb-me">
          <Avatar initials={ME.initials} tone="teal" size={30} />
          <div>
            <div className="tb-me-name">{ME.name}</div>
            <div className="tb-me-sub">At desk since 11:58</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const view = useStore((s) => s.view);
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar />
        <div className={`main-scroll${view === 'catchup' ? ' no-pad' : ''}`}>
          {view === 'catchup' && <CatchUp />}
          {view === 'reports' && <Reports />}
          {view === 'held' && <HeldPosts />}
          {view === 'questions' && <Questions />}
          {view === 'accounts' && <Accounts />}
          {view === 'leaders' && <Leaders />}
          {view === 'groups' && <Groups />}
          {view === 'rules' && <AlertRules />}
          {view === 'log' && <ActivityLog />}
        </div>
      </div>
      <ToastHost />
    </div>
  );
}
