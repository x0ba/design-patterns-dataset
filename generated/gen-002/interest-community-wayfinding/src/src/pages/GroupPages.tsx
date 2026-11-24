import { useState } from 'react';
import { useStore } from '../lib/store';
import { formatCount, formatMeetup } from '../lib/format';
import { getGroup, href, regionalGroups } from '../lib/model';
import { Empty, NotFound } from '../components/common';
import type { RegionalGroup } from '../data/types';

const TOTAL_REGIONAL_GROUPS = 214;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function GroupRow({ group, joined }: { group: RegionalGroup; joined: boolean }) {
  return (
    <li className="group-row">
      <div className="group-main">
        <a className="group-name" href={href.group(group.id)}>
          {group.name}
        </a>
        <div className="hint">
          {group.city}, {group.state} · {group.milesFromPittsburgh === 0 ? 'Your area' : `${group.milesFromPittsburgh} mi away`}
          {' · '}
          {formatCount(group.members)} members
        </div>
      </div>
      <div className="group-chips">
        {group.meetup && <span className="pill pill-wheat">Meets {formatMeetup(group.meetup.when).split(' at ')[0]}</span>}
        {joined && <span className="pill">Joined</span>}
      </div>
    </li>
  );
}

export function RegionalPage() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const all = regionalGroups();
  const term = q.trim().toLowerCase();
  const list = term
    ? all.filter((g) => `${g.name} ${g.city} ${g.state}`.toLowerCase().includes(term))
    : all;

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Sourdough &amp; Wild Yeast · Regional Groups</p>
        <h1>Regional Groups</h1>
        <p className="lede">
          Bakers who meet in person. Groups are listed closest first, measured from Pittsburgh, PA.
        </p>
      </header>

      <div className="filter-row">
        <label className="sr-only" htmlFor="group-filter">
          Filter regional groups
        </label>
        <input
          id="group-filter"
          type="search"
          placeholder="Filter by group name or city"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="hint">
          Showing {list.length} of {TOTAL_REGIONAL_GROUPS} groups
        </span>
      </div>

      {list.length === 0 ? (
        <Empty>No groups match “{q}”. Try a city, like Erie or Cleveland.</Empty>
      ) : (
        <ul className="group-list">
          {list.map((g) => (
            <GroupRow key={g.id} group={g} joined={state.joinedGroups.includes(g.id)} />
          ))}
        </ul>
      )}
    </>
  );
}

export function GroupPage({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const group = getGroup(id);
  if (!group) return <NotFound />;

  const joined = state.joinedGroups.includes(group.id);
  const going = state.rsvps.includes(group.id);
  const members = group.members + (joined ? 1 : 0);

  return (
    <>
      <header className="group-head">
        <span className="hero-mark" aria-hidden="true">
          {initials(group.name)}
        </span>
        <div className="group-head-text">
          <p className="eyebrow">
            Regional group · {group.city}, {group.state} ·{' '}
            {group.milesFromPittsburgh === 0 ? 'Your area' : `${group.milesFromPittsburgh} miles from Pittsburgh`}
          </p>
          <h1>{group.name}</h1>
          <p className="hero-meta">
            {formatCount(members)} members{joined ? ' · You are a member' : ''}
          </p>
        </div>
        <button
          type="button"
          className={`btn ${joined ? '' : 'btn-primary'}`}
          aria-pressed={joined}
          onClick={() => dispatch({ type: 'toggleJoin', id: group.id })}
        >
          {joined ? 'Leave group' : 'Join group'}
        </button>
      </header>

      <div className="two-col">
        <section className="panel">
          <h2>About this group</h2>
          <p>{group.about}</p>
          <p className="hint">Organized by {group.organizers.join(' and ')}.</p>
          <p className="hint">
            Back to <a href={href.regional()}>all regional groups</a>.
          </p>
        </section>

        <aside className="stack">
          {group.meetup ? (
            <section className="panel meetup-card">
              <p className="eyebrow">Next meetup</p>
              <h2>{formatMeetup(group.meetup.when)}</h2>
              <p>
                <strong>{group.meetup.place}</strong>
                <br />
                {group.meetup.detail}
              </p>
              {group.meetup.bring && <p className="hint">{group.meetup.bring}</p>}
              <button
                type="button"
                className={`btn ${going ? '' : 'btn-primary'}`}
                aria-pressed={going}
                onClick={() => dispatch({ type: 'toggleRsvp', id: group.id })}
              >
                {going ? 'You are going · Cancel' : 'I am going'}
              </button>
              <p className="hint">
                {going
                  ? 'The organizers will count you in for the chairs and the swap table.'
                  : 'Tell the organizers you are coming so they know how many to expect.'}
              </p>
            </section>
          ) : (
            <section className="panel">
              <h2>No meetup scheduled</h2>
              <p>Join the group to hear about the next one.</p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
