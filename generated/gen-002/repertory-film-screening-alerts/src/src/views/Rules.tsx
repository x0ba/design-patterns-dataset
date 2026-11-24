import { Card, FormatBadge, Toggle } from "../components/ui";
import {
  LIBRARY_COUNTS,
  SCREENING_ROWS,
  SERIES_NAMES,
  alertsLastSevenDays,
  alertsLastThirtyDays,
} from "../lib/data";
import { QUIET_HOURS_LABEL, verdictFor } from "../lib/rules";
import { useStore } from "../lib/store";
import { FORMATS, type Cinema, type Film, type Format, type Rules as RulesT } from "../types";
import { NOW, fmtClockHHMM } from "../lib/time";

const ROUNDUP_TIMES = ["06:00", "07:00", "08:00", "09:00", "12:00", "18:00"];
const ROUNDUP_DAYS = ["Sunday", "Monday", "Saturday"];

function sameRules(a: RulesT, b: RulesT): boolean {
  return (
    a.unseenOnly === b.unseenOnly &&
    a.soldThreshold === b.soldThreshold &&
    a.roundupDay === b.roundupDay &&
    a.roundupTime === b.roundupTime &&
    [...a.printFormats].sort().join() === [...b.printFormats].sort().join() &&
    [...a.mutedSeries].sort().join("|") === [...b.mutedSeries].sort().join("|")
  );
}

interface Countable {
  film: Film;
  cinema: Cinema;
  format: Format;
  sold: number;
  series: string | null;
}

function countInterrupts(rows: Countable[], rules: RulesT): number {
  return rows.filter((r) => verdictFor(r.film, r.cinema, r.format, r.sold, r.series, rules).route === "interrupt").length;
}

