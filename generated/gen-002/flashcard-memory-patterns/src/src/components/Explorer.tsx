import { useState } from 'react';
import type { Dataset, Review } from '../data/types';
import { type CompareRow, ageRows, deckRows, timeRows, topicRows } from '../analysis/analyze';
import { count, pct, signedPts } from '../format';

type Tab = 'deck' | 'topic' | 'time' | 'age';

const TABS: { id: Tab; label: string }[] = [
  { id: 'time', label: 'Time of day' },
  { id: 'age', label: 'Card age' },
  { id: 'topic', label: 'Topic' },
  { id: 'deck', label: 'Deck' },
];

const NOTES: Record<Tab, string> = {
  time: 'Grouped by the clock time you answered. Late sessions also hold more new cards, so check the explanations above before reading a drop here as lateness.',
  age: 'Age is how many days the card had existed when you reviewed it.',
  topic: 'Biology decks only. Topics come from each card’s content.',
  deck: 'This tab always covers all five decks, so you can compare Biology with the rest.',
};

interface Props {
  ds: Dataset;
  scoped: Review[];
}

export function Explorer({ ds, scoped }: Props) {
  const [tab, setTab] = useState<Tab>('time');

  const rows: CompareRow[] =
    tab === 'deck' ? deckRows(ds) : tab === 'topic' ? topicRows(scoped) : tab === 'time' ? timeRows(scoped) : ageRows(scoped);

  return (
    <section className="card explorer" aria-labelledby="explorer-title">
      <div className="card-head">
        <h2 id="explorer-title">Compare recall by…</h2>
        <div className="tabs" role="tablist" aria-label="Breakdown">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">{NOTES[tab]}</p>

      <table className="explore-table">
        <thead>
          <tr>
            <th scope="col">{tab === 'deck' ? 'Deck' : tab === 'topic' ? 'Topic' : tab === 'time' ? 'Time of day' : 'Card age'}</th>
            <th scope="col" className="num-col">Reviews</th>
            <th scope="col" className="num-col">Oct 6–26</th>
            <th scope="col" className="num-col">Oct 27–Nov 16</th>
            <th scope="col" className="num-col">Change</th>
            <th scope="col" className="bar-col">Recall now</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const recent = row.recent.recall;
            const change = row.change;
            return (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td className="num-col">{row.recent.n ? count(row.recent.n) : '–'}</td>
                <td className="num-col">{pct(row.before.recall)}</td>
                <td className="num-col strong">{pct(recent)}</td>
                <td className={`num-col ${change === null ? '' : change < -3 ? 'down' : change > 3 ? 'up' : ''}`}>
                  {signedPts(change)}
                </td>
                <td className="bar-col">
                  <div className="mini-track" aria-hidden="true">
                    <div className="mini-fill" style={{ width: `${recent ?? 0}%` }} />
                    {row.before.recall !== null && <div className="mini-tick" style={{ left: `${row.before.recall}%` }} />}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="footnote">The tick on each bar marks the Oct 6–26 level. Reviews are counted for Oct 27–Nov 16 only.</p>
    </section>
  );
}
