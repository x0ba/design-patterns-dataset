import { ROSTER } from './data'
import { ICheck } from './icons'

export function Roster({
  agreed, onToggle, locked, big,
}: { agreed: string[]; onToggle: (id: string) => void; locked?: boolean; big?: boolean }) {
  return (
    <div className={`roster${big ? ' big' : ''}`} role="group" aria-label="Huddle agreement">
      {ROSTER.map((r) => {
        const on = agreed.includes(r.id)
        return (
          <button key={r.id} className={`person${on ? ' on' : ''}`} aria-pressed={on} disabled={locked} onClick={() => onToggle(r.id)}>
            <span className="tick">{on && <ICheck size={big ? 26 : 20} strokeWidth={3} />}</span>
            <span className="pname">
              {r.name}
              <small>{r.role}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}
