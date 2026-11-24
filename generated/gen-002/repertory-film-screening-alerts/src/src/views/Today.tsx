import { useState } from "react";
import { Card, Chip, FormatBadge, Sparkline, SoldBar } from "../components/ui";
import { SCREENING_BY_ID, SCREENING_ROWS, alertsLastSevenDays, projectSold, type ScreeningRow } from "../lib/data";
import { verdictFor } from "../lib/rules";
import { useStore } from "../lib/store";
import { ALERT_LABEL } from "../types";
import {
  NOW,
  endTime,
  fmtClock,
  fmtClockHHMM,
  fmtDate,
  fmtDateLong,
  fmtRuntime,
  fmtWhen,
} from "../lib/time";

type Filter = "all" | "interrupt" | "roundup";

function runsText(s: ScreeningRow): string {
  const runtime = s.film.runtime;
  if (!runtime) return fmtClockHHMM(s.time);
  return `${fmtClockHHMM(s.time)} – ${endTime(s.time, runtime)}`;
}

function OptionCard({ s, recommended }: { s: ScreeningRow; recommended: boolean }) {
  const proj = projectSold(s, NOW);
  const seatsLeft = s.cinema.seats - s.sold;
  return (
    <article className={`option ${recommended ? "recommended" : ""}`}>
      <div className="option-head">
        <p className="kicker">{recommended ? "Recommended" : "Alternative"}</p>
        <FormatBadge format={s.format} />
      </div>
      <h3>
        {fmtDateLong(s.date)}
        <span className="muted"> · {fmtClockHHMM(s.time)}</span>
      </h3>
      <p className="seats-left">
        <strong>{seatsLeft}</strong> seats left
      </p>
      <SoldBar sold={s.sold} seats={s.cinema.seats} />
      <dl className="facts">
        <div>
          <dt>Price</dt>
          <dd>${s.price}</dd>
        </div>
        <div>
          <dt>Pace</dt>
          <dd>{proj ? `+${proj.pacePerDay.toFixed(1)} a day` : "—"}</dd>
        </div>
        <div>
          <dt>By showtime</dt>
          <dd>
            about {proj?.projectedSold ?? s.sold} ({proj?.projectedPct ?? s.pct}%)
          </dd>
        </div>
        <div>
          <dt>Runs</dt>
          <dd>{runsText(s)}</dd>
        </div>
      </dl>
      {s.sales && <Sparkline points={s.sales} seats={s.cinema.seats} />}
    </article>
  );
}

