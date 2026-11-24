import { COOP, DESK_USER, EVENT } from '../data/mock';
import { useStore } from '../state/store';
import { activeOutages, awaitingMessages, isSilent } from '../derive';

function clockParts(now: number): string {
  const v = ((now % 1440) + 1440) % 1440;
  const total = Math.floor(v * 60);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(hh)}:${p(mm)}:${p(ss)}`;
}

export function TopBar({ now }: { now: number }) {
  const { state } = useStore();
  const active = activeOutages(state);
  const membersOut = active.reduce((sum, o) => sum + o.members, 0);
  const checkedIn = state.crews.filter((c) => !isSilent(c, now)).length;
  const awaiting = awaitingMessages(state).length;
  const medicalOpen = state.medical.filter((m) => m.status !== 'logged').length;

  return (
    <header className="topbar">
      <div className="brand">
        <div className="wordmark">
          Linecall <span>Storm Room</span>
        </div>
        <div className="brand-sub">
          {COOP} · {EVENT}
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Members without power" value={membersOut.toLocaleString('en-US')} />
        <Kpi label="Active outages" value={String(active.length)} />
        <Kpi label="Crews checked in" value={`${checkedIn} of ${state.crews.length}`} tone={checkedIn < state.crews.length ? 'warn' : undefined} />
        <Kpi label="Awaiting reply" value={String(awaiting)} tone={awaiting > 0 ? 'hot' : undefined} />
        <Kpi label="Medical callbacks open" value={String(medicalOpen)} tone={medicalOpen > 0 ? 'med' : undefined} />
      </div>

      <div className="clock">
        <div className="clock-time" aria-live="off">
          {clockParts(now)}
        </div>
        <div className="clock-desk">Posting as {DESK_USER}</div>
      </div>
    </header>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'hot' | 'med' }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ''}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
