import { useState } from 'react';
import { COURSE } from '../config';
import { ConfirmDialog, GuideBox, Impact, Pill, Term, coverImpact } from '../components/ui';
import { previewAction, useStore, type Action } from '../state/store';
import { boardable, bunkLabel, coursePeople, LODGING_LABEL, personById, personInBunk, rangeText, summary } from '../logic';
import type { AppState, Person } from '../types';

type Filter = 'all' | 'tentative' | 'unnamed' | 'waiver' | 'released';

type Row =
  | { kind: 'person'; person: Person; order: number }
  | { kind: 'slot'; bunkId: string; order: number };

type Dialog = { kind: 'confirm' | 'release' | 'waiver'; personId: string } | null;

function rowsFor(state: AppState, filter: Filter): Row[] {
  const order = (bunkId: string | null) => (bunkId ? state.bunks.findIndex((b) => b.id === bunkId) : 999);
  const rows: Row[] = [];
  if (filter === 'all' || filter === 'tentative' || filter === 'waiver') {
    for (const p of coursePeople(state)) {
      if (filter === 'tentative' && p.booking !== 'tentative') continue;
      if (filter === 'waiver' && p.waiver !== 'incomplete') continue;
      rows.push({ kind: 'person', person: p, order: order(p.bunkId) });
    }
  }
  if (filter === 'all' || filter === 'unnamed') {
    for (const b of state.bunks) {
      if (b.held && !personInBunk(state, b.id)) rows.push({ kind: 'slot', bunkId: b.id, order: order(b.id) });
    }
  }
  if (filter === 'released') {
    for (const p of state.people) {
      if (!p.isResident && p.booking === 'released') rows.push({ kind: 'person', person: p, order: 9999 });
    }
  }
  // Tentative first, then waivers, then the rest, each by bunk order.
  const weight = (r: Row) => {
    if (r.kind === 'slot') return 1;
    if (r.person.booking === 'released') return 4;
    if (r.person.booking === 'tentative') return 0;
    if (r.person.waiver === 'incomplete') return 2;
    return 3;
  };
  return rows.sort((a, b) => weight(a) - weight(b) || a.order - b.order);
}

function checkInStatus(p: Person): { tone: 'ok' | 'alert' | 'neutral'; text: string } {
  if (p.booking === 'released') return { tone: 'neutral', text: 'Not housed' };
  if (p.booking === 'tentative') return { tone: 'neutral', text: 'Not confirmed yet' };
  if (p.waiver === 'incomplete') return { tone: 'alert', text: 'Blocked: waiver' };
  return { tone: 'ok', text: 'Ready' };
}

