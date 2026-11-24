import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CallMeta, Clip, SavedState, Transcript } from '../types';
import { activeIndexAt, analystExchanges, sectionBounds, segmentEnd } from '../lib/transcript';
import { normalizeQuote } from '../lib/quote';
import { callById, HARROWGATE_Q2_ID } from '../data/catalog';
import { Player, RATES } from './Player';
import { TranscriptPanel } from './TranscriptPanel';
import { LeftRail } from './LeftRail';
import { SidePanel, type RightTab } from './SidePanel';
import { formatDateShort } from '../lib/time';

export type NewClip = Omit<Clip, 'id' | 'createdAt' | 'note'>;

export interface Actions {
  setRate: (rate: number) => void;
  savePosition: (callId: string, sec: number) => void;
  markCompleted: (callId: string) => void;
  addClip: (input: NewClip) => void;
  updateClipNote: (id: string, note: string) => void;
  deleteClip: (id: string) => void;
  enqueue: (callId: string) => void;
  dequeue: (callId: string) => void;
}

interface ListenViewProps {
  call: CallMeta;
  transcript: Transcript;
  saved: SavedState;
  actions: Actions;
  /** Position to start from (e.g. a saved clip's time). Falls back to the saved position. */
  startAt: number | null;
  rightTab: RightTab;
  onRightTab: (tab: RightTab) => void;
  flashClipId: string | null;
  onToast: (message: string) => void;
  onOpenCall: (callId: string, at?: number) => void;
}

const TICK = 0.25; // seconds of clock per tick, before the speed multiplier
const SAVE_EVERY_MS = 5000;

