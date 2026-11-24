import { useEffect, useState } from 'react';
import { plural, summarize } from '../lib/format.js';

const STEPS = [
  'Building pages',
  'Checking cross-references',
  'Uploading to version folder',
  'Checking live URLs',
];

export default function PublishDialog({
  site,
  counts,
  canPublish,
  version,
  baseUrl,
  status,
  publishedAt,
  onClose,
  onPublished,
  onFixErrors,
  onSetUrl,
}) {
  const [phase, setPhase] = useState(() => {
    if (status === 'done') return 'done';
    return canPublish ? 'confirm' : 'blocked';
  });
  const [step, setStep] = useState(0);
  const target = `${baseUrl}${version}/`;

  useEffect(() => {
    if (phase !== 'running') return undefined;
    if (step >= STEPS.length) {
      onPublished();
      setPhase('done');
      return undefined;
    }
    const timer = setTimeout(() => setStep((n) => n + 1), 650);
    return () => clearTimeout(timer);
  }, [phase, step, onPublished]);

  const close = () => {
    if (phase !== 'running') onClose();
  };

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title">
        {phase === 'blocked' && (
          <>
            <h2 id="publish-title">Publishing is blocked</h2>
            <p>Fix these first. Warnings and notices don't block a publish.</p>
            <ul className="blocker-list">
              {counts.errors > 0 && (
                <li>
                  <span>{plural(counts.errors, 'broken reference')}</span>
                  <button className="btn small" onClick={onFixErrors}>
                    Open build report
                  </button>
                </li>
              )}
              {!baseUrl && (
                <li>
                  <span>No base URL</span>
                  <button className="btn small" onClick={onSetUrl}>
                    Set base URL
                  </button>
                </li>
              )}
            </ul>
            <div className="dialog-actions">
              <button className="btn" onClick={close}>
                Close
              </button>
            </div>
          </>
        )}

        {phase === 'confirm' && (
          <>
            <h2 id="publish-title">Publish {version} docs</h2>
            <p>
              Uploads {plural(site.pages.length, 'page')} to <code>{target}</code>.
            </p>
            <p className="muted">Build check: {summarize(counts)}</p>
            <p className="muted small">
              Only the <code>{version}/</code> folder is overwritten. Older version folders and the Changelog are not touched.
            </p>
            <div className="dialog-actions">
              <button className="btn" onClick={close}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setStep(0);
                  setPhase('running');
                }}
              >
                Publish {version}
              </button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <>
            <h2 id="publish-title">Publishing…</h2>
            <ol className="progress-steps">
              {STEPS.map((label, index) => (
                <li key={label} className={index < step ? 'done' : index === step ? 'active' : ''}>
                  <span aria-hidden="true">{index < step ? '✓' : index === step ? '…' : '○'}</span>
                  {label}
                </li>
              ))}
            </ol>
          </>
        )}

        {phase === 'done' && (
          <>
            <h2 id="publish-title">Published {version}</h2>
            <p>
              Docs are live at <code>{target}</code>
            </p>
            <p className="muted small">Published {publishedAt || 'just now'}.</p>
            <p className="note-box small">
              This prototype has no server, so nothing was uploaded. The steps above show what a real publish checks.
            </p>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setPhase('confirm')}>
                Publish again
              </button>
              <button className="btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
