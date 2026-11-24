import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CourseNote, Section, Transcript } from '../types';
import { formatTime } from '../lib/time';
import { notesBySegment } from '../lib/transcript';

const SECTION_LABEL: Record<Section, string> = {
  ceo: 'Prepared remarks · CEO',
  cfo: 'Prepared remarks · CFO',
  qa: 'Analyst Q&A',
};

interface TranscriptPanelProps {
  transcript: Transcript;
  activeIndex: number;
  follow: boolean;
  /** Changes whenever the user seeks, so the panel can scroll to the new position. */
  seekToken: number;
  onFollowChange: (follow: boolean) => void;
  onSeekIndex: (index: number) => void;
  onSaveSegment: (index: number) => void;
  onSaveSelection: (index: number, text: string) => void;
}

interface Popover {
  index: number;
  text: string;
  top: number;
  left: number;
}

export function TranscriptPanel(props: TranscriptPanelProps) {
  const { transcript, activeIndex, follow, seekToken, onFollowChange, onSeekIndex, onSaveSegment, onSaveSelection } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [matchCursor, setMatchCursor] = useState(-1);
  const [popover, setPopover] = useState<Popover | null>(null);

  const notesMap = useMemo(() => notesBySegment(transcript), [transcript]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return transcript.segments.reduce<number[]>((acc, seg, i) => {
      if (seg.text.toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [query, transcript]);

  // Auto-follow: keep the active segment near the middle of the panel.
  const firstRun = useRef(true);
  useLayoutEffect(() => {
    if (!follow || activeIndex < 0) return;
    const box = scrollRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-seg="${activeIndex}"]`);
    if (!box || !el) return;
    const top = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
    box.scrollTo({ top, behavior: firstRun.current ? 'auto' : 'smooth' });
    firstRun.current = false;
    // seekToken is included so a seek to the already-active segment still re-centres it.
  }, [activeIndex, follow, seekToken]);

  const onSelectionEnd = () => {
    const sel = window.getSelection();
    const box = scrollRef.current;
    if (!sel || sel.isCollapsed || !box) {
      setPopover(null);
      return;
    }
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    const anchorEl = (sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement) ?? null;
    const row = anchorEl?.closest<HTMLElement>('[data-seg]');
    if (!text || !row || !box.contains(row)) {
      setPopover(null);
      return;
    }
    const range = sel.getRangeAt(0).getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    setPopover({
      index: Number(row.dataset.seg),
      text,
      top: range.top - boxRect.top + box.scrollTop - 40,
      left: Math.max(90, range.left - boxRect.left + range.width / 2),
    });
  };

  const saveSelection = () => {
    if (!popover) return;
    onSaveSelection(popover.index, popover.text);
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const cursorMatch = matchCursor >= 0 && matches.length > 0 ? matches[matchCursor % matches.length] : -1;

  const step = (dir: 1 | -1) => {
    if (matches.length === 0) return;
    const next = matchCursor < 0 ? (dir === 1 ? 0 : matches.length - 1) : (matchCursor + dir + matches.length) % matches.length;
    setMatchCursor(next);
    onSeekIndex(matches[next]);
  };

  return (
    <section className="transcript-panel" aria-label="Transcript">
      <header className="transcript-head">
        <div className="transcript-title">
          <h2>Transcript</h2>
          <span className="muted small">Synced to audio · click any line to play from it</span>
          {transcript.partialNote && <span className="partial-badge">{transcript.partialNote}</span>}
        </div>
        <div className="transcript-tools">
          <div className="search">
            <input
              type="search"
              placeholder="Search transcript"
              value={query}
              aria-label="Search transcript"
              onChange={(e) => {
                setQuery(e.target.value);
                setMatchCursor(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  step(e.shiftKey ? -1 : 1);
                }
              }}
            />
            <span className="match-count small muted">
              {query.trim() === ''
                ? ''
                : matches.length === 0
                  ? 'No matches'
                  : `${matchCursor < 0 ? 0 : matchCursor + 1} of ${matches.length}`}
            </span>
            <button className="icon-btn small" onClick={() => step(-1)} disabled={matches.length === 0} aria-label="Previous match">↑</button>
            <button className="icon-btn small" onClick={() => step(1)} disabled={matches.length === 0} aria-label="Next match">↓</button>
          </div>
          <button
            className={`btn btn-sm follow-btn ${follow ? 'on' : ''}`}
            onClick={() => onFollowChange(!follow)}
            aria-pressed={follow}
          >
            {follow ? 'Following playback' : 'Follow playback'}
          </button>
        </div>
      </header>

      <div
        className="transcript-scroll"
        ref={scrollRef}
        onMouseUp={onSelectionEnd}
        onKeyUp={onSelectionEnd}
        onWheel={() => follow && onFollowChange(false)}
        onTouchMove={() => follow && onFollowChange(false)}
      >
        {transcript.segments.map((seg, i) => {
          const prev = transcript.segments[i - 1];
          const newSection = !prev || prev.section !== seg.section;
          const showSpeaker = newSection || prev.speaker !== seg.speaker;
          const speaker = transcript.speakers[seg.speaker];
          const notes = notesMap.get(i);
          const isActive = i === activeIndex;
          const isMatch = i === cursorMatch;
          return (
            <Fragment key={i}>
              {newSection && <div className="section-head">{SECTION_LABEL[seg.section]}</div>}
              <Row
                index={i}
                t={seg.t}
                text={seg.text}
                speakerName={speaker?.name ?? seg.speaker}
                speakerOrg={speaker?.org ?? ''}
                isManagement={speaker?.kind === 'management'}
                isAnalyst={speaker?.kind === 'analyst'}
                question={seg.question}
                showSpeaker={showSpeaker}
                active={isActive}
                match={isMatch}
                query={query.trim()}
                onSeek={onSeekIndex}
                onSave={onSaveSegment}
              />
              {notes?.map((n) => (
                <CourseNoteBlock key={n.t} note={n} />
              ))}
            </Fragment>
          );
        })}
        <div className="transcript-end muted small">End of recording</div>

        {popover && (
          <button
            className="save-popover"
            style={{ top: popover.top, left: popover.left }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={saveSelection}
          >
            Save quote · {formatTime(transcript.segments[popover.index].t)}
          </button>
        )}
      </div>
    </section>
  );
}

interface RowProps {
  index: number;
  t: number;
  text: string;
  speakerName: string;
  speakerOrg: string;
  isManagement: boolean;
  isAnalyst: boolean;
  question: boolean;
  showSpeaker: boolean;
  active: boolean;
  match: boolean;
  query: string;
  onSeek: (index: number) => void;
  onSave: (index: number) => void;
}

const Row = memo(function Row(p: RowProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (p.match) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [p.match]);

  return (
    <div
      ref={ref}
      className={[
        'seg',
        p.active ? 'active' : '',
        p.match ? 'match-current' : '',
        p.question ? 'is-question' : '',
      ].join(' ')}
      data-seg={p.index}
    >
      <button className="seg-time" onClick={() => p.onSeek(p.index)} aria-label={`Play from ${formatTime(p.t)}`}>
        {formatTime(p.t)}
      </button>
      <div className="seg-body">
        {p.showSpeaker && (
          <div className="seg-speaker">
            <span className={p.isManagement ? 'tag tag-mgmt' : p.isAnalyst ? 'tag tag-analyst' : 'tag'}>
              {p.speakerName}
            </span>
            {p.speakerOrg && <span className="muted small">{p.speakerOrg}</span>}
            {p.question && <span className="q-label">Question</span>}
          </div>
        )}
        <p className="seg-text">{highlight(p.text, p.query)}</p>
      </div>
      <button
        className="seg-save"
        onClick={() => p.onSave(p.index)}
        aria-label={`Save this segment as a quote from ${formatTime(p.t)}`}
        title="Save as quote"
      >
        Save
      </button>
    </div>
  );
});

function highlight(text: string, query: string) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>,
  );
}

function CourseNoteBlock({ note }: { note: CourseNote }) {
  return (
    <aside className="course-note-inline" aria-label={`Course note at ${formatTime(note.t)}`}>
      <span className="note-badge">Course note · {formatTime(note.t)}</span>
      <p>
        <strong>{note.author}:</strong> {note.text}
      </p>
    </aside>
  );
}