export function PeopleView() {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<Dialog>(null);
  const s = summary(state);
  const released = state.people.filter((p) => !p.isResident && p.booking === 'released').length;
  const rows = rowsFor(state, filter);
  const residents = state.people.filter((p) => p.isResident);

  const counts: Record<Filter, number> = {
    all: s.namedCount + s.emptyCount,
    tentative: s.tentative,
    unnamed: s.emptyCount,
    waiver: s.waiverIncomplete,
    released,
  };

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Everyone' },
    { id: 'tentative', label: 'Tentative' },
    { id: 'unnamed', label: 'Unnamed bunks' },
    { id: 'waiver', label: 'Waiver incomplete' },
    { id: 'released', label: 'Released' },
  ];

  const run = (action: Action) => {
    dispatch(action);
    setDialog(null);
  };

  const dialogPerson = dialog ? personById(state, dialog.personId) : undefined;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>People</h1>
          <p className="subtle">
            Everyone in the {COURSE.code} hold, plus the unnamed bunks. {s.namedCount} named, {s.emptyCount} unnamed.
          </p>
        </div>
      </div>

      <GuideBox id="people" title="Where to settle names and waivers">
        <ul>
          <li>
            <strong>Tentative</strong> means the course has not confirmed the name yet. Confirm only with written confirmation from the course. Release only if they are not coming.
          </li>
          <li>
            <strong>Unnamed bunks</strong> are held but empty. Open one to name a person, or release it. Both change the kitchen's pending count.
          </li>
          <li>
            <strong>Check-in</strong> shows what is blocking each person. A waiver that is not on file blocks check-in and the boat, and does not stop a bunk assignment.
          </li>
        </ul>
      </GuideBox>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={filter === t.id} className={`tab ${filter === t.id ? 'active' : ''}`} onClick={() => setFilter(t.id)}>
            {t.label} <span className="count">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <table className="table people">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Lodging</th>
            <th>Bunk</th>
            <th>
              <Term k="tentative">Booking</Term>
            </th>
            <th>Waiver</th>
            <th>Check-in</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="empty-cell">
                Nothing in this list.
              </td>
            </tr>
          )}
          {rows.map((row) => {
            if (row.kind === 'slot') {
              return (
                <tr key={`slot-${row.bunkId}`} className="row-slot">
                  <td>
                    <Term k="unnamed">Unnamed hold bunk</Term>
                  </td>
                  <td className="subtle">—</td>
                  <td className="subtle">—</td>
                  <td>{bunkLabel(row.bunkId)}</td>
                  <td>
                    <Pill tone="empty">Unnamed</Pill>
                  </td>
                  <td className="subtle">—</td>
                  <td className="subtle">Nobody to check in</td>
                  <td>
                    <a className="btn small" href={`#/bunks/${row.bunkId}`}>
                      Name or release…
                    </a>
                  </td>
                </tr>
              );
            }
            const p = row.person;
            const status = checkInStatus(p);
            return (
              <tr key={p.id} className={p.booking === 'released' ? 'row-released' : ''}>
                <td>
                  <strong>{p.name}</strong>
                  {p.diet && <div className="diet-tag">Diet: {p.diet}</div>}
                </td>
                <td>{p.role}</td>
                <td>{LODGING_LABEL[p.lodging]}</td>
                <td>{p.bunkId ? bunkLabel(p.bunkId) : <span className="subtle">none</span>}</td>
                <td>
                  {p.booking === 'confirmed' && <Pill tone="confirmed">Confirmed</Pill>}
                  {p.booking === 'tentative' && <Pill tone="tentative">Tentative</Pill>}
                  {p.booking === 'released' && <Pill tone="neutral">Released</Pill>}
                </td>
                <td>{p.waiver === 'complete' ? <Pill tone="ok">On file</Pill> : <Pill tone="alert">Incomplete</Pill>}</td>
                <td>
                  <Pill tone={status.tone === 'ok' ? 'ok' : status.tone === 'alert' ? 'alert' : 'neutral'}>{status.text}</Pill>
                  {p.booking === 'confirmed' && boardable(p) && p.trip && <div className="subtle small-text">Trip {p.trip}</div>}
                </td>
                <td className="actions-cell">
                  {p.booking === 'tentative' && (
                    <>
                      <button className="btn small primary" onClick={() => setDialog({ kind: 'confirm', personId: p.id })}>
                        Confirm
                      </button>
                      <button className="btn small danger-outline" onClick={() => setDialog({ kind: 'release', personId: p.id })}>
                        Release
                      </button>
                    </>
                  )}
                  {p.waiver === 'incomplete' && p.booking !== 'released' && (
                    <button className="btn small" onClick={() => setDialog({ kind: 'waiver', personId: p.id })}>
                      Waiver on file
                    </button>
                  )}
                  {p.bunkId && p.booking === 'confirmed' && p.waiver === 'complete' && <span className="subtle small-text">None needed</span>}
                  {p.booking === 'released' && <span className="subtle small-text">Bunk returned to free stock</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="panel residents-panel">
        <header className="panel-head">
          <h2>Residents already in house</h2>
          <span className="subtle small-text">Not part of the course hold. Read only here.</span>
        </header>
        <table className="table compact">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Bunk</th>
              <th>Stay</th>
            </tr>
          </thead>
          <tbody>
            {residents.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.role}</td>
                <td>{r.bunkId ? bunkLabel(r.bunkId) : ''}</td>
                <td>{rangeText(r.from, r.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {dialog && dialogPerson && dialog.kind === 'confirm' && (
        <ConfirmDialog
          title={`Confirm ${dialogPerson.name}?`}
          confirmLabel="Confirm booking"
          onClose={() => setDialog(null)}
          onConfirm={() => run({ type: 'confirm', personId: dialogPerson.id })}
          impact={
            <Impact
              title="What changes"
              rows={coverImpact(state, previewAction(state, { type: 'confirm', personId: dialogPerson.id }))}
              note="Confirmed people keep their bunk at the 17:00 release."
            />
          }
        >
          <p>Only confirm after the course has confirmed {dialogPerson.name} in writing.</p>
        </ConfirmDialog>
      )}

      {dialog && dialogPerson && dialog.kind === 'release' && (
        <ConfirmDialog
          title={`Release ${dialogPerson.name}?`}
          confirmLabel="Release bunk"
          tone="danger"
          onClose={() => setDialog(null)}
          onConfirm={() => run({ type: 'releasePerson', personId: dialogPerson.id })}
          impact={<Impact title="What changes" rows={coverImpact(state, previewAction(state, { type: 'releasePerson', personId: dialogPerson.id }))} />}
        >
          <p>
            Use this only when the course has told you {dialogPerson.name} is not coming. The bunk goes back to free stock and they are marked released.
          </p>
        </ConfirmDialog>
      )}

      {dialog && dialogPerson && dialog.kind === 'waiver' && (
        <ConfirmDialog
          title={`Mark ${dialogPerson.name}'s waiver as on file?`}
          confirmLabel="Mark on file"
          onClose={() => setDialog(null)}
          onConfirm={() => run({ type: 'waiver', personId: dialogPerson.id })}
          impact={
            <Impact
              title="What changes"
              rows={[
                { label: 'Waivers incomplete', before: s.waiverIncomplete, after: s.waiverIncomplete - 1 },
              ]}
              note={`After this, ${dialogPerson.name} can be checked in and boarded, once their booking is confirmed.`}
            />
          }
        >
          <p>Only mark this when the signed waiver is in the station file. This records a fact; it is not an override.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