export function Today() {
  const { active, draft, decision, setDecision } = useStore();
  const [filter, setFilter] = useState<Filter>("all");

  const sat = SCREENING_BY_ID.get("s05")!;
  const sun = SCREENING_BY_ID.get("s07")!;
  const satProj = projectSold(sat, NOW);
  const sunProj = projectSold(sun, NOW);
  const satSoldOut = satProj ? satProj.projectedPct >= 90 : false;
  const waitIsLowRisk = satSoldOut && (sunProj?.projectedPct ?? 100) < 60;

  const week = alertsLastSevenDays(NOW);
  const annotated = week.map((a) => ({
    a,
    v: verdictFor(a.film, a.cinema, a.format, a.sold, a.series, draft),
  }));
  const interrupts = annotated.filter((x) => x.v.route === "interrupt").length;
  const roundups = annotated.length - interrupts;
  const shown = annotated.filter((x) => filter === "all" || x.v.route === filter);

  const newest = week[0];
  const nextUp = SCREENING_ROWS.filter(
    (s) =>
      s.id !== "s05" &&
      s.id !== "s07" &&
      verdictFor(s.film, s.cinema, s.format, s.sold, s.series, draft).route === "interrupt",
  ).slice(0, 5);

  const everythingAlerts = active.mode === "everything";
  const satLeft = sat.cinema.seats - sat.sold;

  return (
    <div className="page today">
      <header className="page-head">
        <div>
          <p className="kicker">Monday, November 16 · {fmtClock(NOW.getHours(), NOW.getMinutes())}</p>
          <h1>Good evening, Jonah</h1>
        </div>
        <p className="status-line">
          {everythingAlerts
            ? "Current rules: every wanted-film screening alerts you."
            : "Filter active: only interrupts reach you; the rest waits for Sunday's roundup."}
        </p>
      </header>

      <section className="hero card">
        <div className="hero-top">
          <div>
            <p className="kicker">
              Just in · {newest ? ALERT_LABEL[newest.type] : "Alert"} · {newest ? fmtWhen(newest.when) : ""}
            </p>
            <h2 className="film-title">Stalker</h2>
            <p className="film-meta">
              1979 · Andrei Tarkovsky · {sat.cinema.name} · Tarkovsky in Print
              {sat.film.runtime ? ` · ${fmtRuntime(sat.film.runtime)}` : ""}
            </p>
          </div>
          <div className="hero-tags">
            <FormatBadge format={sat.format} />
            <Chip tone="neutral">Not seen yet</Chip>
            {sat.film.mustSeeOnFilm && <Chip tone="must">On your must-see-on-film list</Chip>}
          </div>
        </div>

        <p className="hero-lede">
          Saturday's 7:30 p.m. 35mm screening is <strong>{sat.pct}% sold</strong>, with {satLeft} seats left.
          Sunday's 3:00 p.m. 35mm screening at the same theatre is {sun.pct}% sold.
        </p>

        <div className="options">
          <OptionCard s={sat} recommended={waitIsLowRisk === false} />
          <OptionCard s={sun} recommended={waitIsLowRisk} />
        </div>

        <div className="verdict-box">
          {waitIsLowRisk ? (
            <p>
              <strong>Our read: wait for Sunday.</strong> Saturday is on pace for about {satProj?.projectedSold} of{" "}
              {sat.cinema.seats} by showtime, so the 7:30 slot is the one most likely to fill. Sunday has{" "}
              {sun.cinema.seats - sun.sold} seats open and is on pace for about {sunProj?.projectedSold}. What you
              give up is the evening: Sunday is an afternoon show ({runsText(sun)}), Saturday an evening one (
              {runsText(sat)}).
            </p>
          ) : (
            <p>
              <strong>Our read: buy Saturday now.</strong> Saturday is on pace for about {satProj?.projectedSold} of{" "}
              {sat.cinema.seats}, and Sunday's pace doesn't leave the same margin.
            </p>
          )}

          {decision.choice === "none" ? (
            <div className="decision-actions">
              <button className="btn primary" onClick={() => setDecision("buy-sat")}>
                Buy Saturday
              </button>
              <button className="btn" onClick={() => setDecision("wait-sun")}>
                Wait for Sunday
              </button>
              <span className="fineprint">Reelcall doesn't sell tickets. Checkout happens on the theatre's site.</span>
            </div>
          ) : (
            <div className="decision-done">
              <p>
                {decision.choice === "buy-sat"
                  ? "You chose Saturday, 7:30 p.m. Finish checkout on the theatre's site."
                  : "You're waiting for Sunday. Reelcall keeps watching the 3:00 p.m. screening."}
              </p>
              <button className="btn ghost" onClick={() => setDecision("none")}>
                Undo
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="today-grid">
        <Card
          className="feed"
          kicker="Alerts"
          title={`Last 7 days · ${week.length} alerts`}
          action={
            <div className="segmented" role="group" aria-label="Filter alerts">
              <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
                All {annotated.length}
              </button>
              <button className={filter === "interrupt" ? "on" : ""} onClick={() => setFilter("interrupt")}>
                Interrupts {interrupts}
              </button>
              <button className={filter === "roundup" ? "on" : ""} onClick={() => setFilter("roundup")}>
                Roundup {roundups}
              </button>
            </div>
          }
        >
          <p className="feed-summary">
            {everythingAlerts
              ? `All ${week.length} reached you. Under your filter, ${interrupts} would still interrupt and ${roundups} would wait for the roundup.`
              : `${interrupts} interrupts reached you. ${roundups} went to the roundup.`}
          </p>
          <ul className="alert-list">
            {shown.map(({ a, v }) => (
              <li key={a.id} className={`alert-row ${v.route}`}>
                <time className="alert-when">{fmtWhen(a.when)}</time>
                <div className="alert-main">
                  <div className="alert-title">
                    <span className="serif">{a.film.title}</span>
                    <span className="muted"> {a.film.year}</span>
                  </div>
                  <div className="alert-meta">
                    {ALERT_LABEL[a.type]} · {a.cinema.name} · {fmtDate(a.date)} {fmtClockHHMM(a.time)} · {a.pct}%
                    sold{a.series ? ` · ${a.series}` : ""}
                  </div>
                </div>
                <FormatBadge format={a.format} />
                <Chip tone={v.route} title={v.reason}>
                  {v.route === "interrupt" ? "Interrupt" : "Roundup"}
                </Chip>
              </li>
            ))}
          </ul>
        </Card>

        <div className="side-stack">
          <Card kicker="Your filter" title={interrupts + " of " + week.length + " would interrupt"}>
            <p className="muted small">
              Interrupts are prints (70mm, 35mm, 16mm) and unseen films at 85% sold or more. Everything else, including
              digital screenings of films you've seen and the Witching Hour series, goes into Sunday's roundup.
            </p>
            <p className="small">
              <strong>Roundup:</strong> {draft.roundupDay}s at {fmtClockHHMM(draft.roundupTime)}
            </p>
            <a className="btn" href="#/rules">
              Review filter
            </a>
          </Card>

          <Card kicker="Coming up" title="Next interrupts">
            <ul className="mini-list">
              {nextUp.map((s) => (
                <li key={s.id}>
                  <span className="mini-date">
                    {fmtDate(s.date)}
                    <span className="muted"> · {fmtClockHHMM(s.time)}</span>
                  </span>
                  <span className="serif">{s.film.title}</span>
                  <span className="muted small">
                    {s.cinema.name} · {s.format} · {s.pct}% sold
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card kicker="Quiet hours" title="Alerts are live">
            <p className="small muted">
              Interrupts that arrive from 11:00 p.m. to 7:00 a.m. wait until 7:00 a.m. It's{" "}
              {fmtClock(NOW.getHours(), NOW.getMinutes())} now, so alerts are live.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