export function ListenView(props: ListenViewProps) {
  const { call, transcript, saved, actions, startAt, rightTab, onRightTab, flashClipId, onToast, onOpenCall } = props;
  const duration = call.durationSec;
  const rate = saved.rate;

  const bounds = useMemo(() => sectionBounds(transcript), [transcript]);
  const exchanges = useMemo(() => analystExchanges(transcript, duration), [transcript, duration]);
  const notes = transcript.notes;
  const clipTimes = useMemo(
    () => saved.clips.filter((c) => c.callId === call.id).map((c) => c.t),
    [saved.clips, call.id],
  );

  const clamp = useCallback((s: number) => Math.min(duration, Math.max(0, s)), [duration]);

  const [pos, setPos] = useState(() => clamp(startAt ?? saved.positions[call.id] ?? 0));
  const [playing, setPlaying] = useState(false);
  const [seekToken, setSeekToken] = useState(0);
  const [follow, setFollow] = useState(true);

  const posRef = useRef(pos);
  posRef.current = pos;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const seek = useCallback(
    (sec: number) => {
      const next = clamp(sec);
      posRef.current = next;
      setPos(next);
      setSeekToken((n) => n + 1);
      setFollow(true);
    },
    [clamp],
  );

  // Simulated playback clock. Advances by TICK × speed while playing.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPos((p) => Math.min(duration, p + TICK * rate));
    }, TICK * 1000);
    return () => window.clearInterval(id);
  }, [playing, rate, duration]);

  // Reaching the end finishes the call.
  useEffect(() => {
    if (playing && pos >= duration) {
      setPlaying(false);
      actionsRef.current.markCompleted(call.id);
    }
  }, [pos, playing, duration, call.id]);

  // Persist position: on pause or seek, and every few seconds while playing.
  useEffect(() => {
    if (!playing) actionsRef.current.savePosition(call.id, pos);
  }, [playing, pos, call.id]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => actionsRef.current.savePosition(call.id, posRef.current), SAVE_EVERY_MS);
    return () => window.clearInterval(id);
  }, [playing, call.id]);

  // Leaving the call (switching view or call) saves where the listener stopped.
  useEffect(() => {
    const id = call.id;
    return () => actionsRef.current.savePosition(id, posRef.current);
  }, [call.id]);

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (posRef.current >= duration - 0.5) seek(0);
    setPlaying(true);
  }, [playing, duration, seek]);

  const skip = useCallback((delta: number) => seek(posRef.current + delta), [seek]);

  const replay30 = useCallback(() => {
    seek(posRef.current - 30);
    actionsRef.current.setRate(1);
    setPlaying(true);
  }, [seek]);

  const playNoteAt1x = useCallback(
    (t: number) => {
      seek(t);
      actionsRef.current.setRate(1);
      setPlaying(true);
    },
    [seek],
  );

  const stepRate = useCallback(
    (dir: 1 | -1) => {
      const nearest = RATES.reduce((best, r, i) => (Math.abs(r - rate) < Math.abs(RATES[best] - rate) ? i : best), 0);
      const next = RATES[Math.min(RATES.length - 1, Math.max(0, nearest + dir))];
      actionsRef.current.setRate(next);
    },
    [rate],
  );

  const currentExchange = useMemo(() => {
    let idx = -1;
    exchanges.forEach((e, i) => {
      if (e.t <= pos) idx = i;
    });
    return idx;
  }, [exchanges, pos]);

  const jumpExchange = useCallback(
    (dir: 1 | -1) => {
      const cur = posRef.current;
      if (dir === 1) {
        const next = exchanges.find((e) => e.t > cur + 0.5);
        if (next) seek(next.t);
        return;
      }
      let idx = -1;
      exchanges.forEach((e, i) => {
        if (e.t <= cur) idx = i;
      });
      if (idx < 0) return;
      // Inside an exchange more than 3 s in, "previous" returns to its start, as in most players.
      if (cur - exchanges[idx].t > 3 || idx === 0) seek(exchanges[idx].t);
      else seek(exchanges[idx - 1].t);
    },
    [exchanges, seek],
  );

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case '[':
          stepRate(-1);
          break;
        case ']':
          stepRate(1);
          break;
        case 'n':
        case 'N':
          jumpExchange(1);
          break;
        case 'p':
        case 'P':
          jumpExchange(-1);
          break;
        case 'r':
        case 'R':
          replay30();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, skip, stepRate, jumpExchange, replay30]);

  const onSeekIndex = useCallback((index: number) => seek(transcript.segments[index].t), [seek, transcript]);

  const saveQuote = useCallback(
    (index: number, quoteText?: string) => {
      const seg = transcript.segments[index];
      const speaker = transcript.speakers[seg.speaker];
      const quote = normalizeQuote(quoteText ?? seg.text);
      if (!quote) return;
      const speakerTitle =
        speaker.kind === 'analyst' ? `analyst, ${speaker.org}` : speaker.title;
      actionsRef.current.addClip({
        callId: call.id,
        companyName: call.companyName,
        ticker: call.ticker,
        quarter: call.quarter,
        callDate: call.callDate,
        t: seg.t,
        tEnd: segmentEnd(transcript, index, duration),
        speakerName: speaker.name,
        speakerTitle,
        quote,
      });
    },
    [transcript, call, duration],
  );

  const onSaveSegment = useCallback((index: number) => saveQuote(index), [saveQuote]);
  const onSaveSelection = useCallback((index: number, text: string) => saveQuote(index, text), [saveQuote]);

  const activeIndex = activeIndexAt(transcript.segments, pos);
  const queueCalls = saved.queue.map((id) => callById(id)).filter((c): c is CallMeta => Boolean(c));
  const queued = saved.queue.includes(HARROWGATE_Q2_ID);
  const showUpNext = call.id === 'hrgo-q3-2026';
  const lastPos = saved.positions[call.id] ?? 0;
  const prevCall = callById(HARROWGATE_Q2_ID);

  return (
    <div className="listen">
      <LeftRail
        call={call}
        transcript={transcript}
        bounds={bounds}
        exchanges={exchanges}
        currentExchange={currentExchange}
        notes={notes}
        pos={pos}
        resumeAt={lastPos}
        onSeek={seek}
        onQueue={() => actions.enqueue(HARROWGATE_Q2_ID)}
        queued={queued}
        nextCallLabel={
          showUpNext && prevCall
            ? `Previous quarter in this case: ${prevCall.companyName} ${prevCall.quarter}, recorded ${formatDateShort(prevCall.callDate)}. Not started. Queue it to compare the gross-margin language.`
            : null
        }
      />

      <main className="center">
        <Player
          duration={duration}
          pos={pos}
          playing={playing}
          rate={rate}
          bounds={bounds}
          notes={notes}
          clipTimes={clipTimes}
          onToggle={togglePlay}
          onSeek={seek}
          onSkip={skip}
          onRate={actions.setRate}
          onReplay={replay30}
        />
        <TranscriptPanel
          transcript={transcript}
          activeIndex={activeIndex}
          follow={follow}
          seekToken={seekToken}
          onFollowChange={setFollow}
          onSeekIndex={onSeekIndex}
          onSaveSegment={onSaveSegment}
          onSaveSelection={onSaveSelection}
        />
      </main>

      <SidePanel
        tab={rightTab}
        onTab={onRightTab}
        notes={notes}
        noteCallLabel={`${call.companyName} ${call.quarter}`}
        clips={saved.clips}
        flashClipId={flashClipId}
        queue={queueCalls}
        canOpen={(id) => Boolean(callById(id)?.hasTranscript)}
        onPlayNote={playNoteAt1x}
        onSeekNote={seek}
        onClipNote={actions.updateClipNote}
        onClipDelete={actions.deleteClip}
        onClipOpen={(id, t) => onOpenCall(id, t)}
        onDequeue={actions.dequeue}
        onOpenCall={(id) => onOpenCall(id)}
        onToast={onToast}
      />
    </div>
  );
}
