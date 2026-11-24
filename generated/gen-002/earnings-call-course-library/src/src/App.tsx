import { useCallback, useEffect, useMemo, useState } from 'react';
import { CASE_CALL_ID, callById } from './data/catalog';
import { getTranscript } from './data/transcripts';
import { loadState, saveState } from './lib/store';
import { formatTime } from './lib/time';
import type { CallMeta, Clip, SavedState } from './types';
import { Header, type View } from './components/Header';
import { LibraryView } from './components/LibraryView';
import { ListenView, type Actions, type NewClip } from './components/ListenView';
import type { RightTab } from './components/SidePanel';

export default function App() {
  const [saved, setSaved] = useState<SavedState>(loadState);
  const [view, setView] = useState<View>('listen');
  const [callId, setCallId] = useState<string>(CASE_CALL_ID);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0); // bumps on every open so the player remounts cleanly
  const [rightTab, setRightTab] = useState<RightTab>('notes');
  const [flashClipId, setFlashClipId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    saveState(saved);
  }, [saved]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!flashClipId) return;
    const id = window.setTimeout(() => setFlashClipId(null), 2200);
    return () => window.clearTimeout(id);
  }, [flashClipId]);

  const call: CallMeta = callById(callId) ?? (callById(CASE_CALL_ID) as CallMeta);
  const transcript = getTranscript(call.id);

  const update = useCallback((fn: (s: SavedState) => SavedState) => setSaved(fn), []);

  const actions: Actions = useMemo(
    () => ({
      setRate: (rate) => update((s) => (s.rate === rate ? s : { ...s, rate })),
      savePosition: (id, sec) =>
        update((s) => {
          const value = Math.round(sec);
          if (s.positions[id] === value) return s;
          return { ...s, positions: { ...s.positions, [id]: value } };
        }),
      markCompleted: (id) =>
        update((s) => (s.completed.includes(id) ? s : { ...s, completed: [...s.completed, id] })),
      addClip: (input: NewClip) => {
        const clip: Clip = {
          ...input,
          id: `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          note: '',
          createdAt: new Date().toISOString(),
        };
        update((s) => ({ ...s, clips: [...s.clips, clip] }));
        setRightTab('clips');
        setFlashClipId(clip.id);
        setToast(`Saved quote at ${formatTime(clip.t)} · ${clip.speakerName}`);
      },
      updateClipNote: (id, note) =>
        update((s) => ({ ...s, clips: s.clips.map((c) => (c.id === id ? { ...c, note } : c)) })),
      deleteClip: (id) => update((s) => ({ ...s, clips: s.clips.filter((c) => c.id !== id) })),
      enqueue: (id) =>
        update((s) => (s.queue.includes(id) ? s : { ...s, queue: [...s.queue, id] })),
      dequeue: (id) => update((s) => ({ ...s, queue: s.queue.filter((q) => q !== id) })),
    }),
    [update],
  );

  const openCall = useCallback((id: string, at?: number) => {
    setCallId(id);
    setStartAt(at ?? null);
    setNonce((n) => n + 1);
    setView('listen');
    if (at !== undefined) setRightTab('clips');
  }, []);

  const enqueueFromLibrary = useCallback(
    (id: string) => {
      actions.enqueue(id);
      const c = callById(id);
      setToast(c ? `Queued ${c.companyName} ${c.quarter}` : 'Queued');
    },
    [actions],
  );

  return (
    <div className="app">
      <Header
        view={view}
        onView={setView}
        queueCount={saved.queue.length}
        clipCount={saved.clips.length}
      />

      {view === 'listen' && transcript && (
        <ListenView
          key={`${call.id}:${nonce}`}
          call={call}
          transcript={transcript}
          saved={saved}
          actions={actions}
          startAt={startAt}
          rightTab={rightTab}
          onRightTab={setRightTab}
          flashClipId={flashClipId}
          onToast={setToast}
          onOpenCall={openCall}
        />
      )}

      {view === 'listen' && !transcript && (
        <div className="empty-state">
          <h1>{call.companyName} {call.quarter}</h1>
          <p>The transcript for this call is not loaded in this build.</p>
          <button className="btn" onClick={() => setView('library')}>Back to the library</button>
        </div>
      )}

      {view === 'library' && (
        <LibraryView saved={saved} onOpen={(id) => openCall(id)} onQueue={enqueueFromLibrary} />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
