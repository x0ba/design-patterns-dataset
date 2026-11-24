import { MANUALS, OTHER_DOCS, DOC_BY_ID } from '../data/manuals.js';
import { PIN_BY_ID, pinLocation } from '../lib/lookup.js';
import { useGo } from '../lib/router.js';
import { PIN_TYPES } from '../data/types.js';

export default function ManualsView({ segments }) {
  const go = useGo();
  const docId = segments[1] && DOC_BY_ID[segments[1]] ? segments[1] : MANUALS[0].id;
  const doc = DOC_BY_ID[docId];
  const pin = PIN_BY_ID[doc.pin];

  return (
    <div className="manuals-view">
      <section className="card doc-list">
        <h3 className="section-h">Appliance manuals · {MANUALS.length}</h3>
        <ul>
          {MANUALS.map((m) => (
            <li key={m.id}>
              <button type="button" className={`doc-row${m.id === docId ? ' is-sel' : ''}`} onClick={() => go(`manuals/${m.id}`)}>
                <span className="type-bar" style={{ background: PIN_TYPES.Appliance.color }} aria-hidden="true" />
                <span>
                  <strong>{m.short}</strong>
                  <span className="muted small">{pinLocation(PIN_BY_ID[m.pin])}</span>
                </span>
                <span className="muted small">{m.pages} pp</span>
              </button>
            </li>
          ))}
        </ul>
        <h3 className="section-h">Other documents · {OTHER_DOCS.length}</h3>
        <ul>
          {OTHER_DOCS.map((m) => (
            <li key={m.id}>
              <button type="button" className={`doc-row${m.id === docId ? ' is-sel' : ''}`} onClick={() => go(`manuals/${m.id}`)}>
                <span className="type-bar" style={{ background: PIN_TYPES[PIN_BY_ID[m.pin].type].color }} aria-hidden="true" />
                <span>
                  <strong>{m.short}</strong>
                  <span className="muted small">{pinLocation(PIN_BY_ID[m.pin])}</span>
                </span>
                <span className="muted small">{m.pages} pp</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card doc-detail">
        <div className="eyebrow">{MANUALS.some((m) => m.id === doc.id) ? 'Appliance manual' : 'Document'} · {doc.pages} pages</div>
        <h2>{doc.title}</h2>
        <p className="pin-loc">
          <span className="pin-id">{doc.pin}</span> &nbsp;Pinned at {pinLocation(pin)}
        </p>
        <p className="muted small">On file: {doc.updated}.</p>

        <div className="excerpt">
          <h3 className="section-h">Shutdown and winterizing (from the binder copy)</h3>
          {doc.excerpt.map((sec) => (
            <section key={sec.head} className="excerpt-sec">
              <h4>{sec.head}</h4>
              <p>{sec.text}</p>
            </section>
          ))}
        </div>

        <div className="doc-actions">
          <button type="button" className="btn btn-primary" onClick={() => go(pin.loc === 'site' ? 'map' : `plans/${pin.loc}`, { pin: pin.id })}>
            Show the pin
          </button>
          <span className="muted small">Excerpt only. The full PDF is in the binder in the mudroom.</span>
        </div>
      </section>
    </div>
  );
}
