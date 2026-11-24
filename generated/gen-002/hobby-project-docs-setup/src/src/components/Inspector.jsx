import BuildTab from './BuildTab.jsx';
import { HELP_ARTICLES } from '../data/project.js';
import { renderStandalone } from '../lib/markdown.js';

export default function Inspector(props) {
  const { tab, onTab, issues } = props;
  const issueCount = issues.length;
  const tabs = [
    ['build', 'Build', issueCount],
    ['page', 'Page'],
    ['help', 'Help'],
  ];

  return (
    <aside className="inspector">
      <div className="tabs" role="tablist">
        {tabs.map(([value, label, count]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'active' : ''}
            onClick={() => onTab(value)}
          >
            {label}
            {count ? <span className="tab-count">{count}</span> : null}
          </button>
        ))}
      </div>

      <div className="inspector-body" role="tabpanel">
        {tab === 'build' && (
          <BuildTab
            issues={issues}
            counts={props.counts}
            builds={props.builds}
            site={props.site}
            baseUrlSet={props.baseUrlSet}
            onOpenLine={props.onOpenLine}
            onFixReference={props.onFixReference}
            onConvertCallout={props.onConvertCallout}
            onSetDescription={props.onSetDescription}
            onOpenHelp={props.onOpenHelp}
            onRebuild={props.onRebuild}
          />
        )}
        {tab === 'page' && (
          <PageTab page={props.page} onSetField={props.onSetPageField} onOpenSection={props.onOpenSection} />
        )}
        {tab === 'help' && <HelpTab slug={props.helpSlug} onSlug={props.onHelpSlug} />}
      </div>
    </aside>
  );
}

function PageTab({ page, onSetField, onOpenSection }) {
  return (
    <div className="page-tab">
      <label className="field">
        <span>Title</span>
        <input value={page.title} onChange={(event) => onSetField('title', event.target.value)} />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          rows={2}
          value={page.description}
          placeholder="One line on what this page covers"
          onChange={(event) => onSetField('description', event.target.value)}
        />
        {!page.description && (
          <small className="warn-text">Missing. Every build warns about this until it's filled in.</small>
        )}
      </label>

      <div className="field">
        <span>Sections</span>
        <ul className="section-list">
          {page.anchors.map((anchor) => (
            <li key={anchor.id} style={{ paddingLeft: (anchor.level - 1) * 12 }}>
              <button className="link" onClick={() => onOpenSection(anchor.id)}>
                {anchor.text}
              </button>
              <code>#{anchor.id}</code>
            </li>
          ))}
        </ul>
      </div>

      <p className="hint">
        Link to this page with <code>ref:{page.slug}</code>, or to one of its sections with{' '}
        <code>ref:{page.slug}#section-id</code>.
      </p>
    </div>
  );
}

function HelpTab({ slug, onSlug }) {
  if (!slug) {
    return (
      <div className="help-list">
        <p className="hint">Short guides on the parts of Quillstack this site uses.</p>
        {HELP_ARTICLES.map((article) => (
          <button key={article.slug} className="help-card" onClick={() => onSlug(article.slug)}>
            <strong>{article.title}</strong>
            <span>{article.summary}</span>
          </button>
        ))}
      </div>
    );
  }
  const article = HELP_ARTICLES.find((a) => a.slug === slug);
  return (
    <div className="help-article">
      <button className="link back" onClick={() => onSlug(null)}>
        ← All help
      </button>
      <div className="prose" dangerouslySetInnerHTML={{ __html: renderStandalone(article.source) }} />
    </div>
  );
}
