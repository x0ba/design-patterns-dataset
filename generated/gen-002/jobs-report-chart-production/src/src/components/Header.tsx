import { EMBARGO_LIFTS, HANDOFF_DUE, ME_ID, personById } from '../data/seed';
import { fmtClock, fmtCountdown, fmtDate, fmtDayTime } from '../lib/format';
import { countByStatus, openThreads, STATUS_LIST } from '../lib/selectors';
import { useStore } from '../lib/store';
import { Avatar, statusSlug } from './ui';

function Countdown({ label, when, now, strong }: { label: string; when: number; now: number; strong?: boolean }) {
  return (
    <div className={`countdown ${strong ? 'strong' : ''}`}>
      <span className="cd-label">{label}</span>
      <span className="cd-when">
        {fmtDate(when)}, {fmtClock(when)}
      </span>
      <span className="cd-left">{fmtCountdown(when, now)} left</span>
    </div>
  );
}

export function TopBar({ now }: { now: number }) {
  const { state } = useStore();
  const me = personById(ME_ID)!;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 16 16">
            <rect width="16" height="16" rx="3" fill="#2f8f94" />
            <path d="M3 11l3-4 2 2 5-6" stroke="#fff" strokeWidth="1.6" fill="none" />
          </svg>
        </span>
        <div>
          <div className="brand-name">Releasewell</div>
          <div className="brand-sub">Chart production · Labor Market Information</div>
        </div>
      </div>

      <div className="release-title">
        <div className="release-name">October 2026 Jobs Report</div>
        <div className="release-sub">22 charts · statewide, metro and county · release lead: {me.name}</div>
      </div>

      <div className="countdowns">
        {state.handedOffAt ? (
          <div className="countdown done">
            <span className="cd-label">Released to communications</span>
            <span className="cd-when">{fmtDayTime(state.handedOffAt)}</span>
          </div>
        ) : (
          <Countdown label="Handoff to communications" when={HANDOFF_DUE} now={now} />
        )}
        <Countdown label="Embargo lifts" when={EMBARGO_LIFTS} now={now} strong />
      </div>

      <div className="me">
        <div className="clock">
          {fmtDate(now)} · {fmtClock(now)}
        </div>
        <div className="me-chip">
          <Avatar personId={me.id} />
          <div>
            <div className="me-name">{me.name}</div>
            <div className="me-role">Release lead · can mark final and release</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function StatusStrip() {
  const { state, dispatch } = useStore();
  const counts = countByStatus(state.charts);
  const total = state.charts.length;
  const open = openThreads(state.comments).length;
  const toMe = openThreads(state.comments).filter((c) => c.to.includes(ME_ID)).length;
  const pct = total ? (counts.final / total) * 100 : 0;

  return (
    <div className="statusstrip" role="region" aria-label="Release status">
      <div className="final-meter">
        <div className="final-count">
          <strong>{counts.final}</strong> of {total} final
        </div>
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="status-segments">
        {STATUS_LIST.map((s) => {
          const active = state.filters.status === s;
          return (
            <button
              key={s}
              type="button"
              className={`seg st-${statusSlug(s)} ${active ? 'on' : ''}`}
              aria-pressed={active}
              title={`Show ${s} charts`}
              onClick={() => dispatch({ type: 'filter', patch: { status: active ? 'all' : s } })}
            >
              <span className="dot" aria-hidden="true" />
              {s}
              <b>{counts[s]}</b>
            </button>
          );
        })}
      </div>

      <div className="strip-right">
        <span>
          <b>{open}</b> open comments
        </span>
        <span className={toMe ? 'to-me' : ''}>
          <b>{toMe}</b> addressed to you
        </span>
      </div>
    </div>
  );
}
