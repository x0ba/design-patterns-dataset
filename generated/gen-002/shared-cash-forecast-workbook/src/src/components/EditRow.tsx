import { useState } from 'react';
import { entityById, lineById, person, type Edit } from '../data';
import { useApp } from '../ctx';
import { delta, fmtDeltaK, fmtK, fmtWhen } from '../model';
import { Avatar } from './Avatar';

export function EditRow({ e, showLine = true, compact }: { e: Edit; showLine?: boolean; compact?: boolean }) {
  const { s, dispatch, now, askEditor } = useApp();
  const [adding, setAdding] = useState(false);
  const [txt, setTxt] = useState('');
  const d = delta(e);
  const l = lineById[e.lineId];
  const missing = !e.note && Math.abs(d) >= 500;
  const sel = s.selection?.kind === 'cell' && s.selection.lineId === e.lineId && s.selection.week === e.week;
  const askId = e.by === 'aisha' ? 't-aisha' : 't-ask-' + e.by;
  const asked = s.threads.some((t) => t.id === askId);
  const siblings = s.edits.filter((x) => x.by === e.by && !x.note && x.at.getTime() === e.at.getTime()).length;
  return (
    <div
      className={'edit' + (missing ? ' edit-unx' : '') + (sel && showLine ? ' edit-sel' : '') + (compact ? ' compact' : '') + (e.live ? ' edit-live' : '')}
      onClick={() => showLine && dispatch({ type: 'select', sel: { kind: 'cell', lineId: e.lineId, week: e.week } })}
    >
      <Avatar id={e.by} size={20} />
      <div className="edit-main">
        <div className="edit-top">
          <b>{e.by === 'helen' ? 'You' : person[e.by].name}</b>
          <span className="muted">{fmtWhen(e.at, now())}</span>
          <span className={'edit-d ' + (d < 0 ? 'neg' : 'pos')}>{fmtDeltaK(d)}</span>
        </div>
        {showLine && (
          <div className="edit-line">
            {l.name} <span className="ent">{entityById[l.entity].short}</span> · wk {e.week + 1}
          </div>
        )}
        <div className="edit-vals muted">
          {fmtK(e.old)} → {fmtK(e.new)}
        </div>
        {e.note ? (
          <div className="edit-note">
            “{e.note}”
            {e.noteBy && (
              <span className="muted"> (note added {e.noteBy === 'helen' ? 'by you' : `by ${person[e.noteBy].first}`} {fmtWhen(e.noteAt!, now()).replace('Today ', '')})</span>
            )}
          </div>
        ) : missing ? (
          <div className="edit-nonote" onClick={(ev) => ev.stopPropagation()}>
            <span className="badge-unx">No note</span>
            {e.by !== 'helen' && (
              <button className="link" onClick={() => askEditor(e.by)}>
                {asked ? 'Open thread' : `Ask ${person[e.by].first}`}
              </button>
            )}
            {!adding && <button className="link muted-link" onClick={() => setAdding(true)}>Add explanation yourself</button>}
          </div>
        ) : null}
        {adding && (
          <div className="add-note" onClick={(ev) => ev.stopPropagation()}>
            <textarea rows={2} autoFocus value={txt} onChange={(ev) => setTxt(ev.target.value)} placeholder={`What did ${person[e.by].first} tell you? Logged as added by you.`} />
            <div className="row-end">
              <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
              <button
                className="btn btn-sm btn-primary"
                disabled={txt.trim().length < 6}
                onClick={() => {
                  const ids = s.edits.filter((x) => x.by === e.by && !x.note && x.at.getTime() === e.at.getTime()).map((x) => x.id);
                  dispatch({ type: 'addNote', editIds: ids, note: txt.trim(), by: 'helen', at: now() });
                  setAdding(false);
                }}
              >
                Save note{siblings > 1 ? ` on all ${siblings} edits` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
