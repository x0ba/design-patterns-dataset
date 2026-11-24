import { BY_ID } from '../data/generate'
import { MAX_COMPARE } from '../data/vocab'
import { ProjectImage } from './ProjectImage'

interface Props {
  compare: string[]
  onRemove: (id: string) => void
  onOpen: () => void
  onClear: () => void
  onSelect: (id: string) => void
}

export function CompareTray({ compare, onRemove, onOpen, onClear, onSelect }: Props) {
  const slots = Array.from({ length: MAX_COMPARE }, (_, i) => compare[i])
  return (
    <footer className="tray" aria-label="Compare tray">
      <div className="tray-label">
        <strong>Compare</strong>
        <span>
          {compare.length === 0 ? 'Pin up to 4 candidates' : compare.length === 1 ? 'Add one more to compare' : `${compare.length} of ${MAX_COMPARE} pinned`}
        </span>
      </div>
      <div className="tray-slots">
        {slots.map((id, i) => {
          const p = id ? BY_ID.get(id) : undefined
          if (!p)
            return (
              <div key={`e${i}`} className="slot empty">
                <span>{i + 1}</span>
              </div>
            )
          return (
            <div key={p.id} className="slot">
              <button className="slot-main" onClick={() => onSelect(p.id)} title={p.name}>
                <ProjectImage p={p} variant={1} className="slot-img" />
                <span className="slot-text">
                  <span className="mono">{p.id}</span>
                  <span className="slot-name">{p.name}</span>
                </span>
              </button>
              <button className="slot-x" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.id} from compare`}>
                ×
              </button>
            </div>
          )
        })}
      </div>
      <div className="tray-actions">
        {compare.length > 0 && (
          <button className="link" onClick={onClear}>
            Clear
          </button>
        )}
        <button className="btn btn-primary btn-lg" disabled={compare.length < 2} onClick={onOpen}>
          Compare side by side{compare.length >= 2 ? ` (${compare.length})` : ''}
        </button>
      </div>
      <div className="tray-keys" aria-hidden>
        <span>
          <kbd>/</kbd> search
        </span>
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> move
        </span>
        <span>
          <kbd>C</kbd> pin
        </span>
      </div>
    </footer>
  )
}
