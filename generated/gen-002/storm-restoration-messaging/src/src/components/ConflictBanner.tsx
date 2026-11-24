import { useStore } from '../state/store';
import { h12 } from '../time';

/** Top-of-room alert for crew estimates that conflict with what members are being told. */
export function ConflictBanner({ now }: { now: number }) {
  const { state, dispatch } = useStore();
  const conflicts = state.outages.filter((o) => o.pendingEtr && o.pendingEtr.time !== o.etr);
  if (conflicts.length === 0) return null;

  return (
    <div className="conflict" role="alert">
      {conflicts.map((o) => {
        const p = o.pendingEtr!;
        const crew = state.crews.find((c) => c.outageId === o.id);
        const told = o.scriptEtr ? h12(o.scriptEtr) : 'no estimate';
        return (
          <div className="conflict-row" key={o.id}>
            <div className="conflict-text">
              <strong>Estimate conflict · {o.id}</strong>
              <span>
                {crew ? `${crew.name} (${p.by})` : p.by} proposes {h12(p.time)}. {o.members} members on {o.feeder} are still being told {told}.
              </span>
            </div>
            <div className="conflict-actions">
              <button className="btn btn-ghost" onClick={() => dispatch({ type: 'select', id: o.id })}>
                Open {o.id}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => dispatch({ type: 'confirmEtr', outageId: o.id, now })}
              >
                Confirm {h12(p.time)}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
