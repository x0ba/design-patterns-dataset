import type { View } from '../types';
import { PEOPLE } from '../data/people';
import { useApp, openComments } from '../store';
import { Avatar, Icon } from './ui';

const NAV: { view: View; label: string; icon: string }[] = [
  { view: 'cards', label: 'Cards', icon: 'cards' },
  { view: 'rulebook', label: 'Rulebook', icon: 'book' },
  { view: 'changes', label: 'Changes', icon: 'changes' },
  { view: 'comments', label: 'Comments', icon: 'comment' },
  { view: 'playtests', label: 'Playtests', icon: 'playtest' },
];

export function Sidebar() {
  const { state, dispatch } = useApp();
  const counts: Record<View, number> = {
    cards: Object.keys(state.cards).length,
    rulebook: state.sections.length,
    changes: state.changes.length,
    comments: openComments(state).length,
    playtests: state.sessions.length,
  };
  const junCard = Object.values(state.cards).find((c) => c.live?.by === 'jun');
  return (
    <aside className="sidebar">
      <div className="brand">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#d9a441" />
          <path d="M6.5 17.5 16 8.5l9.5 9" fill="none" stroke="#15242d" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9.5" y="16" width="13" height="9" rx="1.6" fill="#15242d" />
          <path d="M13 20.5h6" stroke="#d9a441" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span>Cardloft</span>
      </div>

      <div className="gamecard">
        <div className="gamecard-title">Saltwind Exchange</div>
        <div className="gamecard-meta">Version 0.7 &middot; 2&ndash;5 players &middot; 90 min</div>
        <div className="gamecard-bar" aria-hidden="true"><span /></div>
      </div>

      <nav aria-label="Workshop">
        {NAV.map((n) => (
          <button key={n.view} className={`nav-item ${state.view === n.view ? 'active' : ''}`} onClick={() => dispatch({ type: 'view', view: n.view })} aria-current={state.view === n.view ? 'page' : undefined}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
            <span className={`nav-count ${n.view === 'comments' && counts.comments > 0 ? 'attn' : ''}`}>{counts[n.view]}</span>
          </button>
        ))}
      </nav>

      <div className="team">
        <h3>In the workshop</h3>
        <button className="person" disabled={!junCard} onClick={() => junCard && dispatch({ type: 'openCard', id: junCard.id })} title="Jump to the card Jun is editing">
          <Avatar id="jun" live />
          <span className="person-text">
            <strong>Jun Park</strong>
            <span className="live-line">Editing Market{junCard ? ` · ${junCard.name}` : ''}</span>
          </span>
        </button>
        <div className="person">
          <Avatar id="teodora" />
          <span className="person-text"><strong>Teodora Silva</strong><span>Co-designer &middot; seen 3 days ago</span></span>
        </div>
        <div className="person">
          <Avatar id="sam" />
          <span className="person-text"><strong>Sam Alvarado</strong><span>Comment only &middot; 7:02 am</span></span>
        </div>
        <div className="person">
          <Avatar id="aditi" />
          <span className="person-text"><strong>Aditi Rao</strong><span>Comment only &middot; Mon</span></span>
        </div>
      </div>

      <div className="me">
        <Avatar id="hollis" size={34} />
        <span className="person-text"><strong>{PEOPLE.hollis.name}</strong><span>Owner</span></span>
      </div>
    </aside>
  );
}
