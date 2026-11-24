import { summarize } from '../lib/format.js';

export default function TopBar({ config, builds, counts, blockers, canPublish, publish, onRebuild, onPublish }) {
  const last = builds[0];
  const isPublished = publish.status === 'done';
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" aria-hidden="true">Q</span>
        <span className="brand-name">Quillstack</span>
      </div>
      <div className="site-chip">
        <span className="site-name">{config.title}</span>
        <span className="chip">Docs {config.version}</span>
      </div>

      <div className="spacer" />

      <div className="build-status">
        <span className="muted">
          Last build #{last.n} · {last.at}
        </span>
        <span className={`live ${counts.errors ? 'bad' : 'ok'}`} title="Checks run live on the current source">
          Now: {summarize(counts)}
        </span>
      </div>

      <button className="btn" onClick={onRebuild}>
        Rebuild
      </button>

      {!canPublish && !isPublished && (
        <span className="blocked-note">Publish blocked: {blockers.join(', ')}</span>
      )}
      <button
        className="btn primary"
        disabled={!canPublish && !isPublished}
        onClick={onPublish}
        title={canPublish ? 'Publish the docs' : `Blocked: ${blockers.join(', ')}`}
      >
        {isPublished ? 'Published' : 'Publish'}
      </button>
    </header>
  );
}
