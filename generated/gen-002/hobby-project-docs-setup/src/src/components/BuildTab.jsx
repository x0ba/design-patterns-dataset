import { useMemo, useState } from 'react';
import { sectionOptions } from '../lib/site.js';
import { summarize } from '../lib/format.js';

const CALLOUT_TYPE = { NOTE: 'note', TIP: 'tip', WARNING: 'warning', CAUTION: 'caution', IMPORTANT: 'note' };
const DESCRIPTION_HINT = {
  faq: 'Answers to common questions about data sources and rounding',
  changelog: 'Release notes for each elemental.nvim version',
};

export default function BuildTab({
  issues,
  counts,
  builds,
  site,
  baseUrlSet,
  onOpenLine,
  onFixReference,
  onConvertCallout,
  onSetDescription,
  onOpenHelp,
  onRebuild,
}) {
  const options = useMemo(() => sectionOptions(site), [site]);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const notices = issues.filter((i) => i.severity === 'notice');
  const last = builds[0];

  return (
    <div className="build-tab">
      <div className="summary-card">
        <div>
          <p className="eyebrow">
            Build #{last.n} · {last.at}
          </p>
          <p className="summary-line">{summarize(counts)}</p>
        </div>
        <button className="btn small" onClick={onRebuild}>
          Rebuild
        </button>
      </div>

      {errors.length > 0 && (
        <Group title="Errors" hint="Block publishing">
          {errors.map((issue) => (
            <BrokenRefCard
              key={issue.id}
              issue={issue}
              options={options}
              onOpenLine={onOpenLine}
              onFix={onFixReference}
              onHelp={onOpenHelp}
            />
          ))}
        </Group>
      )}

      {warnings.length > 0 && (
        <Group title="Warnings" hint="Fix before launch. Publishing still works.">
          {warnings.map((issue) => (
            <DescriptionCard
              key={issue.id}
              issue={issue}
              onOpenLine={onOpenLine}
              onSave={(text) => onSetDescription(issue.slug, text)}
            />
          ))}
        </Group>
      )}

      {notices.length > 0 && (
        <Group title="Notices" hint="Styling only">
          {notices.map((issue) => (
            <CalloutCard
              key={issue.id}
              issue={issue}
              onOpenLine={onOpenLine}
              onConvert={onConvertCallout}
              onHelp={onOpenHelp}
            />
          ))}
        </Group>
      )}

      {issues.length === 0 && (
        <div className="all-clear">
          {baseUrlSet ? 'No issues. Nothing is blocking publishing.' : 'No issues. Set a base URL to publish.'}
        </div>
      )}

      <section className="build-log">
        <h4>Build log</h4>
        <ol>
          {builds.map((build) => (
            <li key={build.n}>
              <strong>Build #{build.n}</strong>
              <span>{build.at}</span>
              <span className="muted">{summarize(build)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Group({ title, hint, children }) {
  return (
    <section className="issue-group">
      <header>
        <h4>{title}</h4>
        <span className="muted">{hint}</span>
      </header>
      {children}
    </section>
  );
}

function BrokenRefCard({ issue, options, onOpenLine, onFix, onHelp }) {
  const [choice, setChoice] = useState('');
  return (
    <article className="issue issue-error">
      <p className="issue-title">
        <span className="sev sev-error">Broken reference</span> in {issue.pageTitle}, line {issue.line}
      </p>
      <code className="snippet">{issue.text.trim()}</code>
      <p className="issue-reason">{issue.reason}</p>

      {issue.suggestions.length > 0 ? (
        <div className="suggestions">
          <p className="label">Closest match</p>
          {issue.suggestions.map((s) => (
            <button key={s.ref} className="btn small" onClick={() => onFix(issue, s.ref)}>
              Use <code>{s.ref}</code>
              <span className="muted"> {s.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted small">No section is close. Pick one below.</p>
      )}

      <label className="field inline">
        <span>Or point to another section</span>
        <select
          value={choice}
          onChange={(event) => {
            setChoice(event.target.value);
            if (event.target.value) onFix(issue, event.target.value);
          }}
        >
          <option value="">Choose a section…</option>
          {options.map((group) => (
            <optgroup key={group.page} label={group.page}>
              {group.items.map((item) => (
                <option key={item.ref} value={item.ref}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <footer>
        <button className="link" onClick={() => onOpenLine(issue.slug, issue.line)}>
          Show line {issue.line} in source
        </button>
        <button className="link" onClick={() => onHelp('cross-references')}>
          What is a reference?
        </button>
      </footer>
    </article>
  );
}

function CalloutCard({ issue, onOpenLine, onConvert, onHelp }) {
  const type = CALLOUT_TYPE[issue.calloutLabel];
  return (
    <article className="issue issue-notice">
      <p className="issue-title">
        <span className="sev sev-notice">Notice</span> Callout written as a quote in {issue.pageTitle}, line {issue.line}
      </p>
      <code className="snippet">{issue.text.trim()}</code>
      <p className="issue-reason">
        Callouts are <code>:::</code> blocks. A line that starts with <code>&gt;</code> is an ordinary quote, so{' '}
        <code>{issue.calloutLabel}:</code> is printed as plain text and no callout box is drawn.
      </p>
      <div className="actions">
        <button className="btn small primary" onClick={() => onConvert(issue)}>
          Convert to {type} callout
        </button>
      </div>
      <footer>
        <button className="link" onClick={() => onOpenLine(issue.slug, issue.line)}>
          Show line {issue.line} in source
        </button>
        <button className="link" onClick={() => onHelp('callouts')}>
          About callouts
        </button>
      </footer>
    </article>
  );
}

function DescriptionCard({ issue, onOpenLine, onSave }) {
  const [text, setText] = useState('');
  const placeholder = DESCRIPTION_HINT[issue.slug] || 'One line on what this page covers';
  return (
    <article className="issue issue-warning">
      <p className="issue-title">
        <span className="sev sev-warning">Warning</span> Missing description on {issue.pageTitle}
      </p>
      <p className="issue-reason">
        Descriptions appear in search results and link previews. This page has no <code>description:</code> in its
        frontmatter.
      </p>
      <label className="field">
        <span>Description</span>
        <input
          value={text}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && text.trim()) onSave(text.trim());
          }}
        />
      </label>
      <div className="actions">
        <button className="btn small primary" disabled={!text.trim()} onClick={() => onSave(text.trim())}>
          Save description
        </button>
      </div>
      <footer>
        <button className="link" onClick={() => onOpenLine(issue.slug, issue.line)}>
          Show frontmatter
        </button>
      </footer>
    </article>
  );
}
