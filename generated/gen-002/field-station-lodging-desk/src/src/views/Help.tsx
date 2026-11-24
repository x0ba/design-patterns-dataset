import { useState } from 'react';
import { ARTICLES, GLOSSARY, articleById, type Block } from '../help/content';

const GROUPS: { kicker: string; label: string }[] = [
  { kicker: 'Start here', label: 'Start here' },
  { kicker: 'Term', label: 'Words you will see' },
  { kicker: 'Deadline', label: 'Deadlines' },
  { kicker: 'How to', label: 'How to' },
  { kicker: 'Help', label: 'Getting help' },
];

function renderBlock(block: Block, i: number) {
  switch (block.kind) {
    case 'p':
      return <p key={i}>{block.text}</p>;
    case 'list':
      return (
        <ul key={i} className="help-list">
          {block.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol key={i} className="help-steps">
          {block.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ol>
      );
    case 'callout':
      return (
        <div key={i} className={`callout callout-${block.tone}`}>
          {block.text}
        </div>
      );
  }
}

export function HelpView({ articleId }: { articleId?: string }) {
  const [query, setQuery] = useState('');
  const article = articleById(articleId) ?? ARTICLES[0];
  const q = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);

  return (
    <div className="page help-layout">
      <nav className="help-index" aria-label="Help topics">
        <input
          className="help-search"
          type="search"
          placeholder="Search help"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {GROUPS.map((g) => {
          const items = ARTICLES.filter((a) => a.kicker === g.kicker && (!q || matches(a.title) || matches(a.summary)));
          if (items.length === 0) return null;
          return (
            <div key={g.kicker} className="help-group">
              <div className="help-group-label">{g.label}</div>
              {items.map((a) => (
                <a key={a.id} href={`#/help/${a.id}`} className={a.id === article.id ? 'active' : ''}>
                  {a.title}
                </a>
              ))}
            </div>
          );
        })}
      </nav>

      <article className="help-article">
        <div className="kicker">{article.kicker}</div>
        <h1>{article.title}</h1>
        <p className="lead">{article.summary}</p>
        {article.body.map(renderBlock)}

        <section className="help-glossary">
          <h2>All the words in Cabinroll</h2>
          <dl>
            {Object.entries(GLOSSARY).map(([key, g]) => (
              <div key={key} className="glossary-row">
                <dt>
                  <a href={`#/help/${g.article}`}>{g.label}</a>
                </dt>
                <dd>{g.short}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
    </div>
  );
}
