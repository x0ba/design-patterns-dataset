import type { CallMeta, CourseNote, Transcript } from '../types';
import type { Exchange, SectionBounds } from '../lib/transcript';
import { formatDateLong, formatMinutes, formatTime, weekdayOf } from '../lib/time';

interface LeftRailProps {
  call: CallMeta;
  transcript: Transcript;
  bounds: SectionBounds;
  exchanges: Exchange[];
  currentExchange: number;
  notes: CourseNote[];
  pos: number;
  resumeAt: number | null;
  onSeek: (sec: number) => void;
  onQueue: () => void;
  queued: boolean;
  nextCallLabel: string | null;
}

export function LeftRail(props: LeftRailProps) {
  const { call, transcript, bounds, exchanges, currentExchange, notes, pos, resumeAt, onSeek, onQueue, queued, nextCallLabel } = props;
  const currentSection =
    pos >= bounds.qaStart ? 'qa' : pos >= bounds.cfoStart ? 'cfo' : 'ceo';

  return (
    <aside className="rail" aria-label="Call navigation">
      <section className="card now-playing">
        <div className="eyebrow">Now playing</div>
        <h1 className="call-title">{call.companyName} {call.quarter} earnings call</h1>
        <dl className="facts">
          <div><dt>Ticker</dt><dd>{call.ticker}</dd></div>
          <div><dt>Recorded</dt><dd>{weekdayOf(call.callDate)}, {formatDateLong(call.callDate)}</dd></div>
          <div><dt>Length</dt><dd>{formatMinutes(call.durationSec)}</dd></div>
          <div><dt>Speakers</dt><dd>{Object.keys(transcript.speakers).length}</dd></div>
        </dl>
        {resumeAt !== null && resumeAt > 0 && (
          <button className="resume-chip" onClick={() => onSeek(resumeAt)}>
            Last position {formatTime(resumeAt)} · resume
          </button>
        )}
      </section>

      {nextCallLabel && (
        <section className="card up-next">
          <div className="eyebrow">Comparison call</div>
          <p className="small">{nextCallLabel}</p>
          <button className="btn btn-sm" onClick={onQueue} disabled={queued}>
            {queued ? 'Queued' : 'Add to queue'}
          </button>
        </section>
      )}

      <section className="card">
        <div className="eyebrow">Jump to</div>
        <ul className="sections">
          <li>
            <button className={currentSection === 'ceo' ? 'on' : ''} onClick={() => onSeek(bounds.ceoStart)}>
              <span className="sec-time">{formatTime(bounds.ceoStart)}</span>
              <span>Prepared remarks · CEO</span>
            </button>
          </li>
          <li>
            <button className={currentSection === 'cfo' ? 'on' : ''} onClick={() => onSeek(bounds.cfoStart)}>
              <span className="sec-time">{formatTime(bounds.cfoStart)}</span>
              <span>Prepared remarks · CFO</span>
            </button>
          </li>
          <li>
            <button className={currentSection === 'qa' ? 'on' : ''} onClick={() => onSeek(bounds.qaStart)}>
              <span className="sec-time">{formatTime(bounds.qaStart)}</span>
              <span>Analyst Q&amp;A · {exchanges.length} analysts</span>
            </button>
          </li>
        </ul>
      </section>

      <section className="card">
        <div className="eyebrow">Analyst questions</div>
        <ol className="exchanges">
          {exchanges.map((ex, i) => {
            const speaker = transcript.speakers[ex.speaker];
            const hasNote = notes.some((n) => n.t >= ex.t && n.t < ex.end);
            return (
              <li key={ex.t}>
                <button
                  className={[i === currentExchange ? 'on' : '', hasNote ? 'noted' : ''].join(' ').trim()}
                  onClick={() => onSeek(ex.t)}
                  aria-current={i === currentExchange ? 'true' : undefined}
                >
                  <span className="sec-time">{formatTime(ex.t)}</span>
                  <span className="ex-body">
                    <span className="ex-name">{speaker?.name}</span>
                    <span className="ex-firm">{speaker?.org}</span>
                    <span className="ex-topic">{ex.topic}</span>
                  </span>
                  {hasNote && <span className="note-dot" title="Has a course note" aria-label="Course note" />}
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </aside>
  );
}
