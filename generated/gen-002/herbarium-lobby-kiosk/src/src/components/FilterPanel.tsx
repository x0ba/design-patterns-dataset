import type { ReactNode } from 'react';
import { COUNTY_FOCUS, RADIUS_CHOICES, SEASON_LABELS, SPECIES_COLOR } from '../data/collection';
import { COUNTIES, DATA_YEAR_MAX, DATA_YEAR_MIN, SPECIES_EPITHETS } from '../lib/model';
import type { Filters, PhenoChoice, Season } from '../types';

interface FilterPanelProps {
  filters: Filters;
  speciesCounts: Map<string, number>;
  countyCounts: Map<string, number>;
  onChange: (patch: Partial<Filters>, coalesce?: boolean) => void;
}

const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];
const PHENOLOGY: { value: PhenoChoice; label: string }[] = [
  { value: 'flowering', label: 'Flowering' },
  { value: 'fruiting', label: 'Fruiting' },
  { value: 'vegetative', label: 'Vegetative' },
  { value: 'not recorded', label: 'Not recorded' },
];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function FilterPanel({ filters, speciesCounts, countyCounts, onChange }: FilterPanelProps) {
  const counties = COUNTIES.filter((c) => (countyCounts.get(c) ?? 0) > 0 || filters.counties.includes(c));

  return (
    <div className='filters__body'>
      <FilterSection title='Species' note='Penstemon, by current name'>
        <ul className='checklist'>
          {SPECIES_EPITHETS.map((ep) => {
            const count = speciesCounts.get(ep) ?? 0;
            const checked = filters.species.includes(ep);
            return (
              <li key={ep}>
                <label className={`check ${count === 0 && !checked ? 'is-dim' : ''}`}>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={() => onChange({ species: toggle(filters.species, ep) })}
                  />
                  <span className='swatch' style={{ background: SPECIES_COLOR[ep] }} aria-hidden='true' />
                  <span className='check__label'>
                    Penstemon <em>{ep}</em>
                  </span>
                  <span className='check__count'>{count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      <FilterSection title='County' note={`${COUNTY_FOCUS} County is listed first`}>
        <ul className='checklist checklist--short'>
          {counties.map((c) => {
            const checked = filters.counties.includes(c);
            return (
              <li key={c}>
                <label className='check'>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={() => onChange({ counties: toggle(filters.counties, c) })}
                  />
                  <span className='check__label'>{c}</span>
                  <span className='check__count'>{countyCounts.get(c) ?? 0}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      <FilterSection title='Distance from Coyote Hollow' note='Measured from the preserve centre'>
        <div className='chips'>
          {RADIUS_CHOICES.map((r) => (
            <button
              key={r.label}
              type='button'
              className='chip'
              aria-pressed={filters.radiusMi === r.miles}
              onClick={() => onChange({ radiusMi: r.miles })}
            >
              {r.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title='Year collected' note={`${DATA_YEAR_MIN}–${DATA_YEAR_MAX} in this set`}>
        <div className='range'>
          <div className='range__labels'>
            <span>{filters.yearFrom}</span>
            <span>{filters.yearTo}</span>
          </div>
          <label className='range__row'>
            <span className='visually-hidden'>Earliest year</span>
            <input
              type='range'
              min={DATA_YEAR_MIN}
              max={DATA_YEAR_MAX}
              value={filters.yearFrom}
              onChange={(e) => onChange({ yearFrom: Math.min(Number(e.target.value), filters.yearTo) }, true)}
            />
          </label>
          <label className='range__row'>
            <span className='visually-hidden'>Latest year</span>
            <input
              type='range'
              min={DATA_YEAR_MIN}
              max={DATA_YEAR_MAX}
              value={filters.yearTo}
              onChange={(e) => onChange({ yearTo: Math.max(Number(e.target.value), filters.yearFrom) }, true)}
            />
          </label>
          {(filters.yearFrom !== DATA_YEAR_MIN || filters.yearTo !== DATA_YEAR_MAX) && (
            <button
              type='button'
              className='link'
              onClick={() => onChange({ yearFrom: DATA_YEAR_MIN, yearTo: DATA_YEAR_MAX })}
            >
              Show all years
            </button>
          )}
        </div>
      </FilterSection>

      <FilterSection title='Season collected' note='Sheets without a month are not placed in a season'>
        <div className='chips'>
          {SEASONS.map((s) => (
            <button
              key={s}
              type='button'
              className='chip'
              aria-pressed={filters.seasons.includes(s)}
              onClick={() => onChange({ seasons: toggle(filters.seasons, s) })}
            >
              {SEASON_LABELS[s]}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title='Plant condition on the sheet'>
        <div className='chips'>
          {PHENOLOGY.map((p) => (
            <button
              key={p.value}
              type='button'
              className='chip'
              aria-pressed={filters.phenology.includes(p.value)}
              onClick={() => onChange({ phenology: toggle(filters.phenology, p.value) })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title='Options'>
        <label className='check check--block'>
          <input
            type='checkbox'
            checked={filters.earlierNames}
            onChange={() => onChange({ earlierNames: !filters.earlierNames })}
          />
          <span className='check__label'>
            Include earlier determinations
            <span className='check__hint'>Match names a sheet carried before it was re-identified</span>
          </span>
        </label>
        <label className='check check--block'>
          <input
            type='checkbox'
            checked={filters.imagedOnly}
            onChange={() => onChange({ imagedOnly: !filters.imagedOnly })}
          />
          <span className='check__label'>
            Only sheets with images
            <span className='check__hint'>Hides sheets on loan to another institution</span>
          </span>
        </label>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className='filter-section'>
      <h3 className='filter-section__title'>{title}</h3>
      {note && <p className='filter-section__note'>{note}</p>}
      {children}
    </section>
  );
}
