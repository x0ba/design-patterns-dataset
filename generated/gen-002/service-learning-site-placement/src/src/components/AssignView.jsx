import { useEffect, useMemo, useState } from 'react';
import { COURSES } from '../data/network.js';
import * as P from '../lib/placement.js';
import { OrgBadge, SlotChips, RouteChips, Tag, optionsTone, plural } from './ui.jsx';
import SiteMap from './SiteMap.jsx';

const OTHER_PREVIEW = 6;

export default function AssignView({ queue, counts, limit, setLimit, selectedId, setSelectedId, onAssign }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [pendingSiteId, setPendingSiteId] = useState(null);
  const [showAllOther, setShowAllOther] = useState(false);
  const [focusSiteId, setFocusSiteId] = useState(null);

  // Most constrained first: fewest recommended sites, then weekday-evening
  // students (hardest to place), then name.
  const sorted = useMemo(
    () =>
      [...queue].sort(
        (a, b) =>
          a.recommendedCount - b.recommendedCount ||
          Number(P.needsWeekdayEvening(b.student)) - Number(P.needsWeekdayEvening(a.student)) ||
          a.student.name.localeCompare(b.student.name),
      ),
    [queue],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((row) => {
      const s = row.student;
      if (filter === 'evening' && !P.needsWeekdayEvening(s)) return false;
      if (filter === 'none' && row.recommendedCount > 0) return false;
      if (!q) return true;
      const haystack = [s.name, s.id, s.course, COURSES[s.course]?.title, s.neighborhood, s.mode]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sorted, filter, query]);

  const selectedRow = sorted.find((r) => r.student.id === selectedId) ?? sorted[0] ?? null;

  // Keep a valid student selected as the queue changes (e.g. after an assignment).
  useEffect(() => {
    if (sorted.length && (!selectedRow || selectedRow.student.id !== selectedId)) {
      setSelectedId(sorted[0].student.id);
    }
  }, [sorted, selectedRow, selectedId, setSelectedId]);

  // Reset per-student UI state when the selection changes.
  const selectedStudentId = selectedRow?.student.id ?? null;
  useEffect(() => {
    setPendingSiteId(null);
    setShowAllOther(false);
    setFocusSiteId(null);
  }, [selectedStudentId]);

  const eveningCount = queue.filter((r) => P.needsWeekdayEvening(r.student)).length;
  const noneCount = queue.filter((r) => r.recommendedCount === 0).length;

  const recommended = selectedRow
    ? selectedRow.assessments.filter((a) => a.recommended).sort((a, b) => a.minutes - b.minutes)
    : [];
  const others = selectedRow
    ? selectedRow.assessments
        .filter((a) => !a.recommended && a.openSeats > 0)
        // Time-slot matches first (closest to workable), then by commute time.
        .sort((a, b) => Number(b.slotMatch.length > 0) - Number(a.slotMatch.length > 0) || a.minutes - b.minutes)
    : [];
  const fullCount = selectedRow ? selectedRow.assessments.filter((a) => a.openSeats <= 0).length : 0;
  const otherShown = showAllOther ? others : others.slice(0, OTHER_PREVIEW);

  const markers = {};
  if (selectedRow) {
    for (const a of selectedRow.assessments) {
      const fill = a.recommended ? '#15803d' : a.openSeats > 0 ? '#d97706' : '#c3cad5';
      markers[a.site.id] = { fill, r: a.recommended ? 0.36 : 0.28 };
    }
  }

  const student = selectedRow?.student;
  const home = student ? P.NEIGHBORHOOD_BY_ID[student.neighborhood] : null;

  return (
    <div className="assign">
      <aside className="panel queue" aria-label="Unplaced students">
        <div className="panel-head">
          <h2>
            Unplaced students <span className="count">{queue.length}</span>
          </h2>
          <p className="muted small">
            Options = open seats that share a time slot, are reachable, and are within {limit} min by transit.
          </p>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search name, course, neighborhood"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search unplaced students"
        />
        <div className="segmented" role="group" aria-label="Filter queue">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            All {queue.length}
          </button>
          <button className={filter === 'evening' ? 'on' : ''} onClick={() => setFilter('evening')}>
            Weekday evenings {eveningCount}
          </button>
          <button className={filter === 'none' ? 'on' : ''} onClick={() => setFilter('none')}>
            No option {noneCount}
          </button>
        </div>
        <ol className="queue-list">
          {visible.map((row) => {
            const s = row.student;
            const active = selectedRow && row.student.id === selectedRow.student.id;
            return (
              <li key={s.id}>
                <button
                  className={`queue-row${active ? ' active' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={active}
                >
                  <div className="qr-top">
                    <span className="qr-name">{s.name}</span>
                    <span className={`opts tone-${optionsTone(row.recommendedCount)}`}>
                      {plural(row.recommendedCount, 'option')}
                    </span>
                  </div>
                  <div className="qr-meta">
                    {s.course} · {s.neighborhood} · {s.mode}
                  </div>
                  <div className="qr-tags">
                    {P.needsWeekdayEvening(s) && <Tag tone="evening">Evenings only</Tag>}
                    <SlotChips codes={s.availability} />
                  </div>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && <li className="empty small">No students match this filter.</li>}
        </ol>
      </aside>

      <section className="panel detail" aria-label="Candidate sites">
        {student ? (
          <>
            <div className="student-head">
              <div>
                <p className="eyebrow">{student.id} · Waiting for a site</p>
                <h1>{student.name}</h1>
                <p className="muted">
                  {student.course} {COURSES[student.course]?.title} · lives in {student.neighborhood}
                </p>
              </div>
              <div className={`options-big tone-${optionsTone(recommended.length)}`}>
                <strong>{recommended.length}</strong>
                <span>recommended {recommended.length === 1 ? 'site' : 'sites'}</span>
              </div>
            </div>

            <dl className="facts">
              <div>
                <dt>Transit</dt>
                <dd>{student.mode}</dd>
              </div>
              <div>
                <dt>Can attend</dt>
                <dd>
                  <SlotChips codes={student.availability} />
                </dd>
              </div>
              <div>
                <dt>Course fit</dt>
                <dd className="small">{COURSES[student.course]?.fit.join(', ')}</dd>
              </div>
            </dl>

            {recommended.length === 0 && (
              <div className="alert danger">
                <strong>No recommended site.</strong> Nothing open shares this student&apos;s time slots within{' '}
                {limit} min by transit. Options below are over the limit or otherwise blocked. Review them with the
                student, or raise the limit for this student only.
              </div>
            )}

            <div className="limit-row">
              <label htmlFor="limit">
                Max transit time <strong>{limit} min</strong>
              </label>
              <input
                id="limit"
                type="range"
                min={P.LIMIT_MIN}
                max={P.LIMIT_MAX}
                step={5}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
              <span className="muted small">Applies to every queued student. Drivers are not limited.</span>
            </div>

            <h3 className="section-title">
              Recommended <span className="muted small">shortest estimated commute first</span>
            </h3>
            {recommended.length === 0 && <p className="muted small">None under the current limit.</p>}
            <div className="cands">
              {recommended.map((a) => (
                <Candidate
                  key={a.site.id}
                  assessment={a}
                  student={student}
                  focused={focusSiteId === a.site.id}
                  pending={pendingSiteId === a.site.id}
                  onPending={setPendingSiteId}
                  onAssign={() => onAssign(student, a.site.id)}
                />
              ))}
            </div>

            {others.length > 0 && (
              <>
                <h3 className="section-title">
                  Open seats that break a rule <span className="muted small">{others.length} sites</span>
                </h3>
                <div className="cands">
                  {otherShown.map((a) => (
                    <Candidate
                      key={a.site.id}
                      assessment={a}
                      student={student}
                      focused={focusSiteId === a.site.id}
                      pending={pendingSiteId === a.site.id}
                      onPending={setPendingSiteId}
                      onAssign={() => onAssign(student, a.site.id, { overLimit: a.reasons.some((r) => r.startsWith('Over')) })}
                      override
                    />
                  ))}
                </div>
                {others.length > OTHER_PREVIEW && (
                  <button className="btn link" onClick={() => setShowAllOther((v) => !v)}>
                    {showAllOther ? 'Show fewer' : `Show all ${others.length}`}
                  </button>
                )}
              </>
            )}

            {fullCount > 0 && (
              <p className="muted small">{plural(fullCount, 'site')} with no open seats {fullCount === 1 ? 'is' : 'are'} hidden.</p>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h2>Nobody left in the queue</h2>
            <p className="muted">All 145 students have a Spring 2027 site. Export the roster when you are ready.</p>
          </div>
        )}
      </section>

      <aside className="panel side" aria-label="Map of the selected student's options">
        <h3 className="section-title">Where the options are</h3>
        <SiteMap
          markers={markers}
          origin={home}
          selectedSiteId={focusSiteId}
          onSelectSite={(id) => {
            setFocusSiteId(id);
            document.getElementById(`cand-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }}
          caption={home ? `${home.id} marks ${student.name.split(' ')[0]}’s home area.` : null}
        />
        <ul className="legend">
          <li>
            <i className="dot" style={{ background: '#15803d' }} /> Recommended: open, shares a slot, within limit
          </li>
          <li>
            <i className="dot" style={{ background: '#d97706' }} /> Open, but breaks a rule
          </li>
          <li>
            <i className="dot" style={{ background: '#c3cad5' }} /> Full
          </li>
        </ul>
        <div className="side-note">
          <strong>Blue Line extension</strong> opened Sep 2026 with four new stations (Cedar Street, Eastgate,
          Fairgrounds, Riverbend Crossing). Sites near them now have rail access.
        </div>
        <div className="side-note muted small">
          Commute minutes are estimates from the home neighborhood to the site door, from straight-line distance and
          line sharing. Campus minutes are the office transit export.
        </div>
      </aside>
    </div>
  );
}

function Candidate({ assessment: a, student, focused, pending, onPending, onAssign, override = false }) {
  const { site } = a;
  const matched = a.slotMatch;
  return (
    <article
      id={`cand-${site.id}`}
      className={`cand${focused ? ' focused' : ''}${a.recommended ? '' : ' muted-card'}`}
    >
      <div className="cand-main">
        <div className="cand-title">
          <span className="cand-name">{site.name}</span>
          <OrgBadge type={site.type} />
          {a.fitsCourse && <Tag tone="fit">Fits {student.course}</Tag>}
        </div>
        <div className="cand-meta">
          {site.neighborhood} · {site.address}
        </div>
        <div className="cand-meta">
          Nearest stop: {site.stop} <RouteChips routes={site.routes} />
        </div>
        <div className="cand-meta">
          Slots: <SlotChips codes={site.slots} matched={matched} />
        </div>
        {!a.recommended && (
          <div className="reasons">
            {a.reasons.map((r) => (
              <Tag key={r} tone="warn">
                {r}
              </Tag>
            ))}
          </div>
        )}
      </div>
      <div className="cand-side">
        <div className="minutes">
          <strong>{a.minutes}</strong>
          <span>min est.</span>
        </div>
        <div className="small muted">Campus: {site.campusMin} min</div>
        <div className="seats-line">
          <strong>{a.openSeats}</strong> open of {site.capacity}
        </div>
        {pending ? (
          <div className="confirm">
            <button className="btn warn" onClick={onAssign}>
              {override ? 'Confirm assignment' : 'Confirm'}
            </button>
            <button className="btn ghost" onClick={() => onPending(null)}>
              Cancel
            </button>
          </div>
        ) : a.recommended ? (
          <button className="btn primary" onClick={onAssign}>
            Assign
          </button>
        ) : (
          <button className="btn ghost" onClick={() => onPending(site.id)}>
            Assign anyway…
          </button>
        )}
      </div>
    </article>
  );
}
