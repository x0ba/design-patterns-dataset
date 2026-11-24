import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { useApp } from '../App';
import type { Action } from '../store';
import type { Bookmark, Item } from '../types';
import { chapterIndexAt, cutRanges, fmtFor, segmentIndexAt, type CutRange } from '../util';
import * as I from './Icons';

function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let k = 0;
  for (;;) {
    const j = lower.indexOf(q, i);
    if (j < 0) break;
    parts.push(text.slice(i, j), <mark key={k++}>{text.slice(j, j + q.length)}</mark>);
    i = j + q.length;
  }
  parts.push(text.slice(i));
  return parts;
}

interface ListProps {
  item: Item;
  active: number;
  bookmarks: Bookmark[];
  ranges: CutRange[];
  query: string;
  dispatch: Dispatch<Action>;
}

const TranscriptList = memo(function TranscriptList({ item, active, bookmarks, ranges, query, dispatch }: ListProps) {
  const segs = item.transcript;
  const isTour = item.kind === 'tour';
  const bmBySeg = useMemo(() => {
    const m = new Map<number, Bookmark[]>();
    for (const b of bookmarks) {
      const i = segmentIndexAt(segs, b.t);
      m.set(i, [...(m.get(i) ?? []), b].sort((a, c) => a.t - c.t));
    }
    return m;
  }, [bookmarks, segs]);

  const inCut = (t: number) => ranges.find((r) => t >= r.start && t < r.end);

  const rows: ReactNode[] = [];
  let lastCh = -1;
  segs.forEach((s, i) => {
    const chi = chapterIndexAt(item.chapters, s.t);
    if (chi !== lastCh) {
      lastCh = chi;
      const ch = item.chapters[chi];
      rows.push(
        <div className="tr-stop" key={`ch${chi}`} data-ch={chi}>
          <span className="tr-stop-num">{chi + 1}</span>
          <span className="tr-stop-title">{ch.title}</span>
          <button className="tr-stop-time" onClick={() => dispatch({ type: 'seek', t: ch.start })} title="Jump to the start of this stop">
            {fmtFor(item, ch.start)}
          </button>
        </div>,
      );
    }
    const end = segs[i + 1]?.t ?? item.duration;
    const cut = inCut(s.t);
    const cutStartsHere = cut && cut.start >= s.t && cut.start < end;
    const marks = bmBySeg.get(i);
    const quiet = s.speaker === 'none';
    const lower = s.text.toLowerCase();
    const hit = query && lower.includes(query);
    rows.push(
      <div
        key={i}
        data-i={i}
        className={`tr-row ${i === active ? 'active' : ''} ${quiet ? 'quiet' : ''} ${cut ? 'in-cut' : ''} ${hit ? 'hit' : ''} ${
          s.speaker.startsWith('Guest') ? 'guest' : ''
        }`}
      >
        {cutStartsHere && <div className="cut-flag"><I.Scissors size={13} /> Marked to cut · {fmtFor(item, cut.start)} – {fmtFor(item, cut.end)}</div>}
        <button className="tr-time" onClick={() => dispatch({ type: 'seek', t: s.t, play: true })} title="Play from here">
          {fmtFor(item, s.t)}
        </button>
        <div className="tr-content">
          {!quiet && <div className={`tr-speaker sp-${s.speaker.startsWith('Guest') ? 'guest' : 'main'}`}>{s.speaker}</div>}
          {marks?.map((b) => (
            <div key={b.id} className={`tr-mark ${b.kind}`}>
              {b.kind === 'note' ? <I.Bookmark size={12} /> : b.kind === 'cut-start' ? <I.CutStart size={12} /> : <I.CutEnd size={12} />}
              <span className="tr-mark-time">{fmtFor(item, b.t)}</span>
              <span>{b.kind === 'cut-start' ? 'Cut starts' : b.kind === 'cut-end' ? 'Cut ends' : b.note || 'Bookmark (no note)'}</span>
            </div>
          ))}
          <p className="tr-text">{highlight(s.text, query)}</p>
        </div>
        <div className="tr-actions">
          <button onClick={() => dispatch({ type: 'seek', t: s.t, play: true })} title="Play from this line">
            <I.Play size={13} />
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'addBookmark', t: s.t });
            }}
            title="Bookmark this line"
          >
            <I.BookmarkPlus size={14} />
          </button>
          {isTour && (
            <>
              <button
                onClick={() => {
                  dispatch({ type: 'addBookmark', t: s.t, kind: 'cut-start' });
                  dispatch({ type: 'toast', text: `Cut starts at ${fmtFor(item, s.t)}` });
                }}
                title="Start a cut at the beginning of this line"
                className="txt"
              >
                <I.CutStart size={14} /> Start cut
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'addBookmark', t: end, kind: 'cut-end' });
                  dispatch({ type: 'toast', text: `Cut ends at ${fmtFor(item, end)}` });
                }}
                title="End the cut after this line"
                className="txt"
              >
                <I.CutEnd size={14} /> End cut after
              </button>
            </>
          )}
        </div>
      </div>,
    );
  });
  return <>{rows}</>;
});

