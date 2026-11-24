import type { Filing } from "../domain/types";
import { fmtTime } from "../domain/format";

export function ActivityCard({ filing }: { filing: Filing }) {
  const entries = [...filing.events].reverse();
  return (
    <section className="card" aria-labelledby="activity-title">
      <header className="card-head">
        <h2 id="activity-title">Activity</h2>
        <span className="muted">Newest first</span>
      </header>
      <ol className="activity">
        {entries.map((e, i) => (
          <li key={`${e.at}-${i}`}>
            <span className="activity-time mono">{fmtTime(e.at)}</span>
            <span className="activity-text">{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
