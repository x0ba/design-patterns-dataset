import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { DIGITIZED_TOTAL, FEATURED_EXHIBIT, PRESERVE } from '../data/collection';
import { DEFAULT_FILTERS, SPECIMENS, applyFilters, DATA_YEAR_MAX, DATA_YEAR_MIN, SPECIMEN_BY_ID } from '../lib/model';
import { SheetThumb } from './SheetThumb';
import type { Filters } from '../types';
import { pluralize } from '../lib/format';

interface WelcomeProps {
  onSearch: (text: string) => void;
  onQuick: (patch: Partial<Filters>) => void;
  onExhibit: () => void;
  onOpenSheet: (id: string) => void;
}

const FEATURED_SHEET = 'OSU-V-101187'; // the 1898 Lane County sheet

export function Welcome({ onSearch, onQuick, onExhibit, onOpenSheet }: WelcomeProps) {
  const [text, setText] = useState('');

  const counts = useMemo(() => {
    const n = (f: Partial<Filters>) => applyFilters(SPECIMENS, { ...DEFAULT_FILTERS, ...f }).length;
    return {
      all: n({}),
      lane: n({ counties: ['Lane'] }),
      nearSpring: n({ counties: ['Lane'], radiusMi: 10, seasons: ['spring'] }),
      rattanii: n({ species: ['rattanii'], earlierNames: true }),
    };
  }, []);

  const featured = SPECIMEN_BY_ID.get(FEATURED_SHEET);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(text.trim());
  };

  const quick: { title: string; detail: string; count: number; patch: Partial<Filters> }[] = [
    {
      title: 'All Penstemon',
      detail: 'Every sheet in the kiosk set, any county or year',
      count: counts.all,
      patch: {},
    },
    {
      title: 'Penstemon in Lane County',
      detail: 'Sheets from Lane County, 1898 to 2019',
      count: counts.lane,
      patch: { counties: ['Lane'] },
    },
    {
      title: 'Lane County, spring, within 10 miles',
      detail: `Collected Mar–May, within 10 miles of ${PRESERVE.name}`,
      count: counts.nearSpring,
      patch: { counties: ['Lane'], radiusMi: 10, seasons: ['spring'] },
    },
    {
      title: 'Penstemon rattanii',
      detail: 'Includes sheets first determined as rattanii and later changed',
      count: counts.rattanii,
      patch: { species: ['rattanii'], earlierNames: true },
    },
  ];

  return (
    <div className='welcome'>
      <section className='welcome__main'>
        <p className='eyebrow'>Vascular plant herbarium · {DIGITIZED_TOTAL.toLocaleString('en-US')} digitized sheets</p>
        <h1 className='welcome__title'>Find a plant pressed in place.</h1>
        <p className='welcome__lede'>
          Search by name, collector, place, or catalog number. Collectors have pressed sheets here since {DATA_YEAR_MIN}, and each one shows its label, its name history, and where it grew.
        </p>

        <form className='search search--hero' onSubmit={submit} role='search'>
          <label htmlFor='hero-search' className='visually-hidden'>
            Search the herbarium
          </label>
          <input
            id='hero-search'
            type='search'
            className='search__input'
            placeholder='Try “Penstemon rattanii”, “Calder”, or “OSU-V-118204”'
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete='off'
          />
          <button type='submit' className='btn btn--primary btn--lg'>
            Search
          </button>
        </form>

        <h2 className='section-title'>Quick starts for the Penstemon collection</h2>
        <ul className='quick-list'>
          {quick.map((q) => (
            <li key={q.title}>
              <button type='button' className='quick' onClick={() => onQuick(q.patch)}>
                <span className='quick__count'>{q.count.toLocaleString('en-US')}</span>
                <span className='quick__text'>
                  <strong>{q.title}</strong>
                  <span>{q.detail}</span>
                </span>
                <span className='quick__arrow' aria-hidden='true'>
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className='muted welcome__note'>
          Touch a sheet to see it in detail. Pinch or use the buttons to zoom, and use <em>Read label</em> to look at the
          handwriting.
        </p>
      </section>

      <aside className='welcome__side'>
        <button type='button' className='exhibit-card' onClick={onExhibit}>
          <span className='exhibit-card__eyebrow'>Featured this month · {FEATURED_EXHIBIT.month}</span>
          <span className='exhibit-card__title'>{FEATURED_EXHIBIT.title}</span>
          {featured && (
            <span className='exhibit-card__sheet'>
              <SheetThumb spec={featured} />
            </span>
          )}
          <span className='exhibit-card__cta'>Read the exhibit →</span>
        </button>
        {featured && (
          <button type='button' className='sheet-teaser' onClick={() => onOpenSheet(featured.catalogNumber)}>
            <span className='sheet-teaser__label'>Oldest Lane County sheet in the kiosk</span>
            <span className='sheet-teaser__detail'>
              Label reads {featured.determinations[0].name} ({featured.date.year}); now {featured.currentName}.{' '}
              {pluralize(featured.determinations.length, 'determination', 'determinations')} on file.
            </span>
          </button>
        )}
        <p className='welcome__year-range muted'>
          Sheets dated {DATA_YEAR_MIN}–{DATA_YEAR_MAX} in this set. The kiosk clears to this screen after three minutes without touch.
        </p>
      </aside>

    </div>
  );
}
