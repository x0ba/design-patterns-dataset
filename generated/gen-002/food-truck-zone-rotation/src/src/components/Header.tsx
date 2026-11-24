import { useEffect, useRef, useState } from 'react';
import { useApp } from '../ctx';
import { DAYS_TO_PUBLISH, PUBLISH_DEADLINE } from '../data/calendar';
import { Icon } from './ui';

export function Header({
  onUndo,
  onRedo,
  onPublish,
  onRevert,
}: {
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
  onRevert: () => void;
}) {
  const { state, an, groups } = useApp();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!logOpen) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setLogOpen(false);
        setConfirmRevert(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [logOpen]);

  const blocking = an.blockingIds.size;
  const review = groups.filter((g) => g.severity === 'warning').reduce((n, g) => n + g.items.length, 0);
  const changes = state.past.length;
  const lastTime = state.past[state.past.length - 1]?.entry.time;

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="truck" size={18} />
        </div>
        <div>
          <div className="brand-name">Curbrota</div>
          <div className="brand-sub">Office of Small Business · Curbside Vending</div>
        </div>
      </div>

      <div className="doc">
        <div className="doc-title">
          December 2026 rotation
          <span className={`doc-status ${state.published ? 'is-published' : ''}`}>
            {state.published ? 'Scheduled to send' : 'Draft v3'}
          </span>
        </div>
        <div className="doc-sub">
          {changes ? `${changes} change${changes > 1 ? 's' : ''} today · autosaved ${lastTime}` : 'Last saved Fri, Nov 13 · 5:18 PM by you'}
        </div>
      </div>

      <div className="hdr-counts" aria-label="Open issues">
        <div className={`hc hc-block ${blocking === 0 ? 'zero' : ''}`}>
          <b>{blocking}</b>
          <span>must fix</span>
        </div>
        <div className={`hc hc-warn ${review === 0 ? 'zero' : ''}`}>
          <b>{review}</b>
          <span>to review</span>
        </div>
      </div>

      <div className="deadline" title="Rotation goes out to vendors Friday morning">
        <Icon name="calendar" size={15} />
        <div>
          <div className="deadline-main">Sends {PUBLISH_DEADLINE}</div>
          <div className="deadline-sub">{DAYS_TO_PUBLISH} days left</div>
        </div>
      </div>

      <div className="hdr-actions">
        <button className="iconbtn" onClick={onUndo} disabled={!state.past.length} title="Undo (⌘Z)" aria-label="Undo">
          <Icon name="undo" />
        </button>
        <button className="iconbtn" onClick={onRedo} disabled={!state.future.length} title="Redo (⇧⌘Z)" aria-label="Redo">
          <Icon name="redo" />
        </button>
        <div className="logwrap" ref={ref}>
          <button className={`btn btn-ghost ${logOpen ? 'pressed' : ''}`} onClick={() => setLogOpen((o) => !o)}>
            <Icon name="history" size={15} /> Changes{changes ? ` (${changes})` : ''}
          </button>
          {logOpen && (
            <div className="popover log-popover">
              <div className="pop-head">Changes since Friday’s draft</div>
              {changes === 0 ? (
                <div className="pop-empty">No changes yet. Moves, swaps and acknowledgements will be listed here.</div>
              ) : (
                <ol className="log-list">
                  {[...state.past].reverse().map((p, i) => (
                    <li key={i}>
                      <span className="log-time">{p.entry.time}</span>
                      <span>{p.entry.label}</span>
                    </li>
                  ))}
                </ol>
              )}
              <div className="pop-foot">
                {confirmRevert ? (
                  <>
                    <span>Discard all {changes} changes?</span>
                    <button className="btn btn-danger btn-sm" onClick={() => { onRevert(); setLogOpen(false); setConfirmRevert(false); }}>
                      Discard
                    </button>
                    <button className="btn btn-sm" onClick={() => setConfirmRevert(false)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button className="linkbtn" disabled={!changes} onClick={() => setConfirmRevert(true)}>
                    Revert to Friday’s draft
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={onPublish}>
          <Icon name="send" size={15} /> Review &amp; send
        </button>
        <div className="avatar" title="Marisol Achebe · Permit Coordinator">
          MA
        </div>
      </div>
    </header>
  );
}
