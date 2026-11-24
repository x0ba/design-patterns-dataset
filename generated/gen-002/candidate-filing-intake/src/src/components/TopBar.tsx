import { CURE_BY_LABEL, fmtClock, timeRemaining } from "../domain/format";

export function TopBar({ now }: { now: Date }) {
  const left = timeRemaining(now);
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">FD</span>
        <div>
          <div className="brand-name">Filingdesk</div>
          <div className="brand-sub">Secretary of State · Elections Division</div>
        </div>
      </div>

      <div className="deadline" aria-label="Qualifying deadline">
        <div className="deadline-label">Primary qualifying closes</div>
        <div className="deadline-value">{CURE_BY_LABEL}</div>
        <div className="deadline-left">
          {left.closed
            ? "Qualifying closed"
            : `${left.days} d ${left.hours} h ${left.minutes} m remaining`}
        </div>
      </div>

      <div className="clerk">
        <div className="clerk-name">Rosalind Ferreira</div>
        <div className="clerk-role">Senior qualifying clerk</div>
      </div>

      <div className="clock" aria-label="Current time">{fmtClock(now)}</div>
    </header>
  );
}

export function StatsStrip() {
  return (
    <div className="statsbar" role="status">
      <Stat label="Qualifying day" value="3 of 5" />
      <Stat label="Filings received this week" value="312" />
      <Stat label="Offices with filings" value="140" />
      <Stat label="Offices with open deficiencies" value="41" tone="warn" />
      <Stat label="Walk-in line now" value="14 waiting" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
