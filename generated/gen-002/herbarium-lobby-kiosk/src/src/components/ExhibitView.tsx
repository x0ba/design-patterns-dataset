import { FEATURED_EXHIBIT } from '../data/collection';
import { SPECIMEN_BY_ID } from '../lib/model';
import { formatDate } from '../lib/format';
import { SheetThumb } from './SheetThumb';

interface ExhibitViewProps {
  onOpen: (id: string) => void;
  onSearch: () => void;
}

/** Three sheets that tell the exhibit's story, in date order. */
const FEATURED: { id: string; caption: string }[] = [
  { id: 'OSU-V-101187', caption: 'The oldest Lane County sheet. Gathered on Skinner’s Butte in 1898, when the label was written in ink.' },
  { id: 'OSU-V-118204', caption: 'Detling’s 1938 sheet from above Coyote Creek. It was first labeled P. serrulatus, and a 1991 annotation changed it to P. cardwellii.' },
  { id: 'OSU-V-166930', caption: 'A spring 2019 sheet from Spencer Butte, about two miles from Coyote Hollow.' },
];

export function ExhibitView({ onOpen, onSearch }: ExhibitViewProps) {
  return (
    <div className="exhibit">
      <header className="exhibit__head">
        <p className="eyebrow">Featured exhibit · {FEATURED_EXHIBIT.month}</p>
        <h1>{FEATURED_EXHIBIT.title}</h1>
        <p className="exhibit__intro">{FEATURED_EXHIBIT.intro}</p>
      </header>

      <div className="exhibit__body">
        <div className="exhibit__text">
          {FEATURED_EXHIBIT.body.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
          <button type="button" className="btn btn--primary btn--lg" onClick={onSearch}>
            Search the collection
          </button>
        </div>

        <ol className="exhibit__sheets">
          {FEATURED.map(({ id, caption }) => {
            const spec = SPECIMEN_BY_ID.get(id);
            if (!spec) return null;
            return (
              <li key={id}>
                <button type="button" className="exhibit-sheet" onClick={() => onOpen(id)}>
                  <SheetThumb spec={spec} />
                  <span className="exhibit-sheet__date">{formatDate(spec.date)}</span>
                  <span className="exhibit-sheet__name">
                    <em>{spec.currentName}</em>
                  </span>
                  <span className="exhibit-sheet__caption">{caption}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
