import { PINS } from '../data/pins.js';
import { FLOORS, BUILDINGS } from '../data/property.js';
import { PIN_BY_ID, FLOOR_LABEL } from '../lib/lookup.js';
import { useAppState } from '../state.jsx';
import { useGo } from '../lib/router.js';
import PlanView from '../components/PlanView.jsx';
import PinDetail from '../components/PinDetail.jsx';
import { TypeChip } from '../components/ui.jsx';

const FLOOR_IDS = ['ground', 'upper', 'crawl'];

export default function PlansView({ segments, params }) {
  const go = useGo();
  const { location, setLocation } = useAppState();

  const floorId = FLOOR_IDS.includes(segments[1]) ? segments[1] : 'ground';
  const floor = FLOORS[floorId];
  const floorPins = PINS.filter((p) => p.loc === floorId);

  const requested = PIN_BY_ID[params.get('pin')];
  const selected = requested && requested.loc === floorId ? requested : null;
  const selectedId = selected?.id;

  const onRoom = (roomId) => setLocation({ floor: floorId, room: roomId });
  const roomPins = (roomId) => floorPins.filter((p) => p.room === roomId);
  const youHere = location.floor === floorId ? location.room : null;

  return (
    <div className="plans-view">
      <div className="plans-toolbar">
        <div className="floor-tabs" role="tablist" aria-label="Floor">
          {FLOOR_IDS.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={id === floorId}
              className={`floor-tab${id === floorId ? ' is-on' : ''}`}
              onClick={() => go(`plans/${id}`)}
            >
              {FLOORS[id].label}
              <span className="count">{PINS.filter((p) => p.loc === id).length}</span>
            </button>
          ))}
        </div>
        <p className="muted small">
          Click a room to say you are there. Pins with a dot are on this floor.
        </p>
      </div>

      <div className="plans-grid">
        <section className="card plan-card">
          <div className="plan-head">
            <div>
              <div className="eyebrow">Main cabin · {FLOOR_LABEL[floorId]}</div>
              <h2>{floor.label}</h2>
            </div>
            <span className="here-line">
              You are in <strong>{floor.rooms.find((r) => r.id === youHere)?.name || 'another part of the property'}</strong>
            </span>
          </div>
          <div className="plan-stage">
            <PlanView
              floor={floor}
              pins={floorPins}
              selectedId={selectedId}
              onPin={(p) => go(`plans/${floorId}`, { pin: p.id })}
              onRoom={onRoom}
              userRoom={youHere}
              highlightRoom={selected?.room}
            />
          </div>
          {floorId === 'crawl' && (
            <p className="muted small">
              The crawlspace runs under the whole cabin. The north hatch is an exterior door in the north foundation wall. The
              bunkhouse drain valve sits 1.5 m in from it.
            </p>
          )}
        </section>

        <aside className="plans-side">
          <section className="card">
            {selected ? (
              <PinDetail pin={selected} onPlan={false} />
            ) : (
              <div className="pick-hint">
                <h3 className="section-h">Pins on this floor</h3>
                <p className="muted">Select a pin on the plan or in the list below.</p>
              </div>
            )}
          </section>

          <section className="card room-list">
            <h3 className="section-h">By room</h3>
            {floor.rooms.map((r) => {
              const rp = roomPins(r.id);
              return (
                <div key={r.id} className={`room-block${youHere === r.id ? ' is-you' : ''}`}>
                  <button type="button" className="room-head" onClick={() => onRoom(r.id)}>
                    <span>{r.name}</span>
                    <span className="muted small">{youHere === r.id ? 'you are here' : `${rp.length} pin${rp.length === 1 ? '' : 's'}`}</span>
                  </button>
                  <ul>
                    {rp.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`pin-row${p.id === selectedId ? ' is-sel' : ''}`}
                          onClick={() => go(`plans/${floorId}`, { pin: p.id })}
                        >
                          <TypeChip type={p.type} small />
                          <span>{p.title.split(/ [–—] | \(/)[0]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        </aside>
      </div>

      <p className="muted small plans-foot">
        Other buildings have no floor plan:{' '}
        {BUILDINGS.filter((b) => !b.plan).map((b) => b.name).join(', ')}.{' '}
        <button type="button" className="link" onClick={() => go('map')}>See them on the property map</button>.
      </p>
    </div>
  );
}
