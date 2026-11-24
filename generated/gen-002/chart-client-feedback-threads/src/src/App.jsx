import { useEffect, useMemo, useState } from 'react';
import {
  GRAPHICS,
  MESSAGES,
  OTHER_PROJECTS,
  PROJECT,
  THREADS,
  VERSIONS,
  AXIS_OPTIONS,
  V4_DATES,
  REVISED_FILE,
  TODAY,
} from './data.js';
import {
  clientDraft,
  download,
  emptyComposer,
  kofiBrief,
  leakTerms,
  pointLabel,
  seriesCsv,
  seriesFor,
} from './lib.js';
import Sidebar from './components/Sidebar.jsx';
import Workspace from './components/Workspace.jsx';
import { Reconcile, ProjectStatus, InboxSummary } from './components/RightPanel.jsx';
import { GraphicSummary, ProjectInbox } from './components/OtherViews.jsx';

const INITIAL_INBOX = Object.fromEntries(OTHER_PROJECTS.map((p) => [p.id, p.unread]));

export default function App() {
  // Opening state: Monday morning, Riding Back open on G3 (v3), the client review thread in front of Ines.
  const [selection, setSelection] = useState({ kind: 'graphic', id: 'g3' });
  const [version, setVersion] = useState('v3');
  const [floor, setFloor] = useState(0);
  const [muted, setMuted] = useState(false);
  const [oct, setOct] = useState('prelim');
  const [thread, setThread] = useState('client');
  const [filter, setFilter] = useState('all');
  const [messages, setMessages] = useState(MESSAGES);
  const [seen, setSeen] = useState(() => new Set());
  const [composers, setComposers] = useState(() => ({
    client: emptyComposer(),
    data: emptyComposer(),
    studio: emptyComposer(),
  }));
  const [decision, setDecision] = useState({ axis: null, date: null });
  const [checks, setChecks] = useState({});
  const [focus, setFocus] = useState(null); // { msgId, n }
  const [flash, setFlash] = useState(null); // { key: 'pin1' | 'pin2', n }
  const [highlight, setHighlight] = useState(null); // { index, version, n }
  const [toast, setToast] = useState(null);
  const [inbox, setInbox] = useState(INITIAL_INBOX);

  // Opening a thread marks its unread messages as read.
  useEffect(() => {
    if (selection.kind !== 'graphic') return;
    const ids = messages.filter((m) => m.thread === thread && m.unread).map((m) => m.id);
    if (ids.length === 0) return;
    setSeen((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, [thread, selection, messages]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const unreadCounts = useMemo(() => {
    const count = (t) => messages.filter((m) => m.thread === t && m.unread && !seen.has(m.id)).length;
    return { client: count('client'), data: count('data'), studio: count('studio') };
  }, [messages, seen]);
  const riddingUnread = unreadCounts.client + unreadCounts.data + unreadCounts.studio;

  const threadMessages = useMemo(
    () =>
      messages.filter(
        (m) => m.thread === thread && (filter === 'all' || m.version === version),
      ),
    [messages, thread, filter, version],
  );
  const firstUnreadId = messages.find((m) => m.thread === thread && m.unread)?.id;

  // What the status rail says about each conversation, derived from what has been sent.
  const replied = messages.some((m) => m.sent && m.thread === 'client');
  const briefed = messages.some((m) => m.sent && m.thread === 'studio' && m.text.includes('79.8'));
  const studioReplied = messages.some((m) => m.sent && m.thread === 'studio');
  const status = {
    client: replied
      ? { tone: 'ok', text: 'Reply sent · waiting on Renée' }
      : decision.axis
        ? { tone: 'wait', text: 'Position chosen · reply not sent yet' }
        : { tone: 'alert', text: 'Needs your position on the axis' },
    data: briefed
      ? { tone: 'ok', text: 'Corrected figure is with Kofi' }
      : { tone: 'alert', text: 'Kofi doesn’t have 79.8% yet' },
    studio: studioReplied
      ? { tone: 'ok', text: 'You replied to Kofi' }
      : { tone: 'alert', text: 'Kofi is waiting on your answer' },
  };

  const inboxCounts = Object.fromEntries(OTHER_PROJECTS.map((p) => [p.id, (inbox[p.id] || []).length]));
  const graphic = GRAPHICS.find((g) => g.id === (selection.kind === 'graphic' ? selection.id : 'g3'));
  const inboxProject = OTHER_PROJECTS.find((p) => p.id === selection.id);

  function notify(text) {
    setToast({ text, n: Date.now() });
  }

  function setComposer(t, patch) {
    setComposers((cs) => ({ ...cs, [t]: { ...cs[t], ...patch } }));
  }

  function sendFrom(t) {
    const c = composers[t];
    const text = c.text.trim();
    if (!text) return;
    if (t !== 'studio' && leakTerms(text).length > 0) return;
    setMessages((ms) => [
      ...ms,
      {
        id: `new-${Date.now()}`,
        thread: t,
        at: new Date(TODAY),
        from: 'ines',
        version,
        text,
        pin: c.pin,
        files: c.files,
        sent: true,
      },
    ]);
    setComposers((cs) => ({ ...cs, [t]: emptyComposer() }));
    notify(`Posted to ${THREADS[t].label}`);
  }

  function pinPoint(index) {
    const label = pointLabel(index, seriesFor(version, oct)[index]);
    setComposer('client', { pin: { index, version, label } });
    setThread('client');
    notify(`Pinned ${label} for your next client message`);
  }

  // Clicking a numbered pin on the chart opens the message it belongs to.
  function openPin(key) {
    const m = messages.find((x) => x.pin && x.pin.key === key);
    if (!m) return;
    setVersion(m.version);
    setThread(m.thread);
    setFocus({ msgId: m.id, n: Date.now() });
    setFlash({ key, n: Date.now() });
  }

  // Clicking a pin chip in a message shows where it sits on the chart.
  function onPinChip(pin) {
    if (pin.key) {
      setVersion('v3');
      setFlash({ key: pin.key, n: Date.now() });
      return;
    }
    setVersion(pin.version);
    setHighlight({ index: pin.index, version: pin.version, n: Date.now() });
  }

  function openFile(file) {
    download(file.name, seriesCsv({ last: file.last, oct: file.oct }));
    notify(`Downloaded ${file.name}`);
  }

  function downloadVersionData(id) {
    const v = VERSIONS[id];
    download(v.data.name, seriesCsv({ last: v.lastIndex, oct: 'prelim' }));
    notify(`Downloaded ${v.data.name}`);
  }

  function resetPreview() {
    setFloor(0);
    setMuted(false);
    setOct('prelim');
  }

  function showAsSent() {
    resetPreview();
    notify(`Showing ${version} as sent`);
  }

  function removeFile(t, f) {
    setComposers((cs) => ({ ...cs, [t]: { ...cs[t], files: cs[t].files.filter((x) => x.name !== f.name) } }));
  }

  function removePin(t) {
    setComposer(t, { pin: null });
  }

  // Decisions. Choosing an axis option also moves the chart preview to match it.
  function chooseAxis(id) {
    const opt = AXIS_OPTIONS.find((o) => o.id === id);
    setDecision((d) => ({ ...d, axis: id }));
    setFloor(opt.floor);
    setMuted(true);
  }

  function chooseDate(id) {
    setDecision((d) => ({ ...d, date: id }));
  }

  function toggleCheck(id) {
    setChecks((c) => ({ ...c, [id]: !c[id] }));
  }

  function briefKofi() {
    if (composers.studio.text.trim() && !window.confirm('Replace the message you’re drafting to Kofi?')) return;
    const opt = AXIS_OPTIONS.find((o) => o.id === decision.axis);
    const dt = V4_DATES.find((d) => d.id === decision.date);
    setComposer('studio', { text: kofiBrief(opt, dt), files: [REVISED_FILE] });
    setThread('studio');
    notify('Brief for Kofi drafted with the revised file. Check it, then post.');
  }

  function draftClient() {
    const opt = AXIS_OPTIONS.find((o) => o.id === decision.axis);
    const dt = V4_DATES.find((d) => d.id === decision.date);
    if (!opt || !dt) return;
    if (composers.client.text.trim() && !window.confirm('Replace the client reply you’re drafting?')) return;
    setComposer('client', { text: clientDraft(opt, dt) });
    setThread('client');
    notify('Draft ready in Client review. Read it through before you send.');
  }

  function markRead(pid, id) {
    setInbox((s) => ({ ...s, [pid]: s[pid].filter((m) => m.id !== id) }));
  }

  function markAllRead(pid) {
    setInbox((s) => ({ ...s, [pid]: [] }));
  }

  return (
    <div className="app">
      <Sidebar
        selection={selection}
        onGraphic={(id) => setSelection({ kind: 'graphic', id })}
        onInbox={(id) => setSelection({ kind: 'inbox', id })}
        riddingUnread={riddingUnread}
        inboxCounts={inboxCounts}
      />

      <main className="main">
        {selection.kind === 'inbox' && inboxProject ? (
          <ProjectInbox
            project={inboxProject}
            items={inbox[inboxProject.id] || []}
            onRead={(mid) => markRead(inboxProject.id, mid)}
            onReadAll={() => markAllRead(inboxProject.id)}
          />
        ) : graphic.id === 'g3' ? (
          <Workspace
            graphic={graphic}
            version={version}
            onVersion={setVersion}
            floor={floor}
            muted={muted}
            oct={oct}
            onFloor={setFloor}
            onMuted={setMuted}
            onOct={setOct}
            onResetPreview={resetPreview}
            pinned={composers.client.pin}
            highlight={highlight}
            flash={flash}
            onPickIndex={pinPoint}
            onPinClick={openPin}
            thread={thread}
            onThread={setThread}
            unreadCounts={unreadCounts}
            threadMessages={threadMessages}
            firstUnreadId={firstUnreadId}
            filter={filter}
            onFilter={setFilter}
            focus={focus}
            composers={composers}
            onComposer={setComposer}
            onSend={sendFrom}
            onPinChip={onPinChip}
            onFile={openFile}
            onRemoveFile={removeFile}
            onRemovePin={removePin}
            onVersionData={downloadVersionData}
            onShowAsSent={showAsSent}
          />
        ) : (
          <GraphicSummary graphic={graphic} />
        )}
      </main>

      <aside className="rail">
        {selection.kind === 'inbox' ? (
          <InboxSummary inbox={inbox} onOpenProject={(id) => setSelection({ kind: 'inbox', id })} />
        ) : graphic.id === 'g3' ? (
          <Reconcile
            messageCount={messages.length}
            status={status}
            decision={decision}
            onAxis={chooseAxis}
            onDate={chooseDate}
            onBrief={briefKofi}
            onDraft={draftClient}
            checks={checks}
            onCheck={toggleCheck}
          />
        ) : (
          <ProjectStatus project={PROJECT} graphic={graphic} />
        )}
      </aside>

      {toast && (
        <div className="toast" key={toast.n} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
