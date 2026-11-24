import { useMemo } from 'react';
import { longDate } from '../lib/format';
import { navigate } from '../lib/router';
import { TrailBar, useTrailLabel } from '../components/Chrome';

export default function EventsPage({ route, site }) {
  useTrailLabel(route.hash, 'Events');
  const hood = route.query.get('hood') ?? '';
  const hoods = useMemo(() => {
    const seen = new Map();
    for (const e of site.events) seen.set(e.hoodSlug, e.hood);
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [site]);
  const events = useMemo(
    () => site.events.filter((e) => !hood || e.hoodSlug === hood).sort((a, b) => a.date.localeCompare(b.date)),
    [site, hood],
  );
  const issueLabel = site.issues.find((i) => i.id === site.currentIssue)?.label ?? '';

  return (
    <div className="container page">
      <TrailBar route={route} crumbs={[{ label: 'Events' }]} />
      <header className="page-head">
        <p className="eyebrow">Events</p>
        <h1>Holiday events</h1>
        <p>
          Listed in the {issueLabel} issue: {site.events.length} events from Saturday, November 28 through New Year’s Eve.
          Times and prices come from the organizers. If the weather changes plans, check with the host before you go.
        </p>
      </header>

      <div className="filter-bar card-plain">
        <label>
          Neighborhood
          <select value={hood} onChange={(e) => navigate(e.target.value ? `#/events?hood=${e.target.value}` : '#/events')}>
            <option value="">All neighborhoods</option>
            {hoods.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </label>
        <p className="small">{events.length} {events.length === 1 ? 'event' : 'events'} shown</p>
      </div>

      {events.length === 0 && <p className="note">No events in that neighborhood this month.</p>}
      <EventList events={events} />

      <p className="note">
        Past events are in the archive. Choose a month on the <a href="#/archive">archive page</a>, then open that issue’s Events section.
      </p>
    </div>
  );
}

// Shared by the events page and the holiday roundup article.
export function EventList({ events, title }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return [...map];
  }, [events]);

  return (
    <section className="event-list" aria-label={title ?? 'Events'}>
      {title && <h2>{title}</h2>}
      {groups.map(([date, list]) => (
        <div key={date} className="event-day">
          <h3>{longDate(date)}</h3>
          <ul>
            {list.map((e) => (
              <li key={`${e.date}-${e.title}`} className="event">
                <p className="event-time">{e.time}</p>
                <div>
                  <h4>{e.title}</h4>
                  <p className="event-place">{e.place}</p>
                  <p className="event-meta">
                    <a className="chip chip-hood" href={`#/neighborhood/${e.hoodSlug}`}>{e.hood}</a>
                    <span>{e.cost}</span>
                  </p>
                  {e.note && <p className="event-note">{e.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
