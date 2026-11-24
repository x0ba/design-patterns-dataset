import { useMemo, useState } from 'react';
import type { Topic } from '../data/types';
import { type CardSummary, TOPIC_LABELS } from '../analysis/analyze';
import { pct, secs } from '../format';

type ChipId = 'all' | 'krebs' | 'etc' | 'glyc' | 'other';
type SortKey = 'misses' | 'recall' | 'time';

const CHIPS: { id: ChipId; label: string; topics: Topic[] | null }[] = [
  { id: 'all', label: 'All', topics: null },
  { id: 'krebs', label: 'Krebs cycle', topics: ['krebs'] },
  { id: 'etc', label: 'Electron transport', topics: ['etc'] },
  { id: 'glyc', label: 'Glycolysis & fermentation', topics: ['glyc'] },
  { id: 'other', label: 'Other biology', topics: ['bio-other'] },
];

const PAGE = 25;

interface Props {
  cards: CardSummary[];
  scopeLabel: string;
  onOpen: (id: string) => void;
  selectedId: string | null;
}

export function CardTable({ cards, scopeLabel, onOpen, selectedId }: Props) {
  const [chip, setChip] = useState<ChipId>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('misses');
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const topics = CHIPS.find((c) => c.id === chip)!.topics;
    const q = query.trim().toLowerCase();
    let out = cards.filter((c) => {
      if (topics && !topics.includes(c.card.topic)) return false;
      if (!q) return true;
      return (c.card.front ?? '').toLowerCase().includes(q) || (c.card.back ?? '').toLowerCase().includes(q);
    });
    if (sort === 'misses') out = out.slice().sort((a, b) => b.misses - a.misses || (a.recentRate.recall ?? 0) - (b.recentRate.recall ?? 0));
    if (sort === 'recall') out = out.slice().sort((a, b) => (a.recentRate.recall ?? 101) - (b.recentRate.recall ?? 101) || b.misses - a.misses);
    if (sort === 'time') out = out.slice().sort((a, b) => (b.avgSec ?? 0) - (a.avgSec ?? 0));
    return out;
  }, [cards, chip, query, sort]);

  const visible = showAll ? rows : rows.slice(0, PAGE);

  const sortHead = (key: SortKey, label: string) => (
    <th scope="col" className="num-col">
      <button className={`sort ${sort === key ? 'on' : ''}`} onClick={() => setSort(key)} aria-pressed={sort === key}>
        {label}
      </button>
    </th>
  );

  return (
    <section className="card cards-card" aria-labelledby="cards-title">
      <div className="card-head">
        <div>
          <h2 id="cards-title">Cards you keep missing</h2>
          <p className="muted small">
            Counts cover all six weeks · {scopeLabel}. Click a card to see every time you answered it.
          </p>
        </div>
      </div>

      <div className="card-tools">
        <div className="chips" role="group" aria-label="Filter by topic">
          {CHIPS.map((c) => (
            <button key={c.id} className={`chip ${chip === c.id ? 'on' : ''}`} onClick={() => setChip(c.id)} aria-pressed={chip === c.id}>
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search cards"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search cards"
        />
      </div>

      <div className="card-table-wrap">
        <table className="cards-table">
          <thead>
            <tr>
              <th scope="col">Card</th>
              {sortHead('misses', 'Missed')}
              {sortHead('recall', 'Recall, last 3 wks')}
              {sortHead('time', 'Avg. answer')}
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr
                key={c.card.id}
                className={selectedId === c.card.id ? 'selected' : ''}
                onClick={() => onOpen(c.card.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(c.card.id);
                  }
                }}
              >
                <td>
                  <div className="card-front">{c.card.front}</div>
                  <div className="card-meta">
                    {TOPIC_LABELS[c.card.topic]} · {c.total} reviews
                  </div>
                </td>
                <td className="num-col">
                  <span className="miss-count">{c.misses}</span>
                </td>
                <td className={`num-col ${(c.recentRate.recall ?? 100) < 50 ? 'down' : ''}`}>{pct(c.recentRate.recall)}</td>
                <td className="num-col">{secs(c.avgSec)}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  No cards match. Try another topic or clear the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE && (
        <button className="link-btn" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show top 25 only' : `Show all ${rows.length} cards`}
        </button>
      )}
    </section>
  );
}
