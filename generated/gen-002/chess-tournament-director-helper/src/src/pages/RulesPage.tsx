import { useState } from 'react';
import { clubSettings, glossary, rulesNote } from '../data/rules';

export function RulesPage() {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const terms = glossary.filter(
    (g) => !needle || g.term.toLowerCase().includes(needle) || g.long.toLowerCase().includes(needle),
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Club rules</p>
          <h1>Rules note and glossary</h1>
          <p className="lead">
            {rulesNote.heading}. {rulesNote.by}. This is the version loaded into this event.
          </p>
        </div>
      </header>

      <section className="settings-strip" aria-label="Club settings for this event">
        <div>
          <span className="fact-label">Time control</span>
          <strong>{clubSettings.timeControl}</strong>
        </div>
        <div>
          <span className="fact-label">Half-point byes for late entries</span>
          <strong>Rounds {clubSettings.halfByeLateRounds.join(' and ')} only</strong>
        </div>
        <div>
          <span className="fact-label">Full-point bye goes to</span>
          <strong>Lowest-rated in lowest group with no earlier bye</strong>
        </div>
        <div>
          <span className="fact-label">Colour balance</span>
          <strong>On</strong>
        </div>
        <div>
          <span className="fact-label">Tiebreaks</span>
          <strong>{clubSettings.tiebreaks.join(', then ')}</strong>
        </div>
      </section>

      <div className="rules-grid">
        <section>
          <h2>Rules note</h2>
          {rulesNote.sections.map((s) => (
            <article key={s.id} className="rule-card" id={`rule-${s.id}`}>
              <div className="rule-title">{s.title}</div>
              {s.body.map((b) => (
                <p key={b}>{b}</p>
              ))}
            </article>
          ))}
        </section>

        <section>
          <h2>Glossary</h2>
          <input
            className="search"
            type="search"
            placeholder="Search the glossary"
            aria-label="Search the glossary"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {terms.map((t) => (
            <article key={t.term} className="term">
              <h3>{t.term}</h3>
              <p className="term-short">{t.short}</p>
              <p className="muted small">{t.long}</p>
            </article>
          ))}
          {terms.length === 0 && <p className="muted">No term matches that search.</p>}
        </section>
      </div>
    </div>
  );
}