export function Rules() {
  const { active, draft, setDraft, saveDraftAsActive, restoreCurrentRules, resetDraft } = useStore();

  const week = alertsLastSevenDays(NOW);
  const month = alertsLastThirtyDays(NOW);
  const weekIn = countInterrupts(week, draft);
  const monthIn = countInterrupts(month, draft);
  const upcomingIn = countInterrupts(SCREENING_ROWS, draft);

  const everything = active.mode === "everything";
  const differs = everything || !sameRules(active, draft);

  const toggleFormat = (f: Format) => {
    const has = draft.printFormats.includes(f);
    setDraft({ printFormats: has ? draft.printFormats.filter((x) => x !== f) : [...draft.printFormats, f] });
  };

  const toggleSeries = (name: string) => {
    const has = draft.mutedSeries.includes(name);
    setDraft({ mutedSeries: has ? draft.mutedSeries.filter((x) => x !== name) : [...draft.mutedSeries, name] });
  };

  return (
    <div className="page rules">
      <header className="page-head">
        <div>
          <p className="kicker">Alert rules</p>
          <h1>Rules</h1>
        </div>
        <p className="status-line">The impact preview updates as you edit. Nothing changes until you save.</p>
      </header>

      <div className="rules-status">
        <Card kicker="Active now" title={everything ? "Every wanted-film screening alerts you" : "Filter is active"}>
          <p className="small muted">
            {everything
              ? `Selling-fast trigger at ${active.soldThreshold}%. No roundup is sent. Interrupts wait during quiet hours (${QUIET_HOURS_LABEL}).`
              : `Interrupts for ${active.printFormats.join(", ")} prints and for unseen films at ${active.soldThreshold}% sold or more. Everything else goes to the ${active.roundupDay} roundup.`}
          </p>
          {!everything && (
            <button className="btn" onClick={restoreCurrentRules}>
              Go back to current rules
            </button>
          )}
        </Card>

        <Card kicker="Your edits" title={differs ? "Draft differs from active" : "Draft matches active"}>
          <div className="row-actions">
            <button className="btn primary" disabled={!differs} onClick={saveDraftAsActive}>
              Save filter as active
            </button>
            <button className="btn ghost" onClick={resetDraft}>
              Reset to suggested filter
            </button>
          </div>
        </Card>

        <Card kicker="Your library" title="What the filter works from">
          <dl className="library">
            <div>
              <dt>{LIBRARY_COUNTS.wanted}</dt>
              <dd>films on your wanted list</dd>
            </div>
            <div>
              <dt>{LIBRARY_COUNTS.mustSeeOnFilm}</dt>
              <dd>marked must see on film</dd>
            </div>
            <div>
              <dt>{LIBRARY_COUNTS.seen}</dt>
              <dd>marked already seen</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="impact">
        <div className="impact-tile">
          <p className="kicker">This week</p>
          <p className="impact-num">
            {week.length} <span>→</span> {weekIn}
          </p>
          <p className="small muted">alerts become interrupts. The rest wait for the roundup.</p>
        </div>
        <div className="impact-tile">
          <p className="kicker">Last 30 days</p>
          <p className="impact-num">
            {month.length} <span>→</span> {monthIn}
          </p>
          <p className="small muted">would have interrupted you.</p>
        </div>
        <div className="impact-tile">
          <p className="kicker">Next six weeks</p>
          <p className="impact-num">
            {SCREENING_ROWS.length} <span>→</span> {upcomingIn}
          </p>
          <p className="small muted">matching screenings would interrupt.</p>
        </div>
      </div>

      <div className="rules-grid">
        <Card kicker="Step 1 · Interrupt me for" title="Prints and nearly sold-out films">
          <Toggle
            checked={draft.unseenOnly}
            onChange={(v) => setDraft({ unseenOnly: v })}
            label="Only films I haven't seen"
            hint="Seen films skip interrupts even on 35mm or 70mm. They go to the roundup."
          />

          <div className="field">
            <span className="field-label">Print formats that interrupt</span>
            <div className="format-checks">
              {FORMATS.map((f) => (
                <label key={f} className="check">
                  <input type="checkbox" checked={draft.printFormats.includes(f)} onChange={() => toggleFormat(f)} />
                  <FormatBadge format={f} />
                </label>
              ))}
            </div>
            <p className="small muted">
              Rare prints are 70mm, 35mm and 16mm. Digital is off by default.
            </p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="sold-threshold">
              Nearly sold out at {draft.soldThreshold}% or more
            </label>
            <input
              id="sold-threshold"
              type="range"
              min={50}
              max={100}
              step={1}
              value={draft.soldThreshold}
              onChange={(e) => setDraft({ soldThreshold: Number(e.target.value) })}
            />
            <div className="range-scale">
              <span>50%</span>
              <span>100%</span>
            </div>
            <p className="small muted">Applies to unseen films. It also sets the selling-fast trigger.</p>
          </div>
        </Card>

        <Card kicker="Step 2 · Send to roundup" title="Muted series and roundup timing">
          <div className="field">
            <span className="field-label">Muted series</span>
            <p className="small muted">Muted series always go to the roundup, even for prints.</p>
            <ul className="series-list">
              {SERIES_NAMES.map((name) => {
                const count = SCREENING_ROWS.filter((s) => s.series === name).length;
                return (
                  <li key={name}>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={draft.mutedSeries.includes(name)}
                        onChange={() => toggleSeries(name)}
                      />
                      <span>{name}</span>
                      <span className="muted small">{count} upcoming</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="field two-up">
            <label>
              <span className="field-label">Roundup day</span>
              <select value={draft.roundupDay} onChange={(e) => setDraft({ roundupDay: e.target.value })}>
                {ROUNDUP_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Roundup time</span>
              <select value={draft.roundupTime} onChange={(e) => setDraft({ roundupTime: e.target.value })}>
                {ROUNDUP_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {fmtClockHHMM(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-label">Quiet hours</span>
            <p className="small">{QUIET_HOURS_LABEL}: interrupts that arrive overnight wait until 7:00 a.m.</p>
          </div>
        </Card>
      </div>

      <Card kicker="How a screening is decided" title="Checked in order; the first match wins">
        <ol className="decision-steps">
          <li>
            <strong>Muted series?</strong> Goes to the roundup.
          </li>
          <li>
            <strong>Already seen, and only unseen films interrupt?</strong> Goes to the roundup.
          </li>
          <li>
            <strong>Print format on the interrupt list?</strong> Interrupts you now.
          </li>
          <li>
            <strong>At or above the sold-out threshold?</strong> Interrupts you. Otherwise it goes to the roundup.
          </li>
        </ol>
      </Card>
    </div>
  );
}
