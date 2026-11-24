import { bayById, type OptionId, type UpNextItem } from '../lib/engine';
import { fmtTime } from '../lib/time';

interface Props {
  items: UpNextItem[];
  previewOf: OptionId | null; // when set, the list shows the day as Option X would leave it
}

// What the next photographer needs to hear when they walk in.
export function UpNextPanel({ items, previewOf }: Props) {
  return (
    <section className="card upnext" aria-label="Up next and arrival handoff">
      <div className="section-title">
        <span>Up next · what to tell arrivals</span>
        <span className={`pill ${previewOf ? 'pill-preview' : 'pill-live'}`}>
          {previewOf ? `Preview · Option ${previewOf}` : 'Live board'}
        </span>
      </div>
      <ol className="arrivals">
        {items.map((it) => {
          const b = it.booking;
          const bay = bayById(b.bayId);
          return (
            <li key={b.id} className={`arr${b.movedFrom ? ' is-moved' : ''}${it.clash ? ' is-clash' : ''}`}>
              <div className="arr-top">
                <span className="arr-time">{fmtTime(b.start)}</span>
                <span className="bay-chip">{bay.name}</span>
              </div>
              <div className="arr-client">{b.client}</div>
              <div className="arr-sign">
                {b.movedFrom && <span className="tag tag-move">Moved from {bayById(b.movedFrom).name}</span>}
                {it.signLine}
              </div>
              <div className="arr-ready">{it.readyNote}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
