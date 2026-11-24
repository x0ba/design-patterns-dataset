import { WINDOWS } from '../lib/dates.js';
import { TOPICS, WORD_BANDS } from '../lib/search.js';

function Radio({ name, value, current, onChange, label, count }) {
  return (
    <label className={`opt ${value === current ? 'on' : ''}`}>
      <input type="radio" name={name} checked={value === current} onChange={() => onChange(value)} />
      <span className="opt-label">{label}</span>
      {count !== undefined && <span className="opt-count">{count}</span>}
    </label>
  );
}

export default function FiltersRail({ filters, setFilters, topicCounts, angleCounts, baseCount, onReset }) {
  const anyActive =
    filters.window !== 'all' || filters.topics.size > 0 || filters.angle || filters.author !== 'any' || filters.words !== 'any';

  const toggleTopic = (t) =>
    setFilters((f) => {
      const next = new Set(f.topics);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return { ...f, topics: next };
    });

  return (
    <aside className="rail left" aria-label="Narrow results">
      <div className="rail-head">
        <h2>Narrow results</h2>
        {anyActive && (
          <button className="link" onClick={onReset}>
            Reset
          </button>
        )}
      </div>
      <p className="muted small">
        {baseCount} articles match the search before filters.
      </p>

      <section className="fgroup">
        <h3>Published</h3>
        {WINDOWS.map((w) => (
          <Radio
            key={w.key}
            name="window"
            value={w.key}
            current={filters.window}
            onChange={(v) => setFilters((f) => ({ ...f, window: v }))}
            label={w.label}
          />
        ))}
      </section>

      <section className="fgroup">
        <h3>Tagged as</h3>
        <p className="muted tiny">Every box you tick must apply.</p>
        {TOPICS.map((t) => {
          const on = filters.topics.has(t);
          return (
            <label key={t} className={`opt ${on ? 'on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggleTopic(t)} />
              <span className="opt-label">{t}</span>
              <span className="opt-count">{topicCounts[t] ?? 0}</span>
            </label>
          );
        })}
      </section>

      <section className="fgroup">
        <h3>Angle</h3>
        <Radio
          name="angle"
          value=""
          current={filters.angle || ''}
          onChange={() => setFilters((f) => ({ ...f, angle: null }))}
          label="Any angle"
          count={baseCount}
        />
        {angleCounts.map(([a, n]) => (
          <Radio
            key={a}
            name="angle"
            value={a}
            current={filters.angle || ''}
            onChange={(v) => setFilters((f) => ({ ...f, angle: v }))}
            label={a}
            count={n}
          />
        ))}
      </section>

      <section className="fgroup">
        <h3>Writer</h3>
        {[
          ['any', 'Staff or freelance'],
          ['freelance', 'Freelance-written only'],
          ['staff', 'Staff-written only'],
        ].map(([v, label]) => (
          <Radio
            key={v}
            name="author"
            value={v}
            current={filters.author}
            onChange={(x) => setFilters((f) => ({ ...f, author: x }))}
            label={label}
          />
        ))}
      </section>

      <section className="fgroup">
        <h3>Length</h3>
        {WORD_BANDS.map((b) => (
          <Radio
            key={b.key}
            name="words"
            value={b.key}
            current={filters.words}
            onChange={(v) => setFilters((f) => ({ ...f, words: v }))}
            label={b.label}
          />
        ))}
      </section>

      <p className="index-note tiny muted">
        Index: 2.1M articles from 4,800 publications. Writer type is taken from each byline.
      </p>
    </aside>
  );
}
