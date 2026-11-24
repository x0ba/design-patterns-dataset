import { useStore } from '../lib/store';
import { communities } from '../data/seed';
import { formatCount, formatMeetup, formatShortDate, formatMembers } from '../lib/format';
import {
  childSpaces,
  getCommunity,
  getGuide,
  getSpace,
  getThread,
  href,
  nearbyGroup,
  topSpaces,
} from '../lib/model';
import { Empty, NotFound, RecentItem } from '../components/common';

function initials(name: string): string {
  return name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function HomePage() {
  const { state } = useStore();
  const meetup = nearbyGroup();
  const latest = state.recent.slice(0, 5);

  return (
    <>
      <header className="page-head">
        <h1>Your communities</h1>
        <p className="lede">You belong to four communities. Everything you open is kept under Recently viewed.</p>
      </header>

      <div className="community-cards">
        {communities.map((c) => {
          const count = state.recent.filter((r) => getThread(r.id)?.communityId === c.id).length;
          return (
            <a key={c.id} className="community-card" href={href.community(c.id)}>
              <span className="hero-mark small" aria-hidden="true">
                {initials(c.name)}
              </span>
              <strong>{c.name}</strong>
              <span className="hint">{formatMembers(c.members)} members</span>
              <span className="hint">{count} threads viewed recently</span>
            </a>
          );
        })}
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Recently viewed</h2>
            <a href={href.recent()}>See all {state.recent.length}</a>
          </div>
          <ul className="recent-list">
            {latest.map((r) => (
              <RecentItem key={r.id} id={r.id} at={r.at} />
            ))}
          </ul>
        </section>

        <aside className="stack">
          {meetup?.meetup && (
            <section className="panel near-card">
              <span className="pill pill-wheat">Near you · Pittsburgh, PA</span>
              <h2>{meetup.name}</h2>
              <p>{formatMeetup(meetup.meetup.when)}</p>
              <p className="hint">{meetup.meetup.place}</p>
              <a className="btn btn-primary" href={href.group(meetup.id)}>
                View the group
              </a>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function SpaceCard({ id }: { id: string }) {
  const space = getSpace(id);
  if (!space) return null;
  const subs = childSpaces(id);
  const isRegional = id === 'regional-groups';
  return (
    <a className="space-card" href={href.space(id)}>
      <strong>{space.name}</strong>
      <span className="space-desc">{space.description}</span>
      <span className="hint">
        {isRegional ? `${formatCount(space.threadCount)} groups` : `${formatCount(space.threadCount)} threads`}
        {subs.length > 0 ? ` · ${subs.length} sub-spaces` : ''}
      </span>
    </a>
  );
}

export function CommunityPage({ id }: { id: string }) {
  const { state } = useStore();
  const community = getCommunity(id);
  if (!community) return <NotFound />;

  const guide = community.pinnedGuideId ? getGuide(community.pinnedGuideId) : undefined;
  const isSourdough = community.id === 'sourdough';
  const meetup = isSourdough ? nearbyGroup() : undefined;
  const recentHere = state.recent.filter((r) => getThread(r.id)?.communityId === community.id);

  return (
    <>
      <header className="hero">
        <span className="hero-mark" aria-hidden="true">
          {initials(community.name)}
        </span>
        <div>
          <h1>{community.name}</h1>
          <p className="hero-meta">
            {formatCount(community.members)} members · You joined {formatShortDate(community.joinedAt)}
          </p>
          <p className="lede">{community.description}</p>
        </div>
      </header>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Recently viewed here</h2>
            {recentHere.length > 0 && <a href={href.recent(community.id)}>See all {recentHere.length}</a>}
          </div>
          <p className="hint">Threads you open are kept here with where they live. Tap one to go back to it.</p>
          {recentHere.length === 0 ? (
            <Empty>You have not opened any threads here yet.</Empty>
          ) : (
            <ul className="recent-list">
              {recentHere.slice(0, 6).map((r) => (
                <RecentItem key={r.id} id={r.id} at={r.at} inCommunity />
              ))}
            </ul>
          )}
        </section>

        <aside className="stack">
          {guide && (
            <section className="panel guide-card">
              <span className="pill">Pinned by moderators</span>
              <h2>{guide.title}</h2>
              <p>
                {guide.sections.length} short sections. If your starter smells like nail polish or has grey liquid on top,
                sections 3 and 4 are the quickest answers.
              </p>
              <div className="btn-row">
                <a className="btn btn-primary" href={href.guide(guide.id)}>
                  Open the guide
                </a>
                <a className="btn" href={href.guide(guide.id, 3)}>
                  Smells (section 3)
                </a>
              </div>
            </section>
          )}

          {meetup?.meetup && (
            <section className="panel near-card">
              <span className="pill pill-wheat">Near you · Pittsburgh, PA</span>
              <h2>{meetup.name}</h2>
              <p>
                {formatCount(meetup.members)} members · Meets {formatMeetup(meetup.meetup.when)}
              </p>
              <p className="hint">{meetup.meetup.place}</p>
              <a className="btn btn-primary" href={href.group(meetup.id)}>
                View the group
              </a>
            </section>
          )}
        </aside>
      </div>

      <section className="section">
        <div className="panel-head">
          <h2>Topic spaces</h2>
        </div>
        <div className="space-grid">
          {topSpaces(community.id).map((s) => (
            <SpaceCard key={s.id} id={s.id} />
          ))}
        </div>
      </section>
    </>
  );
}
