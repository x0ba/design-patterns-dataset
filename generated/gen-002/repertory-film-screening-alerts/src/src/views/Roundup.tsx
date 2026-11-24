import { Card, Chip, FormatBadge } from "../components/ui";
import { SCREENING_ROWS, alertsLastSevenDays, type AlertRow } from "../lib/data";
import { verdictFor } from "../lib/rules";
import { useStore } from "../lib/store";
import { ALERT_LABEL, type Rules } from "../types";
import { NOW, addDays, fmtClockHHMM, fmtDate, fmtWhen, toDayKey } from "../lib/time";

type Bucket = "seen-digital" | "seen-print" | "muted" | "below";

const BUCKET_TITLE: Record<Bucket, { title: string; why: string }> = {
  "seen-digital": {
    title: "Digital screenings of films you've seen",
    why: "Digital copies of films already on your seen list. Your filter never interrupts for these.",
  },
  "seen-print": {
    title: "Prints of films you've seen",
    why: "Rare prints, but of films you've already watched. The filter holds these for the roundup.",
  },
  muted: {
    title: "Muted series",
    why: "Series you've switched off. Witching Hour Late Shows is midnight programming you don't follow.",
  },
  below: {
    title: "Not nearly sold out",
    why: "Unseen films on digital, or at less than the sold-out threshold.",
  },
};

function bucketOf(film: AlertRow["film"], format: AlertRow["format"], series: string | null, rules: Rules): Bucket {
  if (series && rules.mutedSeries.includes(series)) return "muted";
  if (film.seen) return format === "DCP" ? "seen-digital" : "seen-print";
  return "below";
}

const BUCKET_ORDER: Bucket[] = ["seen-digital", "seen-print", "muted", "below"];

export function Roundup() {
  const { active, draft } = useStore();

  const week = alertsLastSevenDays(NOW).map((a) => ({
    a,
    v: verdictFor(a.film, a.cinema, a.format, a.sold, a.series, draft),
  }));
  const weekRoundup = week.filter((x) => x.v.route === "roundup");
  const weekInterrupt = week.length - weekRoundup.length;

  const buckets = new Map<Bucket, typeof weekRoundup>();
  for (const item of weekRoundup) {
    const b = bucketOf(item.a.film, item.a.format, item.a.series, draft);
    buckets.set(b, [...(buckets.get(b) ?? []), item]);
  }

  // Upcoming items that would land in the next roundup (the coming Sunday covers Nov 17–22).
  const sundayEnd = toDayKey(addDays(NOW, 6));
  const upcomingRoundup = SCREENING_ROWS.filter(
    (s) =>
      s.date <= sundayEnd &&
      verdictFor(s.film, s.cinema, s.format, s.sold, s.series, draft).route === "roundup",
  );

  const filterOn = active.mode === "filtered";

  return (
    <div className="page roundup">
      <header className="page-head">
        <div>
          <p className="kicker">Next send · Sunday, Nov 22 · {fmtClockHHMM(draft.roundupTime)}</p>
          <h1>Weekly roundup</h1>
        </div>
        <p className="status-line">
          {filterOn
            ? "Your filter is active. This is what was sent or will be sent."
            : "Preview only. Your filter isn't active yet, so nothing has been held back."}
        </p>
      </header>

      <div className="roundup-stats">
        <div className="stat">
          <span className="stat-num">{weekRoundup.length}</span>
          <span className="stat-label">items held for the roundup this week</span>
        </div>
        <div className="stat">
          <span className="stat-num">{weekInterrupt}</span>
          <span className="stat-label">still interrupt you</span>
        </div>
        <div className="stat">
          <span className="stat-num">{upcomingRoundup.length}</span>
          <span className="stat-label">upcoming in the next roundup (Nov 17–22)</span>
        </div>
      </div>

      <div className="roundup-grid">
        <Card kicker="Last 7 days · Nov 10–16" title={`${weekRoundup.length} roundup items`}>
          {BUCKET_ORDER.filter((b) => buckets.has(b)).map((b) => {
            const items = buckets.get(b)!;
            return (
              <section key={b} className="bucket">
                <header>
                  <h3>
                    {BUCKET_TITLE[b].title} <span className="muted">· {items.length}</span>
                  </h3>
                  <p className="small muted">{BUCKET_TITLE[b].why}</p>
                </header>
                <ul className="mini-list">
                  {items.map(({ a }) => (
                    <li key={a.id} className="roundup-row">
                      <span className="mini-date">{fmtWhen(a.when)}</span>
                      <span>
                        <span className="serif">{a.film.title}</span>
                        <span className="muted small">
                          {" "}
                          · {ALERT_LABEL[a.type]} · {a.cinema.name} · {fmtDate(a.date)}
                        </span>
                      </span>
                      <FormatBadge format={a.format} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {weekRoundup.length === 0 && <p className="empty">Nothing held back this week.</p>}
        </Card>

        <Card kicker="Coming up" title="Next roundup, Nov 17–22">
          <ul className="mini-list">
            {upcomingRoundup.map((s) => {
              const v = verdictFor(s.film, s.cinema, s.format, s.sold, s.series, draft);
              return (
                <li key={s.id} className="roundup-row">
                  <span className="mini-date">
                    {fmtDate(s.date)}
                    <span className="muted"> · {fmtClockHHMM(s.time)}</span>
                  </span>
                  <span>
                    <span className="serif">{s.film.title}</span>
                    <span className="muted small"> · {s.cinema.name}</span>
                    <div className="tags">
                      <Chip tone="roundup" title={v.reason}>
                        {v.reason}
                      </Chip>
                    </div>
                  </span>
                  <FormatBadge format={s.format} />
                </li>
              );
            })}
          </ul>
          <p className="small muted">
            Roundups arrive Sundays at {fmtClockHHMM(draft.roundupTime)}, covering the last seven days and the week
            ahead.
          </p>
        </Card>
      </div>
    </div>
  );
}
