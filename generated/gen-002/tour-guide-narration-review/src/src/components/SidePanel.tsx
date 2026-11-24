import { useEffect, useRef, useState } from 'react';
import { useApp } from '../App';
import type { Bookmark, BookmarkKind, Item } from '../types';
import { chapterIndexAt, cutRanges, fmt, fmtDelta, fmtFor, totalCut } from '../util';
import * as I from './Icons';

const KIND_LABEL: Record<BookmarkKind, string> = { note: 'Note', 'cut-start': 'Cut starts', 'cut-end': 'Cut ends' };

function BookmarkRow({ b, item, flash, inRange }: { b: Bookmark; item: Item; flash: boolean; inRange: boolean }) {
  const { state, dispatch } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const row = useRef<HTMLLIElement>(null);
  const [draft, setDraft] = useState(b.note);
  useEffect(() => setDraft(b.note), [b.note]);
  useEffect(() => {
    if (state.focusBookmark === b.id) {
      row.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      input.current?.focus();
      dispatch({ type: 'focused' });
    }
  }, [state.focusBookmark, b.id, dispatch]);

  const commit = () => {
    if (draft !== b.note) dispatch({ type: 'updateBookmark', id: b.id, note: draft.trim() });
  };
  const near = Math.abs(state.position - b.t) < 4;

  return (
    <li ref={row} className={`bm-row ${b.kind} ${flash ? 'flash' : ''} ${near ? 'near' : ''} ${inRange ? 'paired' : ''}`}>
      <button className="bm-time" onClick={() => dispatch({ type: 'seek', t: b.t, play: true })} title="Play from this bookmark">
        <I.Play size={11} /> {fmtFor(item, b.t)}
      </button>
      <div className="bm-body">
        <input
          ref={input}
          className="bm-note"
          value={draft}
          placeholder={b.kind === 'note' ? 'Add a short note…' : b.kind === 'cut-start' ? 'Why cut? e.g. “tangent — tiles theft”' : 'Note (optional)'}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label={`Note for bookmark at ${fmtFor(item, b.t)}`}
        />
        <div className="bm-foot">
          {item.kind === 'tour' ? (
            <select
              className={`bm-kind ${b.kind}`}
              value={b.kind}
              onChange={(e) => dispatch({ type: 'updateBookmark', id: b.id, kind: e.target.value as BookmarkKind })}
              aria-label="Bookmark type"
            >
              <option value="note">Note</option>
              <option value="cut-start">Cut starts</option>
              <option value="cut-end">Cut ends</option>
            </select>
          ) : (
            <span className={`bm-kind ${b.kind}`}>{KIND_LABEL[b.kind]}</span>
          )}
          <span className="bm-stop">Stop {chapterIndexAt(item.chapters, b.t) + 1}</span>
          <button
            className="icon-btn bm-del"
            title="Delete bookmark"
            onClick={() => {
              dispatch({ type: 'deleteBookmark', id: b.id });
              dispatch({ type: 'toast', text: `Bookmark at ${fmtFor(item, b.t)} deleted`, undo: { type: 'restoreBookmark', bookmark: b } });
            }}
          >
            <I.Trash size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}

export default function SidePanel({ item }: { item: Item }) {
  const { state, dispatch } = useApp();
  const ci = chapterIndexAt(item.chapters, state.position);
  const bms = state.bookmarks.filter((b) => b.itemId === item.id).sort((a, b) => a.t - b.t);
  const { ranges, openStart, orphanEnds } = cutRanges(bms);
  const cut = totalCut(ranges);
  const isTour = item.kind === 'tour';
  const prevCount = useRef(bms.length);
  const [flashId, setFlashId] = useState<string | null>(null);
  const newest = state.bookmarks[state.bookmarks.length - 1];
  useEffect(() => {
    if (bms.length > prevCount.current && newest) {
      setFlashId(newest.id);
      const t = setTimeout(() => setFlashId(null), 1400);
      prevCount.current = bms.length;
      return () => clearTimeout(t);
    }
    prevCount.current = bms.length;
  }, [bms.length, newest]);

  const [tab, setTab] = useState<'bookmarks' | 'stops'>('bookmarks');
  useEffect(() => {
    if (state.focusBookmark) setTab('bookmarks');
  }, [state.focusBookmark]);
  // When listening to a lecture, surface tour notes that flag something to verify.
  const toCheck = isTour
    ? []
    : state.bookmarks
        .filter((b) => state.items[b.itemId].kind === 'tour' && b.kind === 'note' && /\b1[0-9]{3}s?\b/.test(b.note) && /\?|check|wrong|said/i.test(b.note))
        .sort((a, b) => (a.itemId === b.itemId ? a.t - b.t : a.itemId.localeCompare(b.itemId)));
  const paired = new Set(ranges.flatMap((r) => [r.startId, r.endId]));
  const label = (t: number) => fmtFor(item, t);

  return (
    <aside className="sidepanel">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'bookmarks'} className={tab === 'bookmarks' ? 'on' : ''} onClick={() => setTab('bookmarks')}>
          <I.Bookmark size={15} /> {isTour ? 'Bookmarks & cuts' : 'Bookmarks'} <span className="count">{bms.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'stops'} className={tab === 'stops' ? 'on' : ''} onClick={() => setTab('stops')}>
          {isTour ? 'Stops' : 'Chapters'} <span className="count">{item.chapters.length}</span>
        </button>
      </div>
      {tab === 'stops' && (
      <section className="panel stops-panel">
        {isTour && <div className="panel-sub">Length of each stop, and how far it ran over or under plan. Click to jump to its start.</div>}
        <ol className="stop-list">
          {item.chapters.map((c, i) => {
            const len = c.end - c.start;
            const d = c.planned !== undefined ? len - c.planned : 0;
            return (
              <li key={i}>
                <button
                  className={`stop-row ${i === ci ? 'current' : ''}`}
                  onClick={() => dispatch({ type: 'seek', t: c.start })}
                  title={`Jump to ${isTour ? 'stop' : 'chapter'} ${i + 1} at ${label(c.start)}`}
                >
                  <span className="stop-num">{i + 1}</span>
                  <span className="stop-name">{c.title}</span>
                  <span className="stop-start">{label(c.start)}</span>
                  {isTour ? (
                    <span className={`stop-delta ${d >= 120 ? 'over' : d <= -60 ? 'under' : ''}`}>{fmt(len)}{Math.abs(d) >= 30 ? ` · ${fmtDelta(d)}` : ''}</span>
                  ) : (
                    <span className="stop-delta">{fmt(len)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      )}

      {tab === 'bookmarks' && (
      <section className="panel bm-panel">
        <div className="bm-actions">
          <button className="btn btn-bm" onClick={() => dispatch({ type: 'addBookmark' })} title="Bookmark the current moment (B)">
            <I.BookmarkPlus size={16} /> Bookmark {label(state.position)}
          </button>
          {isTour && (
            <div className="cut-btns">
              <button
                className="btn btn-cut"
                onClick={() => {
                  dispatch({ type: 'addBookmark', kind: 'cut-start' });
                  dispatch({ type: 'toast', text: `Cut starts at ${label(state.position)}` });
                }}
                title="Mark where a cut should start ( [ )"
              >
                <I.CutStart size={16} /> Cut starts
              </button>
              <button
                className="btn btn-cut"
                onClick={() => {
                  dispatch({ type: 'addBookmark', kind: 'cut-end' });
                  dispatch({ type: 'toast', text: `Cut ends at ${label(state.position)}` });
                }}
                title="Mark where a cut should end ( ] )"
              >
                <I.CutEnd size={16} /> Cut ends
              </button>
            </div>
          )}
        </div>

        {isTour && (openStart || ranges.length > 0 || orphanEnds.length > 0) && (
          <div className={`cut-summary ${openStart ? 'open' : ''}`}>
            {ranges.map((r) => (
              <div key={r.startId} className="cut-line">
                <I.Scissors size={14} />
                <button className="link" onClick={() => dispatch({ type: 'seek', t: r.start })}>{label(r.start)}</button>
                <span>→</span>
                <button className="link" onClick={() => dispatch({ type: 'seek', t: r.end })}>{label(r.end)}</button>
                <strong>{fmt(r.end - r.start)}</strong>
              </div>
            ))}
            {openStart && (
              <div className="cut-hint">
                Cut started at <strong>{label(openStart.t)}</strong> — now find where it ends and mark <em>Cut ends</em>.
              </div>
            )}
            {orphanEnds.length > 0 && !openStart && (
              <div className="cut-hint">A “cut ends” mark at {label(orphanEnds[0].t)} has no start before it.</div>
            )}
            {ranges.length > 0 && item.planned && (
              <div className="cut-total">
                Cutting {fmt(cut)} brings the walk to <strong>{fmt(item.duration - cut, true)}</strong> —{' '}
                {item.duration - cut > item.planned
                  ? `still ${fmt(item.duration - cut - item.planned)} over`
                  : `${fmt(item.planned - (item.duration - cut))} under plan`}
                .
              </div>
            )}
          </div>
        )}

        {bms.length === 0 ? (
          <p className="empty">
            No bookmarks on this {isTour ? 'recording' : 'lecture'} yet. Press <kbd>B</kbd> while listening, or use the bookmark button on any transcript line.
          </p>
        ) : (
          <ul className="bm-list">
            {bms.map((b) => (
              <BookmarkRow key={b.id} b={b} item={item} flash={flashId === b.id} inRange={paired.has(b.id)} />
            ))}
          </ul>
        )}

        {toCheck.length > 0 && (
          <div className="check-box">
            <div className="check-head">Dates to check from your tours</div>
            <p className="check-sub">Bookmarks where you questioned a date you said on the walk.</p>
            <ul className="check-list">
              {toCheck.map((b) => {
                const tour = state.items[b.itemId];
                const seg = tour.transcript.filter((s) => s.t <= b.t).pop();
                const year = b.note.match(/\b(1[0-9]{2})[0-9]s?\b/);
                const decade = year ? `${year[1]}0s` : null;
                const found = decade && item.transcript.some((s) => s.text.includes(decade));
                return (
                  <li key={b.id}>
                    <div className="check-note">{b.note}</div>
                    {seg && seg.speaker !== 'none' && <div className="check-quote">“{seg.text.length > 110 ? seg.text.slice(0, 110) + '…' : seg.text}”</div>}
                    <div className="check-actions">
                      {found ? (
                        <button className="chip" onClick={() => dispatch({ type: 'search', text: decade! })} title={`Search this lecture's transcript for “${decade}”`}>
                          <I.Search size={12} /> Find “{decade}” here
                        </button>
                      ) : decade ? (
                        <span className="check-none">“{decade}” isn't mentioned in this lecture</span>
                      ) : null}
                      <button
                        className="link check-link"
                        onClick={() => dispatch({ type: 'load', id: tour.id, at: b.t, play: false })}
                        title="Open the tour recording at this moment (paused)"
                      >
                        {tour.subtitle} · {fmtFor(tour, b.t)}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
      )}
    </aside>
  );
}
