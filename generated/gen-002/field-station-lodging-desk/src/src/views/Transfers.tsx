import { useState } from 'react';
import { BOAT, COURSE } from '../config';
import { GuideBox, Panel, Pill, Term } from '../components/ui';
import { useStore } from '../state/store';
import {
  boardable,
  dayLabel,
  manifestKey,
  manifestMessage,
  passengers,
  unassignedForBoat,
} from '../logic';
import type { Person } from '../types';

function tripTime(trip: 1 | 2): string {
  return BOAT.times[trip];
}

export function TransfersView() {
  const { state, dispatch } = useStore();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const trip1 = passengers(state, 1);
  const trip2 = passengers(state, 2);
  const unassigned = unassignedForBoat(state);
  const sent = state.manifestSentKey === manifestKey(state);
  const message = manifestMessage(state);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied('idle'), 2500);
  };

  const tripCard = (trip: 1 | 2, list: Person[]) => {
    const boardableCount = list.filter(boardable).length;
    const over = list.length > BOAT.capacity;
    return (
      <Panel
        title={
          <>
            Trip {trip} · {tripTime(trip)}
            {trip === 2 && <span className="subtle small-text"> (time to confirm with the captain)</span>}
          </>
        }
        right={
          <span className={`seat-count ${over ? 'over' : ''}`}>
            {list.length} / {BOAT.capacity} seats
          </span>
        }
      >
        <div className="seat-bar">
          <div className="seat-fill" style={{ width: `${Math.min(100, (list.length / BOAT.capacity) * 100)}%` }} />
        </div>
        <div className="subtle small-text">
          {boardableCount} boardable now{list.length - boardableCount > 0 ? `, ${list.length - boardableCount} on hold` : ''}
        </div>
        {over && <div className="alert small-alert">Over capacity. Move someone to the other trip.</div>}
        {list.length === 0 && <div className="empty">Nobody on this trip yet.</div>}
        <ul className="manifest">
          {list.map((p) => (
            <PassengerRow key={p.id} person={p} onTrip={(t) => dispatch({ type: 'setTrip', personId: p.id, trip: t })} />
          ))}
        </ul>
      </Panel>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Transfers</h1>
          <p className="subtle">
            Boat from {BOAT.origin} on {dayLabel(BOAT.date)}, carrying the {COURSE.code} course to the station. Two trips, {BOAT.capacity} seats each.
          </p>
        </div>
      </div>

      <GuideBox id="transfers" title="Boat trips and the manifest">
        <ul>
          <li>
            <strong>Boardable</strong> means confirmed and waiver on file. Anyone else stays on the list marked <strong>HOLD</strong>, so the captain can see them.
          </li>
          <li>
            Tentative and unnamed seats are not on the manifest until they are confirmed. Use the menu on each person to place them.
          </li>
          <li>
            The waiver gate applies to boarding: a person without a waiver on file is held, even if they have a bunk.
          </li>
        </ul>
      </GuideBox>

      <div className="trip-grid">
        {tripCard(1, trip1)}
        {tripCard(2, trip2)}
      </div>

      <div className="grid-transfers">
        <Panel
          title="Not on the manifest"
          right={<span className="subtle small-text">{unassigned.length} people</span>}
        >
          {unassigned.length === 0 && <div className="empty">Everyone in the course is on a trip.</div>}
          <ul className="manifest">
            {unassigned.map((p) => (
              <PassengerRow key={p.id} person={p} onTrip={(t) => dispatch({ type: 'setTrip', personId: p.id, trip: t })} />
            ))}
          </ul>
          <p className="note">
            A <Term k="tentative">tentative</Term> person can be placed on a trip, but they show as a hold until the course confirms them.
          </p>
        </Panel>

        <Panel title="Vehicle transfers">
          <p className="subtle">No vehicle transfers are recorded for {COURSE.code} in this period.</p>
          <p className="note">Boat transfers are the only transport booked here. Add a vehicle here if the course is driven to {BOAT.origin}.</p>
        </Panel>
      </div>

      <Panel
        title="Manifest for the captain"
        right={
          sent ? <Pill tone="ok">Sent. Matches the list</Pill> : <Pill tone="alert">Not sent, or out of date</Pill>
        }
      >
        <pre className="message" aria-label="Boat manifest">{message}</pre>
        <div className="meal-actions">
          <button className="btn" onClick={copy}>
            {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Select the text and copy' : 'Copy manifest'}
          </button>
          <button className="btn primary" onClick={() => dispatch({ type: 'sendManifest' })} disabled={sent}>
            {sent ? 'Already marked as sent' : `Mark as sent to ${BOAT.captain}`}
          </button>
          <span className="subtle small-text">Cabinroll does not send messages. Mark as sent after you have sent the list.</span>
        </div>
      </Panel>
    </div>
  );
}

function PassengerRow({ person, onTrip }: { person: Person; onTrip: (t: 1 | 2 | null) => void }) {
  const hold = !boardable(person);
  const reason = person.booking === 'tentative' ? 'Tentative' : person.waiver === 'incomplete' ? 'Waiver not on file' : '';
  return (
    <li className={`manifest-row ${hold ? 'hold' : ''}`}>
      <div className="manifest-main">
        <strong>{person.name}</strong>
        {reason ? (
          <Pill tone={person.booking === 'tentative' ? 'tentative' : 'alert'}>HOLD: {reason}</Pill>
        ) : (
          <Pill tone="ok">Boardable</Pill>
        )}
        {person.diet && <span className="diet-tag">{person.diet}</span>}
      </div>
      <select
        aria-label={`Trip for ${person.name}`}
        value={person.trip ?? 'none'}
        onChange={(e) => {
          const v = e.target.value;
          onTrip(v === 'none' ? null : (Number(v) as 1 | 2));
        }}
      >
        <option value="1">Trip 1 · {tripTime(1)}</option>
        <option value="2">Trip 2 · {tripTime(2)}</option>
        <option value="none">Not on boat</option>
      </select>
    </li>
  );
}
