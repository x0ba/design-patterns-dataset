import { useState } from 'react';
import type { CallMeta, Clip, CourseNote } from '../types';
import { formatCitation, clipsToMarkdown, copyText } from '../lib/citation';
import { formatTime, formatDateShort } from '../lib/time';

export type RightTab = 'notes' | 'clips' | 'queue';

interface SidePanelProps {
  tab: RightTab;
  onTab: (tab: RightTab) => void;
  notes: CourseNote[];
  noteCallLabel: string;
  clips: Clip[];
  flashClipId: string | null;
  queue: CallMeta[];
  canOpen: (callId: string) => boolean;
  onPlayNote: (t: number) => void;
  onSeekNote: (t: number) => void;
  onClipNote: (id: string, note: string) => void;
  onClipDelete: (id: string) => void;
  onClipOpen: (callId: string, t: number) => void;
  onDequeue: (callId: string) => void;
  onOpenCall: (callId: string) => void;
  onToast: (message: string) => void;
}

export function SidePanel(props: SidePanelProps) {
  const { tab, onTab, notes, clips, queue } = props;
  return (
    <aside className="side" aria-label="Notes, clips and queue">
      <div className="tabs" role="tablist">
        <TabButton id="notes" label="Notes" count={notes.length} tab={tab} onTab={onTab} />
        <TabButton id="clips" label="Clips" count={clips.length} tab={tab} onTab={onTab} />
        <TabButton id="queue" label="Queue" count={queue.length} tab={tab} onTab={onTab} />
      </div>
      <div className="side-body" role="tabpanel">
        {tab === 'notes' && <NotesTab {...props} />}
        {tab === 'clips' && <ClipsTab {...props} />}
        {tab === 'queue' && <QueueTab {...props} />}
      </div>
    </aside>
  );
}

function TabButton({
  id, label, count, tab, onTab,
}: { id: RightTab; label: string; count: number; tab: RightTab; onTab: (t: RightTab) => void }) {
  return (
    <button role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => onTab(id)}>
      {label} <span className="count">{count}</span>
    </button>
  );
}

function NotesTab({ notes, noteCallLabel, onPlayNote, onSeekNote }: SidePanelProps) {
  return (
    <div className="notes-tab">
      {notes.length > 0 ? (
        <p className="muted small">
          Course notes on {noteCallLabel}. Click a time to jump there, or play from it at 1× speed.
        </p>
      ) : (
        <p className="muted">No course notes on this call.</p>
      )}
      {notes.map((n) => (
        <article className="course-note" key={n.t}>
          <header>
            <button className="time-link" onClick={() => onSeekNote(n.t)}>{formatTime(n.t)}</button>
            <span className="muted small">{n.author}</span>
          </header>
          <p>{n.text}</p>
          <div className="note-actions">
            <button className="btn btn-sm" onClick={() => onPlayNote(n.t)}>Play from here at 1×</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ClipsTab({ clips, flashClipId, onClipNote, onClipDelete, onClipOpen, canOpen, onToast }: SidePanelProps) {
  const sorted = [...clips].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const exportAll = () => {
    const blob = new Blob([clipsToMarkdown(sorted)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'callroom-saved-quotes.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onToast('Exported saved quotes as Markdown');
  };

  return (
    <div className="clips-tab">
      <div className="clips-head">
        <p className="muted small">Each quote keeps its exact text, speaker, and timestamp for your citations.</p>
        <button className="btn btn-sm" onClick={exportAll} disabled={clips.length === 0}>Export .md</button>
      </div>
      {sorted.length === 0 && <p className="muted">No saved quotes yet. Use Save on any transcript line.</p>}
      {sorted.map((clip) => (
        <ClipCard
          key={clip.id}
          clip={clip}
          flash={clip.id === flashClipId}
          canOpen={canOpen(clip.callId)}
          onNote={(note) => onClipNote(clip.id, note)}
          onDelete={() => onClipDelete(clip.id)}
          onOpen={() => onClipOpen(clip.callId, clip.t)}
          onToast={onToast}
        />
      ))}
    </div>
  );
}

interface ClipCardProps {
  clip: Clip;
  flash: boolean;
  canOpen: boolean;
  onNote: (note: string) => void;
  onDelete: () => void;
  onOpen: () => void;
  onToast: (message: string) => void;
}

function ClipCard({ clip, flash, canOpen, onNote, onDelete, onOpen, onToast }: ClipCardProps) {
  const [draft, setDraft] = useState(clip.note);
  const [confirming, setConfirming] = useState(false);

  const copy = async () => {
    const ok = await copyText(formatCitation(clip));
    onToast(ok ? 'Citation copied' : 'Could not access the clipboard. Select the text and copy it manually.');
  };

  return (
    <article className={`clip ${flash ? 'flash' : ''}`}>
      <header className="clip-head">
        <span className="clip-co">{clip.companyName} <span className="muted">({clip.ticker})</span></span>
        <span className="clip-meta muted small">
          {clip.quarter} · {formatDateShort(clip.callDate)}
        </span>
      </header>
      <blockquote className="clip-quote">“{clip.quote}”</blockquote>
      <p className="clip-speaker small">
        <strong>{clip.speakerName}</strong>, {clip.speakerTitle} ·{' '}
        <span className="clip-time">at {formatTime(clip.t)}</span>
        {clip.tEnd > clip.t && <span className="muted"> (segment {formatTime(clip.t)}–{formatTime(clip.tEnd)})</span>}
      </p>
      <label className="clip-note-label small muted" htmlFor={`note-${clip.id}`}>Your note</label>
      <textarea
        id={`note-${clip.id}`}
        rows={2}
        value={draft}
        placeholder="Why this quote matters for the memo"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== clip.note && onNote(draft)}
      />
      <div className="clip-actions">
        <button className="btn btn-sm" onClick={copy}>Copy citation</button>
        <button className="btn btn-sm btn-ghost" onClick={onOpen} disabled={!canOpen}>
          {canOpen ? 'Open at this time' : 'Call not in this build'}
        </button>
        {confirming ? (
          <>
            <button className="btn btn-sm btn-danger" onClick={onDelete}>Confirm delete</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(true)}>Delete</button>
        )}
      </div>
    </article>
  );
}

function QueueTab({ queue, onDequeue, onOpenCall }: SidePanelProps) {
  return (
    <div className="queue-tab">
      <p className="muted small">Calls queued here are next up. Add calls from the Library or from the Up-next card.</p>
      {queue.length === 0 && <p className="muted">The queue is empty.</p>}
      <ol className="queue-list">
        {queue.map((c) => (
          <li key={c.id} className="queue-item">
            <div>
              <div className="cell-company">{c.companyName} · {c.quarter}</div>
              <div className="muted small">Recorded {formatDateShort(c.callDate)} · {Math.round(c.durationSec / 60)} min</div>
            </div>
            <div className="queue-actions">
              <button className="btn btn-sm" onClick={() => onOpenCall(c.id)}>Play</button>
              <button className="btn btn-sm btn-ghost" onClick={() => onDequeue(c.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
