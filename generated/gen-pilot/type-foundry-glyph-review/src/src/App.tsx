import React from 'react';
import { CLIENT, DAYS_LEFT, DEADLINE_LABEL, PEOPLE, STYLES, clock, rel, type PersonId } from './data/core';
import { countStatuses } from './data/glyphs';
import { INITIAL_PRESENCE } from './data/access';
import { useGo, useStore, type View } from './store';
import { kernStats, openThreads, revisionStats, threadsForMe } from './derive';
import { Avatar, Bar, Icon, Toasts } from './components/ui';
import { PathText } from './components/GlyphCanvas';
import { Today } from './views/Today';
import { Review } from './views/Review';
import { Kerning } from './views/Kerning';
import { Glyphs } from './views/Glyphs';
import { Comments } from './views/Comments';
import { People } from './views/People';
import { Release } from './views/Release';

function TopBar() {
  const { s } = useStore();
  const go = useGo();
  const c = s.jonasCursor;
  const away: PersonId[] = ['eleni', 'tomas'];
  return (
    <header className="topbar">
      <div className="brand" onClick={() => go('today')} role="button" tabIndex={0}>
        <span className="mark">S</span>
        <span className="brand-name">Serifhouse</span>
        <span className="crumb-sep">/</span>
        <span className="family">Calloway</span>
      </div>

      <div className="presence" aria-label="Who is here">
        <button className="presence-live" onClick={() => go('kerning')} title="Jonas Brandt is kerning in Bold">
          <Avatar id="jonas" size={24} live />
          <span className="pl-text">
            <b>Jonas</b> · Bold · kerning
            <span className="pl-pair">
              <PathText style="bold" text={c.left + c.right} size={17} kern={(a, b) => (a === c.left && b === c.right ? c.value : 0)} />
            </span>
            <span className="mono">{c.value}</span>
          </span>
        </button>
        <span className="presence-you"><Avatar id="ines" size={24} live /><span>You · reviewing</span></span>
        <span className="presence-sep" />
        {away.map((id) => {
          const p = INITIAL_PRESENCE[id];
          return (
            <button key={id} className="presence-away" onClick={() => go('people', id)} title={`${PEOPLE[id].name} — last active ${p.kind === 'away' ? rel(p.lastSeen, s.now) : ''}`}>
              <Avatar id={id} size={22} dim />
              <span>{PEOPLE[id].first} <i>{p.kind === 'away' ? rel(p.lastSeen, s.now).replace(' days ago', 'd ago') : ''}</i></span>
            </button>
          );
        })}
        <button className="presence-away" onClick={() => go('release')} title="Marieke de Wit has been invited but has not joined yet">
          <Avatar id="marieke" size={22} dim />
          <span>Marieke <i>invited</i></span>
        </button>
      </div>

      <div className="deadline" title={`Delivery of Calloway to ${CLIENT} on ${DEADLINE_LABEL}`}>
        <span className="dl-days">{DAYS_LEFT} days left</span>
        <span className="dl-text">{CLIENT} · {DEADLINE_LABEL.replace('November', 'Nov')}</span>
      </div>
      <div className="clock">Thu 13 Nov<br />{clock(s.now)} Lisbon</div>
    </header>
  );
}

function Sidebar() {
  const { s } = useStore();
  const go = useGo();
  const rv = revisionStats(s);
  const ks = kernStats(s);
  const open = openThreads(s).length;
  const mine = threadsForMe(s).length;
  const item = (view: View, label: string, count?: React.ReactNode, hint?: string) => (
    <button className={`nav-item ${s.route.view === view ? 'on' : ''}`} onClick={() => go(view)} title={hint}>
      <span>{label}</span>
      {count !== undefined && <span className="nav-count">{count}</span>}
    </button>
  );
  return (
    <nav className="sidebar">
      <div className="nav-group">
        <div className="nav-head">Since Tue 16:40</div>
        {item('today', 'Overview')}
        {item('review', 'Glyph revisions', rv.pending ? <>{rv.pending}<i> to review</i></> : <Icon.check />)}
        {item('kerning', 'Kerning · Bold', ks.unsurePending ? <><Icon.flag size={10} /> {ks.unsurePending}</> : ks.pending)}
        {item('comments', 'Comments', <>{open}{mine ? <b className="for-me">{mine} for you</b> : null}</>)}
      </div>
      <div className="nav-group">
        <div className="nav-head">Family</div>
        {item('glyphs', 'Glyphs')}
        {item('people', 'People & access', 5)}
        {item('release', 'Lock & share')}
      </div>
      <div className="nav-group styles-mini">
        <div className="nav-head">Styles · approved</div>
        {STYLES.map((st) => {
          const l = countStatuses(s.statuses, st.id, 'latin');
          const g = countStatuses(s.statuses, st.id, 'greek');
          const a = l.approved + g.approved, r = l.review + g.review, d = l.draft + g.draft;
          const locked = s.locks.some((k) => k.startsWith(st.id + ':'));
          return (
            <button key={st.id} className="style-row" onClick={() => go('glyphs', st.id)}>
              <span className="sr-name" style={{ fontWeight: st.weight, fontStyle: st.italic ? 'italic' : 'normal' }}>
                {st.name} {locked && <Icon.lock size={10} />}
              </span>
              <span className="sr-pct">{Math.round((a / 612) * 100)}%</span>
              <Bar approved={a} review={r} draft={d} height={4} />
            </button>
          );
        })}
        <div className="legend"><i className="lg-a" />approved <i className="lg-r" />in review <i className="lg-d" />draft</div>
      </div>
    </nav>
  );
}

export default function App() {
  const { s } = useStore();
  const v = s.route.view;
  return (
    <div className="app">
      <TopBar />
      <Sidebar />
      <main className="main">
        {v === 'today' && <Today />}
        {v === 'review' && <Review />}
        {v === 'kerning' && <Kerning />}
        {v === 'glyphs' && <Glyphs />}
        {v === 'comments' && <Comments />}
        {v === 'people' && <People />}
        {v === 'release' && <Release />}
      </main>
      <Toasts />
    </div>
  );
}
