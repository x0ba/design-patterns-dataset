import { DOC_BY_ID } from '../data/manuals.js';
import { FLOORS } from '../data/property.js';
import { pinLocation, stepsForPin, notesForPins, FLOOR_LABEL } from '../lib/lookup.js';
import { useAppState } from '../state.jsx';
import { useGo } from '../lib/router.js';
import { isoToDate } from '../lib/useNow.js';
import { fmtDateTime } from '../lib/clock.js';
import { describeFrom } from '../lib/geo.js';
import { BOATHOUSE_REF } from '../data/property.js';
import { TypeChip, PhotoTile } from './ui.jsx';

export default function PinDetail({ pin, onPlan = true }) {
  const go = useGo();
  const { notes, location } = useAppState();
  if (!pin) return null;

  const steps = stepsForPin(pin.id);
  const docs = pin.doc ? [DOC_BY_ID[pin.doc]].filter(Boolean) : [];
  const linked = notesForPins([pin.id], notes);
  const floor = pin.loc === 'site' ? null : FLOORS[pin.loc];
  const here = pin.loc !== 'site' && location.floor === pin.loc && location.room === pin.room;

  return (
    <article className="pin-detail" aria-labelledby={`pin-${pin.id}`}>
      <div className="pin-card-top">
        <TypeChip type={pin.type} />
        <span className="pin-id">{pin.id}</span>
        {here && <span className="here-badge">You are here</span>}
      </div>
      <h2 id={`pin-${pin.id}`} className="pin-title">{pin.title}</h2>
      <p className="pin-loc">
        {pin.loc !== 'site' && <span className="floor-tag">{FLOOR_LABEL[pin.loc]}</span>}
        {pin.loc === 'site' ? 'On the property' : pinLocation(pin)}
      </p>

      <PhotoTile pin={pin} />

      <p className="pin-body">{pin.notes}</p>
      <p className="muted small">
        Last edited by {pin.by}, {fmtDateTime(isoToDate(pin.at))}.
      </p>

      {pin.loc === 'site' && (
        <p className="measure-line">
          <strong>{describeFrom(BOATHOUSE_REF, pin)}</strong> of the boathouse centre.
        </p>
      )}

      {onPlan && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (pin.loc === 'site' ? go('map', { pin: pin.id }) : go(`plans/${pin.loc}`, { pin: pin.id }))}
        >
          {floor ? `Show on ${floor.label.toLowerCase()} plan` : 'Show on property map'}
        </button>
      )}

      {steps.length > 0 && (
        <section className="detail-block">
          <h3 className="section-h">Used in closing</h3>
          <ul className="link-list">
            {steps.map((s) => (
              <li key={s.n}>
                <button type="button" className="link" onClick={() => go(`closing/${s.n}`)}>
                  Step {s.n} · {s.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {docs.length > 0 && (
        <section className="detail-block">
          <h3 className="section-h">Attached</h3>
          <ul className="link-list">
            {docs.map((d) => (
              <li key={d.id}>
                <button type="button" className="link" onClick={() => go(`manuals/${d.id}`)}>
                  {d.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {linked.length > 0 && (
        <section className="detail-block">
          <h3 className="section-h">Family notes</h3>
          {linked.map((n) => (
            <blockquote key={n.id}>
              <div className="note-meta">{n.by} · {fmtDateTime(isoToDate(n.at))}</div>
              {n.body}
            </blockquote>
          ))}
        </section>
      )}
    </article>
  );
}
