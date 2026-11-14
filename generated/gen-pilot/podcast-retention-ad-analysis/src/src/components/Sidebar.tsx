import { FORMATS, PLATFORMS, SHOWS, type Format } from '../data/shows';
import { PRODUCTION_NOTES, MOVE_ISO } from '../data/generate';
import { DATA_FIRST_DAY, DATA_LAST_DAY, DEFAULT_FILTERS, LENGTH_LABEL, NARRATIVE_IDS, showsForFormat, type Filters, type FormatFilter, type LengthBand, type PlatformFilter } from '../analysis/model';
import { dateLong } from '../lib/format';

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  flagged: { total: number; pre: number; post: number };
  counts: { treatPre: number; treatPost: number; ctrlPre: number; ctrlPost: number; hasTreat: boolean };
}

const FORMAT_OPTIONS: FormatFilter[] = ['All', ...FORMATS];
const LENGTH_OPTIONS: LengthBand[] = ['all', 'short', 'medium', 'long'];

export function Sidebar({ filters, onChange, onReset, flagged, counts }: Props) {
  const isDefault =
    filters.format === DEFAULT_FILTERS.format &&
    filters.length === 'all' &&
    filters.platform === 'All' &&
    filters.excludeFlagged === DEFAULT_FILTERS.excludeFlagged &&
    filters.split === DEFAULT_FILTERS.split &&
    filters.end === DEFAULT_FILTERS.end &&
    filters.showIds.length === NARRATIVE_IDS.length;

  const setFormat = (format: FormatFilter) => {
    onChange({ format, showIds: showsForFormat(format).map((s) => s.id) });
  };

  const toggleShow = (id: string) => {
    const has = filters.showIds.includes(id);
    onChange({ showIds: has ? filters.showIds.filter((x) => x !== id) : [...filters.showIds, id] });
  };

  const visibleShows = showsForFormat(filters.format);
  const groups: Format[] = filters.format === 'All' ? FORMATS : [filters.format as Format];

  return (
    <aside className="sidebar" aria-label="Filters">
      <section className="side-section">
        <div className="side-title">Comparison split</div>
        <div className="field">
          <input
            className="input"
            type="date"
            value={filters.split}
            min="2025-01-02"
            max="2026-11-13"
            onChange={(e) => e.target.value && onChange({ split: e.target.value })}
            aria-label="Split date: episodes before this date are the before group"
          />
        </div>
        <p className="side-help">
          Before: episodes earlier than {dateLong(filters.split)}. After: that date onward.
          {filters.split === MOVE_ISO ? ' The mid-roll moved from minute 18 to minute 25 on this date.' : ' Changed from the ad-move date.'}
        </p>
        <div className="field" style={{ marginTop: 12 }}>
          <label className="side-title" style={{ margin: 0 }} htmlFor="window-end">Window ends</label>
          <input
            id="window-end"
            className="input"
            type="date"
            value={filters.end}
            min={DATA_FIRST_DAY}
            max={DATA_LAST_DAY}
            onChange={(e) => e.target.value && onChange({ end: e.target.value })}
          />
        </div>
        <p className="side-help">
          Episodes after this date are left out. For a placebo check, move the split to an earlier date and end the window on 3 Aug 2026:
          any change then has to come from before the ad move.
        </p>
      </section>

      <section className="side-section">
        <div className="side-title">Show format</div>
        <div className="seg" role="group" aria-label="Show format">
          {FORMAT_OPTIONS.map((f) => (
            <button key={f} type="button" className={filters.format === f ? 'is-active' : ''} onClick={() => setFormat(f)}>
              {f === 'Daily news' ? 'Daily' : f}
            </button>
          ))}
        </div>

        <div className="check-list" style={{ marginTop: 10 }}>
          {groups.map((g) => (
            <div key={g}>
              {filters.format === 'All' && <div className="check-group-label">{g}</div>}
              {visibleShows
                .filter((s) => s.format === g)
                .map((s) => {
                  const checked = filters.showIds.includes(s.id);
                  return (
                    <label key={s.id} className="check">
                      <input type="checkbox" checked={checked} onChange={() => toggleShow(s.id)} />
                      <span className="dot" style={{ background: s.color }} />
                      <span>{s.name}</span>
                    </label>
                  );
                })}
            </div>
          ))}
        </div>
        {filters.format === 'Narrative' && (
          <p className="side-help">Narrative shows are the ones whose ad slot moved. Other formats act as the comparison group.</p>
        )}
      </section>

      <section className="side-section">
        <div className="side-title">Episode length</div>
        <div className="seg wrap" role="group" aria-label="Episode length">
          {LENGTH_OPTIONS.map((l) => (
            <button key={l} type="button" className={filters.length === l ? 'is-active' : ''} onClick={() => onChange({ length: l })}>
              {LENGTH_LABEL[l]}
            </button>
          ))}
        </div>
      </section>

      <section className="side-section">
        <div className="side-title">Majority platform</div>
        <select
          className="input"
          value={filters.platform}
          onChange={(e) => onChange({ platform: e.target.value as PlatformFilter })}
          aria-label="Majority listening platform"
        >
          <option value="All">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <p className="side-help">An episode counts toward the platform that has the largest share of its starts.</p>
      </section>

      <section className="side-section">
        <div className="side-title">Production notes</div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.excludeFlagged}
            onChange={(e) => onChange({ excludeFlagged: e.target.checked })}
          />
          <span>
            Exclude episodes with production notes
            <span className="side-help" style={{ display: 'block', marginTop: 2 }}>
              {flagged.total} flagged in the selected shows: {flagged.pre} before the split, {flagged.post} after.
            </span>
          </span>
        </label>
      </section>

      <section className="side-section">
        <div className="side-title">Episodes in this view</div>
        <dl className="kv" style={{ gridTemplateColumns: '1fr auto', rowGap: 4, fontSize: 12.5 }}>
          <dt>{counts.hasTreat ? 'Narrative, before' : 'Selected, before'}</dt>
          <dd>{counts.treatPre}</dd>
          <dt>{counts.hasTreat ? 'Narrative, after' : 'Selected, after'}</dt>
          <dd>{counts.treatPost}</dd>
          {counts.hasTreat && (
            <>
              <dt>Comparison, before</dt>
              <dd>{counts.ctrlPre}</dd>
              <dt>Comparison, after</dt>
              <dd>{counts.ctrlPost}</dd>
            </>
          )}
        </dl>
        <div style={{ marginTop: 10 }}>
          <button type="button" className="reset-link" onClick={onReset} disabled={isDefault}>
            Reset to default view
          </button>
        </div>
      </section>

      <section className="side-section">
        <div className="side-help" style={{ marginTop: 0 }}>
          Showing {SHOWS.length} shows and {PRODUCTION_NOTES.length} production-note flags. Demo data is synthetic and generated in the browser.
        </div>
      </section>
    </aside>
  );
}