export default function Transcript({ item }: { item: Item }) {
  const { state, dispatch } = useApp();
  const active = segmentIndexAt(item.transcript, state.position);
  const bookmarks = useMemo(() => state.bookmarks.filter((b) => b.itemId === item.id), [state.bookmarks, item.id]);
  const { ranges } = useMemo(() => cutRanges(bookmarks), [bookmarks]);
  const [follow, setFollow] = useState(true);
  const [rawQuery, setQuery] = useState('');
  const query = rawQuery.trim().toLowerCase();
  const [hitIdx, setHitIdx] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const lastPos = useRef(state.position);
  const programmatic = useRef(0);

  // Search requested from another panel (e.g. "Find 1730s in this lecture")
  const handledReq = useRef(state.searchRequest?.id ?? 0);
  useEffect(() => {
    const req = state.searchRequest;
    if (!req || req.id === handledReq.current) return;
    handledReq.current = req.id;
    const q = req.text.toLowerCase();
    setQuery(req.text);
    const first = item.transcript.findIndex((s) => s.text.toLowerCase().includes(q));
    setHitIdx(first >= 0 ? 0 : -1);
    if (first >= 0) {
      setFollow(false);
      requestAnimationFrame(() => scrollToRow(first, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.searchRequest]);

  const hits = useMemo(
    () => (query.length < 2 ? [] : item.transcript.map((s, i) => (s.text.toLowerCase().includes(query) ? i : -1)).filter((i) => i >= 0)),
    [query, item.transcript],
  );

  const scrollToRow = (i: number, smooth: boolean) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
    const box = scroller.current;
    if (!el || !box) return;
    programmatic.current = performance.now();
    const top = el.offsetTop - box.clientHeight * 0.3;
    box.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  };

  // A jump (seek, stop click, new item) re-engages follow mode.
  useEffect(() => {
    const jumped = Math.abs(state.position - lastPos.current) > 3;
    lastPos.current = state.position;
    if (jumped) setFollow(true);
  }, [state.position]);

  useLayoutEffect(() => {
    if (follow) scrollToRow(active, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, follow]);

  useLayoutEffect(() => {
    scrollToRow(segmentIndexAt(item.transcript, state.position), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const stopFollowing = () => {
    if (performance.now() - programmatic.current < 900) return;
    setFollow(false);
  };

  const goHit = (dir: 1 | -1) => {
    if (!hits.length) return;
    const n = (hitIdx + dir + hits.length) % hits.length;
    setHitIdx(n);
    setFollow(false);
    scrollToRow(hits[n], true);
  };

  return (
    <section className="transcript">
      <div className="tr-toolbar">
        <h2 className="section-title">Transcript</h2>
        {!rawQuery && <span className="tr-auto">auto-generated · speaker labels</span>}
        <div className="tr-search">
          <I.Search size={15} />
          <input
            value={rawQuery}
            placeholder="Find in transcript — e.g. “grandmother”"
            onChange={(e) => {
              setQuery(e.target.value);
              setHitIdx(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goHit(e.shiftKey ? -1 : 1);
              if (e.key === 'Escape') setQuery('');
            }}
            aria-label="Find in transcript"
          />
          {query.length >= 2 && (
            <>
              <span className="tr-count">{hits.length ? `${hitIdx >= 0 ? hitIdx + 1 : '–'} of ${hits.length}` : 'No matches'}</span>
              <button className="icon-btn" onClick={() => goHit(-1)} disabled={!hits.length} aria-label="Previous match"><I.Up size={15} /></button>
              <button className="icon-btn" onClick={() => goHit(1)} disabled={!hits.length} aria-label="Next match"><I.Down size={15} /></button>
              <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><I.Close size={14} /></button>
            </>
          )}
        </div>
        <button className={`follow-btn ${follow ? 'on' : ''}`} onClick={() => setFollow((f) => !f)} title="Keep the playing line in view">
          <I.Follow size={15} /> {follow ? 'Following playback' : 'Follow playback'}
        </button>
      </div>
      <div className="tr-scroll" ref={scroller} onScroll={stopFollowing}>
        <TranscriptList item={item} active={active} bookmarks={bookmarks} ranges={ranges} query={query.length >= 2 ? query : ''} dispatch={dispatch} />
        <div className="tr-end">End of recording · {fmtFor(item, item.duration)}</div>
      </div>
      {!follow && (
        <button className="back-to-play" onClick={() => setFollow(true)}>
          <I.Follow size={15} /> Back to playing line · {fmtFor(item, state.position)}
        </button>
      )}
    </section>
  );
}
