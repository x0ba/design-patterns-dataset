import { changedAreas, discardDraft, saveDraft, useAppState } from '../lib/store';

export function SaveBar() {
  const live = useAppState((s) => s.live);
  const draft = useAppState((s) => s.draft);
  const notice = useAppState((s) => s.notice);
  const areas = changedAreas(live, draft);
  const dirty = areas.length > 0;

  return (
    <>
      {dirty && (
        <div className="savebar" role="region" aria-label="Unsaved changes">
          <div className="savebar-text">
            <strong>Unsaved changes:</strong> {areas.join(', ')}.
            <span className="muted"> Check them on a flagged call first. Saved changes apply to the next call.</span>
          </div>
          <div className="savebar-actions">
            <button type="button" className="btn ghost" onClick={discardDraft}>
              Discard
            </button>
            <button type="button" className="btn primary" onClick={saveDraft}>
              Save and make live
            </button>
          </div>
        </div>
      )}
      {!dirty && notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );
}
